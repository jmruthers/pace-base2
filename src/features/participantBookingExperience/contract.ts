import type {
  ActivityBookingStatus,
  BookingValidationResult,
  OfferingBrowseItem,
  SessionBrowseItem,
} from './types';
import type { ParticipantBookingItem } from './participantBookingTypes';
import { mapBookingProjectionError } from './bookingProjection';
import type { BookingProjectionErrorState } from './types';

const OFFERING_KEYS = [
  'id',
  'name',
  'description',
  'location_display',
  'booking_open_at',
  'booking_close_at',
  'bookingWindowOpen',
  'sessions',
] as const;

const SESSION_KEYS = [
  'id',
  'session_name',
  'start_time',
  'end_time',
  'location_display',
  'capacity',
  'allow_waitlist',
  'capacityFull',
  'waitlistOpen',
  'confirmedCount',
] as const;

const VALIDATION_KEYS = [
  'bookingWindowOpen',
  'capacityFull',
  'waitlistOpen',
  'duplicateBooking',
  'sessionConflict',
  'conflictingSession',
  'eligibilityDenied',
  'consentRequired',
  'consentText',
  'canBook',
] as const;

const CONFLICT_KEYS = ['session_id', 'session_name', 'start_time'] as const;

const BOOKING_KEYS = [
  'id',
  'session_id',
  'session_name',
  'start_time',
  'end_time',
  'offering_name',
  'status',
  'booked_at',
  'cancelled_at',
  'cancellable',
  'onWaitlist',
] as const;

const BOOKING_STATUSES: ReadonlySet<ActivityBookingStatus> = new Set(['confirmed', 'waitlisted', 'cancelled']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[], name: string): void {
  const actualKeys = Object.keys(value).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    actualKeys.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new Error(`${name} keys mismatch`);
  }
}

function assertString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be string`);
  }
  return value;
}

function assertNullableString(value: unknown, name: string): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${name} must be string or null`);
  }
  return value;
}

function assertBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be boolean`);
  }
  return value;
}

function assertNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${name} must be number`);
  }
  return value;
}

function assertStatus(value: unknown): ActivityBookingStatus {
  if (typeof value !== 'string' || !BOOKING_STATUSES.has(value as ActivityBookingStatus)) {
    throw new Error('status must be confirmed, waitlisted, or cancelled');
  }
  return value as ActivityBookingStatus;
}

function parseSessionBrowseItem(payload: unknown): SessionBrowseItem {
  if (!isRecord(payload)) {
    throw new Error('SessionBrowseItem must be object');
  }
  assertExactKeys(payload, SESSION_KEYS, 'SessionBrowseItem');
  return {
    id: assertString(payload.id, 'id'),
    session_name: assertNullableString(payload.session_name, 'session_name'),
    start_time: assertString(payload.start_time, 'start_time'),
    end_time: assertString(payload.end_time, 'end_time'),
    location_display: assertNullableString(payload.location_display, 'location_display'),
    capacity: assertNumber(payload.capacity, 'capacity'),
    allow_waitlist: assertBoolean(payload.allow_waitlist, 'allow_waitlist'),
    capacityFull: assertBoolean(payload.capacityFull, 'capacityFull'),
    waitlistOpen: assertBoolean(payload.waitlistOpen, 'waitlistOpen'),
    confirmedCount: assertNumber(payload.confirmedCount, 'confirmedCount'),
  };
}

function parseOfferingBrowseItem(payload: unknown): OfferingBrowseItem {
  if (!isRecord(payload)) {
    throw new Error('OfferingBrowseItem must be object');
  }
  assertExactKeys(payload, OFFERING_KEYS, 'OfferingBrowseItem');
  if (!Array.isArray(payload.sessions)) {
    throw new Error('sessions must be array');
  }
  return {
    id: assertString(payload.id, 'id'),
    name: assertString(payload.name, 'name'),
    description: assertNullableString(payload.description, 'description'),
    location_display: assertNullableString(payload.location_display, 'location_display'),
    booking_open_at: assertNullableString(payload.booking_open_at, 'booking_open_at'),
    booking_close_at: assertNullableString(payload.booking_close_at, 'booking_close_at'),
    bookingWindowOpen: assertBoolean(payload.bookingWindowOpen, 'bookingWindowOpen'),
    sessions: payload.sessions.map(parseSessionBrowseItem),
  };
}

export function parseOfferingBrowseItems(payload: unknown): OfferingBrowseItem[] {
  if (!Array.isArray(payload)) {
    throw new Error('Offering browse payload must be array');
  }
  return payload.map(parseOfferingBrowseItem);
}

export function parseBookingValidationResult(payload: unknown): BookingValidationResult {
  if (!isRecord(payload)) {
    throw new Error('BookingValidationResult must be object');
  }
  assertExactKeys(payload, VALIDATION_KEYS, 'BookingValidationResult');

  const conflictPayload = payload.conflictingSession;
  let conflictingSession: BookingValidationResult['conflictingSession'] = null;
  if (conflictPayload != null) {
    if (!isRecord(conflictPayload)) {
      throw new Error('conflictingSession must be object or null');
    }
    assertExactKeys(conflictPayload, CONFLICT_KEYS, 'conflictingSession');
    conflictingSession = {
      session_id: assertString(conflictPayload.session_id, 'conflictingSession.session_id'),
      session_name: assertNullableString(conflictPayload.session_name, 'conflictingSession.session_name'),
      start_time: assertString(conflictPayload.start_time, 'conflictingSession.start_time'),
    };
  }

  return {
    bookingWindowOpen: assertBoolean(payload.bookingWindowOpen, 'bookingWindowOpen'),
    capacityFull: assertBoolean(payload.capacityFull, 'capacityFull'),
    waitlistOpen: assertBoolean(payload.waitlistOpen, 'waitlistOpen'),
    duplicateBooking: assertBoolean(payload.duplicateBooking, 'duplicateBooking'),
    sessionConflict: assertBoolean(payload.sessionConflict, 'sessionConflict'),
    conflictingSession,
    eligibilityDenied: assertBoolean(payload.eligibilityDenied, 'eligibilityDenied'),
    consentRequired: assertBoolean(payload.consentRequired, 'consentRequired'),
    consentText: assertNullableString(payload.consentText, 'consentText'),
    canBook: assertBoolean(payload.canBook, 'canBook'),
  };
}

function parseParticipantBookingItem(payload: unknown): ParticipantBookingItem {
  if (!isRecord(payload)) {
    throw new Error('ParticipantBookingItem must be object');
  }
  assertExactKeys(payload, BOOKING_KEYS, 'ParticipantBookingItem');
  return {
    id: assertString(payload.id, 'id'),
    session_id: assertString(payload.session_id, 'session_id'),
    session_name: assertNullableString(payload.session_name, 'session_name'),
    start_time: assertString(payload.start_time, 'start_time'),
    end_time: assertString(payload.end_time, 'end_time'),
    offering_name: assertString(payload.offering_name, 'offering_name'),
    status: assertStatus(payload.status),
    booked_at: assertString(payload.booked_at, 'booked_at'),
    cancelled_at: assertNullableString(payload.cancelled_at, 'cancelled_at'),
    cancellable: assertBoolean(payload.cancellable, 'cancellable'),
    onWaitlist: assertBoolean(payload.onWaitlist, 'onWaitlist'),
  };
}

export function parseParticipantBookingItems(payload: unknown): ParticipantBookingItem[] {
  if (!Array.isArray(payload)) {
    throw new Error('Participant booking payload must be array');
  }
  return payload.map(parseParticipantBookingItem);
}

export function parseBookingProjectionErrorState(errorMessage: unknown): BookingProjectionErrorState {
  if (typeof errorMessage !== 'string') {
    return 'unknown_error';
  }
  return mapBookingProjectionError(errorMessage);
}
