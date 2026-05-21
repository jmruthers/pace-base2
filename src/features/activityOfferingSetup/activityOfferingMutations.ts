import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

import type { OfferingFormValues, SessionFormValues } from './types';
import { normalizeOptionalText, parseOptionalCost } from './shared';
import {
  asOfferingSupabaseClient,
  offeringToErrorMessage,
  resolveOrganisationIdForEvent,
} from './activityOfferingClients';

export function useCreateOfferingMutation() {
  const secureSupabase = useSecureSupabase();
  const { user, selectedEvent } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (params: { eventId: string; values: OfferingFormValues }) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const organisationResult = await resolveOrganisationIdForEvent(supabase, selectedEvent, params.eventId);
      if (!organisationResult.ok) {
        throw new Error(organisationResult.message);
      }
      const { error } = await supabase.from('base_activity_offering')['insert']({
        name: params.values.name.trim(),
        event_id: params.eventId,
        organisation_id: organisationResult.data,
        trac_activity_id: params.values.trac_activity_id,
        booking_open_at: params.values.booking_open_at,
        booking_close_at: params.values.booking_close_at,
        cost: parseOptionalCost(params.values.cost),
        payment_due_at: params.values.payment_due_at,
        allow_waitlist: params.values.allow_waitlist,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to create offering.'));
      }
      return null;
    },
  });
}

export function useUpdateOfferingMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (params: { offeringId: string; values: OfferingFormValues }) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_offering')['update']({
          name: params.values.name.trim(),
          trac_activity_id: params.values.trac_activity_id,
          booking_open_at: params.values.booking_open_at,
          booking_close_at: params.values.booking_close_at,
          cost: parseOptionalCost(params.values.cost),
          payment_due_at: params.values.payment_due_at,
          allow_waitlist: params.values.allow_waitlist,
          updated_by: user?.id ?? null,
        })
        .eq('id', params.offeringId)
        .select('id')
        .maybeSingle();

      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to save offering.'));
      }
      if (data == null) {
        throw new Error('Offering could not be saved — it may have been deleted.');
      }
      return null;
    },
  });
}

export function useDeleteOfferingMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (offeringId: string) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_offering')['delete']().eq('id', offeringId);
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to delete offering.'));
      }
      return null;
    },
  });
}

export function useCreateSessionMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (params: { offeringId: string; values: SessionFormValues }) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_session')['insert']({
        offering_id: params.offeringId,
        session_name: normalizeOptionalText(params.values.session_name),
        start_time: params.values.start_time,
        end_time: params.values.end_time,
        location_display_name: normalizeOptionalText(params.values.location_display_name),
        capacity: Number(params.values.capacity),
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to add session.'));
      }
      return null;
    },
  });
}

export function useUpdateSessionMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (params: { sessionId: string; values: SessionFormValues }) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_session')['update']({
          session_name: normalizeOptionalText(params.values.session_name),
          start_time: params.values.start_time,
          end_time: params.values.end_time,
          location_display_name: normalizeOptionalText(params.values.location_display_name),
          capacity: Number(params.values.capacity),
          updated_by: user?.id ?? null,
        })
        .eq('id', params.sessionId)
        .select('id')
        .maybeSingle();

      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to save session.'));
      }
      if (data == null) {
        throw new Error('Session could not be saved — it may have been deleted.');
      }
      return null;
    },
  });
}

export function useDeleteSessionMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_session')['delete']().eq('id', sessionId);
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to delete session.'));
      }
      return null;
    },
  });
}
