import { useSecureSupabase } from '@solvera/pace-core/rbac';

export type UnitsApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

type QueryChain = {
  select: (columns: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryChain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => QueryChain;
  update: (payload: Record<string, unknown>) => QueryChain;
  delete: () => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
} & PromiseLike<{ data: unknown; error: unknown }>;

export type UnitsSupabaseLike = {
  from: (table: string) => QueryChain;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): UnitsSupabaseLike {
  return client as unknown as UnitsSupabaseLike;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}

export async function resolveEventOrganisationId(
  supabase: UnitsSupabaseLike,
  eventId: string
): Promise<UnitsApiResult<string>> {
  const { data, error } = await supabase
    .from('core_events')
    .select('organisation_id')
    .eq('event_id', eventId)
    .single();
  if (error != null) {
    return { ok: false, message: toErrorMessage(error, 'Failed to resolve organisation for event.') };
  }
  const organisationId = (data as { organisation_id?: string | null } | null)?.organisation_id ?? null;
  if (organisationId == null) {
    return { ok: false, message: 'Failed to resolve organisation for event.' };
  }
  return { ok: true, data: organisationId };
}
