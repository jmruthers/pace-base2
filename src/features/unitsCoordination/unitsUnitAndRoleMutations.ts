import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

import {
  requireActorUserId,
  withCreatedAndUpdatedBy,
  withUpdatedBy,
} from './unitsCoordinationActorHelpers';
import {
  asSupabaseClient,
  resolveEventOrganisationId,
  toErrorMessage,
} from './unitsCoordinationSupabase';

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
      const { data, error } = await supabase
        .from('base_units')['insert'](
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
        )
        .select('id, unit_number, parent_unit_id')
        .single();
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to create unit.'));
      }
      return (data as { id: string; unit_number: number; parent_unit_id: string | null } | null) ?? null;
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
        .from('base_units')['update'](
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
      const { error } = await supabase.from('base_units')['delete']().eq('id', unitId);
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
      const { error } = await supabase.from('base_unit_role_types')['insert'](
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
        .from('base_unit_role_types')['update'](withUpdatedBy({ role_title: payload.roleTitle }, actorUserId))
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
      const { error } = await supabase.from('base_unit_role_types')['delete']().eq('id', roleTypeId);
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
          .from('base_unit_roles')['update'](withUpdatedBy({ role_type_id: payload.roleTypeId }, actorUserId))
          .eq('id', existingId);
        if (error != null) {
          throw new Error(toErrorMessage(error, 'Failed to update role assignment.'));
        }
        return;
      }
      const { error } = await supabase.from('base_unit_roles')['insert'](
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
      const { error } = await supabase.from('base_unit_roles')['delete']().eq('id', assignmentId);
      if (error != null) {
        throw new Error(toErrorMessage(error, 'Failed to remove role assignment.'));
      }
    },
  });
}
