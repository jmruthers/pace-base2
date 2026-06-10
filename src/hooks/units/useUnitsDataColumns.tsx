import { Button } from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useMemo } from 'react';
import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';
import type { UnitsPageScope } from '@/hooks/units/unitsPageScope';

export function useUnitsDataColumns(
  scope: UnitsPageScope,
  unitOptions: Array<{ value: string; label: string }>,
  onDeleteUnit: (row: UnitsTableRow) => void
) {
  return useMemo(
    () => [
      {
        id: 'unit_number',
        accessorKey: 'unit_number',
        header: 'Unit #',
        sortable: true,
        fieldType: 'number' as const,
      },
      {
        id: 'unit_name',
        accessorKey: 'unit_name',
        header: 'Unit Name',
        sortable: true,
        fieldType: 'text' as const,
      },
      {
        id: 'subcamp',
        accessorKey: 'subcamp',
        header: 'Subcamp',
        sortable: true,
        fieldType: 'text' as const,
      },
      {
        id: 'contingent',
        accessorKey: 'contingent',
        header: 'Contingent',
        sortable: true,
        fieldType: 'text' as const,
      },
      {
        id: 'parent_unit_id',
        accessorKey: 'parent_unit_id',
        header: 'Parent Unit',
        sortable: true,
        fieldType: 'select' as const,
        fieldOptions: {
          options: unitOptions,
        },
        cell: ({ row }: { row: UnitsTableRow }) => row.parent_unit_label,
      },
      {
        id: 'unitActions',
        header: 'Actions',
        cell: ({ row }: { row: UnitsTableRow }) => (
          <PagePermissionGuard pageName="UnitsPage" operation="delete" scope={scope} fallback={null}>
            <Button type="button" variant="destructive" onClick={() => onDeleteUnit(row)}>
              Delete
            </Button>
          </PagePermissionGuard>
        ),
      },
    ],
    [onDeleteUnit, scope, unitOptions]
  );
}
