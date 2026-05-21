import { useMemo } from 'react';
import { Badge } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import { getResultBadge } from '@/features/scanningSetup/scanningBadges';

export function useScanningSetupHistoryColumns(): unknown[] {
  return useMemo<unknown[]>(
    () => [
      { id: 'scan_point_name', accessorKey: 'scan_point_name', header: 'Scan point', sortable: true },
      {
        id: 'participant_name',
        accessorKey: 'participant_name',
        header: 'Participant',
        sortable: true,
        cell: ({ row }: { row: { participant_name: string | null } }) => row?.participant_name ?? '—',
      },
      {
        id: 'card_identifier',
        accessorKey: 'card_identifier',
        header: 'Card identifier',
        sortable: true,
        cell: ({ row }: { row: { card_identifier: string | null } }) => row?.card_identifier ?? '—',
      },
      {
        id: 'validation_result',
        accessorKey: 'validation_result',
        header: 'Result',
        sortable: true,
        cell: ({ row }: { row: { validation_result: 'accepted' | 'rejected' | 'upload_conflict' } }) => {
          const result = getResultBadge(row.validation_result);
          return <Badge variant={result.variant}>{result.label}</Badge>;
        },
      },
      {
        id: 'validation_reason',
        accessorKey: 'validation_reason',
        header: 'Reason',
        sortable: true,
        cell: ({ row }: { row: { validation_reason: string | null } }) => row?.validation_reason ?? '—',
      },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: { scanned_at: string } }) => formatDateTime(row.scanned_at),
      },
      {
        id: 'synced_at',
        accessorKey: 'synced_at',
        header: 'Synced at',
        sortable: true,
        cell: ({ row }: { row: { synced_at: string | null } }) =>
          row.synced_at != null ? formatDateTime(row.synced_at) : '—',
      },
    ],
    []
  );
}
