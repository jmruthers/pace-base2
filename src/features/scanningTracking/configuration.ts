/* eslint-disable pace-core-compliance/max-named-exports */
import { deriveParticipantName } from '@/features/scanningSetup/shared';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';

type QueryChain = {
  select: (columns: string, options?: Record<string, unknown>) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  order: (column: string, options?: { ascending?: boolean }) => QueryChain;
  or: (filters: string, options?: Record<string, unknown>) => QueryChain;
  ilike: (column: string, pattern: string) => QueryChain;
  limit: (value: number) => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown }>;

export type SupabaseLike = {
  from: (table: string) => QueryChain;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export type TrackingContextType = 'site' | 'activity' | 'transport' | 'meal';
export type TrackingDirection = 'in' | 'out' | 'both' | 'neutral';
export type TrackingValidationResult =
  | 'accepted'
  | 'accepted_override'
  | 'rejected'
  | 'upload_conflict';

type PersonRecord =
  | {
      preferred_name: string | null;
      first_name: string | null;
      last_name: string | null;
    }
  | Array<{
      preferred_name: string | null;
      first_name: string | null;
      last_name: string | null;
    }>
  | null;

export interface TrackingScanPointRow {
  id: string;
  name: string;
  context_type: TrackingContextType;
  direction: TrackingDirection;
  resource_type: string | null;
  resource_id: string | null;
  is_active: boolean;
  event_id: string;
  organisation_id: string;
}

export interface TrackingApplicationRow {
  id: string;
  person_id: string;
  event_id: string;
  status: 'approved';
  core_person: PersonRecord;
}

export interface TrackingMemberRow {
  id: string;
  person_id: string;
  organisation_id: string;
}

export interface TrackingScanEventRow {
  id: string;
  scan_point_id: string;
  member_id: string;
  validation_result: TrackingValidationResult;
  validation_reason: string | null;
  scanned_at: string;
  device_id: string | null;
  override_by: string | null;
  notes: string | null;
}

interface MemberCardSearchRow {
  id: string;
  member_id: string;
  card_identifier: string | null;
  core_member:
    | {
        id: string;
        person_id: string;
      }
    | Array<{
        id: string;
        person_id: string;
      }>
    | null;
}

export interface TrackingSearchResult {
  applicationId: string;
  personId: string;
  memberId: string | null;
  displayName: string;
  cardIdentifier: string | null;
}

export interface TrackingParticipantSnapshot {
  memberId: string | null;
  personId: string;
  applicationId: string;
  displayName: string;
}

export interface PresenceParticipantRow {
  memberId: string | null;
  displayName: string;
  scannedAt: string | null;
}

export interface PresenceGroup {
  key: string;
  label: string;
  count: number;
  participants: PresenceParticipantRow[];
  unknownLocation?: boolean;
}

export interface PointSummaryRow {
  pointId: string;
  name: string;
  direction: TrackingDirection;
  count: number;
  participants: PresenceParticipantRow[];
}

export interface TrackingSnapshot {
  onSiteCount: number;
  offSiteCount: number;
  neverScannedCount: number;
  onSiteGroups: PresenceGroup[];
  offSiteGroups: PresenceGroup[];
  activityRows: PointSummaryRow[];
  transportRows: PointSummaryRow[];
  pointById: Record<string, TrackingScanPointRow>;
  participantByMemberId: Record<string, TrackingParticipantSnapshot>;
}

function apiSuccess<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function apiFailure(
  code: string,
  fallbackMessage: string,
  error: unknown
): ApiResult<never> {
  const normalized = NormalizeSupabaseError(error);
  return {
    ok: false,
    error: {
      code,
      message: normalized.message.length > 0 ? normalized.message : fallbackMessage,
    },
  };
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(result.error.message);
}

function asPersonRecord(value: PersonRecord): {
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
} | null {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function toDisplayName(person: PersonRecord, fallback: string): string {
  const resolved = asPersonRecord(person);
  if (resolved == null) {
    return fallback;
  }
  return deriveParticipantName(resolved) ?? fallback;
}

function escapeLike(term: string): string {
  return term.replace(/[%_]/g, '\\$&');
}

export async function loadTrackingScanPoints(
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<TrackingScanPointRow[]>> {
  const { data, error } = await supabase
    .from('base_scan_point')
    .select(
      'id, name, context_type, direction, resource_type, resource_id, is_active, event_id, organisation_id'
    )
    .eq('event_id', eventId)
    .eq('organisation_id', organisationId);
  if (error != null) {
    return apiFailure('ba16_scan_points', 'Failed to load scan points.', error);
  }
  return apiSuccess(
    ((data as TrackingScanPointRow[] | null) ?? []).map((row) => ({
      ...row,
      resource_type: row.resource_type ?? null,
      resource_id: row.resource_id ?? null,
    }))
  );
}

export async function loadApprovedParticipants(
  supabase: SupabaseLike,
  eventId: string,
  organisationId: string
): Promise<ApiResult<TrackingApplicationRow[]>> {
  const { data, error } = await supabase
    .from('base_application')
    .select('id, person_id, event_id, status, core_person(preferred_name, first_name, last_name)')
    .eq('event_id', eventId)
    .eq('organisation_id', organisationId)
    .eq('status', 'approved')
    .limit(500);
  if (error != null) {
    return apiFailure(
      'ba16_approved_participants',
      'Failed to load approved participants.',
      error
    );
  }
  return apiSuccess((data as TrackingApplicationRow[] | null) ?? []);
}

export async function loadMembersByPersonIds(
  supabase: SupabaseLike,
  personIds: string[],
  organisationId: string
): Promise<ApiResult<TrackingMemberRow[]>> {
  if (personIds.length === 0) {
    return apiSuccess([]);
  }
  const { data, error } = await supabase
    .from('core_member')
    .select('id, person_id, organisation_id')
    .eq('organisation_id', organisationId)
    .in('person_id', personIds)
    .limit(500);
  if (error != null) {
    return apiFailure(
      'ba16_member_lookup',
      'Failed to resolve members for participants.',
      error
    );
  }
  return apiSuccess((data as TrackingMemberRow[] | null) ?? []);
}

export async function loadTrackingEvents(
  supabase: SupabaseLike,
  scanPointIds: string[],
  options?: {
    acceptedOnly?: boolean;
    memberId?: string;
  }
): Promise<ApiResult<TrackingScanEventRow[]>> {
  if (scanPointIds.length === 0) {
    return apiSuccess([]);
  }
  let query = supabase
    .from('base_scan_event')
    .select(
      'id, scan_point_id, member_id, validation_result, validation_reason, scanned_at, device_id, override_by, notes'
    )
    .in('scan_point_id', scanPointIds)
    .order('scanned_at', { ascending: false })
    .limit(500);

  if (options?.acceptedOnly === true) {
    query = query.in('validation_result', ['accepted', 'accepted_override']);
  }
  if (options?.memberId != null) {
    query = query.eq('member_id', options.memberId);
  }

  const { data, error } = await query;
  if (error != null) {
    return apiFailure('ba16_scan_events', 'Failed to load scan events.', error);
  }
  return apiSuccess(
    ((data as TrackingScanEventRow[] | null) ?? []).map((row) => ({
      ...row,
      validation_reason: row.validation_reason ?? null,
      device_id: row.device_id ?? null,
      override_by: row.override_by ?? null,
      notes: row.notes ?? null,
    }))
  );
}

export async function searchTrackingParticipants(
  supabase: SupabaseLike,
  term: string,
  eventId: string,
  organisationId: string
): Promise<ApiResult<TrackingSearchResult[]>> {
  const trimmed = term.trim();
  if (trimmed.length < 2) {
    return apiSuccess([]);
  }

  const pattern = `%${escapeLike(trimmed)}%`;

  const { data: appRowsData, error: appRowsError } = await supabase
    .from('base_application')
    .select('id, person_id, event_id, status, core_person!inner(preferred_name, first_name, last_name)')
    .eq('event_id', eventId)
    .eq('organisation_id', organisationId)
    .eq('status', 'approved')
    .or(
      `preferred_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
      { foreignTable: 'core_person' }
    )
    .limit(20);
  if (appRowsError != null) {
    return apiFailure(
      'ba16_search_name',
      'Failed to search participants by name.',
      appRowsError
    );
  }

  const appRows = (appRowsData as TrackingApplicationRow[] | null) ?? [];
  const approvedByPersonId = new Map<string, TrackingApplicationRow>();
  appRows.forEach((row) => {
    if (!approvedByPersonId.has(row.person_id)) {
      approvedByPersonId.set(row.person_id, row);
    }
  });
  const appPersonIds = Array.from(approvedByPersonId.keys());

  const nameResultMembers =
    appPersonIds.length === 0
      ? []
      : unwrapApiResult(
          await loadMembersByPersonIds(supabase, appPersonIds, organisationId)
        );
  const memberByPersonId = new Map<string, string>();
  nameResultMembers.forEach((member) => {
    if (!memberByPersonId.has(member.person_id)) {
      memberByPersonId.set(member.person_id, member.id);
    }
  });

  const { data: cardRowsData, error: cardRowsError } = await supabase
    .from('core_member_card')
    .select('id, member_id, card_identifier, core_member(id, person_id)')
    .eq('organisation_id', organisationId)
    .ilike('card_identifier', pattern)
    .eq('is_active', true)
    .limit(20);
  if (cardRowsError != null) {
    return apiFailure(
      'ba16_search_card',
      'Failed to search participants by card identifier.',
      cardRowsError
    );
  }

  const cardRows = (cardRowsData as MemberCardSearchRow[] | null) ?? [];
  const resultsByPersonId = new Map<string, TrackingSearchResult>();

  appRows.forEach((row) => {
    const displayName = toDisplayName(row.core_person, row.person_id);
    resultsByPersonId.set(row.person_id, {
      applicationId: row.id,
      personId: row.person_id,
      memberId: memberByPersonId.get(row.person_id) ?? null,
      displayName,
      cardIdentifier: null,
    });
  });

  cardRows.forEach((row) => {
    const memberRecord = Array.isArray(row.core_member) ? row.core_member[0] : row.core_member;
    const personId = memberRecord?.person_id ?? null;
    if (personId == null) {
      return;
    }
    const approvedRow = approvedByPersonId.get(personId);
    if (approvedRow == null) {
      return;
    }
    const existing = resultsByPersonId.get(personId);
    const displayName = toDisplayName(approvedRow.core_person, approvedRow.person_id);
    resultsByPersonId.set(personId, {
      applicationId: approvedRow.id,
      personId: approvedRow.person_id,
      memberId: row.member_id,
      displayName,
      cardIdentifier: row.card_identifier ?? existing?.cardIdentifier ?? null,
    });
  });

  return apiSuccess(
    Array.from(resultsByPersonId.values())
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, 20)
  );
}

function groupLatestEventsByMember(
  events: TrackingScanEventRow[]
): Map<string, TrackingScanEventRow> {
  const latest = new Map<string, TrackingScanEventRow>();
  events.forEach((event) => {
    if (!latest.has(event.member_id)) {
      latest.set(event.member_id, event);
    }
  });
  return latest;
}

function buildPointSummaries(
  points: TrackingScanPointRow[],
  acceptedEvents: TrackingScanEventRow[],
  participantByMemberId: Record<string, TrackingParticipantSnapshot>
): PointSummaryRow[] {
  const pointIds = new Set(points.map((point) => point.id));
  const acceptedByPoint = new Map<string, TrackingScanEventRow[]>();
  acceptedEvents.forEach((event) => {
    if (!pointIds.has(event.scan_point_id)) {
      return;
    }
    const rows = acceptedByPoint.get(event.scan_point_id) ?? [];
    rows.push(event);
    acceptedByPoint.set(event.scan_point_id, rows);
  });

  const summaries = points.map((point) => {
    const rows = acceptedByPoint.get(point.id) ?? [];
    const latestByMember = groupLatestEventsByMember(rows);
    const participants = Array.from(latestByMember.entries())
      .map(([memberId, event]) => ({
        memberId,
        displayName: participantByMemberId[memberId]?.displayName ?? memberId,
        scannedAt: event.scanned_at,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      pointId: point.id,
      name: point.name,
      direction: point.direction,
      count: rows.length,
      participants,
    };
  });

  return summaries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function deriveTrackingSnapshot(params: {
  scanPoints: TrackingScanPointRow[];
  approvedApplications: TrackingApplicationRow[];
  memberRows: TrackingMemberRow[];
  allEvents: TrackingScanEventRow[];
  acceptedEvents: TrackingScanEventRow[];
}): TrackingSnapshot {
  const { scanPoints, approvedApplications, memberRows, allEvents, acceptedEvents } = params;

  const pointById: Record<string, TrackingScanPointRow> = {};
  scanPoints.forEach((point) => {
    pointById[point.id] = point;
  });

  const memberByPersonId = new Map<string, string>();
  memberRows.forEach((member) => {
    if (!memberByPersonId.has(member.person_id)) {
      memberByPersonId.set(member.person_id, member.id);
    }
  });

  const participantByMemberId: Record<string, TrackingParticipantSnapshot> = {};
  const approvedSnapshots = approvedApplications.map((application) => {
    const memberId = memberByPersonId.get(application.person_id) ?? null;
    const snapshot: TrackingParticipantSnapshot = {
      memberId,
      personId: application.person_id,
      applicationId: application.id,
      displayName: toDisplayName(application.core_person, application.person_id),
    };
    if (memberId != null) {
      participantByMemberId[memberId] = snapshot;
    }
    return snapshot;
  });

  const approvedMemberIds = new Set(
    approvedSnapshots
      .map((snapshot) => snapshot.memberId)
      .filter((memberId): memberId is string => memberId != null)
  );

  const scopedAllEvents = allEvents.filter((event) => approvedMemberIds.has(event.member_id));
  const scopedAcceptedEvents = acceptedEvents.filter((event) => approvedMemberIds.has(event.member_id));

  const membersWithAnyEvent = new Set(scopedAllEvents.map((event) => event.member_id));

  const sitePointIds = new Set(
    scanPoints.filter((point) => point.context_type === 'site').map((point) => point.id)
  );
  const nonSitePointIds = new Set(
    scanPoints.filter((point) => point.context_type !== 'site').map((point) => point.id)
  );

  const latestAcceptedSiteByMember = groupLatestEventsByMember(
    scopedAcceptedEvents.filter((event) => sitePointIds.has(event.scan_point_id))
  );
  const latestAcceptedNonSiteByMember = groupLatestEventsByMember(
    scopedAcceptedEvents.filter((event) => nonSitePointIds.has(event.scan_point_id))
  );

  const onSiteMemberIds: string[] = [];
  const offSiteMemberIds: string[] = [];
  latestAcceptedSiteByMember.forEach((event, memberId) => {
    const point = pointById[event.scan_point_id];
    if (point == null) {
      return;
    }
    if (point.direction === 'out') {
      offSiteMemberIds.push(memberId);
      return;
    }
    if (point.direction === 'in' || point.direction === 'both') {
      onSiteMemberIds.push(memberId);
    }
  });

  const onSiteByPoint = new Map<string, PresenceParticipantRow[]>();
  onSiteMemberIds.forEach((memberId) => {
    const event = latestAcceptedSiteByMember.get(memberId);
    if (event == null) {
      return;
    }
    const row: PresenceParticipantRow = {
      memberId,
      displayName: participantByMemberId[memberId]?.displayName ?? memberId,
      scannedAt: event.scanned_at,
    };
    const rows = onSiteByPoint.get(event.scan_point_id) ?? [];
    rows.push(row);
    onSiteByPoint.set(event.scan_point_id, rows);
  });

  const onSiteGroups = Array.from(onSiteByPoint.entries())
    .map(([pointId, rows]) => {
      const point = pointById[pointId];
      return {
        key: `site-${pointId}`,
        label: point?.name ?? 'Unknown scan point',
        count: rows.length,
        participants: rows.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      } satisfies PresenceGroup;
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const offSiteByGroup = new Map<string, PresenceGroup>();
  const unknownOffSite: PresenceParticipantRow[] = [];
  offSiteMemberIds.forEach((memberId) => {
    const event = latestAcceptedNonSiteByMember.get(memberId);
    const participant: PresenceParticipantRow = {
      memberId,
      displayName: participantByMemberId[memberId]?.displayName ?? memberId,
      scannedAt: event?.scanned_at ?? null,
    };
    if (event == null) {
      unknownOffSite.push(participant);
      return;
    }
    const point = pointById[event.scan_point_id];
    if (point == null) {
      unknownOffSite.push(participant);
      return;
    }
    const contextLabel =
      point.context_type === 'activity'
        ? 'Activity'
        : point.context_type === 'transport'
          ? 'Transport'
          : point.context_type === 'meal'
            ? 'Meal'
            : 'Site';
    const key = `${point.id}:${point.context_type}`;
    const label = `${point.name} (${contextLabel})`;
    const group =
      offSiteByGroup.get(key) ??
      ({
        key,
        label,
        count: 0,
        participants: [],
      } satisfies PresenceGroup);
    group.participants.push(participant);
    group.count = group.participants.length;
    offSiteByGroup.set(key, group);
  });

  const namedOffSiteGroups = Array.from(offSiteByGroup.values())
    .map((group) => ({
      ...group,
      participants: group.participants.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const offSiteGroups =
    unknownOffSite.length > 0
      ? [
          ...namedOffSiteGroups,
          {
            key: 'unknown-location',
            label: 'Unknown location',
            count: unknownOffSite.length,
            unknownLocation: true,
            participants: unknownOffSite.sort((a, b) => a.displayName.localeCompare(b.displayName)),
          } satisfies PresenceGroup,
        ]
      : namedOffSiteGroups;

  const neverScannedCount = approvedSnapshots.filter((snapshot) => {
    if (snapshot.memberId == null) {
      return true;
    }
    return !membersWithAnyEvent.has(snapshot.memberId);
  }).length;

  const activityRows = buildPointSummaries(
    scanPoints.filter((point) => point.context_type === 'activity'),
    scopedAcceptedEvents,
    participantByMemberId
  );
  const transportRows = buildPointSummaries(
    scanPoints.filter((point) => point.context_type === 'transport'),
    scopedAcceptedEvents,
    participantByMemberId
  );

  return {
    onSiteCount: onSiteMemberIds.length,
    offSiteCount: offSiteMemberIds.length,
    neverScannedCount,
    onSiteGroups,
    offSiteGroups,
    activityRows,
    transportRows,
    pointById,
    participantByMemberId,
  };
}
