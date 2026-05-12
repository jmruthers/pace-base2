/* eslint-disable pace-core-compliance/max-named-exports */
import type {
  ActivityBookingStatus,
  BookingValidationResult,
  ConflictingSessionSummary,
} from './types';

export interface SessionTimeRange {
  session_id: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
}

export interface ParticipantSessionBooking {
  participant_id: string;
  session_id: string;
  status: ActivityBookingStatus;
}

export interface SessionBookingRecord {
  status: ActivityBookingStatus;
}

export type BookingProjectionErrorState = 'access_denied' | 'unknown_error';

const ACTIVE_BOOKING_STATUSES: ReadonlySet<ActivityBookingStatus> = new Set(['confirmed', 'waitlisted']);

export function computeBookingWindowOpen(
  bookingOpenAt: string | null,
  bookingCloseAt: string | null,
  nowIso: string = new Date().toISOString()
): boolean {
  if (bookingOpenAt == null && bookingCloseAt == null) {
    return true;
  }
  if (bookingOpenAt == null && bookingCloseAt != null) {
    return nowIso <= bookingCloseAt;
  }
  if (bookingOpenAt != null && bookingCloseAt == null) {
    return nowIso >= bookingOpenAt;
  }
  const openAt = bookingOpenAt as string;
  const closeAt = bookingCloseAt as string;
  return openAt <= nowIso && nowIso <= closeAt;
}

export function countConfirmedBookings(bookings: SessionBookingRecord[]): number {
  return bookings.filter((booking) => booking.status === 'confirmed').length;
}

export function computeCapacityFull(capacity: number, confirmedCount: number): boolean {
  return confirmedCount >= capacity;
}

export function computeWaitlistOpen(capacityFull: boolean, allowWaitlist: boolean): boolean {
  return capacityFull && allowWaitlist;
}

export function computeDuplicateBooking(
  bookings: ParticipantSessionBooking[],
  participantId: string,
  sessionId: string
): boolean {
  return bookings.some(
    (booking) =>
      booking.participant_id === participantId &&
      booking.session_id === sessionId &&
      ACTIVE_BOOKING_STATUSES.has(booking.status)
  );
}

export function rangesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function findConflictingSession(
  activeBookedSessions: SessionTimeRange[],
  targetSession: SessionTimeRange
): ConflictingSessionSummary | null {
  const conflict = activeBookedSessions.find(
    (candidate) =>
      candidate.session_id !== targetSession.session_id &&
      rangesOverlap(candidate.start_time, candidate.end_time, targetSession.start_time, targetSession.end_time)
  );
  if (conflict == null) {
    return null;
  }
  return {
    session_id: conflict.session_id,
    session_name: conflict.session_name,
    start_time: conflict.start_time,
  };
}

export function computeCancellable(status: ActivityBookingStatus, startTime: string, nowIso: string): boolean {
  return status === 'confirmed' && startTime > nowIso;
}

export function computeOnWaitlist(status: ActivityBookingStatus): boolean {
  return status === 'waitlisted';
}

export function computeCanBook(input: {
  bookingWindowOpen: boolean;
  capacityFull: boolean;
  waitlistOpen: boolean;
  duplicateBooking: boolean;
  sessionConflict: boolean;
  eligibilityDenied: boolean;
}): boolean {
  return (
    input.bookingWindowOpen &&
    (!input.capacityFull || input.waitlistOpen) &&
    !input.duplicateBooking &&
    !input.sessionConflict &&
    !input.eligibilityDenied
  );
}

export function buildBookingValidationResult(
  input: Omit<BookingValidationResult, 'canBook'> & { canBook?: boolean }
): BookingValidationResult {
  const canBook =
    input.canBook ??
    computeCanBook({
      bookingWindowOpen: input.bookingWindowOpen,
      capacityFull: input.capacityFull,
      waitlistOpen: input.waitlistOpen,
      duplicateBooking: input.duplicateBooking,
      sessionConflict: input.sessionConflict,
      eligibilityDenied: input.eligibilityDenied,
    });
  return { ...input, canBook };
}

export function mapBookingProjectionError(errorMessage: string): BookingProjectionErrorState {
  if (errorMessage === 'base_booking_access_denied') {
    return 'access_denied';
  }
  return 'unknown_error';
}
