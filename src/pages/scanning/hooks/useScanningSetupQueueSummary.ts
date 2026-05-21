import { useQuery } from '@tanstack/react-query';
import {
  getQueueEntriesByStatus,
  getQueueStatusCounts,
} from '@/features/scanningRuntime/sync/scanSyncWorker';

export function useScanningSetupQueueSummary(scanPointIds: string[], lastFlushAt: unknown) {
  const queueSummaryQuery = useQuery({
    queryKey: ['ba14', 'queue-summary', scanPointIds, lastFlushAt],
    queryFn: async () => {
      const [counts, failedRows] = await Promise.all([
        getQueueStatusCounts(scanPointIds),
        getQueueEntriesByStatus(['failed'], scanPointIds),
      ]);
      return {
        counts,
        failedEntries: failedRows,
      };
    },
  });

  const queueCounts = queueSummaryQuery.data?.counts ?? {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  };

  const queueFailedEntries = queueSummaryQuery.data?.failedEntries ?? [];

  return { queueSummaryQuery, queueCounts, queueFailedEntries };
}
