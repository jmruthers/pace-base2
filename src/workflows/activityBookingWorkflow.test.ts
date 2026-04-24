import { describe, expect, it, vi } from 'vitest';
import { cancelActivityBooking, requestActivityBooking } from './activityBookingWorkflow';

describe('BA10 participant activity booking workflow contracts', () => {
  it('requires consent before booking submit', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    const result = await requestActivityBooking(
      { rpc: rpcMock },
      { sessionId: 'session-1', participantId: 'person-1', consentAccepted: false }
    );
    expect(result).toEqual({ ok: false, reason: 'consent_required' });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('handles confirmed and waitlisted outcomes from booking contract', async () => {
    const confirmedRpc = vi.fn(async () => ({
      data: { booking_id: 'booking-1', status: 'confirmed' },
      error: null,
    }));
    const waitlistedRpc = vi.fn(async () => ({
      data: { booking_id: 'booking-2', status: 'waitlisted' },
      error: null,
    }));

    await expect(
      requestActivityBooking(
        { rpc: confirmedRpc },
        { sessionId: 'session-1', participantId: 'person-1', consentAccepted: true }
      )
    ).resolves.toEqual({ ok: true, bookingId: 'booking-1', bookingStatus: 'confirmed' });

    await expect(
      requestActivityBooking(
        { rpc: waitlistedRpc },
        { sessionId: 'session-1', participantId: 'person-1', consentAccepted: true }
      )
    ).resolves.toEqual({ ok: true, bookingId: 'booking-2', bookingStatus: 'waitlisted' });
  });

  it('returns validation failure classes from backend booking status', async () => {
    const conflictRpc = vi.fn(async () => ({
      data: { booking_id: 'booking-3', status: 'session_conflict' },
      error: null,
    }));

    const result = await requestActivityBooking(
      { rpc: conflictRpc },
      { sessionId: 'session-1', participantId: 'person-1', consentAccepted: true }
    );
    expect(result).toEqual({ ok: false, reason: 'session_conflict' });
  });

  it('cancels booking through backend-owned cancel contract', async () => {
    const rpcMock = vi.fn(async () => ({ data: null, error: null }));
    const result = await cancelActivityBooking(
      { rpc: rpcMock },
      { bookingId: 'booking-1', participantId: 'person-1' }
    );
    expect(result).toEqual({ ok: true, data: { cancelled: true } });
    expect(rpcMock).toHaveBeenCalledWith('app_base_activity_booking_cancel', {
      p_booking_id: 'booking-1',
      p_participant_id: 'person-1',
    });
  });
});
