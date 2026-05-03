import { useQueries } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { DashboardCountState } from './types';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseCountClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => Promise<{ count: number | null; error: unknown }>;
    };
  };
};

async function fetchCount(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  tableName: string,
  eventId: string
): Promise<ApiResult<number | null>> {
  if (secureSupabase == null) {
    return { ok: true, data: null };
  }

  const result = await (secureSupabase as unknown as SupabaseCountClient)
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (result.error != null) {
    return { ok: false, error: { code: 'dashboard-count-error', message: String(result.error) } };
  }

  return { ok: true, data: (result.count as number | null) ?? 0 };
}

export function useDashboardCounts(eventId: string | null): DashboardCountState {
  const secureSupabase = useSecureSupabase();

  const queryResults = useQueries({
    queries: [
      {
        queryKey: ['event-dashboard-forms-count', eventId],
        enabled: eventId != null,
        queryFn: async () => {
          const result = await fetchCount(secureSupabase, 'core_forms', eventId as string);
          return result.ok ? result.data : null;
        },
      },
      {
        queryKey: ['event-dashboard-applications-count', eventId],
        enabled: eventId != null,
        queryFn: async () => {
          const result = await fetchCount(secureSupabase, 'base_application', eventId as string);
          return result.ok ? result.data : null;
        },
      },
      {
        queryKey: ['event-dashboard-registration-types-count', eventId],
        enabled: eventId != null,
        queryFn: async () => {
          const result = await fetchCount(secureSupabase, 'base_registration_type', eventId as string);
          return result.ok ? result.data : null;
        },
      },
    ],
  });

  const [forms, applications, registrationTypes] = queryResults;
  const isLoading = queryResults.some((result) => result.isLoading);

  return {
    forms: forms.data ?? (forms.isLoading ? null : forms.isError ? null : 0),
    applications:
      applications.data ?? (applications.isLoading ? null : applications.isError ? null : 0),
    registrationTypes:
      registrationTypes.data ??
      (registrationTypes.isLoading ? null : registrationTypes.isError ? null : 0),
    isLoading,
  };
}
