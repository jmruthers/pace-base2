// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import { buildQueueEntry, getScanQueueEntry, putScanQueueEntry, updateScanQueueEntrySyncStatus } from '@/features/scanningRuntime/queue/scanQueueIdb';
import {
  flushScanQueueNow,
  retryFailedQueueEntries,
  startScanSyncWorker,
  stopScanSyncWorker,
} from './scanSyncWorker';

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core/components', () => ({
  toast: toastMock,
}));

function mockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: 'token-1',
          },
        },
        error: null,
      })),
    },
  } as unknown as Parameters<typeof startScanSyncWorker>[0];
}

describe('scanSyncWorker', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pub-key');
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('ba13_scan_queue');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  afterEach(() => {
    stopScanSyncWorker();
  });

  it('resets stale syncing entries to pending during startup', async () => {
    const entry = buildQueueEntry({
      scanPointId: 'point-1',
      cardIdentifier: 'CARD-A',
      scannedAt: 1,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    entry.local_id = '11111111-1111-1111-1111-111111111111';
    await putScanQueueEntry(entry);
    await updateScanQueueEntrySyncStatus({ localId: entry.local_id, syncStatus: 'syncing' });

    await startScanSyncWorker(mockSupabaseClient());

    const row = await getScanQueueEntry(entry.local_id);
    expect(isOk(row) && row.data?.sync_status === 'pending').toBe(true);
  });

  it('flushes retry targets and marks them synced', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            local_id: '22222222-2222-2222-2222-222222222222',
            status: 'synced',
            conflict_detected: false,
            conflict_flagged: false,
          },
        }),
      }))
    );
    const entry = buildQueueEntry({
      scanPointId: 'point-2',
      cardIdentifier: 'CARD-B',
      scannedAt: 2,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    entry.local_id = '22222222-2222-2222-2222-222222222222';
    await putScanQueueEntry(entry);
    await updateScanQueueEntrySyncStatus({
      localId: entry.local_id,
      syncStatus: 'failed',
      failureReason: 'edge_sync_failed',
    });

    await startScanSyncWorker(mockSupabaseClient());
    const summary = await retryFailedQueueEntries([entry.local_id]);

    const row = await getScanQueueEntry(entry.local_id);
    expect(summary).toEqual({ retried: 1, skippedManualNoCard: 0 });
    expect(isOk(row) && row.data?.sync_status === 'synced').toBe(true);
    expect(toastMock).toHaveBeenCalled();
  });

  it('excludes manual-scan no-card failures from automatic flush cycles', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          local_id: '55555555-5555-5555-5555-555555555555',
          status: 'synced',
          conflict_detected: false,
          conflict_flagged: false,
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const retryableEntry = buildQueueEntry({
      scanPointId: 'point-5',
      cardIdentifier: 'CARD-E',
      scannedAt: 5,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    retryableEntry.local_id = '55555555-5555-5555-5555-555555555555';
    await putScanQueueEntry(retryableEntry);
    await updateScanQueueEntrySyncStatus({
      localId: retryableEntry.local_id,
      syncStatus: 'failed',
      failureReason: 'edge_sync_failed',
    });

    const manualEntry = buildQueueEntry({
      scanPointId: 'point-6',
      cardIdentifier: null,
      scannedAt: 6,
      validationResult: 'accepted_override',
      validationReason: null,
      overrideBy: 'user-1',
      notes: null,
    });
    manualEntry.local_id = '66666666-6666-6666-6666-666666666666';
    await putScanQueueEntry(manualEntry);
    await updateScanQueueEntrySyncStatus({
      localId: manualEntry.local_id,
      syncStatus: 'failed',
      failureReason: 'manual_scan_no_card',
    });

    await startScanSyncWorker(mockSupabaseClient());
    await flushScanQueueNow();

    const retryableAfter = await getScanQueueEntry(retryableEntry.local_id);
    const manualAfter = await getScanQueueEntry(manualEntry.local_id);
    expect(isOk(retryableAfter) && retryableAfter.data?.sync_status === 'synced').toBe(true);
    expect(isOk(manualAfter) && manualAfter.data?.sync_status === 'failed').toBe(true);
    expect(isOk(manualAfter) ? manualAfter.data?.failure_reason : null).toBe('manual_scan_no_card');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not requeue manual scan failures during explicit retry', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const entry = buildQueueEntry({
      scanPointId: 'point-3',
      cardIdentifier: null,
      scannedAt: 3,
      validationResult: 'accepted_override',
      validationReason: null,
      overrideBy: 'user-1',
      notes: null,
    });
    entry.local_id = '33333333-3333-3333-3333-333333333333';
    await putScanQueueEntry(entry);
    await updateScanQueueEntrySyncStatus({
      localId: entry.local_id,
      syncStatus: 'failed',
      failureReason: 'manual_scan_no_card',
    });

    await startScanSyncWorker(mockSupabaseClient());
    const summary = await retryFailedQueueEntries([entry.local_id]);

    const row = await getScanQueueEntry(entry.local_id);
    expect(summary).toEqual({ retried: 0, skippedManualNoCard: 1 });
    expect(isOk(row) && row.data?.sync_status === 'failed').toBe(true);
    expect(isOk(row) ? row.data?.failure_reason : null).toBe('manual_scan_no_card');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries failed entries immediately when requested', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            local_id: '44444444-4444-4444-4444-444444444444',
            status: 'already_synced',
            conflict_detected: false,
            conflict_flagged: false,
          },
        }),
      }))
    );
    const entry = buildQueueEntry({
      scanPointId: 'point-4',
      cardIdentifier: 'CARD-D',
      scannedAt: 4,
      validationResult: 'rejected',
      validationReason: 'booking_not_valid',
      overrideBy: null,
      notes: null,
    });
    entry.local_id = '44444444-4444-4444-4444-444444444444';
    await putScanQueueEntry(entry);
    await updateScanQueueEntrySyncStatus({
      localId: entry.local_id,
      syncStatus: 'failed',
      failureReason: 'edge_sync_failed',
    });

    await startScanSyncWorker(mockSupabaseClient());
    const summary = await retryFailedQueueEntries([entry.local_id]);

    const row = await getScanQueueEntry(entry.local_id);
    expect(summary).toEqual({ retried: 1, skippedManualNoCard: 0 });
    expect(isOk(row) && row.data?.sync_status === 'synced').toBe(true);
  });
});
