import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { AttentionSectionItem } from '@solvera/pace-core/components';
import type { EventStub } from '@solvera/pace-core/types';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { eventDisplayName, readEventString } from './shellLandingHelpers';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type SupabaseCountClient = {
  from: (table: string) => {
    select: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        in: (...args: unknown[]) => Promise<{ count: number | null; error: unknown }>;
      };
    };
  };
};

async function fetchPendingApplicationsCount(
  secureSupabase: ReturnType<typeof useSecureSupabase>,
  eventId: string
): Promise<ApiResult<number>> {
  if (secureSupabase == null) {
    return { ok: true, data: 0 };
  }

  const result = await (secureSupabase as unknown as SupabaseCountClient)
    .from('base_application')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('status', ['submitted', 'under_review']);

  if (result.error != null) {
    return {
      ok: false,
      error: { code: 'shell-landing-pending-count-error', message: String(result.error) },
    };
  }

  return { ok: true, data: result.count ?? 0 };
}

export function useShellLandingAttentionItems(
  events: ReadonlyArray<EventStub>,
  onSelectEventApplications: (event: EventStub) => void
): AttentionSectionItem[] {
  const secureSupabase = useSecureSupabase();

  const pendingQueries = useQueries({
    queries: events.map((event) => ({
      queryKey: ['shell-landing', 'pending-applications', event.id],
      enabled: secureSupabase != null,
      queryFn: async () => fetchPendingApplicationsCount(secureSupabase, event.id),
    })),
  });

  const pendingCounts = pendingQueries.map((query) => {
    if (query.data == null || !query.data.ok) {
      return 0;
    }
    return query.data.data;
  });

  return useMemo(() => {
    const items: AttentionSectionItem[] = [];

    events.forEach((event, index) => {
      const pendingCount = pendingCounts[index] ?? 0;
      if (pendingCount <= 0) {
        return;
      }

      const name = eventDisplayName(event);
      const applicationLabel = pendingCount === 1 ? 'application' : 'applications';

      items.push({
        id: `shell-attention-${event.id}`,
        title: name,
        kind: 'Applications',
        sub: `${pendingCount} ${applicationLabel} awaiting approval`,
        tone: 'warn',
        contextLabel: readEventString(event, ['event_code', 'code']) ?? undefined,
        onClick: () => onSelectEventApplications(event),
      });
    });

    return items;
  }, [events, onSelectEventApplications, pendingCounts]);
}
