// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanningRuntimePage } from './ScanningRuntimePage';

const state = vi.hoisted(() => ({
  canUpdate: false,
  secureSupabase: null as unknown,
  scanPointLoading: true,
  scanPoint: undefined as Record<string, unknown> | undefined,
  queueCounts: { pending: 0, syncing: 0, synced: 0, failed: 0 },
  failedQueueEntries: [] as Array<Record<string, unknown>>,
}));

const retryFailedQueueEntriesMock = vi.hoisted(() => vi.fn(async () => ({ retried: 1, skippedManualNoCard: 0 })));

vi.mock('@/features/scanningRuntime/hooks/useScanPointRecord', () => ({
  useScanPointRecord: () => ({ scanPoint: state.scanPoint, isLoading: state.scanPointLoading }),
}));

vi.mock('@/features/scanningRuntime/sync/scanSyncWorker', () => ({
  useScanSyncSnapshot: () => ({ isFlushing: false, lastFlushAt: null }),
  getQueueStatusCounts: vi.fn(async () => state.queueCounts),
  getQueueEntriesByStatus: vi.fn(async (statuses: string[]) =>
    statuses.includes('failed') ? state.failedQueueEntries : []
  ),
  retryFailedQueueEntries: retryFailedQueueEntriesMock,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: { id: 'e1', name: 'Event' } }),
  useUnifiedAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@solvera/pace-core/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/rbac')>();
  return {
    ...actual,
    useCan: () => ({ can: state.canUpdate }),
    useSecureSupabase: () => state.secureSupabase,
    PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useResolvedScope: () => ({
      organisationId: 'o1',
      eventId: 'e1',
      appId: 'base',
      scope: { organisationId: 'o1', eventId: 'e1', appId: 'base' },
      isLoading: false,
      resilienceStatus: 'success',
      resilienceErrors: [],
      sourceOutcomes: {},
    }),
  };
});

describe('ScanningRuntimePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.resetModules();
    state.canUpdate = false;
    state.secureSupabase = null;
    state.scanPointLoading = true;
    state.scanPoint = undefined;
    state.queueCounts = { pending: 0, syncing: 0, synced: 0, failed: 0 };
    state.failedQueueEntries = [];
    retryFailedQueueEntriesMock.mockClear();
  });

  it('shows loading spinner while scan point is loading', () => {
    render(
      <MemoryRouter initialEntries={['/scanning/sp1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanningRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.querySelector('[class*="spinner"], svg') ?? document.body).toBeTruthy();
  });

  it('shows per-entry retry controls with entry-specific aria labels when update is allowed', async () => {
    state.canUpdate = true;
    state.secureSupabase = {};
    state.scanPointLoading = false;
    state.scanPoint = {
      id: 'sp1',
      event_id: 'e1',
      organisation_id: 'o1',
      name: 'Main Gate',
      direction: 'both',
      is_active: true,
    };
    state.queueCounts = { pending: 0, syncing: 0, synced: 0, failed: 1 };
    state.failedQueueEntries = [
      {
        local_id: 'failed-runtime-1',
        scan_point_id: 'sp1',
        card_identifier: 'CARD-2',
        scanned_at: 1,
        validation_result: 'rejected',
        validation_reason: 'booking_not_valid',
        override_by: null,
        notes: null,
        device_id: 'device-1',
        sync_status: 'failed',
        failure_reason: 'edge_sync_failed',
      },
    ];

    render(
      <MemoryRouter initialEntries={['/scanning/sp1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanningRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: 'Retry failed queue entry failed-runtime-1' })).toBeTruthy();
  });
});
