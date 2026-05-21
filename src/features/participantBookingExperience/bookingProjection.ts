import type {
  ActivityBookingStatus,
  BookingProjectionErrorState,
  BookingValidationResult,
  ConflictingSessionSummary,
  SessionTimeRange,
} from './types';

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
