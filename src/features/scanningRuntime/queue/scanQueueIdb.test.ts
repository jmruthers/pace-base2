import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOk } from '@solvera/pace-core/types';
import {
  DEDUP_WINDOW_MS,
  buildQueueEntry,
  getScanQueueEntry,
  hasRecentAcceptAtPoint,
  listScanQueueEntriesByStatus,
  openScanQueueDb,
  putScanQueueEntry,
  resetSyncingEntriesToPending,
  updateScanQueueEntrySyncStatus,
} from './scanQueueIdb';

describe('scanQueueIdb', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
    vi.stubGlobal(
      'sessionStorage',
      {
        getItem: () => 'device-session-1',
        setItem: () => undefined,
        removeItem: () => undefined,
        clear: () => undefined,
        length: 0,
        key: () => null,
      } as Storage
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('buildQueueEntry always sets sync_status pending', () => {
    const e = buildQueueEntry({
      scanPointId: 'sp-1',
      cardIdentifier: 'c1',
      scannedAt: 1,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    expect(e.sync_status).toBe('pending');
  });

  it('dedup matches within window lower bound exclusive', async () => {
    const t0 = 1_000_000;
    const scanPointId = 'point-1';
    const card = 'CARD-1';

    const put = await putScanQueueEntry(
      buildQueueEntry({
        scanPointId,
        cardIdentifier: card,
        scannedAt: t0,
        validationResult: 'accepted',
        validationReason: null,
        overrideBy: null,
        notes: null,
      })
    );
    expect(isOk(put)).toBe(true);

    const near = await hasRecentAcceptAtPoint(scanPointId, card, t0 + DEDUP_WINDOW_MS - 1, DEDUP_WINDOW_MS);
    expect(isOk(near) && near.data).toBe(true);

    const far = await hasRecentAcceptAtPoint(scanPointId, card, t0 + DEDUP_WINDOW_MS, DEDUP_WINDOW_MS);
    expect(isOk(far) && !far.data).toBe(true);
  });

  it('override immutability: prior rejected row unchanged after second accepted_override entry', async () => {
    const scanPointId = 'point-1';
    const rejectEntry = buildQueueEntry({
      scanPointId,
      cardIdentifier: 'X',
      scannedAt: 10,
      validationResult: 'rejected',
      validationReason: 'booking_not_valid',
      overrideBy: null,
      notes: null,
    });
    rejectEntry.local_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    const overrideEntry = buildQueueEntry({
      scanPointId,
      cardIdentifier: 'X',
      scannedAt: 20,
      validationResult: 'accepted_override',
      validationReason: 'booking_not_valid',
      overrideBy: 'user-1',
      notes: null,
    });
    overrideEntry.local_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const putReject = await putScanQueueEntry(rejectEntry);
    const putOverride = await putScanQueueEntry(overrideEntry);
    expect(isOk(putReject)).toBe(true);
    expect(isOk(putOverride)).toBe(true);

    const dbOpen = await openScanQueueDb();
    expect(isOk(dbOpen)).toBe(true);
    if (!isOk(dbOpen)) {
      throw new Error('expected db');
    }
    const db = dbOpen.data;
    const first = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction('scan_events', 'readonly');
      const req = tx.objectStore('scan_events').get('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    const firstRow = first as { validation_result: string; local_id: string };
    expect(firstRow.local_id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(firstRow.validation_result).toBe('rejected');
  });

  it('updates sync status and stores local failure reason', async () => {
    const entry = buildQueueEntry({
      scanPointId: 'point-2',
      cardIdentifier: 'CARD-2',
      scannedAt: 40,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    entry.local_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const put = await putScanQueueEntry(entry);
    expect(isOk(put)).toBe(true);

    const updated = await updateScanQueueEntrySyncStatus({
      localId: entry.local_id,
      syncStatus: 'failed',
      failureReason: 'edge_sync_failed',
    });
    expect(isOk(updated) && updated.data?.sync_status === 'failed').toBe(true);
    expect(isOk(updated) ? updated.data?.failure_reason : null).toBe('edge_sync_failed');

    const reloaded = await getScanQueueEntry(entry.local_id);
    expect(isOk(reloaded) && reloaded.data?.failure_reason === 'edge_sync_failed').toBe(true);
  });

  it('resets stale syncing entries to pending on startup recovery', async () => {
    const entry = buildQueueEntry({
      scanPointId: 'point-3',
      cardIdentifier: 'CARD-3',
      scannedAt: 60,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    entry.local_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    await putScanQueueEntry(entry);
    await updateScanQueueEntrySyncStatus({
      localId: entry.local_id,
      syncStatus: 'syncing',
    });

    const reset = await resetSyncingEntriesToPending();
    expect(isOk(reset) && reset.data === 1).toBe(true);

    const row = await getScanQueueEntry(entry.local_id);
    expect(isOk(row) && row.data?.sync_status === 'pending').toBe(true);
  });

  it('lists entries by sync status for flush selection', async () => {
    const pending = buildQueueEntry({
      scanPointId: 'point-4',
      cardIdentifier: 'CARD-4',
      scannedAt: 70,
      validationResult: 'accepted',
      validationReason: null,
      overrideBy: null,
      notes: null,
    });
    pending.local_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const failed = buildQueueEntry({
      scanPointId: 'point-4',
      cardIdentifier: 'CARD-5',
      scannedAt: 80,
      validationResult: 'rejected',
      validationReason: 'booking_not_valid',
      overrideBy: null,
      notes: null,
    });
    failed.local_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    await putScanQueueEntry(pending);
    await putScanQueueEntry(failed);
    await updateScanQueueEntrySyncStatus({
      localId: failed.local_id,
      syncStatus: 'failed',
      failureReason: 'edge_sync_failed',
    });

    const rows = await listScanQueueEntriesByStatus(['pending', 'failed']);
    expect(isOk(rows)).toBe(true);
    expect(isOk(rows) ? rows.data.some((row) => row.local_id === pending.local_id) : false).toBe(true);
    expect(isOk(rows) ? rows.data.some((row) => row.local_id === failed.local_id) : false).toBe(true);
  });
});
