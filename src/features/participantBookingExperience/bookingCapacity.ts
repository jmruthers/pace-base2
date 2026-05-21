import type { ActivityBookingStatus, ParticipantSessionBooking, SessionBookingRecord } from './types';

const ACTIVE_BOOKING_STATUSES: ReadonlySet<ActivityBookingStatus> = new Set(['confirmed', 'waitlisted']);

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
