/* eslint-disable pace-core-compliance/max-named-exports */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { ActivityOfferingRow, ActivitySessionRow, OfferingFormValues, SessionFormValues, TracActivityRow } from './types';
import { normalizeOptionalText, parseOptionalCost } from './shared';

type SupabaseLike = {
  from: (table: string) => QueryChain;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type QueryChain = {
  select: (columns: string, options?: Record<string, unknown>) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryChain;
  single: () => Promise<{ data: unknown; error: unknown }>;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  insert: (payload: Record<string, unknown>) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  delete: () => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown; count?: number | null }>;

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}

async function resolveOrganisationIdForEvent(
  supabase: SupabaseLike,
  selectedEvent: unknown,
  eventId: string
): Promise<ApiResult<string>> {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'organisation_id' in selectedEvent) {
    const organisationId = (selectedEvent as { organisation_id?: unknown }).organisation_id;
    if (typeof organisationId === 'string' && organisationId.length > 0) {
      return { ok: true, data: organisationId };
    }
  }

  const { data, error } = await supabase
    .from('core_events')
    .select('organisation_id')
    .eq('event_id', eventId)
    .single();
  if (error != null) {
    return { ok: false, message: toErrorMessage(error, 'Failed to resolve organisation for selected event.') };
  }
  const organisationId = (data as { organisation_id?: string | null } | null)?.organisation_id ?? null;
  if (organisationId == null) {
    return { ok: false, message: 'Failed to resolve organisation for selected event.' };
  }
  return { ok: true, data: organisationId };
}

export function useOfferingsList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'offerings', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_offering')
        .select(`
          id,
          name,
          trac_activity_id,
          booking_open_at,
          booking_close_at,
          cost,
          payment_due_at,
          allow_waitlist,
          event_id,
          organisation_id,
          trac_activity:trac_activity (
            id,
            name,
            event_id
          ),
          sessions:base_activity_session ( count )
        `)
        .eq('event_id', eventId as string)
        .order('name', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load activity offerings.'));
      }
      return (data as ActivityOfferingRow[] | null) ?? [];
    },
  });
}

export function useOffering(offeringId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'offering', offeringId],
    enabled: offeringId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_offering')
        .select(`
          id,
          name,
          trac_activity_id,
          booking_open_at,
          booking_close_at,
          cost,
          payment_due_at,
          allow_waitlist,
          event_id,
          organisation_id,
          trac_activity:trac_activity (
            id,
            name,
            event_id
          )
        `)
        .eq('id', offeringId as string)
        .maybeSingle();
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load offering details.'));
      }
      return (data as ActivityOfferingRow | null) ?? null;
    },
  });
}

export function useOfferingSessions(offeringId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'sessions', offeringId],
    enabled: offeringId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_session')
        .select(`
          id,
          offering_id,
          session_name,
          start_time,
          end_time,
          location_display_name,
          capacity,
          created_at,
          updated_at
        `)
        .eq('offering_id', offeringId as string)
        .order('start_time', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load sessions.'));
      }
      return (data as ActivitySessionRow[] | null) ?? [];
    },
  });
}

export function useTracActivities(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'trac-activities', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('trac_activity')
        .select('id, name, event_id')
        .eq('event_id', eventId as string)
        .order('name', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load TRAC activities.'));
      }
      return (data as TracActivityRow[] | null) ?? [];
    },
  });
}

export function useOfferingSessionCount(offeringId: string | null, enabled: boolean) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'offering-session-count', offeringId],
    enabled: enabled && offeringId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { count, error } = await supabase
        .from('base_activity_session')
        .select('id', { count: 'exact', head: true })
        .eq('offering_id', offeringId as string);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to check session count.'));
      }
      return count ?? 0;
    },
  });
}

export function useSessionBookingCount(sessionId: string | null, enabled: boolean) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'session-bookings-count', sessionId],
    enabled: enabled && sessionId != null && secureSupabase != null,
    queryFn: async () => {
      try {
        const supabase = asSupabaseClient(secureSupabase);
        const { count, error } = await supabase
          .from('base_activity_booking')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId as string);
        if (error != null) {
          throw error;
        }
        return count ?? 0;
      } catch (error) {
        console.warn('base_activity_booking unavailable, defaulting booking count to 0', error);
        return 0;
      }
    },
  });
}

export function useCreateOfferingMutation() {
  const secureSupabase = useSecureSupabase();
  const { user, selectedEvent } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (params: { eventId: string; values: OfferingFormValues }) => {
      if (secureSupabase == null) {
        return null;
      }
      const supabase = asSupabaseClient(secureSupabase);
      const organisationResult = await resolveOrganisationIdForEvent(supabase, selectedEvent, params.eventId);
      if (!organisationResult.ok) {
        throw new Error(organisationResult.message);
      }
      const { error } = await supabase.from('base_activity_offering').insert({
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
        throw new Error(toErrorMessage(error, 'Failed to create offering.'));
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
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_offering')
        .update({
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
        throw new Error(toErrorMessage(error, 'Failed to save offering.'));
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
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_offering').delete().eq('id', offeringId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to delete offering.'));
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
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_session').insert({
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
        throw new Error(toErrorMessage(error, 'Failed to add session.'));
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
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_session')
        .update({
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
        throw new Error(toErrorMessage(error, 'Failed to save session.'));
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
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_session').delete().eq('id', sessionId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to delete session.'));
      }
      return null;
    },
  });
}
