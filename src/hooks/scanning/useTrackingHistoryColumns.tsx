import { Badge } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import { useMemo } from 'react';
import type { TrackingValidationResult } from '@/features/scanningTracking/trackingTypes';
import {
  trackingDirectionBadgeLabel,
  trackingHistoryResultBadge,
} from '@/pages/scanning/scanningTrackingHelpers';

export function useTrackingHistoryColumns() {
  return useMemo(
    () => [
      {
        id: 'scan_point_name',
        accessorKey: 'scan_point_name',
        header: 'Scan point',
        sortable: true,
        cell: ({ row }: { row: { scan_point_name: string } }) => row.scan_point_name,
      },
      {
        id: 'direction',
        accessorKey: 'direction',
        header: 'Direction',
        sortable: true,
        cell: ({ row }: { row: { direction: 'in' | 'out' | 'both' | 'neutral' } }) => (
          <Badge variant="solid-sec-muted">{trackingDirectionBadgeLabel(row.direction)}</Badge>
        ),
      },
      {
        id: 'result',
        accessorKey: 'validation_result',
        header: 'Result',
        sortable: true,
        cell: ({ row }: { row: { validation_result: TrackingValidationResult } }) => {
          const badge = trackingHistoryResultBadge(row.validation_result);
          return (
            <Badge variant={badge.variant as never} aria-label={badge.ariaLabel}>
              {badge.label}
            </Badge>
          );
        },
      },
      {
        id: 'reason',
        accessorKey: 'validation_reason',
        header: 'Reason',
        sortable: true,
        cell: ({ row }: { row: { validation_reason: string | null } }) => row.validation_reason ?? '—',
      },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: { scanned_at: string } }) => formatDateTime(row.scanned_at),
      },
      {
        id: 'device_id',
        accessorKey: 'device_id',
        header: 'Device',
        sortable: true,
        cell: ({ row }: { row: { device_id: string | null } }) => row.device_id ?? '—',
      },
    ],
    []
  );
}
