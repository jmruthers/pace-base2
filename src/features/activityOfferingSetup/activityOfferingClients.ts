import { useSecureSupabase } from '@solvera/pace-core/rbac';

export type OfferingApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type QueryChain = {
  select: (columns: string, options?: Record<string, unknown>) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryChain;
  single: () => Promise<{ data: unknown; error: unknown }>;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  insert: (payload: Record<string, unknown>) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  delete: () => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown; count?: number | null }>;

type OfferingSupabaseLike = {
  from: (table: string) => QueryChain;
};

export function asOfferingSupabaseClient(client: ReturnType<typeof useSecureSupabase>): OfferingSupabaseLike {
  return client as unknown as OfferingSupabaseLike;
}

export function offeringToErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}

export async function resolveOrganisationIdForEvent(
  supabase: OfferingSupabaseLike,
  selectedEvent: unknown,
  eventId: string
): Promise<OfferingApiResult<string>> {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'organisation_id' in selectedEvent) {
    const organisationId = (selectedEvent as { organisation_id?: unknown }).organisation_id;
    if (typeof organisationId === 'string' && organisationId.length > 0) {
      return { ok: true, data: organisationId };
    }
  }

  const { data, error } = await supabase
    .from('core_events')
    .select('organisation_id')
    .eq('event_id', eventId)
    .single();
  if (error != null) {
    return { ok: false, message: offeringToErrorMessage(error, 'Failed to resolve organisation for selected event.') };
  }
  const organisationId = (data as { organisation_id?: string | null } | null)?.organisation_id ?? null;
  if (organisationId == null) {
    return { ok: false, message: 'Failed to resolve organisation for selected event.' };
  }
  return { ok: true, data: organisationId };
}
