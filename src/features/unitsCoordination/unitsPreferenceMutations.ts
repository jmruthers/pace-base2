import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useSecureSupabase } from '@solvera/pace-core/rbac';

import type { SubmitPreferencesResult } from './types';
import {
  buildSubmitPreferencesRpcArgs,
  requireActorUserId,
  withCreatedAndUpdatedBy,
  withUpdatedBy,
} from './unitsCoordinationActorHelpers';
import {
  asSupabaseClient,
  resolveEventOrganisationId,
  toErrorMessage,
} from './unitsCoordinationSupabase';

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
      const { error } = await supabase.from('base_activity_preference')['insert'](
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
        .from('base_activity_preference')['update'](withUpdatedBy({ rank: payload.rank }, actorUserId))
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
      const { error } = await supabase.from('base_activity_preference')['delete']().eq('id', preferenceId);
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
