import { Badge, Button } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import { useMemo } from 'react';
import { bookingStatusBadgeProps } from '@/features/bookingOversight/display';
import type { BookingTableRow } from '@/features/bookingOversight/types';
import { shouldShowCancelAction, shouldShowPromoteAction } from '@/features/bookingOversight/rules';

export function useBookingsTableColumns(params: {
  offeringFilterOptions: Array<{ value: string; label: string }>;
  sessionFilterOptions: Array<{ value: string; label: string }>;
  statusFilterOptions: Array<{ value: string; label: string }>;
  canUpdateBookings: boolean;
  canDeleteBookings: boolean;
  onPromote: (row: BookingTableRow) => void;
  onCancel: (row: BookingTableRow) => void;
}) {
  const {
    offeringFilterOptions,
    sessionFilterOptions,
    statusFilterOptions,
    canUpdateBookings,
    canDeleteBookings,
    onPromote,
    onCancel,
  } = params;

  return useMemo(
    () => [
      {
        id: 'participant',
        accessorKey: 'participant',
        header: 'Participant',
        sortable: true,
        searchable: true,
      },
      {
        id: 'offering',
        accessorKey: 'offering',
        header: 'Offering',
        sortable: true,
        searchable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: offeringFilterOptions,
      },
      {
        id: 'session',
        accessorKey: 'session',
        header: 'Session',
        sortable: true,
        searchable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: sessionFilterOptions,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        sortable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: statusFilterOptions,
        cell: ({ row }: { row: BookingTableRow }) => {
          const spec = bookingStatusBadgeProps(row.status);
          return <Badge variant={spec.variant}>{spec.label}</Badge>;
        },
      },
      {
        id: 'sourceLabel',
        accessorKey: 'sourceLabel',
        header: 'Source',
        sortable: true,
      },
      {
        id: 'booked_at',
        accessorKey: 'booked_at',
        header: 'Booked',
        sortable: true,
        cell: ({ row }: { row: BookingTableRow }) => formatDateTime(row.booked_at),
      },
      {
        id: 'row_actions',
        accessorKey: 'id',
        header: 'Actions',
        sortable: false,
        searchable: false,
        cell: ({ row }: { row: BookingTableRow }) => (
          <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
            {shouldShowPromoteAction(row.status, canUpdateBookings) ? (
              <Button type="button" size="small" variant="default" onClick={() => onPromote(row)}>
                Promote
              </Button>
            ) : null}
            {shouldShowCancelAction(row.status, canDeleteBookings) ? (
              <Button type="button" size="small" variant="destructive" onClick={() => onCancel(row)}>
                Cancel
              </Button>
            ) : null}
          </section>
        ),
      },
    ],
    [
      offeringFilterOptions,
      sessionFilterOptions,
      statusFilterOptions,
      canUpdateBookings,
      canDeleteBookings,
      onPromote,
      onCancel,
    ]
  );
}
