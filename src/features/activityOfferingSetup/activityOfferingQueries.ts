import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

import type { ActivityOfferingRow, ActivitySessionRow, TracActivityRow } from './types';

import {
  asOfferingSupabaseClient,
  offeringToErrorMessage,
} from './activityOfferingClients';

export function useOfferingsList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba09', 'offerings', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asOfferingSupabaseClient(secureSupabase);
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
          sessions:base_activity_session (
            capacity,
            bookings:base_activity_booking ( count )
          )
        `)
        .eq('event_id', eventId as string)
        .order('name', { ascending: true });
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to load activity offerings.'));
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
      const supabase = asOfferingSupabaseClient(secureSupabase);
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
        throw new Error(offeringToErrorMessage(error, 'Failed to load offering details.'));
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
      const supabase = asOfferingSupabaseClient(secureSupabase);
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
        throw new Error(offeringToErrorMessage(error, 'Failed to load sessions.'));
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
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('trac_activity')
        .select('id, name, event_id')
        .eq('event_id', eventId as string)
        .order('name', { ascending: true });
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to load TRAC activities.'));
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
      const supabase = asOfferingSupabaseClient(secureSupabase);
      const { count, error } = await supabase
        .from('base_activity_session')
        .select('id', { count: 'exact', head: true })
        .eq('offering_id', offeringId as string);
      if (error != null) {
        throw new Error(offeringToErrorMessage(error, 'Failed to check session count.'));
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
        const supabase = asOfferingSupabaseClient(secureSupabase);
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
