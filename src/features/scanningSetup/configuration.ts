/* eslint-disable pace-core-compliance/max-named-exports */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { formatDateTime, formatInTimeZone, NormalizeSupabaseError } from '@solvera/pace-core/utils';
import {
  buildManifestFilename,
  deriveParticipantName,
  requiresResource,
  toResourceType,
} from './shared';
import type {
  ManifestContextType,
  ManifestRow,
  ScanCardRow,
  ScanConflictRow,
  ScanEventRow,
  ScanHistoryRow,
  ScanPersonRow,
  ScanPointMutationInput,
  ScanPointRow,
  ScanResourceOption,
} from './types';

type QueryChain = {
  select: (columns: string, options?: Record<string, unknown>) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  order: (column: string, options?: { ascending?: boolean }) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  insert: (payload: Record<string, unknown>) => QueryChain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
} & PromiseLike<{ data: unknown; error: unknown; count?: number | null }>;

type SupabaseLike = {
  from: (table: string) => QueryChain;
};

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function toError(error: unknown, fallback: string): Error {
  const normalized = NormalizeSupabaseError(error);
  if (normalized.message.length > 0) {
    return new Error(normalized.message);
  }
  return new Error(fallback);
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

function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(result.error.message);
}

function mapScanPointRows(rows: unknown): ScanPointRow[] {
  return ((rows as ScanPointRow[] | null) ?? []).map((row) => ({
    ...row,
    resource_id: row.resource_id ?? null,
    resource_type: row.resource_type ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    created_by: row.created_by ?? null,
  }));
}

async function loadCardsById(
  supabase: SupabaseLike,
  cardIds: string[]
): Promise<ApiResult<Record<string, string | null>>> {
  if (cardIds.length === 0) {
    return apiSuccess({});
  }
  const { data, error } = await supabase
    .from('core_member_card')
    .select('id, card_identifier')
    .in('id', cardIds);
  if (error != null) {
    return apiFailure('ba12_load_cards', 'Failed to load card identifiers.', error);
  }
  const map: Record<string, string | null> = {};
  ((data as ScanCardRow[] | null) ?? []).forEach((row) => {
    map[row.id] = row.card_identifier ?? null;
  });
  return apiSuccess(map);
}

async function loadPersonNameMap(
  supabase: SupabaseLike,
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

async function loadEventScanPointRows(
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ScanPointRow[]>> {
  const { data, error } = await supabase
    .from('base_scan_point')
    .select(
      'id, name, event_id, organisation_id, context_type, direction, resource_type, resource_id, is_active, created_at, updated_at, created_by'
    )
    .eq('event_id', eventId)
    .eq('organisation_id', organisationId);

  if (error != null) {
    return apiFailure('ba12_load_scan_points', 'Failed to load scan points.', error);
  }
  return apiSuccess(mapScanPointRows(data).sort((a, b) => a.name.localeCompare(b.name)));
}

async function loadScanEventsForPoints(
  supabase: SupabaseLike,
  scanPointIds: string[],
  conflictOnly: boolean
): Promise<ApiResult<ScanEventRow[]>> {
  if (scanPointIds.length === 0) {
    return apiSuccess([]);
  }
  const query = supabase
    .from('base_scan_event')
    .select(
      'id, scan_point_id, scan_card_id, validation_result, validation_reason, scanned_at, synced_at, notes, override_by, application_id'
    )
    .in('scan_point_id', scanPointIds)
    .order('scanned_at', { ascending: false });

  const { data, error } = await (conflictOnly
    ? query.eq('validation_result', 'upload_conflict')
    : query);

  if (error != null) {
    return apiFailure('ba12_load_scan_events', 'Failed to load scan events.', error);
  }
  return apiSuccess(
    ((data as ScanEventRow[] | null) ?? []).map((row) => ({
      ...row,
      scan_card_id: row.scan_card_id ?? null,
      validation_reason: row.validation_reason ?? null,
      synced_at: row.synced_at ?? null,
      notes: row.notes ?? null,
      override_by: row.override_by ?? null,
      application_id: row.application_id ?? null,
    }))
  );
}

async function loadApplicationPersonMap(
  supabase: SupabaseLike,
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
  supabase: SupabaseLike,
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

export function useScanPoints(eventId: string | null, organisationId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba12', 'scan-points', eventId, organisationId],
    enabled: secureSupabase != null && eventId != null && organisationId != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      return loadScanPointsForEvent(supabase, eventId as string, organisationId as string);
    },
  });
}

export function useActivityResourceOptions(eventId: string | null, eventTimezone: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba12', 'activity-resource-options', eventId, eventTimezone],
    enabled: secureSupabase != null && eventId != null,
    queryFn: async (): Promise<ScanResourceOption[]> => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_activity_session')
        .select(
          'id, session_name, start_time, offering:base_activity_offering ( id, name )'
        )
        .eq('event_id', eventId as string)
        .order('start_time', { ascending: true });
      if (error != null) {
        throw toError(error, 'Failed to load activity sessions.');
      }
      return ((data as Array<{
        id: string;
        session_name: string | null;
        start_time: string;
        offering: { id: string; name: string } | null;
      }> | null) ?? []).map((row) => {
        const offeringName = row.offering?.name ?? 'Activity';
        const sessionLabel = row.session_name?.trim().length
          ? row.session_name
          : eventTimezone != null && eventTimezone.length > 0
            ? formatInTimeZone(row.start_time, eventTimezone, 'd MMM yyyy h:mm a')
            : formatDateTime(row.start_time);
        return { id: row.id, label: `${offeringName} — ${sessionLabel}` };
      });
    },
  });
}

export function useTransportResourceOptions(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba12', 'transport-resource-options', eventId],
    enabled: secureSupabase != null && eventId != null,
    queryFn: async (): Promise<ScanResourceOption[]> => {
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('trac_activity')
        .select('id, name')
        .eq('event_id', eventId as string)
        .order('name', { ascending: true });
      if (error != null) {
        throw toError(error, 'Failed to load transport resources.');
      }
      return ((data as Array<{ id: string; name: string }> | null) ?? []).map((row) => ({
        id: row.id,
        label: row.name,
      }));
    },
  });
}

export function useScanConflicts(eventId: string | null, organisationId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba12', 'scan-conflicts', eventId, organisationId],
    enabled: secureSupabase != null && eventId != null && organisationId != null,
    queryFn: async (): Promise<ScanConflictRow[]> => {
      const supabase = asSupabaseClient(secureSupabase);
      return unwrapApiResult(
        await loadConflictsForEvent(supabase, eventId as string, organisationId as string)
      );
    },
  });
}

export function useScanHistory(eventId: string | null, organisationId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba12', 'scan-history', eventId, organisationId],
    enabled: secureSupabase != null && eventId != null && organisationId != null,
    queryFn: async (): Promise<ScanHistoryRow[]> => {
      const supabase = asSupabaseClient(secureSupabase);
      return unwrapApiResult(
        await loadHistoryForEvent(supabase, eventId as string, organisationId as string)
      );
    },
  });
}

export async function loadScanPointsForEvent(
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ScanPointRow[]> {
  return unwrapApiResult(await loadEventScanPointRows(supabase, eventId, organisationId));
}

export async function loadConflictsForEvent(
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ScanConflictRow[]>> {
  const pointsResult = await loadEventScanPointRows(supabase, eventId, organisationId);
  if (!pointsResult.ok) {
    return { ok: false, error: pointsResult.error };
  }
  const points = pointsResult.data;
  const pointNameById: Record<string, string> = {};
  const pointIds = points.map((point) => {
    pointNameById[point.id] = point.name;
    return point.id;
  });
  const eventsResult = await loadScanEventsForPoints(supabase, pointIds, true);
  if (!eventsResult.ok) {
    return { ok: false, error: eventsResult.error };
  }
  const events = eventsResult.data;
  const cardResult = await loadCardsById(
    supabase,
    events.map((row) => row.scan_card_id).filter((value): value is string => value != null)
  );
  if (!cardResult.ok) {
    return { ok: false, error: cardResult.error };
  }
  const cardMap = cardResult.data;
  return apiSuccess(
    events.map((row) => ({
      ...row,
      scan_point_name: pointNameById[row.scan_point_id] ?? '—',
      card_identifier: row.scan_card_id != null ? cardMap[row.scan_card_id] ?? null : null,
    }))
  );
}

export async function loadHistoryForEvent(
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ScanHistoryRow[]>> {
  const pointsResult = await loadEventScanPointRows(supabase, eventId, organisationId);
  if (!pointsResult.ok) {
    return { ok: false, error: pointsResult.error };
  }
  const points = pointsResult.data;
  const pointNameById: Record<string, string> = {};
  const pointIds = points.map((point) => {
    pointNameById[point.id] = point.name;
    return point.id;
  });
  const eventsResult = await loadScanEventsForPoints(supabase, pointIds, false);
  if (!eventsResult.ok) {
    return { ok: false, error: eventsResult.error };
  }
  const events = eventsResult.data;
  const cardResult = await loadCardsById(
    supabase,
    events.map((row) => row.scan_card_id).filter((value): value is string => value != null)
  );
  if (!cardResult.ok) {
    return { ok: false, error: cardResult.error };
  }
  const cardMap = cardResult.data;

  const appResult = await loadApplicationPersonMap(
    supabase,
    events.map((row) => row.application_id).filter((value): value is string => value != null)
  );
  if (!appResult.ok) {
    return { ok: false, error: appResult.error };
  }
  const appToPerson = appResult.data;
  const personResult = await loadPersonNameMap(supabase, Object.values(appToPerson));
  if (!personResult.ok) {
    return { ok: false, error: personResult.error };
  }
  const personMap = personResult.data;

  return apiSuccess(
    events.map((row) => {
      const personId = row.application_id != null ? appToPerson[row.application_id] : undefined;
      return {
        ...row,
        scan_point_name: pointNameById[row.scan_point_id] ?? '—',
        card_identifier: row.scan_card_id != null ? cardMap[row.scan_card_id] ?? null : null,
        participant_name: personId != null ? personMap[personId] ?? null : null,
      };
    })
  );
}

export function useCreateScanPointMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (input: ScanPointMutationInput) => {
      if (secureSupabase == null) {
        throw new Error('Secure Supabase client not available.');
      }
      if (requiresResource(input.context_type) && (input.resource_id == null || input.resource_id.length === 0)) {
        throw new Error('A resource is required for this context type.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { error } = await supabase.from('base_scan_point')['insert']({
        name: input.name.trim(),
        event_id: input.eventId,
        organisation_id: input.organisationId,
        context_type: input.context_type,
        direction: input.direction,
        resource_type: toResourceType(input.context_type),
        resource_id: requiresResource(input.context_type) ? input.resource_id : null,
        is_active: true,
        created_by: input.userId,
      });
      if (error != null) {
        throw toError(error, 'Failed to create scan point.');
      }
      return null;
    },
  });
}

export function useUpdateScanPointMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (
      input: ScanPointMutationInput & {
        scanPointId: string;
      }
    ) => {
      if (secureSupabase == null) {
        throw new Error('Secure Supabase client not available.');
      }
      if (requiresResource(input.context_type) && (input.resource_id == null || input.resource_id.length === 0)) {
        throw new Error('A resource is required for this context type.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_scan_point')['update']({
          name: input.name.trim(),
          context_type: input.context_type,
          direction: input.direction,
          resource_type: toResourceType(input.context_type),
          resource_id: requiresResource(input.context_type) ? input.resource_id : null,
          updated_by: input.userId,
        })
        .eq('id', input.scanPointId)
        .eq('event_id', input.eventId)
        .select('id')
        .maybeSingle();

      if (error != null) {
        throw toError(error, 'Failed to update scan point.');
      }
      if (data == null) {
        throw new Error('Scan point could not be saved — it may have been deleted.');
      }
      return null;
    },
  });
}

export function useSetScanPointActiveMutation() {
  const secureSupabase = useSecureSupabase();
  return useMutation({
    mutationFn: async (input: { scanPointId: string; eventId: string; userId: string | null; isActive: boolean }) => {
      if (secureSupabase == null) {
        throw new Error('Secure Supabase client not available.');
      }
      const supabase = asSupabaseClient(secureSupabase);
      const { data, error } = await supabase
        .from('base_scan_point')['update']({
          is_active: input.isActive,
          updated_by: input.userId,
        })
        .eq('id', input.scanPointId)
        .eq('event_id', input.eventId)
        .select('id')
        .maybeSingle();
      if (error != null) {
        throw toError(error, 'Failed to update scan point status.');
      }
      if (data == null) {
        throw new Error('Scan point could not be updated — it may have been deleted.');
      }
      return null;
    },
  });
}

export async function loadSiteManifest(
  supabase: SupabaseLike,
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
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<ManifestRow[]>> {
  return loadSiteManifest(supabase, eventId, organisationId);
}

export async function loadActivityManifest(
  supabase: SupabaseLike,
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
  supabase: SupabaseLike,
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
  supabase: SupabaseLike,
  contextType: ManifestContextType,
  eventId: string,
  organisationId: string
): Promise<ManifestRow[]> {
  if (contextType === 'site') {
    return unwrapApiResult(await loadSiteManifest(supabase, eventId, organisationId));
  }
  if (contextType === 'activity') {
    return unwrapApiResult(await loadActivityManifest(supabase, eventId, organisationId));
  }
  if (contextType === 'transport') {
    return unwrapApiResult(await loadTransportManifest(supabase, eventId, organisationId));
  }
  if (contextType === 'meal') {
    return unwrapApiResult(await loadMealManifest(supabase, eventId, organisationId));
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
