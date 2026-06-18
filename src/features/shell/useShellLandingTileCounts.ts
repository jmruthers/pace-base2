import { useQueries } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { EventStub } from '@solvera/pace-core/types';
import { readEventNumber } from './shellLandingHelpers';

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

async function fetchTableCount(
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
    return {
      ok: false,
      error: { code: 'shell-landing-table-count-error', message: String(result.error) },
    };
  }

  return { ok: true, data: result.count ?? 0 };
}

export interface ShellLandingTileCounts {
  applications: number | null;
  forms: number | null;
  expectedParticipants: number | null;
  isLoading: boolean;
}

function readCountResult(
  result: ApiResult<number | null> | undefined,
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

export function useShellLandingTileCounts(events: ReadonlyArray<EventStub>): ShellLandingTileCounts[] {
  const secureSupabase = useSecureSupabase();

  const applicationQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: ['shell-landing', 'applications-count', event.id],
      enabled: secureSupabase != null,
      queryFn: async () => fetchTableCount(secureSupabase, 'base_application', event.id),
    })),
  });

  const formsQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: ['shell-landing', 'forms-count', event.id],
      enabled: secureSupabase != null,
      queryFn: async () => fetchTableCount(secureSupabase, 'core_forms', event.id),
    })),
  });

  return events.map((event, index) => {
    const applications = applicationQueries[index];
    const forms = formsQueries[index];
    const isLoading = applications.isLoading || forms.isLoading;

    return {
      applications: readCountResult(applications.data, applications.isLoading, applications.isError),
      forms: readCountResult(forms.data, forms.isLoading, forms.isError),
      expectedParticipants: readEventNumber(event, ['expected_participants']),
      isLoading,
    };
  });
}
