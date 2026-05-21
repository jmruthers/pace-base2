import type { ApiResult } from '@solvera/pace-core/types';
import { createErrorResult, ok } from '@solvera/pace-core/types';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { CancelBookingRpcParams, CreateBookingRpcParams } from './bookingRpcTypes';
import type {
  ActivitySessionOptionRow,
  ApprovedApplicationOptionRow,
  BookingQueryRow,
} from './types';

export type SupabaseLike = {
  from: (table: string) => QueryChain;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type QueryChain = {
  select: (columns: string, options?: Record<string, unknown>) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown }>;

const BOOKING_LIST_SELECT = `
  id,
  event_id,
  organisation_id,
  session_id,
  application_id,
  status,
  source,
  booked_at,
  cancelled_at,
  session:base_activity_session (
    id,
    session_name,
    start_time,
    end_time,
    capacity,
    offering:base_activity_offering (
      id,
      name
    )
  ),
  application:base_application (
    id,
    person:core_person!base_application_person_id_fkey (
      preferred_name,
      first_name,
      last_name
    )
  )
`;

const APPROVED_APPLICATIONS_SELECT = `
  id,
  status,
  person:core_person!base_application_person_id_fkey (
    preferred_name,
    first_name,
    last_name
  )
`;

const SESSIONS_SELECT = `
  id,
  session_name,
  start_time,
  end_time,
  capacity,
  offering_id,
  offering:base_activity_offering (
    id,
    name
  )
`;

export async function loadBookingsForEvent(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<BookingQueryRow[]>> {
  const { data, error } = await supabase
    .from('base_activity_booking')
    .select(BOOKING_LIST_SELECT)
    .eq('event_id', eventId)
    .order('booked_at', { ascending: false });
  if (error != null) {
    return createErrorResult(
      'ba11-bookings-load-failed',
      NormalizeSupabaseError(error).message
    );
  }
  return ok((data as BookingQueryRow[] | null) ?? []);
}

export async function loadApprovedApplicationsForBookings(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<ApprovedApplicationOptionRow[]>> {
  const { data, error } = await supabase
    .from('base_application')
    .select(APPROVED_APPLICATIONS_SELECT)
    .eq('event_id', eventId)
    .eq('status', 'approved')
    .order('person(last_name)', { ascending: true });
  if (error != null) {
    return createErrorResult(
      'ba11-approved-applications-load-failed',
      NormalizeSupabaseError(error).message
    );
  }
  const rows = (data as ApprovedApplicationOptionRow[] | null) ?? [];
  const sorted = [...rows].sort((a, b) => {
    const la = a.person?.last_name?.toLowerCase() ?? '';
    const lb = b.person?.last_name?.toLowerCase() ?? '';
    if (la !== lb) return la.localeCompare(lb);
    const fa = a.person?.first_name?.toLowerCase() ?? '';
    const fb = b.person?.first_name?.toLowerCase() ?? '';
    return fa.localeCompare(fb);
  });
  return ok(sorted);
}

export async function loadActivitySessionsForBookings(
  supabase: SupabaseLike,
  eventId: string
): Promise<ApiResult<ActivitySessionOptionRow[]>> {
  const { data, error } = await supabase
    .from('base_activity_session')
    .select(SESSIONS_SELECT)
    .eq('event_id', eventId)
    .order('start_time', { ascending: true });
  if (error != null) {
    return createErrorResult(
      'ba11-sessions-load-failed',
      NormalizeSupabaseError(error).message
    );
  }
  return ok((data as ActivitySessionOptionRow[] | null) ?? []);
}

export async function createActivityBookingRpc(
  supabase: SupabaseLike,
  params: CreateBookingRpcParams
): Promise<ApiResult<void>> {
  const { error } = await supabase.rpc('app_base_activity_booking_create', {
    ...params,
  } as unknown as Record<string, unknown>);
  if (error != null) {
    return createErrorResult('ba11-booking-create-failed', NormalizeSupabaseError(error).message);
  }
  return ok(undefined);
}

export async function postAppBaseActivityBookingCancel(
  supabase: SupabaseLike,
  params: CancelBookingRpcParams
): Promise<ApiResult<void>> {
  const { error } = await supabase.rpc('app_base_activity_booking_cancel', {
    ...params,
  } as unknown as Record<string, unknown>);
  if (error != null) {
    return createErrorResult('ba11-booking-cancel-failed', NormalizeSupabaseError(error).message);
  }
  return ok(undefined);
}
