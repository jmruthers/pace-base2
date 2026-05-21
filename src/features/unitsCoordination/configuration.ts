import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type {
  ActivityPreferenceRow,
  ActivitySessionRow,
  ApprovedApplicationRow,
  UnitRoleAssignmentRow,
  UnitRoleTypeRow,
  UnitRow,
} from './types';
import {
  asSupabaseClient,
  toErrorMessage,
} from './unitsCoordinationSupabase';

export function useUnitsList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'units', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_units')
        .select('id, unit_number, unit_name, subcamp, contingent, parent_unit_id, event_id, created_at, updated_at')
        .eq('event_id', eventId as string)
        .order('unit_number', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load units.'));
      }
      return (data as UnitRow[] | null) ?? [];
    },
  });
}

export function useRoleTypesList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'role-types', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_unit_role_types')
        .select('id, role_title, event_id, created_at, updated_at')
        .eq('event_id', eventId as string)
        .order('role_title', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load role types.'));
      }
      return (data as UnitRoleTypeRow[] | null) ?? [];
    },
  });
}

export function useApprovedApplications(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'approved-applications', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_application')
        .select(`
          id,
          status,
          person:core_person!base_application_person_id_fkey (
            preferred_name,
            first_name,
            last_name,
            email
          )
        `)
        .eq('event_id', eventId as string)
        .eq('status', 'approved');
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load approved applications.'));
      }
      return (data as ApprovedApplicationRow[] | null) ?? [];
    },
  });
}

export function useUnitRoleAssignments(unitId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'unit-role-assignments', unitId],
    enabled: unitId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_unit_roles')
        .select(`
          id,
          unit_id,
          application_id,
          role_type_id,
          role_type:base_unit_role_types!base_unit_roles_role_type_id_fkey (
            id,
            role_title
          ),
          application:base_application!base_unit_roles_application_id_fkey (
            id,
            status,
            person:core_person!base_application_person_id_fkey (
              preferred_name,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('unit_id', unitId as string);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load role assignments.'));
      }
      return (data as UnitRoleAssignmentRow[] | null) ?? [];
    },
  });
}

export function useActivitySessions(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'activity-sessions', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_session')
        .select('id, session_name, start_time, end_time, offering_id, capacity')
        .eq('event_id', eventId as string)
        .order('start_time', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load activity sessions.'));
      }
      return (data as ActivitySessionRow[] | null) ?? [];
    },
  });
}

export function useUnitPreferences(unitId: string | null, eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'unit-preferences', unitId, eventId],
    enabled: unitId != null && eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_preference')
        .select('id, unit_id, session_id, rank, submitted_at, submitted_by, event_id')
        .eq('unit_id', unitId as string)
        .eq('event_id', eventId as string)
        .order('rank', { ascending: true });
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load unit preferences.'));
      }
      return (data as ActivityPreferenceRow[] | null) ?? [];
    },
  });
}

export function useSubmitterPerson(submittedByUserId: string | null, enabled: boolean) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba08', 'submitter-person', submittedByUserId],
    enabled: enabled && submittedByUserId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('core_person')
        .select('user_id, preferred_name, first_name, last_name')
        .eq('user_id', submittedByUserId as string)
        .maybeSingle();
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to load submitter details.'));
      }
      return (data as {
        user_id: string;
        preferred_name: string | null;
        first_name: string | null;
        last_name: string | null;
      } | null) ?? null;
    },
  });
}
