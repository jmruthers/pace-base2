import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { WorkflowAuthoringState } from '@solvera/pace-core/forms';
import {
  buildDefinitionPayload,
  buildFieldsRpcPayload,
  sortFieldRows,
  toFieldCountMap,
} from './stateHelpers';
import type {
  CoreFormDetailRow,
  CoreFormFieldRow,
  CoreFormListRow,
  DeleteFormRpcResult,
  FormBuilderRecord,
  FormRegistrationBindingRow,
  RegistrationBindingDraft,
  RegistrationTypeRow,
  SaveFormParams,
} from './types';

type ApiError = {
  code: string;
  message: string;
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => SelectChain;
    delete: () => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => Promise<{ error: unknown }>;
      };
    };
    insert: (rows: Record<string, unknown>[]) => Promise<{ error: unknown }>;
  };
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type SelectChain = {
  eq: (column: string, value: unknown) => SelectChain;
  in: (column: string, values: unknown[]) => SelectChain;
  order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
};

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function apiSuccess<T>(data: T): ApiResult<T> {
  return { ok: true, data };
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

async function fetchFormsList(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<CoreFormListRow[]>> {
  const { data, error } = await supabase
    .from('core_forms')
    .select(
      'id, name, slug, status, workflow_type, is_active, is_primary_entrypoint, opens_at, closes_at, created_at, updated_at'
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error != null) {
    return apiFailure('forms-list-read-error', 'Failed to load forms', error);
  }
  return apiSuccess((data as CoreFormListRow[] | null) ?? []);
}

async function fetchFieldCountRows(
  supabase: SupabaseLike,
  formIds: string[]
): Promise<ApiResult<Record<string, number>>> {
  if (formIds.length === 0) {
    return apiSuccess({});
  }
  const { data, error } = await supabase
    .from('core_form_fields')
    .select('form_id')
    .in('form_id', formIds)
    .eq('is_active', true)
    .order('form_id', { ascending: true });
  if (error != null) {
    return apiFailure('field-count-read-error', 'Failed to load field counts', error);
  }
  return apiSuccess(toFieldCountMap(((data as Array<{ form_id: string }> | null) ?? [])));
}

async function fetchFormDetail(
  supabase: SupabaseLike,
  eventId: string,
  formId: string
): Promise<ApiResult<CoreFormDetailRow>> {
  const { data, error } = await supabase
    .from('core_forms')
    .select(
      'id, name, title, description, slug, status, workflow_type, access_mode, workflow_config, is_active, is_primary_entrypoint, is_required, opens_at, closes_at, max_submissions, confirmation_message, event_id, organisation_id, owner_app_id'
    )
    .eq('id', formId)
    .eq('event_id', eventId)
    .single();
  if (error != null) {
    return apiFailure('form-detail-read-error', 'Failed to load form', error);
  }
  return apiSuccess(data as CoreFormDetailRow);
}

async function fetchFormFields(
  supabase: SupabaseLike,
  formId: string
): Promise<ApiResult<CoreFormFieldRow[]>> {
  const { data, error } = await supabase
    .from('core_form_fields')
    .select('id, form_id, field_key, field_label, is_required, is_active, sort_order, display_options')
    .eq('form_id', formId)
    .order('sort_order', { ascending: true });
  if (error != null) {
    return apiFailure('form-fields-read-error', 'Failed to load form fields', error);
  }
  return apiSuccess(sortFieldRows(((data as CoreFormFieldRow[] | null) ?? [])));
}

async function fetchFormBindings(
  supabase: SupabaseLike,
  formId: string,
  eventId: string
): Promise<ApiResult<FormRegistrationBindingRow[]>> {
  const { data, error } = await supabase
    .from('base_form_registration_type')
    .select('registration_type_id, sort_order, is_default')
    .eq('form_id', formId)
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error != null) {
    return apiFailure('form-bindings-read-error', 'Failed to load registration bindings', error);
  }
  return apiSuccess((data as FormRegistrationBindingRow[] | null) ?? []);
}

async function fetchRegistrationTypes(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<RegistrationTypeRow[]>> {
  const { data, error } = await supabase
    .from('base_registration_type')
    .select('id, name, description, is_active')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error != null) {
    return apiFailure('registration-types-read-error', 'Failed to load registration types', error);
  }
  return apiSuccess((data as RegistrationTypeRow[] | null) ?? []);
}

async function saveBindings(params: {
  supabase: SupabaseLike;
  resolvedFormId: string;
  bindings: RegistrationBindingDraft[];
  eventId: string;
  organisationId: string;
  userId: string | null;
}): Promise<ApiResult<null>> {
  const { error: deleteError } = await params.supabase
    .from('base_form_registration_type')
    .delete()
    .eq('form_id', params.resolvedFormId)
    .eq('event_id', params.eventId);
  if (deleteError != null) {
    return apiFailure('registration-bindings-clear-error', 'Failed to clear registration bindings', deleteError);
  }

  const checkedBindings = params.bindings.filter((binding) => binding.checked);
  if (checkedBindings.length === 0) {
    return apiSuccess(null);
  }

  const rows = checkedBindings.map((binding, index) => ({
    form_id: params.resolvedFormId,
    registration_type_id: binding.typeId,
    event_id: params.eventId,
    organisation_id: params.organisationId,
    sort_order: index,
    is_default: binding.isDefault,
    created_by: params.userId,
    updated_by: params.userId,
  }));

  const { error: insertError } = await params.supabase
    .from('base_form_registration_type')
    .insert(rows);
  if (insertError != null) {
    return apiFailure('registration-bindings-save-error', 'Failed to save registration bindings', insertError);
  }
  return apiSuccess(null);
}

async function saveWorkflowForm(
  supabase: SupabaseLike,
  params: SaveFormParams
): Promise<ApiResult<{ formId: string }>> {
  const definitionPayload = buildDefinitionPayload(params.state);
  const { data: upsertData, error: upsertError } = await supabase.rpc('app_base_form_upsert', {
    p_event_id: params.eventId,
    p_organisation_id: params.organisationId,
    p_form_id: params.state.metadata.id ?? null,
    p_definition: definitionPayload,
  });
  if (upsertError != null) {
    return apiFailure('form-save-definition-error', 'Failed to save form definition', upsertError);
  }
  const resolvedFormId = (upsertData as Array<{ form_id: string }> | null)?.[0]?.form_id;
  if (resolvedFormId == null) {
    return apiFailure('form-save-missing-id', 'Form save returned no form ID', null);
  }

  const fieldsPayload = buildFieldsRpcPayload(params.state.fields);
  const { error: fieldsError } = await supabase.rpc('app_base_form_fields_replace', {
    p_form_id: resolvedFormId,
    p_fields: fieldsPayload,
  });
  if (fieldsError != null) {
    return apiFailure('form-save-fields-error', 'Failed to save form fields', fieldsError);
  }

  if (params.state.metadata.workflowType === 'base_registration') {
    const saveBindingsResult = await saveBindings({
      supabase,
      resolvedFormId,
      bindings: params.bindings,
      eventId: params.eventId,
      organisationId: params.organisationId,
      userId: params.userId,
    });
    if (!saveBindingsResult.ok) {
      return saveBindingsResult;
    }
  }

  return apiSuccess({ formId: resolvedFormId });
}

async function deleteForm(
  supabase: SupabaseLike,
  eventId: string,
  formId: string
): Promise<ApiResult<DeleteFormRpcResult>> {
  const { data, error } = await supabase.rpc('app_base_form_delete', {
    p_event_id: eventId,
    p_form_id: formId,
  });
  if (error != null) {
    return apiFailure('form-delete-error', 'Failed to delete form', error);
  }
  return apiSuccess(((data as DeleteFormRpcResult[] | null) ?? [])[0] ?? {
    deleted: false,
    response_count: 0,
    registration_binding_count: 0,
  });
}

export function useFormsList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['forms-authoring', 'forms-list', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const result = await fetchFormsList(supabase, eventId as string);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useFormFieldCounts(eventId: string | null, forms: CoreFormListRow[] | undefined) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['forms-authoring', 'field-counts', eventId, forms?.map((form) => form.id).join(',')],
    enabled: eventId != null && secureSupabase != null && (forms?.length ?? 0) > 0,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const result = await fetchFieldCountRows(
        supabase,
        (forms ?? []).map((form) => form.id)
      );
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useFormBuilderRecord(eventId: string | null, formId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['forms-authoring', 'builder-record', eventId, formId],
    enabled: eventId != null && formId != null && secureSupabase != null,
    queryFn: async (): Promise<FormBuilderRecord> => {
      const supabase = asSupabaseClient(secureSupabase);
      const [formResult, fieldsResult] = await Promise.all([
        fetchFormDetail(supabase, eventId as string, formId as string),
        fetchFormFields(supabase, formId as string),
      ]);
      if (!formResult.ok) {
        throw new Error(formResult.error.message);
      }
      if (!fieldsResult.ok) {
        throw new Error(fieldsResult.error.message);
      }
      const form = formResult.data;
      const fields = fieldsResult.data;

      let bindings: FormRegistrationBindingRow[] = [];
      if (form.workflow_type === 'base_registration') {
        const bindingsResult = await fetchFormBindings(supabase, formId as string, eventId as string);
        if (!bindingsResult.ok) {
          throw new Error(bindingsResult.error.message);
        }
        bindings = bindingsResult.data;
      }

      return { form, fields, bindings };
    },
  });
}

export function useRegistrationTypes(eventId: string | null, enabled = true) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['forms-authoring', 'registration-types', eventId],
    enabled: enabled && eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const result = await fetchRegistrationTypes(supabase, eventId as string);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useSaveWorkflowFormMutation() {
  const secureSupabase = useSecureSupabase();

  return useMutation({
    mutationFn: async (params: SaveFormParams) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const result = await saveWorkflowForm(supabase, params);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useDeleteFormMutation() {
  const secureSupabase = useSecureSupabase();

  return useMutation({
    mutationFn: async (params: { eventId: string; formId: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const result = await deleteForm(supabase, params.eventId, params.formId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function isPublishedForm(state: WorkflowAuthoringState): boolean {
  return state.metadata.id != null && state.metadata.status === 'published';
}
