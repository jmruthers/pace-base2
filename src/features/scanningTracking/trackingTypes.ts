export type TrackingContextType = 'site' | 'activity' | 'transport' | 'meal';
export type TrackingDirection = 'in' | 'out' | 'both' | 'neutral';
export type TrackingValidationResult =
  | 'accepted'
  | 'accepted_override'
  | 'rejected'
  | 'upload_conflict';

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
  core_person:
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

export interface TrackingSearchResult {
  applicationId: string;
  personId: string;
  memberId: string | null;
  displayName: string;
  cardIdentifier: string | null;
}
