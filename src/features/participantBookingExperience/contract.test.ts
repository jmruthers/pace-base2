import { describe, expect, it } from 'vitest';
import {
  parseBookingProjectionErrorState,
  parseBookingValidationResult,
  parseOfferingBrowseItems,
  parseParticipantBookingItems,
} from './contract';

describe('BA10 contract parsers', () => {
  it('parses offering browse payload with nested sessions', () => {
    const parsed = parseOfferingBrowseItems([
      {
        id: 'offering-1',
        name: 'Climbing',
        description: null,
        location_display: 'North Wall',
        booking_open_at: null,
        booking_close_at: null,
        bookingWindowOpen: true,
        sessions: [
          {
            id: 'session-1',
            session_name: 'Morning',
            start_time: '2026-05-12T10:00:00.000Z',
            end_time: '2026-05-12T11:00:00.000Z',
            location_display: null,
            capacity: 20,
            allow_waitlist: true,
            capacityFull: false,
            waitlistOpen: false,
            confirmedCount: 3,
          },
        ],
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].sessions).toHaveLength(1);
    expect(parsed[0].sessions[0].capacity).toBe(20);
  });

  it('rejects offering payload with forbidden extra keys', () => {
    expect(() =>
      parseOfferingBrowseItems([
        {
          id: 'offering-1',
          name: 'Climbing',
          description: null,
          location_display: 'North Wall',
          booking_open_at: null,
          booking_close_at: null,
          bookingWindowOpen: true,
          sessions: [],
          extra: 'forbidden',
        },
      ])
    ).toThrow(/keys mismatch/);
  });

  it('parses booking validation payload with conflict object', () => {
    const parsed = parseBookingValidationResult({
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
      consentText: 'Consent text',
      canBook: false,
    });

    expect(parsed.sessionConflict).toBe(true);
    expect(parsed.conflictingSession?.session_id).toBe('session-2');
  });

  it('rejects validation payload with wrong field type', () => {
    expect(() =>
      parseBookingValidationResult({
        bookingWindowOpen: 'false',
        capacityFull: true,
        waitlistOpen: false,
        duplicateBooking: true,
        sessionConflict: true,
        conflictingSession: null,
        eligibilityDenied: true,
        consentRequired: true,
        consentText: 'Consent text',
        canBook: false,
      })
    ).toThrow(/bookingWindowOpen must be boolean/);
  });

  it('parses participant booking payload and enforces status literals', () => {
    const parsed = parseParticipantBookingItems([
      {
        id: 'booking-1',
        session_id: 'session-1',
        session_name: 'Morning',
        start_time: '2026-05-12T10:00:00.000Z',
        end_time: '2026-05-12T11:00:00.000Z',
        offering_name: 'Climbing',
        status: 'waitlisted',
        booked_at: '2026-05-01T10:00:00.000Z',
        cancelled_at: null,
        cancellable: false,
        onWaitlist: true,
      },
    ]);
    expect(parsed[0].status).toBe('waitlisted');

    expect(() =>
      parseParticipantBookingItems([
        {
          id: 'booking-1',
          session_id: 'session-1',
          session_name: 'Morning',
          start_time: '2026-05-12T10:00:00.000Z',
          end_time: '2026-05-12T11:00:00.000Z',
          offering_name: 'Climbing',
          status: 'pending',
          booked_at: '2026-05-01T10:00:00.000Z',
          cancelled_at: null,
          cancellable: false,
          onWaitlist: false,
        },
      ])
    ).toThrow(/status must be confirmed, waitlisted, or cancelled/);
  });

  it('maps projection errors to contract state', () => {
    expect(parseBookingProjectionErrorState('base_booking_access_denied')).toBe('access_denied');
    expect(parseBookingProjectionErrorState('other')).toBe('unknown_error');
    expect(parseBookingProjectionErrorState(null)).toBe('unknown_error');
  });
});
