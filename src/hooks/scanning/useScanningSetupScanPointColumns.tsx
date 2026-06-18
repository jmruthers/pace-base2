import { useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Badge, Button } from '@solvera/pace-core/components';
import { ChevronRight, Plus, SquarePen, X } from '@solvera/pace-core/icons';
import { getContextBadge, getDirectionBadge, getOfflineBadge, getQueueSyncBadge, getStatusBadge } from '@/features/scanningSetup/scanningBadges';
import type { ScanPointRow } from '@/features/scanningSetup/types';
import type { ScanPointQueueSummary } from '@/features/scanningRuntime/sync/scanSyncWorker';

function renderScanPointSyncBadge(summary: ScanPointQueueSummary | undefined) {
  if (summary == null) {
    return null;
  }
  if (summary.failed > 0) {
    const badge = getQueueSyncBadge('failed');
    return (
      <Badge variant={badge.variant} role="status">
        {badge.label}
        {summary.failed > 1 ? ` (${summary.failed})` : ''}
      </Badge>
    );
  }
  if (summary.pending > 0) {
    const badge = getQueueSyncBadge('pending');
    return (
      <Badge variant={badge.variant} role="status">
        {badge.label}
        {summary.pending > 1 ? ` (${summary.pending})` : ''}
      </Badge>
    );
  }
  if (summary.syncing > 0) {
    const badge = getQueueSyncBadge('syncing');
    return (
      <span className={badge.className}>
        <Badge variant={badge.variant} role="status">
          {badge.label}
        </Badge>
      </span>
    );
  }
  return null;
}

export function useScanningSetupScanPointColumns(args: {
  resourceLabelById: Record<string, string>;
  queueByScanPoint: Record<string, ScanPointQueueSummary>;
  canUpdate: boolean;
  updateLoading: boolean;
  navigate: NavigateFunction;
  onActivate: (scanPointId: string) => void | Promise<void>;
  onRowsEditRequested: (row: ScanPointRow) => void;
  onDeactivateRequested: (row: ScanPointRow) => void;
}): unknown[] {
  const {
    resourceLabelById,
    queueByScanPoint,
    canUpdate,
    updateLoading,
    navigate,
    onActivate,
    onRowsEditRequested,
    onDeactivateRequested,
  } = args;

  return useMemo<unknown[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => row.name,
      },
      {
        id: 'context',
        accessorKey: 'context_type',
        header: 'Context',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => {
          const context = getContextBadge(row.context_type);
          return <Badge variant={context.variant}>{context.label}</Badge>;
        },
      },
      {
        id: 'direction',
        accessorKey: 'direction',
        header: 'Direction',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => {
          const direction = getDirectionBadge(row.direction);
          return <Badge variant={direction.variant}>{direction.label}</Badge>;
        },
      },
      {
        id: 'resource',
        accessorKey: 'resource_id',
        header: 'Resource',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) =>
          row.resource_id != null ? resourceLabelById[row.resource_id] ?? row.resource_id : '—',
      },
      {
        id: 'status',
        accessorKey: 'is_active',
        header: 'Status',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => {
          const status = getStatusBadge(row.is_active);
          const offline = getOfflineBadge(row.context_type);
          return (
            <section className="grid grid-flow-col auto-cols-max gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant={offline.variant}>{offline.label}</Badge>
            </section>
          );
        },
      },
      {
        id: 'sync',
        header: 'Sync',
        cell: ({ row }: { row: ScanPointRow }) => renderScanPointSyncBadge(queueByScanPoint[row.id]),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: ScanPointRow }) => (
          <section className="grid grid-flow-col auto-cols-max gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Launch scan point"
              onClick={() => navigate(`/scanning/${row.id}`)}
            >
              <ChevronRight />
            </Button>
            {canUpdate && !updateLoading && row.is_active ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Edit scan point"
                  onClick={() => onRowsEditRequested(row)}
                >
                  <SquarePen />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Deactivate scan point"
                  onClick={() => onDeactivateRequested(row)}
                >
                  <X />
                </Button>
              </>
            ) : null}
            {canUpdate && !updateLoading && !row.is_active ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Activate scan point"
                onClick={() => void onActivate(row.id)}
              >
                <Plus />
              </Button>
            ) : null}
          </section>
        ),
      },
    ],
    [
      canUpdate,
      navigate,
      onActivate,
      onDeactivateRequested,
      onRowsEditRequested,
      queueByScanPoint,
      resourceLabelById,
      updateLoading,
    ]
  );
}
