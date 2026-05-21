import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { formatDateTime, formatInTimeZone, NormalizeSupabaseError } from '@solvera/pace-core/utils';

import type { ScanResourceOption } from './scanEventTypes';

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
