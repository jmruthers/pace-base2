import { rpcErrorMessageText } from './bookingOverrideMessaging';
import type { BookingQueryRow, BookingStatus } from './types';

export function confirmedCountForSession(bookings: BookingQueryRow[], sessionId: string): number {
  return bookings.filter((b) => b.session_id === sessionId && b.status === 'confirmed').length;
}

export function isSessionAtCapacity(confirmedCount: number, capacity: number): boolean {
  if (!Number.isFinite(capacity) || capacity < 0) return false;
  return confirmedCount >= capacity;
}

export function shouldShowPromoteAction(status: BookingStatus, canUpdate: boolean): boolean {
  return canUpdate && status === 'waitlisted';
}

export function shouldShowCancelAction(status: BookingStatus, canDelete: boolean): boolean {
  return canDelete && (status === 'confirmed' || status === 'waitlisted');
}

export function isNonEmptyOverrideReason(text: string): boolean {
  return text.trim().length > 0;
}

/** Detect concurrent cancel / already-cancelled RPC error (§5). */
export function isBookingAlreadyCancelledError(error: unknown): boolean {
  return rpcErrorMessageText(error).includes('base_booking_already_cancelled');
}
