import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { EventLogoReference } from './types';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseLogoClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        eq: (...args: unknown[]) => {
          eq: (...args: unknown[]) => {
            order: (...args: unknown[]) => {
              limit: (...args: unknown[]) => {
                maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
              };
            };
          };
        };
      };
    };
  };
};

async function fetchEventLogoReference(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  eventId: string
): Promise<ApiResult<EventLogoReference>> {
  if (secureSupabase == null) {
    return { ok: true, data: null };
  }

  const result = await (secureSupabase as unknown as SupabaseLogoClient)
    .from('core_file_references')
    .select('*')
    .eq('table_name', 'core_events')
    .eq('record_id', eventId)
    .eq('category', 'event_logos')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error != null) {
    return { ok: false, error: { code: 'logo-reference-read-error', message: String(result.error) } };
  }

  return { ok: true, data: (result.data as EventLogoReference) ?? null };
}

export function useEventLogoReference(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery({
    queryKey: ['event-logo-reference', eventId],
    enabled: eventId != null,
    queryFn: async () => {
      const result = await fetchEventLogoReference(secureSupabase, eventId as string);
      return result.ok ? result.data : null;
    },
  });
}
