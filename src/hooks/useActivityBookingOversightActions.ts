import { useCallback } from 'react';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

interface ActionResult {
  ok: boolean;
  errorMessage?: string;
}

export function useActivityBookingOversightActions() {
  const secureSupabase = useSecureSupabase();

  const createOnBehalf = useCallback(
    async (input: { sessionId: string; participantId: string; overrideReason: string }) => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' } as ActionResult;
      }
      type RpcClient = {
        rpc: (
          name: string,
          payload: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };
      const typed = secureSupabase as RpcClient;
      const { error } = await typed.rpc('app_base_activity_booking_create', {
        p_session_id: input.sessionId,
        p_participant_id: input.participantId,
        p_override_reason: input.overrideReason,
      });
      return error == null ? { ok: true } : { ok: false, errorMessage: error.message };
    },
    [secureSupabase]
  );

  const cancelBooking = useCallback(
    async (input: { bookingId: string; overrideReason: string }) => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' } as ActionResult;
      }
      type RpcClient = {
        rpc: (
          name: string,
          payload: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };
      const typed = secureSupabase as RpcClient;
      const { error } = await typed.rpc('app_base_activity_booking_cancel', {
        p_booking_id: input.bookingId,
        p_override_reason: input.overrideReason,
      });
      return error == null ? { ok: true } : { ok: false, errorMessage: error.message };
    },
    [secureSupabase]
  );

  const promoteWaitlist = useCallback(
    async (input: { bookingId: string; overrideReason: string }) => {
      if (secureSupabase == null) {
        return { ok: false, errorMessage: 'Configuration service is unavailable.' } as ActionResult;
      }
      type RpcClient = {
        rpc: (
          name: string,
          payload: Record<string, unknown>
        ) => Promise<{ error: { message: string } | null }>;
      };
      const typed = secureSupabase as RpcClient;
      const { error } = await typed.rpc('app_base_activity_booking_update', {
        p_booking_id: input.bookingId,
        p_status: 'confirmed',
        p_override_reason: input.overrideReason,
      });
      return error == null ? { ok: true } : { ok: false, errorMessage: error.message };
    },
    [secureSupabase]
  );

  return { createOnBehalf, cancelBooking, promoteWaitlist };
}
