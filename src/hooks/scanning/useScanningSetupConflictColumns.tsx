import { useMemo } from 'react';
import { Button } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';

export function useScanningSetupConflictColumns(onViewDetail: (conflictId: string) => void): unknown[] {
  return useMemo<unknown[]>(
    () => [
      { id: 'scan_point_name', accessorKey: 'scan_point_name', header: 'Scan point', sortable: true },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: { scanned_at: string } }) =>
          row != null ? formatDateTime(row.scanned_at) : '—',
      },
      {
        id: 'card_identifier',
        accessorKey: 'card_identifier',
        header: 'Card identifier',
        sortable: true,
        cell: ({ row }: { row: { card_identifier: string | null } }) =>
          row != null ? row.card_identifier ?? '—' : '—',
      },
      {
        id: 'validation_reason',
        accessorKey: 'validation_reason',
        header: 'Original reason',
        sortable: true,
        cell: ({ row }: { row: { validation_reason: string | null } }) =>
          row != null ? row.validation_reason ?? '—' : '—',
      },
      {
        id: 'synced_at',
        accessorKey: 'synced_at',
        header: 'Synced at',
        sortable: true,
        cell: ({ row }: { row: { synced_at: string | null } }) =>
          row?.synced_at != null ? formatDateTime(row.synced_at) : '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: { id: string } }) => (
          <Button
            type="button"
            variant="ghost"
            size="small"
            onClick={() => {
              const id = row?.id ?? '';
              if (id.length > 0) {
                onViewDetail(id);
              }
            }}
          >
            View detail
          </Button>
        ),
      },
    ],
    [onViewDetail]
  );
}
