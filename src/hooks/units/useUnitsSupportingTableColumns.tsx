import { Badge, Button } from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useMemo } from 'react';
import type { UnitAssignmentTableRow, UnitRoleTypeRow } from '@/features/unitsCoordination/types';
import type { UnitsPageScope } from '@/hooks/units/unitsPageScope';

export function useUnitsRoleTypesColumns(scope: UnitsPageScope, onDeleteRoleType: (row: UnitRoleTypeRow) => void) {
  return useMemo(
    () => [
      {
        id: 'role_title',
        accessorKey: 'role_title',
        header: 'Role Title',
        sortable: true,
        fieldType: 'text' as const,
      },
      {
        id: 'roleTypeActions',
        header: 'Actions',
        cell: ({ row }: { row: UnitRoleTypeRow }) => (
          <PagePermissionGuard pageName="UnitsPage" operation="delete" scope={scope} fallback={null}>
            <Button type="button" variant="destructive" onClick={() => onDeleteRoleType(row)}>
              Delete
            </Button>
          </PagePermissionGuard>
        ),
      },
    ],
    [onDeleteRoleType, scope]
  );
}

export function useAssignmentsTableColumns(
  scope: UnitsPageScope,
  onRemoveAssignment: (assignmentId: string, applicantName: string) => void
) {
  return useMemo(
    () => [
      {
        id: 'applicant_name',
        accessorKey: 'applicant_name',
        header: 'Applicant Name',
        sortable: true,
      },
      {
        id: 'applicant_email',
        accessorKey: 'applicant_email',
        header: 'Email',
        sortable: true,
      },
      {
        id: 'application_status',
        accessorKey: 'application_status',
        header: 'Application Status',
        sortable: true,
        cell: ({ row }: { row: UnitAssignmentTableRow }) => (
          <Badge variant="solid-main-normal">{row.application_status}</Badge>
        ),
      },
      {
        id: 'assigned_role',
        accessorKey: 'assigned_role',
        header: 'Assigned Role',
        sortable: true,
        cell: ({ row }: { row: UnitAssignmentTableRow }) => row.assigned_role ?? <em>No role assigned</em>,
      },
      {
        id: 'assignmentActions',
        header: 'Actions',
        cell: ({ row }: { row: UnitAssignmentTableRow }) =>
          row.role_assignment_id == null ? null : (
            <PagePermissionGuard pageName="UnitsPage" operation="update" scope={scope} fallback={null}>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onRemoveAssignment(row.role_assignment_id as string, row.applicant_name)}
              >
                Remove
              </Button>
            </PagePermissionGuard>
          ),
      },
    ],
    [onRemoveAssignment, scope]
  );
}
