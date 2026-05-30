// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast as paceToast } from '@solvera/pace-core/components';
import { mapBookingToTableRow } from '@/features/bookingOversight/display';
import type { BookingOverrideIntent } from '@/features/bookingOversight/bookOnBehalfForm';
import type { BookingQueryRow, BookingTableRow } from '@/features/bookingOversight/types';
import {
  useBookingsPageBookingHandlers,
  type BookingsPageBookingHandlersDeps,
} from './useBookingsPageBookingHandlers';

vi.mock('@solvera/pace-core/components', () => ({
  toast: vi.fn(),
}));

vi.mock('@solvera/pace-core/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/utils')>();
  return {
    ...actual,
    NormalizeSupabaseError: (error: unknown) => ({
      message: error instanceof Error ? error.message : String(error),
    }),
  };
});

const paceToastMock = vi.mocked(paceToast);

const baseBookingRow: BookingQueryRow = {
  id: 'book-1',
  event_id: 'event-1',
  organisation_id: 'org-1',
  session_id: 'sess-1',
  application_id: 'app-1',
  status: 'waitlisted',
  source: 'self',
  booked_at: '2026-05-01T10:00:00.000Z',
  cancelled_at: null,
  session: {
    id: 'sess-1',
    session_name: 'Morning',
    start_time: '2026-05-01T09:00:00.000Z',
    end_time: null,
    capacity: 1,
    offering: { id: 'off-1', name: 'Climb' },
  },
  application: {
    id: 'app-1',
    person: { preferred_name: 'Sam', first_name: 'Sam', last_name: 'Lee' },
  },
};

function buildTableRow(row: BookingQueryRow = baseBookingRow): BookingTableRow {
  return mapBookingToTableRow(row, 'UTC');
}

function buildDeps(overrides?: Partial<BookingsPageBookingHandlersDeps>): BookingsPageBookingHandlersDeps {
  return {
    userId: 'user-1',
    eventId: 'event-1',
    organisationId: 'org-1',
    eventTimezone: 'UTC',
    rawBookings: [baseBookingRow],
    applicationsData: [{ id: 'app-1', status: 'approved', person: baseBookingRow.application!.person! }],
    sessionsData: [
      {
        id: 'sess-1',
        session_name: 'Morning',
        start_time: '2026-05-01T09:00:00.000Z',
        end_time: null,
        capacity: 1,
        offering_id: 'off-1',
        offering: { id: 'off-1', name: 'Climb' },
      },
    ],
    cancelTarget: null,
    promoteTarget: null,
    overrideIntent: null,
    overrideReason: '',
    runCreateBooking: vi.fn(async () => undefined),
    cancelMutationMutateAsync: vi.fn(async () => undefined),
    invalidateBookingsQueries: vi.fn(),
    setBookOnBehalfOpen: vi.fn(),
    setBookFormKey: vi.fn(),
    setOverrideOpen: vi.fn(),
    setOverrideReason: vi.fn(),
    setOverrideIntent: vi.fn(),
    setCancelTarget: vi.fn(),
    setPromoteTarget: vi.fn(),
    ...overrides,
  };
}

describe('BA11 useBookingsPageBookingHandlers', () => {
  beforeEach(() => {
    paceToastMock.mockClear();
  });

  it('creates booking on valid submit without override flags', async () => {
    const runCreateBooking = vi.fn(async () => undefined);
    const setBookOnBehalfOpen = vi.fn();
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(buildDeps({ runCreateBooking, setBookOnBehalfOpen }))
    );

    await act(async () => {
      await result.current.onCreateValidSubmit({
        application_id: 'app-1',
        session_id: 'sess-1',
        override_capacity: false,
        override_window: false,
        override_conflict: false,
      });
    });

    expect(runCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        p_application_id: 'app-1',
        p_session_id: 'sess-1',
        p_override_reason: null,
        p_override_by: null,
      })
    );
    expect(paceToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Booking created', variant: 'success' })
    );
    expect(setBookOnBehalfOpen).toHaveBeenCalledWith(false);
  });

  it('opens override dialog when create fails with capacity-full error', async () => {
    const runCreateBooking = vi.fn(async () => {
      throw new Error('base_booking_capacity_full');
    });
    const setOverrideIntent = vi.fn();
    const setOverrideOpen = vi.fn();
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(
        buildDeps({ runCreateBooking, setOverrideIntent, setOverrideOpen })
      )
    );

    await act(async () => {
      await result.current.onCreateValidSubmit({
        application_id: 'app-1',
        session_id: 'sess-1',
        override_capacity: false,
        override_window: false,
        override_conflict: false,
      });
    });

    expect(setOverrideIntent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'create', p_override_capacity: true })
    );
    expect(setOverrideOpen).toHaveBeenCalledWith(true);
  });

  it('does not confirm override when reason is empty', async () => {
    const runCreateBooking = vi.fn(async () => undefined);
    const overrideIntent: BookingOverrideIntent = {
      kind: 'create',
      title: 'Override',
      confirmationBody: 'Confirm',
      confirmLabel: 'Book with override',
      eventId: 'event-1',
      organisationId: 'org-1',
      applicationId: 'app-1',
      sessionId: 'sess-1',
      p_override_capacity: true,
      p_override_window: false,
      p_override_conflict: false,
    };
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(
        buildDeps({ runCreateBooking, overrideIntent, overrideReason: '   ' })
      )
    );

    await act(async () => {
      await result.current.onOverrideConfirm();
    });

    expect(runCreateBooking).not.toHaveBeenCalled();
  });

  it('confirms create override with trimmed reason and user id', async () => {
    const runCreateBooking = vi.fn(async () => undefined);
    const setOverrideOpen = vi.fn();
    const overrideIntent: BookingOverrideIntent = {
      kind: 'create',
      title: 'Override',
      confirmationBody: 'Confirm',
      confirmLabel: 'Book with override',
      eventId: 'event-1',
      organisationId: 'org-1',
      applicationId: 'app-1',
      sessionId: 'sess-1',
      p_override_capacity: true,
      p_override_window: false,
      p_override_conflict: false,
    };
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(
        buildDeps({
          runCreateBooking,
          setOverrideOpen,
          overrideIntent,
          overrideReason: '  capacity exception  ',
        })
      )
    );

    await act(async () => {
      await result.current.onOverrideConfirm();
    });

    expect(runCreateBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        p_override_reason: 'capacity exception',
        p_override_by: 'user-1',
        p_override_capacity: true,
      })
    );
    expect(setOverrideOpen).toHaveBeenCalledWith(false);
  });

  it('opens promote override when session is already at capacity', async () => {
    const confirmedRow: BookingQueryRow = {
      ...baseBookingRow,
      id: 'book-2',
      status: 'confirmed',
      application_id: 'app-2',
    };
    const setOverrideIntent = vi.fn();
    const setOverrideOpen = vi.fn();
    const setPromoteTarget = vi.fn();
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(
        buildDeps({
          rawBookings: [baseBookingRow, confirmedRow],
          promoteTarget: buildTableRow(),
          setOverrideIntent,
          setOverrideOpen,
          setPromoteTarget,
        })
      )
    );

    await act(async () => {
      await result.current.onConfirmPromote();
    });

    expect(setOverrideIntent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'promote', p_override_capacity: true })
    );
    expect(setOverrideOpen).toHaveBeenCalledWith(true);
    expect(setPromoteTarget).toHaveBeenCalledWith(null);
  });

  it('cancels booking with actor id on confirm', async () => {
    const cancelMutationMutateAsync = vi.fn(async () => undefined);
    const setCancelTarget = vi.fn();
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(
        buildDeps({
          cancelMutationMutateAsync,
          cancelTarget: buildTableRow(),
          setCancelTarget,
        })
      )
    );

    await act(async () => {
      await result.current.onConfirmCancelBooking();
    });

    expect(cancelMutationMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        p_booking_id: 'book-1',
        p_cancelled_by: 'user-1',
      })
    );
    expect(setCancelTarget).toHaveBeenCalledWith(null);
  });

  it('handles already-cancelled booking on cancel confirm', async () => {
    const cancelMutationMutateAsync = vi.fn(async () => {
      throw new Error('base_booking_already_cancelled');
    });
    const invalidateBookingsQueries = vi.fn();
    const setCancelTarget = vi.fn();
    const { result } = renderHook(() =>
      useBookingsPageBookingHandlers(
        buildDeps({
          cancelMutationMutateAsync,
          invalidateBookingsQueries,
          cancelTarget: buildTableRow(),
          setCancelTarget,
        })
      )
    );

    await act(async () => {
      await result.current.onConfirmCancelBooking();
    });

    expect(paceToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'This booking has already been cancelled.' })
    );
    expect(invalidateBookingsQueries).toHaveBeenCalled();
    expect(setCancelTarget).toHaveBeenCalledWith(null);
  });
});
