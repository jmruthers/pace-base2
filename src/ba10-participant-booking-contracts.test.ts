import { describe, expect, it } from 'vitest';
import type { BookingValidationResult } from './features/participantBookingExperience/types';
import type { ParticipantBookingItem } from './features/participantBookingExperience/participantBookingTypes';
import { buildBookingValidationResult, mapBookingProjectionError } from './features/participantBookingExperience/bookingProjection';
import {
  parseBookingProjectionErrorState,
  parseBookingValidationResult,
} from './features/participantBookingExperience/contract';

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

const PARTICIPANT_BOOKING_KEYS = [
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

function assertExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): void {
  expect(Object.keys(value).sort()).toEqual([...expectedKeys].sort());
}

function readValidationProjection(payload: unknown): { ok: true; data: BookingValidationResult } | {
  ok: false;
  state: 'access_denied' | 'unknown_error';
} {
  if (payload != null && typeof payload === 'object' && 'error' in payload) {
    const errorMessage = (payload as { error?: unknown }).error;
    return { ok: false, state: parseBookingProjectionErrorState(errorMessage) };
  }
  return { ok: true, data: parseBookingValidationResult(payload) };
}

describe('BA10 participant booking contracts', () => {
  it('returns all validation failure classes together in a single response', () => {
    const result: BookingValidationResult = buildBookingValidationResult({
      bookingWindowOpen: false,
      capacityFull: true,
      waitlistOpen: false,
      duplicateBooking: true,
      sessionConflict: true,
      conflictingSession: {
        session_id: 'session-2',
        session_name: 'Conflicting Session',
        start_time: '2026-05-12T10:00:00.000Z',
      },
      eligibilityDenied: true,
      consentRequired: true,
      consentText: 'Verbatim consent text',
    });

    assertExactKeys(result as unknown as Record<string, unknown>, VALIDATION_KEYS);
    expect(result).toEqual({
      bookingWindowOpen: false,
      capacityFull: true,
      waitlistOpen: false,
      duplicateBooking: true,
      sessionConflict: true,
      conflictingSession: {
        session_id: 'session-2',
        session_name: 'Conflicting Session',
        start_time: '2026-05-12T10:00:00.000Z',
      },
      eligibilityDenied: true,
      consentRequired: true,
      consentText: 'Verbatim consent text',
      canBook: false,
    });
  });

  it('keeps canBook true when waitlist is open and all other conditions pass', () => {
    const result = buildBookingValidationResult({
      bookingWindowOpen: true,
      capacityFull: true,
      waitlistOpen: true,
      duplicateBooking: false,
      sessionConflict: false,
      conflictingSession: null,
      eligibilityDenied: false,
      consentRequired: false,
      consentText: null,
    });
    expect(result.canBook).toBe(true);
  });

  it('maps projection denial error message to stable access_denied state', () => {
    expect(mapBookingProjectionError('base_booking_access_denied')).toBe('access_denied');
    expect(mapBookingProjectionError('different_error')).toBe('unknown_error');
  });

  it('maps denied contract-call payload to access_denied state', () => {
    const result = readValidationProjection({ error: 'base_booking_access_denied' });
    expect(result).toEqual({ ok: false, state: 'access_denied' });
  });

  it('parses multi-failure validation payload through contract boundary', () => {
    const result = readValidationProjection({
      bookingWindowOpen: false,
      capacityFull: true,
      waitlistOpen: false,
      duplicateBooking: true,
      sessionConflict: true,
      conflictingSession: {
        session_id: 'session-2',
        session_name: 'Conflict',
        start_time: '2026-05-12T10:00:00.000Z',
      },
      eligibilityDenied: true,
      consentRequired: true,
      consentText: 'Consent required verbatim text',
      canBook: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.consentRequired).toBe(true);
      expect(result.data.consentText).toBe('Consent required verbatim text');
      expect(result.data.duplicateBooking).toBe(true);
      expect(result.data.sessionConflict).toBe(true);
      expect(result.data.eligibilityDenied).toBe(true);
    }
  });

  it('enforces participant booking payload key allow-list shape', () => {
    const item: ParticipantBookingItem = {
      id: 'booking-1',
      session_id: 'session-1',
      session_name: 'Session Name',
      start_time: '2026-05-12T10:00:00.000Z',
      end_time: '2026-05-12T11:00:00.000Z',
      offering_name: 'Climbing',
      status: 'waitlisted',
      booked_at: '2026-05-10T10:00:00.000Z',
      cancelled_at: null,
      cancellable: false,
      onWaitlist: true,
    };

    assertExactKeys(item as unknown as Record<string, unknown>, PARTICIPANT_BOOKING_KEYS);
    expect(item.status).toBe('waitlisted');
    expect(item.onWaitlist).toBe(true);
  });
});
