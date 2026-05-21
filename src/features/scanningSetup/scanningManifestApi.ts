import { useMutation } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';

import { buildManifestFilename, deriveParticipantName } from './shared';
import type {
  ManifestContextType,
  ManifestRow,
} from './scanEventTypes';
import type { ScanPersonRow } from './types';

type QueryChain = {
  select: (columns: string, options?: Record<string, unknown>) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  order: (column: string, options?: { ascending?: boolean }) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  insert: (payload: Record<string, unknown>) => QueryChain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
} & PromiseLike<{ data: unknown; error: unknown; count?: number | null }>;

type ManifestSupabaseLike = {
  from: (table: string) => QueryChain;
};

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): ManifestSupabaseLike {
  return client as unknown as ManifestSupabaseLike;
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function apiSuccess<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function apiFailure(code: string, fallbackMessage: string, error: unknown): ApiResult<never> {
  const normalized = NormalizeSupabaseError(error);
  return {
    ok: false,
    error: {
      code,
      message: normalized.message.length > 0 ? normalized.message : fallbackMessage,
    },
  };
}

function unwrapManifestApiResult<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(result.error.message);
}

export async function loadPersonNameMap(
  supabase: ManifestSupabaseLike,
  personIds: string[]
): Promise<ApiResult<Record<string, string | null>>> {
  if (personIds.length === 0) {
    return apiSuccess({});
  }
  const { data, error } = await supabase
    .from('core_person')
    .select('id, preferred_name, first_name, last_name')
    .in('id', personIds);
  if (error != null) {
    return apiFailure('ba12_load_person_names', 'Failed to load participant names.', error);
  }
  const map: Record<string, string | null> = {};
  ((data as ScanPersonRow[] | null) ?? []).forEach((row) => {
    map[row.id] = deriveParticipantName(row);
  });
  return apiSuccess(map);
}

export async function loadApplicationPersonMap(
  supabase: ManifestSupabaseLike,
  applicationIds: string[]
): Promise<ApiResult<Record<string, string>>> {
  if (applicationIds.length === 0) {
    return apiSuccess({});
  }
  const { data, error } = await supabase
    .from('base_application')
    .select('id, person_id')
    .in('id', applicationIds);
  if (error != null) {
    return apiFailure('ba12_load_applications', 'Failed to resolve applications.', error);
  }
  const map: Record<string, string> = {};
  ((data as Array<{ id: string; person_id: string }> | null) ?? []).forEach((row) => {
    map[row.id] = row.person_id;
  });
  return apiSuccess(map);
}

async function buildManifestRowsForPersonIds(
  supabase: ManifestSupabaseLike,
  organisationId: string,
  personIds: string[]
): Promise<ApiResult<ManifestRow[]>> {
  if (personIds.length === 0) {
    return apiSuccess([]);
  }
  const uniquePersonIds = Array.from(new Set(personIds));
  const { data: memberRows, error: memberError } = await supabase
    .from('core_member')
    .select('id, person_id')
    .eq('organisation_id', organisationId)
    .in('person_id', uniquePersonIds);
  if (memberError != null) {
    return apiFailure('ba12_manifest_members', 'Failed to resolve members for manifest.', memberError);
  }

  const members = (memberRows as Array<{ id: string; person_id: string }> | null) ?? [];
  const memberByPerson: Record<string, string> = {};
  members.forEach((row) => {
    memberByPerson[row.person_id] = row.id;
  });
  const memberIds = members.map((row) => row.id);

  if (memberIds.length === 0) {
    return apiSuccess([]);
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('core_member_card')
    .select('member_id, card_identifier')
    .eq('is_active', true)
    .in('member_id', memberIds);
  if (cardError != null) {
    return apiFailure('ba12_manifest_cards', 'Failed to resolve active cards.', cardError);
  }
  const cardByMember: Record<string, string> = {};
  ((cardRows as Array<{ member_id: string; card_identifier: string }> | null) ?? []).forEach((row) => {
    cardByMember[row.member_id] = row.card_identifier;
  });

  const personResult = await loadPersonNameMap(supabase, uniquePersonIds);
  if (!personResult.ok) {
    return personResult;
  }
  const personMap = personResult.data;
  const rows: ManifestRow[] = [];
  uniquePersonIds.forEach((personId) => {
    const memberId = memberByPerson[personId];
    const cardIdentifier = memberId != null ? cardByMember[memberId] : undefined;
    if (cardIdentifier != null) {
      rows.push({
        card_identifier: cardIdentifier,
        person_id: personId,
        name: personMap[personId] ?? '—',
      });
    }
  });
  return apiSuccess(rows);
}

export async function loadSiteManifest(
  supabase: ManifestSupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ManifestRow[]>> {
  const { data, error } = await supabase
    .from('base_application')
    .select('person_id')
    .eq('event_id', eventId)
    .eq('organisation_id', organisationId)
    .eq('status', 'approved');
  if (error != null) {
    return apiFailure('ba12_site_manifest', 'Failed to load site manifest.', error);
  }
  return buildManifestRowsForPersonIds(
    supabase,
    organisationId,
    ((data as Array<{ person_id: string }> | null) ?? []).map((row) => row.person_id)
  );
}

export async function loadMealManifest(
  supabase: ManifestSupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ManifestRow[]>> {
  return loadSiteManifest(supabase, eventId, organisationId);
}

export async function loadActivityManifest(
  supabase: ManifestSupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ManifestRow[]>> {
  const { data, error } = await supabase
    .from('base_activity_booking')
    .select('application_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed');
  if (error != null) {
    return apiFailure('ba12_activity_manifest', 'Failed to load activity manifest.', error);
  }
  const applicationIds = ((data as Array<{ application_id: string }> | null) ?? []).map(
    (row) => row.application_id
  );
  const appResult = await loadApplicationPersonMap(supabase, applicationIds);
  if (!appResult.ok) {
    return appResult;
  }
  return buildManifestRowsForPersonIds(supabase, organisationId, Object.values(appResult.data));
}

export async function loadTransportManifest(
  supabase: ManifestSupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ManifestRow[]>> {
  const { data, error } = await supabase
    .from('trac_itinerary_assignment')
    .select('application_id')
    .eq('event_id', eventId)
    .eq('organisation_id', organisationId)
    .eq('resource_type', 'transport');
  if (error != null) {
    return apiFailure('ba12_transport_manifest', 'Failed to load transport manifest.', error);
  }
  const applicationIds = ((data as Array<{ application_id: string }> | null) ?? []).map(
    (row) => row.application_id
  );
  const appResult = await loadApplicationPersonMap(supabase, applicationIds);
  if (!appResult.ok) {
    return appResult;
  }
  return buildManifestRowsForPersonIds(supabase, organisationId, Object.values(appResult.data));
}

export async function loadManifestByContext(
  supabase: ManifestSupabaseLike,
  contextType: ManifestContextType,
  eventId: string,
  organisationId: string
): Promise<ManifestRow[]> {
  if (contextType === 'site') {
    return unwrapManifestApiResult(await loadSiteManifest(supabase, eventId, organisationId));
  }
  if (contextType === 'activity') {
    return unwrapManifestApiResult(await loadActivityManifest(supabase, eventId, organisationId));
  }
  if (contextType === 'transport') {
    return unwrapManifestApiResult(await loadTransportManifest(supabase, eventId, organisationId));
  }
  if (contextType === 'meal') {
    return unwrapManifestApiResult(await loadMealManifest(supabase, eventId, organisationId));
  }
  throw new Error('Manifest not available for this context type.');
}

export function downloadManifestJson(rows: ManifestRow[], contextType: ManifestContextType, eventId: string): string {
  const fileName = buildManifestFilename(contextType, eventId, new Date());
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return fileName;
}

export function useManifestDownload() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (params: {
      contextType: ManifestContextType;
      eventId: string;
      organisationId: string;
    }): Promise<{ fileName: string; rows: ManifestRow[] }> => {
      if (secureSupabase == null) {
        throw new Error('Secure Supabase client not available.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const rows = await loadManifestByContext(
        supabase,
        params.contextType,
        params.eventId,
        params.organisationId
      );
      const fileName = downloadManifestJson(rows, params.contextType, params.eventId);
      return { fileName, rows };
    },
  });
}
