/* eslint-disable pace-core-compliance/max-named-exports */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type {
  ActivityPreferenceRow,
  ActivitySessionRow,
  ApprovedApplicationRow,
  SubmitPreferencesResult,
  UnitRoleAssignmentRow,
  UnitRoleTypeRow,
  UnitRow,
} from './types';

type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type QueryChain = {
  select: (columns: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryChain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  delete: () => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown }>;

type SupabaseLike = {
  from: (table: string) => QueryChain;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type AuthUserLike = { id?: string | null } | null | undefined;

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

export function requireActorUserId(user: AuthUserLike): string {
  const actorUserId = user?.id ?? null;
  if (actorUserId == null || actorUserId.trim().length === 0) {
    throw new Error('Authenticated user is required for this action.');
  }
  return actorUserId;
}

export function withCreatedAndUpdatedBy<T extends Record<string, unknown>>(
  payload: T,
  actorUserId: string
): T & { created_by: string; updated_by: string } {
  return {
    ...payload,
    created_by: actorUserId,
    updated_by: actorUserId,
  };
}

export function withUpdatedBy<T extends Record<string, unknown>>(
  payload: T,
  actorUserId: string
): T & { updated_by: string } {
  return {
    ...payload,
    updated_by: actorUserId,
  };
}

export function buildSubmitPreferencesRpcArgs(payload: {
  unitId: string;
  eventId: string;
}): { p_unit_id: string; p_event_id: string } {
  return {
    p_unit_id: payload.unitId,
    p_event_id: payload.eventId,
  };
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

async function resolveEventOrganisationId(supabase: SupabaseLike, eventId: string): Promise<ApiResult<string>> {
  const { data, error } = await supabase
    .from('core_events')
    .select('organisation_id')
    .eq('event_id', eventId)
    .single();
  if (error != null) {
    return { ok: false, message: toErrorMessage(error, 'Failed to resolve organisation for event.') };
  }
  const organisationId = (data as { organisation_id?: string | null } | null)?.organisation_id ?? null;
  if (organisationId == null) {
    return { ok: false, message: 'Failed to resolve organisation for event.' };
  }
  return { ok: true, data: organisationId };
}

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
      return (data as { user_id: string; preferred_name: string | null; first_name: string | null; last_name: string | null } | null) ?? null;
    },
  });
}

export function useCreateUnitMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: {
      eventId: string;
      unitNumber: number;
      unitName: string | null;
      subcamp: string | null;
      contingent: string | null;
      parentUnitId: string | null;
    }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const organisation = await resolveEventOrganisationId(supabase, payload.eventId);
      if (!organisation.ok) {
        throw new Error(organisation.message);
      }
      const { error } = await supabase.from('base_units').insert(
        withCreatedAndUpdatedBy(
          {
            unit_number: payload.unitNumber,
            unit_name: payload.unitName,
            subcamp: payload.subcamp,
            contingent: payload.contingent,
            parent_unit_id: payload.parentUnitId,
            event_id: payload.eventId,
            organisation_id: organisation.data,
          },
          actorUserId
        )
      );
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to create unit.'));
      }
    },
  });
}

export function useUpdateUnitMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: {
      unitId: string;
      unitNumber: number;
      unitName: string | null;
      subcamp: string | null;
      contingent: string | null;
      parentUnitId: string | null;
    }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase
        .from('base_units')
        .update(
          withUpdatedBy(
            {
              unit_number: payload.unitNumber,
              unit_name: payload.unitName,
              subcamp: payload.subcamp,
              contingent: payload.contingent,
              parent_unit_id: payload.parentUnitId,
            },
            actorUserId
          )
        )
        .eq('id', payload.unitId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to update unit.'));
      }
    },
  });
}

export function useDeleteUnitMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (unitId: string) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_units').delete().eq('id', unitId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to delete unit.'));
      }
    },
  });
}

export function useCreateRoleTypeMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: { eventId: string; roleTitle: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const organisation = await resolveEventOrganisationId(supabase, payload.eventId);
      if (!organisation.ok) {
        throw new Error(organisation.message);
      }
      const { error } = await supabase.from('base_unit_role_types').insert(
        withCreatedAndUpdatedBy(
          {
            role_title: payload.roleTitle,
            event_id: payload.eventId,
            organisation_id: organisation.data,
          },
          actorUserId
        )
      );
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to create role type.'));
      }
    },
  });
}

export function useUpdateRoleTypeMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: { roleTypeId: string; roleTitle: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase
        .from('base_unit_role_types')
        .update(withUpdatedBy({ role_title: payload.roleTitle }, actorUserId))
        .eq('id', payload.roleTypeId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to update role type.'));
      }
    },
  });
}

export function useDeleteRoleTypeMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (roleTypeId: string) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_unit_role_types').delete().eq('id', roleTypeId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to delete role type.'));
      }
    },
  });
}

export function useAssignRoleMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: { unitId: string; applicationId: string; roleTypeId: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const { data: existingAssignment, error: existingError } = await supabase
        .from('base_unit_roles')
        .select('id')
        .eq('unit_id', payload.unitId)
        .eq('application_id', payload.applicationId)
        .maybeSingle();
      if (existingError != null) {
        throw new Error(toErrorMessage(existingError, 'Failed to check existing role assignment.'));
      }
      const existingId = (existingAssignment as { id?: string } | null)?.id ?? null;
      if (existingId != null) {
        const { error } = await supabase
          .from('base_unit_roles')
          .update(withUpdatedBy({ role_type_id: payload.roleTypeId }, actorUserId))
          .eq('id', existingId);
        if (error != null) {
          throw new Error(toErrorMessage(error, 'Failed to update role assignment.'));
        }
        return;
      }
      const { error } = await supabase.from('base_unit_roles').insert(
        withCreatedAndUpdatedBy(
          {
            unit_id: payload.unitId,
            application_id: payload.applicationId,
            role_type_id: payload.roleTypeId,
          },
          actorUserId
        )
      );
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to assign role.'));
      }
    },
  });
}

export function useRemoveRoleAssignmentMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_unit_roles').delete().eq('id', assignmentId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to remove role assignment.'));
      }
    },
  });
}

export function useCreatePreferenceMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: { unitId: string; eventId: string; sessionId: string; rank: number }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const organisation = await resolveEventOrganisationId(supabase, payload.eventId);
      if (!organisation.ok) {
        throw new Error(organisation.message);
      }
      const { error } = await supabase.from('base_activity_preference').insert(
        withCreatedAndUpdatedBy(
          {
            unit_id: payload.unitId,
            session_id: payload.sessionId,
            rank: payload.rank,
            event_id: payload.eventId,
            organisation_id: organisation.data,
          },
          actorUserId
        )
      );
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to add preference.'));
      }
    },
  });
}

export function useUpdatePreferenceRankMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: { preferenceId: string; rank: number }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const actorUserId = requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase
        .from('base_activity_preference')
        .update(withUpdatedBy({ rank: payload.rank }, actorUserId))
        .eq('id', payload.preferenceId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to update preference rank.'));
      }
    },
  });
}

export function useDeletePreferenceMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (preferenceId: string) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_activity_preference').delete().eq('id', preferenceId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to remove preference.'));
      }
    },
  });
}

export function useSubmitPreferencesMutation() {
  const secureSupabase = useSecureSupabase();
  const { user } = useUnifiedAuth();
  return useMutation({
    mutationFn: async (payload: { unitId: string; eventId: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable.');
      }
      requireActorUserId(user);
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase.rpc(
        'app_base_unit_preference_submit',
        buildSubmitPreferencesRpcArgs(payload)
      );
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to submit preferences.'));
      }
      return data as SubmitPreferencesResult;
    },
  });
}
