// @vitest-environment jsdom
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanningRuntimePage } from './ScanningRuntimePage';
import type { ScanningRuntimePanelState } from './scanningRuntimePageTypes';

const state = vi.hoisted(() => ({
  canUpdate: false,
  secureSupabase: null as unknown,
  scanPointLoading: true,
  scanPoint: undefined as Record<string, unknown> | undefined,
  queueCounts: { pending: 0, syncing: 0, synced: 0, failed: 0 },
  failedQueueEntries: [] as Array<Record<string, unknown>>,
}));

const retryFailedQueueEntriesMock = vi.hoisted(() => vi.fn(async () => ({ retried: 1, skippedManualNoCard: 0 })));

const controllerState = vi.hoisted(() => ({
  useMockController: false,
  panel: { kind: 'idle' } as ScanningRuntimePanelState,
}));

vi.mock('@/hooks/scanning/useScanningRuntimePageController', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/scanning/useScanningRuntimePageController')>();
  return {
  useScanningRuntimePageController: () => {
    if (!controllerState.useMockController) {
      return actual.useScanningRuntimePageController();
    }
    return {
      status: 'ready' as const,
      cardInputRef: { current: null },
      surface: {
        navigate: vi.fn(),
        scanPoint: {
          id: 'sp1',
          name: 'Main Gate',
          context_type: 'site',
          direction: 'in',
          resource_type: null,
          resource_id: null,
          is_active: true,
          event_id: 'e1',
          organisation_id: 'o1',
        },
        eventName: 'Event',
        eventTz: 'UTC',
        queueCounts: { pending: 0, syncing: 0, synced: 0, failed: 0 },
        failedQueueEntries: [],
        handleRetryFailed: vi.fn(),
        cardValue: '',
        setCardValue: vi.fn(),
        panel: controllerState.panel,
        validationDisabled: false,
        showResultPanel: controllerState.panel.kind === 'accepted',
        formatScanned: () => 'scanned',
        handleDismiss: vi.fn(),
        canUpdateScanning: false,
        pendingOverride: null,
        overrideDialogOpenChange: vi.fn(),
        overrideOpen: false,
        overrideNotes: '',
        setOverrideNotes: vi.fn(),
        handleConfirmOverride: vi.fn(),
        focusInput: vi.fn(),
        showNotesCounter: false,
        onKeyDown: vi.fn(),
        manualOpen: false,
        setManualOpen: vi.fn(),
        manualSearch: '',
        setManualSearch: vi.fn(),
        manualNotes: '',
        setManualNotes: vi.fn(),
        manualSelected: null,
        setManualSelected: vi.fn(),
        visibleManualResults: [],
        manualListEligible: false,
        recordManualScan: vi.fn(),
        showManualNotesCounter: false,
      },
    };
  },
  };
});

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

const guardState = vi.hoisted(() => ({
  pageName: null as string | null,
}));

vi.mock('@solvera/pace-core/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/rbac')>();
  return {
    ...actual,
    useCan: () => ({ can: state.canUpdate }),
    useSecureSupabase: () => state.secureSupabase,
    PagePermissionGuard: ({
      pageName,
      children,
    }: {
      pageName?: string;
      children: React.ReactNode;
    }) => {
      guardState.pageName = pageName ?? null;
      return <>{children}</>;
    },
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
    guardState.pageName = null;
    controllerState.useMockController = false;
    controllerState.panel = { kind: 'idle' };
    retryFailedQueueEntriesMock.mockClear();
  });

  it('gates the route with scanning-runtime read permission', () => {
    render(
      <MemoryRouter initialEntries={['/scanning/sp1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanningRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(guardState.pageName).toBe('ScanningRuntimePage');
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

  it('shows accepted result panel when controller reports successful scan', () => {
    controllerState.useMockController = true;
    controllerState.panel = { kind: 'accepted', name: 'Alex Example', scannedAt: 100 };
    state.secureSupabase = {};
    state.scanPointLoading = false;

    render(
      <MemoryRouter initialEntries={['/scanning/sp1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanningRuntimePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.getByText('Alex Example')).toBeTruthy();
  });
});
