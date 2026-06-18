import { useMemo } from 'react';
import { Badge } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import { getHistorySyncBadge, getResultBadge } from '@/features/scanningSetup/scanningBadges';
import type { ScanHistoryRow } from '@/features/scanningSetup/scanEventTypes';

export function useScanningSetupHistoryColumns(): unknown[] {
  return useMemo<unknown[]>(
    () => [
      { id: 'scan_point_name', accessorKey: 'scan_point_name', header: 'Scan point', sortable: true },
      {
        id: 'participant_name',
        accessorKey: 'participant_name',
        header: 'Participant',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) => row.participant_name ?? '—',
      },
      {
        id: 'card_identifier',
        accessorKey: 'card_identifier',
        header: 'Card identifier',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) => row.card_identifier ?? '—',
      },
      {
        id: 'validation_result',
        accessorKey: 'validation_result',
        header: 'Result',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) => {
          const result = getResultBadge(row.validation_result);
          return <Badge variant={result.variant}>{result.label}</Badge>;
        },
      },
      {
        id: 'sync_status',
        accessorKey: 'synced_at',
        header: 'Sync',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) => {
          const sync = getHistorySyncBadge({
            synced_at: row.synced_at,
            validation_result: row.validation_result,
          });
          if (sync.className != null) {
            return (
              <span className={sync.className}>
                <Badge variant={sync.variant}>{sync.label}</Badge>
              </span>
            );
          }
          return <Badge variant={sync.variant}>{sync.label}</Badge>;
        },
      },
      {
        id: 'validation_reason',
        accessorKey: 'validation_reason',
        header: 'Reason',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) => row.validation_reason ?? '—',
      },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) => formatDateTime(row.scanned_at),
      },
      {
        id: 'synced_at',
        accessorKey: 'synced_at',
        header: 'Synced at',
        sortable: true,
        cell: ({ row }: { row: ScanHistoryRow }) =>
          row.synced_at != null ? formatDateTime(row.synced_at) : '—',
      },
    ],
    []
  );
}
