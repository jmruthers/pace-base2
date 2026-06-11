import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type {
  RegistrationTypeEligibilityRow,
  RegistrationTypeRequirementRow,
  RegistrationTypeRow,
} from './types';
import type { DeleteRegistrationTypeRpcResult, RegistrationTypeUpsertPayload } from './types.rpc';

type ApiError = {
  code: string;
  message: string;
};

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

interface MembershipTypeRow {
  id: number;
  name: string;
}

interface OrganisationRow {
  id: string;
  name: string;
  display_name: string | null;
}

type SelectChain = {
  eq: (column: string, value: unknown) => SelectChain;
  neq: (column: string, value: unknown) => SelectChain;
  in: (column: string, values: unknown[]) => SelectChain;
  order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => SelectChain;
  };
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function apiSuccess<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function apiFailure(code: string, fallbackMessage: string, error: unknown): ApiResult<never> {
  const message =
    error != null ? NormalizeSupabaseError(error, fallbackMessage).message : fallbackMessage;
  return {
    ok: false,
    error: {
      code,
      message: message.length > 0 ? message : fallbackMessage,
    },
  };
}

async function fetchRegistrationTypes(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<RegistrationTypeRow[]>> {
  const { data, error } = await supabase
    .from('base_registration_type')
    .select(
      'id, name, description, eligibility_message, cost, capacity, is_active, sort_order, pre_submission_checks, organisation_id, event_id, created_at'
    )
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error != null) {
    return apiFailure('registration-types-read-error', 'Failed to load registration types', error);
  }
  const rows = ((data as RegistrationTypeRow[] | null) ?? []).sort((left, right) => {
    const leftSort = left.sort_order ?? Number.POSITIVE_INFINITY;
    const rightSort = right.sort_order ?? Number.POSITIVE_INFINITY;
    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }
    return left.name.localeCompare(right.name);
  });
  return apiSuccess(rows);
}

async function fetchEligibilityRows(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<RegistrationTypeEligibilityRow[]>> {
  const { data, error } = await supabase
    .from('base_registration_type_eligibility')
    .select('registration_type_id, rule_type, value')
    .eq('event_id', eventId)
    .order('registration_type_id', { ascending: true });
  if (error != null) {
    return apiFailure('eligibility-rules-read-error', 'Failed to load eligibility rules', error);
  }
  return apiSuccess((data as RegistrationTypeEligibilityRow[] | null) ?? []);
}

async function fetchRequirements(
  supabase: SupabaseLike,
  registrationTypeId: string
): Promise<ApiResult<RegistrationTypeRequirementRow[]>> {
  const { data, error } = await supabase
    .from('base_registration_type_requirement')
    .select('id, check_type, sort_order, is_automated, config')
    .eq('registration_type_id', registrationTypeId)
    .order('sort_order', { ascending: true });
  if (error != null) {
    return apiFailure('requirements-read-error', 'Failed to load requirements', error);
  }
  return apiSuccess((data as RegistrationTypeRequirementRow[] | null) ?? []);
}

async function fetchEventOrganisationId(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase
    .from('core_events')
    .select('organisation_id')
    .eq('event_id', eventId)
    .single();
  if (error != null) {
    return apiFailure('event-organisation-read-error', 'Failed to load event organisation', error);
  }
  const row = data as { organisation_id?: string | null } | null;
  return apiSuccess(row?.organisation_id ?? null);
}

async function fetchMembershipTypes(
  supabase: SupabaseLike,
  organisationId: string
): Promise<ApiResult<MembershipTypeRow[]>> {
  const { data, error } = await supabase
    .from('core_membership_type')
    .select('id, name')
    .eq('organisation_id', organisationId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error != null) {
    return apiFailure('membership-types-read-error', 'Failed to load membership types', error);
  }
  return apiSuccess((data as MembershipTypeRow[] | null) ?? []);
}

export type RegistrationTypeDeleteBlockers = {
  applicationCount: number;
  formBindingCount: number;
};

type CountQueryBuilder = {
  eq: (column: string, value: unknown) => CountQueryBuilder;
} & Promise<{ count: number | null; error: unknown }>;

type CountSupabaseLike = {
  from: (table: string) => {
    select: (columns: string, options: { count: 'exact'; head: true }) => CountQueryBuilder;
  };
};

async function countRegistrationTypeDependencies(
  supabase: SupabaseLike,
  table: 'base_application' | 'base_form_registration_type',
  eventId: string,
  registrationTypeId: string
): Promise<ApiResult<number>> {
  const client = supabase as unknown as CountSupabaseLike;
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('registration_type_id', registrationTypeId);
  if (error != null) {
    return apiFailure(
      'registration-type-delete-blockers-read-error',
      'Failed to check whether this registration type can be deleted',
      error
    );
  }
  return apiSuccess(count ?? 0);
}

async function fetchRegistrationTypeDeleteBlockers(
  supabase: SupabaseLike,
  eventId: string,
  registrationTypeId: string
): Promise<ApiResult<RegistrationTypeDeleteBlockers>> {
  const [applicationsResult, bindingsResult] = await Promise.all([
    countRegistrationTypeDependencies(supabase, 'base_application', eventId, registrationTypeId),
    countRegistrationTypeDependencies(
      supabase,
      'base_form_registration_type',
      eventId,
      registrationTypeId
    ),
  ]);
  if (!applicationsResult.ok) {
    return applicationsResult;
  }
  if (!bindingsResult.ok) {
    return bindingsResult;
  }
  return apiSuccess({
    applicationCount: applicationsResult.data,
    formBindingCount: bindingsResult.data,
  });
}

export async function getRegistrationTypeDeleteBlockers(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  eventId: string,
  registrationTypeId: string
): Promise<ApiResult<RegistrationTypeDeleteBlockers>> {
  if (secureSupabase == null) {
    return apiFailure('supabase-client-unavailable', 'Supabase client unavailable', null);
  }
  const supabase = asSupabaseClient(secureSupabase);
  return fetchRegistrationTypeDeleteBlockers(supabase, eventId, registrationTypeId);
}

async function deleteRegistrationType(
  supabase: SupabaseLike,
  eventId: string,
  registrationTypeId: string
): Promise<ApiResult<DeleteRegistrationTypeRpcResult>> {
  const { data, error } = await supabase.rpc('app_base_registration_type_delete', {
    p_event_id: eventId,
    p_registration_type_id: registrationTypeId,
  });
  if (error != null) {
    return apiFailure('registration-type-delete-error', 'Failed to delete registration type', error);
  }
  return apiSuccess(
    ((data as DeleteRegistrationTypeRpcResult[] | null) ?? [])[0] ?? {
      deleted: false,
      application_count: 0,
      form_binding_count: 0,
    }
  );
}

async function fetchReviewingOrganisations(
  supabase: SupabaseLike,
  rootOrganisationId: string
): Promise<ApiResult<OrganisationRow[]>> {
  const descendantsRpcName = 'get_org_descendants';
  const { data: descendantsData, error: descendantsError } = await supabase.rpc(descendantsRpcName, {
    p_root_org_id: rootOrganisationId,
  });
  if (descendantsError != null) {
    return apiFailure(
      'reviewing-organisations-descendants-read-error',
      'Failed to load descendant organisations',
      descendantsError
    );
  }
  const descendants = ((descendantsData as string[] | null) ?? []).filter((id) => id !== rootOrganisationId);
  if (descendants.length === 0) {
    return apiSuccess([]);
  }
  const { data, error } = await supabase
    .from('core_organisations')
    .select('id, name, display_name')
    .in('id', descendants)
    .neq('id', rootOrganisationId)
    .eq('is_active', true)
    .order('display_name', { ascending: true });
  if (error != null) {
    return apiFailure('reviewing-organisations-read-error', 'Failed to load reviewing organisations', error);
  }
  return apiSuccess((data as OrganisationRow[] | null) ?? []);
}

export function useRegistrationTypesList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['registration-setup', 'types-list', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const [typesResult, eligibilityResult] = await Promise.all([
        fetchRegistrationTypes(supabase, eventId as string),
        fetchEligibilityRows(supabase, eventId as string),
      ]);
      if (!typesResult.ok) {
        throw new Error(typesResult.error.message);
      }
      if (!eligibilityResult.ok) {
        throw new Error(eligibilityResult.error.message);
      }
      const types = typesResult.data;
      const eligibility = eligibilityResult.data;

      const counts = eligibility.reduce<Record<string, number>>((accumulator, row) => {
        const current = accumulator[row.registration_type_id] ?? 0;
        accumulator[row.registration_type_id] = current + 1;
        return accumulator;
      }, {});

      return {
        types,
        eligibilityCountsByTypeId: counts,
        eligibilityByTypeId: eligibility.reduce<Record<string, RegistrationTypeEligibilityRow[]>>(
          (accumulator, row) => {
            accumulator[row.registration_type_id] = [
              ...(accumulator[row.registration_type_id] ?? []),
              row,
            ];
            return accumulator;
          },
          {}
        ),
      };
    },
  });
}

export function useRequirementsForType(registrationTypeId: string | null, enabled = true) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['registration-setup', 'requirements', registrationTypeId],
    enabled: enabled && registrationTypeId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const result = await fetchRequirements(supabase, registrationTypeId as string);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useMembershipTypesForEvent(eventId: string | null, enabled = true) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['registration-setup', 'membership-types', eventId],
    enabled: enabled && eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const organisationIdResult = await fetchEventOrganisationId(supabase, eventId as string);
      if (!organisationIdResult.ok) {
        throw new Error(organisationIdResult.error.message);
      }
      const organisationId = organisationIdResult.data;
      if (organisationId == null) {
        return [] as MembershipTypeRow[];
      }
      const result = await fetchMembershipTypes(supabase, organisationId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useReviewingOrganisationsForEvent(eventId: string | null, enabled = true) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['registration-setup', 'reviewing-organisations', eventId],
    enabled: enabled && eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      const organisationIdResult = await fetchEventOrganisationId(supabase, eventId as string);
      if (!organisationIdResult.ok) {
        throw new Error(organisationIdResult.error.message);
      }
      const organisationId = organisationIdResult.data;
      if (organisationId == null) {
        return [] as OrganisationRow[];
      }
      const result = await fetchReviewingOrganisations(supabase, organisationId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useRegistrationTypeUpsertMutation() {
  const secureSupabase = useSecureSupabase();

  return useMutation({
    mutationFn: async (payload: RegistrationTypeUpsertPayload) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase.rpc(
        'app_base_registration_type_upsert',
        payload as unknown as Record<string, unknown>
      );
      if (error != null) {
        throw new Error(String(error));
      }
      const resolvedId = (data as Array<{ registration_type_id: string }> | null)?.[0]?.registration_type_id;
      if (resolvedId == null) {
        throw new Error('Registration type save returned no id');
      }
      return resolvedId;
    },
  });
}

export function useSetRegistrationTypeActiveMutation() {
  const secureSupabase = useSecureSupabase();

  return useMutation({
    mutationFn: async (params: {
      eventId: string;
      registrationTypeId: string;
      isActive: boolean;
    }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase.rpc('app_base_registration_type_set_active', {
        p_event_id: params.eventId,
        p_registration_type_id: params.registrationTypeId,
        p_is_active: params.isActive,
      });
      if (error != null) {
        throw new Error(String(error));
      }
      const result = (data as Array<{ registration_type_id: string; is_active: boolean }> | null)?.[0];
      if (result == null) {
        throw new Error('Set active returned no result');
      }
      return result;
    },
  });
}

export function useDeleteRegistrationTypeMutation() {
  const secureSupabase = useSecureSupabase();

  return useMutation({
    mutationFn: async (params: { eventId: string; registrationTypeId: string }) => {
      if (secureSupabase == null) {
        throw new Error('Supabase client unavailable');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const result = await deleteRegistrationType(supabase, params.eventId, params.registrationTypeId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
