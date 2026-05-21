import { describe, expect, it } from 'vitest';
import {
  computeCapacityFull,
  computeDuplicateBooking,
  computeWaitlistOpen,
  countConfirmedBookings,
} from './bookingCapacity';
import {
  buildBookingValidationResult,
  computeBookingWindowOpen,
  computeCancellable,
  computeCanBook,
  computeOnWaitlist,
  findConflictingSession,
  rangesOverlap,
} from './bookingProjection';

describe('BA10 booking window projection', () => {
  const nowIso = '2026-05-12T10:00:00.000Z';

  it('returns open when both boundaries are null', () => {
    expect(computeBookingWindowOpen(null, null, nowIso)).toBe(true);
  });

  it('returns open with null open boundary and future close boundary', () => {
    expect(computeBookingWindowOpen(null, '2026-05-12T11:00:00.000Z', nowIso)).toBe(true);
  });

  it('returns closed with null open boundary and past close boundary', () => {
    expect(computeBookingWindowOpen(null, '2026-05-12T09:00:00.000Z', nowIso)).toBe(false);
  });

  it('returns open with past open boundary and null close boundary', () => {
    expect(computeBookingWindowOpen('2026-05-12T09:00:00.000Z', null, nowIso)).toBe(true);
  });

  it('returns closed with future open boundary and null close boundary', () => {
    expect(computeBookingWindowOpen('2026-05-12T11:00:00.000Z', null, nowIso)).toBe(false);
  });

  it('returns open within a bounded window and closed outside', () => {
    expect(computeBookingWindowOpen('2026-05-12T09:00:00.000Z', '2026-05-12T11:00:00.000Z', nowIso)).toBe(true);
    expect(computeBookingWindowOpen('2026-05-12T09:00:00.000Z', '2026-05-12T09:30:00.000Z', nowIso)).toBe(false);
  });
});

describe('BA10 capacity and waitlist projection', () => {
  it('counts only confirmed bookings toward capacity', () => {
    expect(
      countConfirmedBookings([
        { status: 'confirmed' },
        { status: 'waitlisted' },
        { status: 'cancelled' },
        { status: 'confirmed' },
      ])
    ).toBe(2);
  });

  it('sets capacityFull when confirmed count reaches or exceeds capacity', () => {
    expect(computeCapacityFull(2, 2)).toBe(true);
    expect(computeCapacityFull(2, 3)).toBe(true);
    expect(computeCapacityFull(2, 1)).toBe(false);
  });

  it('opens waitlist only when capacity is full and offering allows waitlist', () => {
    expect(computeWaitlistOpen(true, true)).toBe(true);
    expect(computeWaitlistOpen(true, false)).toBe(false);
    expect(computeWaitlistOpen(false, true)).toBe(false);
  });
});

describe('BA10 duplicate and conflict detection', () => {
  it('detects duplicate bookings for confirmed or waitlisted statuses only', () => {
    expect(
      computeDuplicateBooking(
        [
          { participant_id: 'p-1', session_id: 's-1', status: 'confirmed' },
          { participant_id: 'p-1', session_id: 's-2', status: 'cancelled' },
        ],
        'p-1',
        's-1'
      )
    ).toBe(true);

    expect(
      computeDuplicateBooking([{ participant_id: 'p-1', session_id: 's-1', status: 'waitlisted' }], 'p-1', 's-1')
    ).toBe(true);

    expect(
      computeDuplicateBooking([{ participant_id: 'p-1', session_id: 's-1', status: 'cancelled' }], 'p-1', 's-1')
    ).toBe(false);
  });

  it('detects overlap conflicts but not non-overlap or adjacent sessions', () => {
    expect(
      rangesOverlap(
        '2026-05-12T10:00:00.000Z',
        '2026-05-12T11:00:00.000Z',
        '2026-05-12T10:30:00.000Z',
        '2026-05-12T11:30:00.000Z'
      )
    ).toBe(true);

    expect(
      rangesOverlap(
        '2026-05-12T10:00:00.000Z',
        '2026-05-12T11:00:00.000Z',
        '2026-05-12T11:00:00.000Z',
        '2026-05-12T12:00:00.000Z'
      )
    ).toBe(false);
  });

  it('returns conflicting session summary with required fields', () => {
    expect(
      findConflictingSession(
        [
          {
            session_id: 's-1',
            session_name: 'Morning',
            start_time: '2026-05-12T10:00:00.000Z',
            end_time: '2026-05-12T11:00:00.000Z',
          },
          {
            session_id: 's-2',
            session_name: 'Afternoon',
            start_time: '2026-05-12T13:00:00.000Z',
            end_time: '2026-05-12T14:00:00.000Z',
          },
        ],
        {
          session_id: 's-3',
          session_name: 'Target',
          start_time: '2026-05-12T10:30:00.000Z',
          end_time: '2026-05-12T11:30:00.000Z',
        }
      )
    ).toEqual({
      session_id: 's-1',
      session_name: 'Morning',
      start_time: '2026-05-12T10:00:00.000Z',
    });

    expect(
      findConflictingSession(
        [
          {
            session_id: 's-1',
            session_name: 'Morning',
            start_time: '2026-05-12T10:00:00.000Z',
            end_time: '2026-05-12T11:00:00.000Z',
          },
        ],
        {
          session_id: 's-2',
          session_name: 'Target',
          start_time: '2026-05-12T11:00:00.000Z',
          end_time: '2026-05-12T12:00:00.000Z',
        }
      )
    ).toBeNull();
  });
});

describe('BA10 cancellation and canBook derivation', () => {
  const nowIso = '2026-05-12T10:00:00.000Z';

  it('computes cancellable for status x timing combinations', () => {
    expect(computeCancellable('confirmed', '2026-05-12T11:00:00.000Z', nowIso)).toBe(true);
    expect(computeCancellable('confirmed', '2026-05-12T10:00:00.000Z', nowIso)).toBe(false);
    expect(computeCancellable('confirmed', '2026-05-12T09:00:00.000Z', nowIso)).toBe(false);
    expect(computeCancellable('waitlisted', '2026-05-12T11:00:00.000Z', nowIso)).toBe(false);
    expect(computeCancellable('cancelled', '2026-05-12T11:00:00.000Z', nowIso)).toBe(false);
  });

  it('computes onWaitlist from booking status', () => {
    expect(computeOnWaitlist('waitlisted')).toBe(true);
    expect(computeOnWaitlist('confirmed')).toBe(false);
  });

  it('derives canBook from server-evaluable conditions', () => {
    expect(
      computeCanBook({
        bookingWindowOpen: true,
        capacityFull: false,
        waitlistOpen: false,
        duplicateBooking: false,
        sessionConflict: false,
        eligibilityDenied: false,
      })
    ).toBe(true);

    expect(
      computeCanBook({
        bookingWindowOpen: true,
        capacityFull: true,
        waitlistOpen: true,
        duplicateBooking: false,
        sessionConflict: false,
        eligibilityDenied: false,
      })
    ).toBe(true);

    expect(
      computeCanBook({
        bookingWindowOpen: false,
        capacityFull: false,
        waitlistOpen: false,
        duplicateBooking: false,
        sessionConflict: false,
        eligibilityDenied: false,
      })
    ).toBe(false);
  });

  it('builds validation result with derived canBook when omitted', () => {
    const result = buildBookingValidationResult({
      bookingWindowOpen: true,
      capacityFull: false,
      waitlistOpen: false,
      duplicateBooking: false,
      sessionConflict: false,
      conflictingSession: null,
      eligibilityDenied: false,
      consentRequired: true,
      consentText: 'I agree',
    });
    expect(result.canBook).toBe(true);
  });
});
