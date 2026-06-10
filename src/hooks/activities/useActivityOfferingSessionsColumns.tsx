import { Badge, Button } from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { formatDateTime } from '@solvera/pace-core/utils';
import { useMemo } from 'react';
import type { ActivitySessionRow } from '@/features/activityOfferingSetup/types';

type OfferingScope = {
  organisationId: string | null;
  eventId: string | null;
  appId?: string;
};

export function useActivityOfferingSessionsColumns(
  scope: OfferingScope,
  onEditSession: (row: ActivitySessionRow) => void,
  onRequestDeleteSession: (row: ActivitySessionRow) => void
) {
  return useMemo(
    () => [
      {
        id: 'session_name',
        accessorKey: 'session_name',
        header: 'Session Name',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => row.session_name ?? '—',
      },
      {
        id: 'start_time',
        accessorKey: 'start_time',
        header: 'Starts',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => formatDateTime(row.start_time),
      },
      {
        id: 'end_time',
        accessorKey: 'end_time',
        header: 'Ends',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => formatDateTime(row.end_time),
      },
      {
        id: 'capacity',
        accessorKey: 'capacity',
        header: 'Capacity',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => <Badge variant="solid-sec-muted">{row.capacity}</Badge>,
      },
      {
        id: 'location_display_name',
        accessorKey: 'location_display_name',
        header: 'Location',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => row.location_display_name ?? '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: ActivitySessionRow }) => (
          <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <PagePermissionGuard pageName="ActivitiesPage" operation="update" scope={scope} fallback={null}>
              <Button type="button" variant="outline" size="small" onClick={() => onEditSession(row)}>
                Edit
              </Button>
            </PagePermissionGuard>
            <PagePermissionGuard pageName="ActivitiesPage" operation="delete" scope={scope} fallback={null}>
              <Button type="button" variant="destructive" size="small" onClick={() => onRequestDeleteSession(row)}>
                Delete
              </Button>
            </PagePermissionGuard>
          </section>
        ),
      },
    ],
    [onEditSession, onRequestDeleteSession, scope]
  );
}
