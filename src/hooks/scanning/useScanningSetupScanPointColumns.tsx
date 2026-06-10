import { useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Badge, Button } from '@solvera/pace-core/components';
import { ChevronRight, Plus, SquarePen, X } from '@solvera/pace-core/icons';
import { getContextBadge, getDirectionBadge, getOfflineBadge, getStatusBadge } from '@/features/scanningSetup/scanningBadges';
import type { ScanPointRow } from '@/features/scanningSetup/types';

export function useScanningSetupScanPointColumns(args: {
  resourceLabelById: Record<string, string>;
  canUpdate: boolean;
  updateLoading: boolean;
  navigate: NavigateFunction;
  onActivate: (scanPointId: string) => void | Promise<void>;
  onRowsEditRequested: (row: ScanPointRow) => void;
  onDeactivateRequested: (row: ScanPointRow) => void;
}): unknown[] {
  const {
    resourceLabelById,
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
      resourceLabelById,
      updateLoading,
    ]
  );
}
