import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { ApplicationEvidenceRow, ApplicationQueueRow } from './types';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => QueryChain;
  };
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type QueryChain = {
  eq: (column: string, value: unknown) => QueryChain;
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean }
  ) => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown }>;

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function apiFailure(code: string, fallbackMessage: string, error: unknown): ApiResult<never> {
  return {
    ok: false,
    error: {
      code,
      message: error != null ? String(error) : fallbackMessage,
    },
  };
}

async function fetchApplicationsQueue(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<ApplicationQueueRow[]>> {
  const { data, error } = await supabase
    .from('base_application')
    .select(
      `
      id,
      event_id,
      person_id,
      status,
      submitted_at,
      created_at,
      registration_type_id,
      person:core_person!base_application_person_id_fkey (
        preferred_name,
        first_name,
        last_name,
        email
      ),
      registration_type:base_registration_type!base_application_registration_type_id_fkey (
        id,
        name
      ),
      checks:base_application_check (
        id,
        status,
        requirement_id,
        token_expires_at,
        actioned_at,
        notes,
        requirement:base_registration_type_requirement (
          check_type,
          sort_order,
          is_automated,
          config
        )
      )
    `
    )
    .eq('event_id', eventId)
    .order('submitted_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error != null) {
    return apiFailure('applications-queue-read-error', 'Failed to load applications queue', error);
  }
  return { ok: true, data: ((data as ApplicationQueueRow[] | null) ?? []).map((row) => ({ ...row, checks: row.checks ?? [] })) };
}

async function fetchApplicationEvidence(
  supabase: SupabaseLike,
  applicationId: string
): Promise<ApiResult<ApplicationEvidenceRow[]>> {
  const { data, error } = await supabase
    .from('core_form_responses')
    .select(
      `
      id,
      submitted_at,
      form:core_forms ( id, name ),
      values:core_form_response_values (
        field_key,
        form_field_id,
        value_text,
        value_json,
        field:core_form_fields ( id, label, field_key )
      )
    `
    )
    .eq('workflow_subject_type', 'base_application')
    .eq('workflow_subject_id', applicationId)
    .order('submitted_at', { ascending: false });
  if (error != null) {
    return apiFailure('application-evidence-read-error', 'Failed to load application evidence', error);
  }
  return {
    ok: true,
    data: ((data as ApplicationEvidenceRow[] | null) ?? []).map((item) => ({
      ...item,
      values: item.values ?? [],
    })),
  };
}

async function setApplicationStatus(params: {
  supabase: SupabaseLike;
  applicationId: string;
  targetStatus: 'approved' | 'rejected';
  notes: string | null;
}): Promise<ApiResult<null>> {
  const payload: Record<string, unknown> = {
    p_application_id: params.applicationId,
    p_target_status: params.targetStatus,
  };
  if (params.notes != null) {
    payload.p_notes = params.notes;
  }
  const { error } = await params.supabase.rpc('app_base_application_set_status', payload);
  if (error != null) {
    return apiFailure('application-status-mutation-error', 'Failed to update application status', error);
  }
  return { ok: true, data: null };
}

async function setCheckStatus(params: {
  supabase: SupabaseLike;
  checkId: string;
  targetStatus: 'satisfied' | 'failed';
  notes: string | null;
}): Promise<ApiResult<null>> {
  // Contract name is fixed by backend slice BA06.
  // eslint-disable-next-line pace-core-compliance/rpc-naming-pattern
  const { error } = await params.supabase.rpc('app_base_application_check_set_status', {
    p_check_id: params.checkId,
    p_status: params.targetStatus,
    p_notes: params.notes,
  });
  if (error != null) {
    return apiFailure('application-check-mutation-error', 'Failed to update check status', error);
  }
  return { ok: true, data: null };
}

async function reissueCheckToken(params: {
  supabase: SupabaseLike;
  checkId: string;
}): Promise<ApiResult<null>> {
  // Contract name is fixed by backend slice BA06.
  // eslint-disable-next-line pace-core-compliance/rpc-naming-pattern
  const { error } = await params.supabase.rpc('app_base_application_check_reissue_token', {
    p_check_id: params.checkId,
  });
  if (error != null) {
    return apiFailure('application-check-reissue-error', 'Failed to reissue approval link', error);
  }
  return { ok: true, data: null };
}

export function useApplicationsQueue(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['applications-admin', 'queue', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const result = await fetchApplicationsQueue(supabase, eventId as string);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useApplicationEvidence(applicationId: string | null, enabled: boolean) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['applications-admin', 'evidence', applicationId],
    enabled: enabled && applicationId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const result = await fetchApplicationEvidence(supabase, applicationId as string);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useSetApplicationStatusMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (params: {
      applicationId: string;
      targetStatus: 'approved' | 'rejected';
      notes: string | null;
    }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const result = await setApplicationStatus({ supabase, ...params });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useSetCheckStatusMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (params: {
      checkId: string;
      targetStatus: 'satisfied' | 'failed';
      notes: string | null;
    }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const result = await setCheckStatus({ supabase, ...params });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useReissueCheckTokenMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (params: { checkId: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const result = await reissueCheckToken({ supabase, ...params });
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
