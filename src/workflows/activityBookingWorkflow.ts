type BookingFailureReason =
  | 'window_closed'
  | 'capacity_full'
  | 'duplicate_booking'
  | 'session_conflict'
  | 'consent_required';

interface RpcClient {
  rpc: (
    name: string,
    payload: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

export interface BookingRequestInput {
  sessionId: string;
  participantId: string;
  consentAccepted: boolean;
}

export type BookingRequestResult =
  | { ok: true; bookingStatus: 'confirmed' | 'waitlisted'; bookingId: string }
  | { ok: false; reason: BookingFailureReason };

export async function requestActivityBooking(
  client: RpcClient,
  input: BookingRequestInput
): Promise<BookingRequestResult> {
  if (!input.consentAccepted) {
    return { ok: false, reason: 'consent_required' };
  }

  const { data, error } = await client.rpc('app_base_activity_booking_create', {
    p_session_id: input.sessionId,
    p_participant_id: input.participantId,
  });
  if (error != null || data == null) {
    return { ok: false, reason: 'capacity_full' };
  }

  const bookingData = data as {
    booking_id: string;
    status: 'confirmed' | 'waitlisted' | 'window_closed' | 'duplicate_booking' | 'session_conflict';
  };

  if (bookingData.status === 'window_closed') {
    return { ok: false, reason: 'window_closed' };
  }
  if (bookingData.status === 'duplicate_booking') {
    return { ok: false, reason: 'duplicate_booking' };
  }
  if (bookingData.status === 'session_conflict') {
    return { ok: false, reason: 'session_conflict' };
  }

  return {
    ok: true,
    bookingId: bookingData.booking_id,
    bookingStatus: bookingData.status,
  };
}

export async function cancelActivityBooking(
  client: RpcClient,
  input: { bookingId: string; participantId: string }
): Promise<{ ok: boolean }> {
  const { error } = await client.rpc('app_base_activity_booking_cancel', {
    p_booking_id: input.bookingId,
    p_participant_id: input.participantId,
  });
  return { ok: error == null };
}
