// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@solvera/pace-core/types';
import { validateScan } from '@/features/scanningRuntime/validation/validateScan';
import { useScanningRuntimeProcessScan } from './useScanningRuntimeProcessScan';
import type { ScanningRuntimePanelState } from '@/pages/scanning/scanningRuntimePageTypes';

vi.mock('@/features/scanningRuntime/validation/validateScan', () => ({
  validateScan: vi.fn(),
}));

const validateScanMock = vi.mocked(validateScan);

const activeScanPoint = {
  id: 'sp1',
  name: 'Gate',
  context_type: 'site' as const,
  direction: 'in' as const,
  resource_type: null,
  resource_id: null,
  is_active: true,
  event_id: 'e1',
  organisation_id: 'o1',
};

describe('BA13 useScanningRuntimeProcessScan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not process when scan point is inactive', async () => {
    const setPanel = vi.fn();
    const writeQueueOrToast = vi.fn();

    const { result } = renderHook(() =>
      useScanningRuntimeProcessScan({
        scanGenRef: { current: 0 },
        secureSupabase: {} as never,
        scanPoint: { ...activeScanPoint, is_active: false },
        eventId: 'e1',
        writeQueueOrToast,
        setPanel,
        setCardValue: vi.fn(),
        setPendingOverride: vi.fn(),
      })
    );

    await act(async () => {
      await result.current('CARD-1');
    });

    expect(validateScanMock).not.toHaveBeenCalled();
    expect(writeQueueOrToast).not.toHaveBeenCalled();
  });

  it('sets accepted panel after successful validation and queue write', async () => {
    validateScanMock.mockResolvedValue(
      ok({
        kind: 'accepted',
        participantName: 'Alex Example',
        scannedAt: 100,
        cardIdentifier: 'CARD-1',
      })
    );
    const setPanel = vi.fn();
    const writeQueueOrToast = vi.fn(async () => true);

    const { result } = renderHook(() =>
      useScanningRuntimeProcessScan({
        scanGenRef: { current: 0 },
        secureSupabase: {} as never,
        scanPoint: activeScanPoint,
        eventId: 'e1',
        writeQueueOrToast,
        setPanel,
        setCardValue: vi.fn(),
        setPendingOverride: vi.fn(),
      })
    );

    await act(async () => {
      await result.current('CARD-1');
    });

    expect(validateScanMock).toHaveBeenCalled();
    expect(writeQueueOrToast).toHaveBeenCalled();
    const lastPanel = setPanel.mock.calls.at(-1)?.[0] as ScanningRuntimePanelState;
    expect(lastPanel).toEqual({ kind: 'accepted', name: 'Alex Example', scannedAt: 100 });
  });

  it('sets rejected panel and pending override on validation rejection', async () => {
    validateScanMock.mockResolvedValue(
      ok({
        kind: 'rejected',
        participantName: 'Sam',
        reason: 'booking_not_valid',
        scannedAt: 200,
        cardIdentifier: 'CARD-2',
      })
    );
    const setPanel = vi.fn();
    const setPendingOverride = vi.fn();
    const writeQueueOrToast = vi.fn(async () => true);

    const { result } = renderHook(() =>
      useScanningRuntimeProcessScan({
        scanGenRef: { current: 0 },
        secureSupabase: {} as never,
        scanPoint: activeScanPoint,
        eventId: 'e1',
        writeQueueOrToast,
        setPanel,
        setCardValue: vi.fn(),
        setPendingOverride,
      })
    );

    await act(async () => {
      await result.current('CARD-2');
    });

    const lastPanel = setPanel.mock.calls.at(-1)?.[0] as ScanningRuntimePanelState;
    expect(lastPanel.kind).toBe('rejected');
    expect(setPendingOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'booking_not_valid',
        cardIdentifier: 'CARD-2',
      })
    );
  });

  it('sets eligibility_error panel when validateScan returns API error', async () => {
    validateScanMock.mockResolvedValue({
      ok: false,
      error: { code: 'scan_failed', message: 'Validation unavailable' },
    });
    const setPanel = vi.fn();

    const { result } = renderHook(() =>
      useScanningRuntimeProcessScan({
        scanGenRef: { current: 0 },
        secureSupabase: {} as never,
        scanPoint: activeScanPoint,
        eventId: 'e1',
        writeQueueOrToast: vi.fn(),
        setPanel,
        setCardValue: vi.fn(),
        setPendingOverride: vi.fn(),
      })
    );

    await act(async () => {
      await result.current('CARD-3');
    });

    const lastPanel = setPanel.mock.calls.at(-1)?.[0] as ScanningRuntimePanelState;
    expect(lastPanel).toEqual({
      kind: 'eligibility_error',
      message: 'Validation unavailable',
      scannedAt: expect.any(Number),
    });
  });
});
