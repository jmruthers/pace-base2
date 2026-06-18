import { useQueries } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { EventDashboardMetrics } from './types';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type CountQueryBuilder = {
  eq: (column: string, value: string) => CountQueryBuilder;
  in: (column: string, values: ReadonlyArray<string>) => CountQueryBuilder;
  then: Promise<{ count: number | null; error: unknown }>['then'];
};

type SupabaseCountClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => CountQueryBuilder;
  };
};

async function fetchFilteredCount(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  tableName: string,
  eventId: string,
  filter?: { column: string; op: 'eq' | 'in'; value: string | ReadonlyArray<string> }
): Promise<ApiResult<number>> {
  if (secureSupabase == null) {
    return { ok: true, data: 0 };
  }

  let query = (secureSupabase as unknown as SupabaseCountClient)
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (filter?.op === 'eq') {
    query = query.eq(filter.column, filter.value as string);
  } else if (filter?.op === 'in') {
    query = query.in(filter.column, filter.value as ReadonlyArray<string>);
  }

  const result = await query;

  if (result.error != null) {
    return {
      ok: false,
      error: { code: 'dashboard-metric-count-error', message: String(result.error) },
    };
  }

  return { ok: true, data: result.count ?? 0 };
}

function readMetricResult(
  result: ApiResult<number> | undefined,
  isLoading: boolean,
  isError: boolean
): number | null {
  if (result?.ok === true) {
    return result.data;
  }
  if (isLoading) {
    return null;
  }
  if (isError) {
    return null;
  }
  return 0;
}

export function useEventDashboardMetrics(eventId: string | null): EventDashboardMetrics {
  const secureSupabase = useSecureSupabase();

  const queryResults = useQueries({
    queries: [
      {
        queryKey: ['event-dashboard', 'awaiting-applications', eventId],
        enabled: eventId != null && secureSupabase != null,
        queryFn: async () =>
          fetchFilteredCount(secureSupabase, 'base_application', eventId as string, {
            column: 'status',
            op: 'in',
            value: ['submitted', 'under_review'],
          }),
      },
      {
        queryKey: ['event-dashboard', 'approved-applications', eventId],
        enabled: eventId != null && secureSupabase != null,
        queryFn: async () =>
          fetchFilteredCount(secureSupabase, 'base_application', eventId as string, {
            column: 'status',
            op: 'eq',
            value: 'approved',
          }),
      },
      {
        queryKey: ['event-dashboard', 'published-forms', eventId],
        enabled: eventId != null && secureSupabase != null,
        queryFn: async () =>
          fetchFilteredCount(secureSupabase, 'core_forms', eventId as string, {
            column: 'status',
            op: 'eq',
            value: 'published',
          }),
      },
    ],
  });

  const [awaiting, approved, publishedForms] = queryResults;
  const isLoading = queryResults.some((query) => query.isLoading);

  return {
    awaitingApplications: readMetricResult(awaiting.data, awaiting.isLoading, awaiting.isError),
    approvedApplications: readMetricResult(approved.data, approved.isLoading, approved.isError),
    publishedForms: readMetricResult(publishedForms.data, publishedForms.isLoading, publishedForms.isError),
    isLoading,
  };
}
