import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmationDialog,
  DataTable,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ImportSummary,
} from '@solvera/pace-core/components';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  useApprovedApplications,
  useAssignRoleMutation,
  useCreateRoleTypeMutation,
  useCreateUnitMutation,
  useDeleteRoleTypeMutation,
  useDeleteUnitMutation,
  useRemoveRoleAssignmentMutation,
  useRoleTypesList,
  useUnitRoleAssignments,
  useUnitsList,
  useUpdateRoleTypeMutation,
  useUpdateUnitMutation,
} from '@/features/unitsCoordination/configuration';
import {
  composeAssignmentsTableRows,
  computeDescendantIds,
  formatParentUnitLabel,
  formatUnitDisplayLabel,
  normalizeOptionalText,
  normalizeRoleTitle,
  validateUnitNumber,
} from '@/features/unitsCoordination/stateHelpers';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { UnitRoleTypeRow, UnitRow } from '@/features/unitsCoordination/types';

interface UnitsTableRow extends UnitRow {
  parent_unit_label: string;
}

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

function parseUnitNumberFromInput(value: unknown): number {
  const validated = validateUnitNumber(String(value ?? ''));
  if (!validated.valid) {
    throw new Error(validated.message ?? 'Unit number is invalid.');
  }
  return Number.parseInt(String(value), 10);
}

function parseParentUnitId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

// eslint-disable-next-line max-lines-per-function
export function UnitsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent, selectedEventId, selectedOrganisationId, appId } = useUnifiedAuth();
  const { selectedEvent: eventFromService } = useEvents();

  const unitsQuery = useUnitsList(selectedEventId);
  const roleTypesQuery = useRoleTypesList(selectedEventId);
  const approvedApplicationsQuery = useApprovedApplications(selectedEventId);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const assignmentsQuery = useUnitRoleAssignments(selectedUnitId);

  const [pendingDeleteUnit, setPendingDeleteUnit] = useState<UnitRow | null>(null);
  const [pendingDeleteRoleType, setPendingDeleteRoleType] = useState<UnitRoleTypeRow | null>(null);
  const [pendingRemoveAssignment, setPendingRemoveAssignment] = useState<{
    assignmentId: string;
    applicantName: string;
  } | null>(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [selectedRoleTypeId, setSelectedRoleTypeId] = useState<string | null>(null);

  const createUnitMutation = useCreateUnitMutation();
  const updateUnitMutation = useUpdateUnitMutation();
  const deleteUnitMutation = useDeleteUnitMutation();
  const createRoleTypeMutation = useCreateRoleTypeMutation();
  const updateRoleTypeMutation = useUpdateRoleTypeMutation();
  const deleteRoleTypeMutation = useDeleteRoleTypeMutation();
  const assignRoleMutation = useAssignRoleMutation();
  const removeRoleAssignmentMutation = useRemoveRoleAssignmentMutation();

  const eventName = eventNameFromSelection(selectedEvent ?? eventFromService);
  const scope = useMemo(
    () => ({
      organisationId: selectedOrganisationId,
      eventId: selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, selectedEventId, selectedOrganisationId]
  );

  const retryUnitsQuery = useRetryRefetchHandler(unitsQuery);
  const retryRoleTypesQuery = useRetryRefetchHandler(roleTypesQuery);
  const retryApprovedApplicationsQuery = useRetryRefetchHandler(approvedApplicationsQuery);
  const retryAssignmentsQuery = useRetryRefetchHandler(assignmentsQuery);

  const parentLookup = useMemo(() => {
    const lookup = new Map<string, UnitRow>();
    for (const unit of unitsQuery.data ?? []) {
      lookup.set(unit.id, unit);
    }
    return lookup;
  }, [unitsQuery.data]);

  const unitsRows = useMemo<UnitsTableRow[]>(() => {
    return (unitsQuery.data ?? []).map((unit) => ({
      ...unit,
      parent_unit_label: formatParentUnitLabel(
        unit.parent_unit_id != null ? parentLookup.get(unit.parent_unit_id) : null
      ),
    }));
  }, [parentLookup, unitsQuery.data]);

  const unitOptions = useMemo(
    () =>
      (unitsQuery.data ?? []).map((unit) => ({
        value: unit.id,
        label: formatUnitDisplayLabel(unit),
      })),
    [unitsQuery.data]
  );

  const unitsColumns = useMemo(
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
          <PagePermissionGuard pageName="units" operation="delete" scope={scope} fallback={null}>
            <Button type="button" variant="destructive" onClick={() => setPendingDeleteUnit(row)}>
              Delete
            </Button>
          </PagePermissionGuard>
        ),
      },
    ],
    [scope, unitOptions]
  );

  const roleTypesColumns = useMemo(
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
          <PagePermissionGuard pageName="units" operation="delete" scope={scope} fallback={null}>
            <Button type="button" variant="destructive" onClick={() => setPendingDeleteRoleType(row)}>
              Delete
            </Button>
          </PagePermissionGuard>
        ),
      },
    ],
    [scope]
  );

  const assignmentRows = useMemo(
    () => composeAssignmentsTableRows(approvedApplicationsQuery.data ?? [], assignmentsQuery.data ?? []),
    [approvedApplicationsQuery.data, assignmentsQuery.data]
  );

  const assignmentsColumns = useMemo(
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
        cell: ({ row }: { row: { application_status: string } }) => (
          <Badge variant="solid-main-normal">{row.application_status}</Badge>
        ),
      },
      {
        id: 'assigned_role',
        accessorKey: 'assigned_role',
        header: 'Assigned Role',
        sortable: true,
        cell: ({ row }: { row: { assigned_role: string | null } }) =>
          row.assigned_role ?? 'No role assigned',
      },
      {
        id: 'assignmentActions',
        header: 'Actions',
        cell: ({ row }: { row: { role_assignment_id: string | null; applicant_name: string } }) =>
          row.role_assignment_id == null ? null : (
            <PagePermissionGuard pageName="units" operation="update" scope={scope} fallback={null}>
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  setPendingRemoveAssignment({
                    assignmentId: row.role_assignment_id as string,
                    applicantName: row.applicant_name,
                  })
                }
              >
                Remove
              </Button>
            </PagePermissionGuard>
          ),
      },
    ],
    [scope]
  );

  async function refetchUnits() {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'units', selectedEventId] });
  }

  async function refetchRoleTypes() {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'role-types', selectedEventId] });
  }

  async function refetchAssignments() {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'unit-role-assignments', selectedUnitId] });
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'approved-applications', selectedEventId] });
  }

  async function handleCreateUnit(rowData: Partial<UnitsTableRow>) {
    if (selectedEventId == null) {
      return;
    }
    try {
      await createUnitMutation.mutateAsync({
        eventId: selectedEventId,
        unitNumber: parseUnitNumberFromInput(rowData.unit_number),
        unitName: normalizeOptionalText(String(rowData.unit_name ?? '')),
        subcamp: normalizeOptionalText(String(rowData.subcamp ?? '')),
        contingent: normalizeOptionalText(String(rowData.contingent ?? '')),
        parentUnitId: parseParentUnitId(rowData.parent_unit_id),
      });
      ShowSuccessMessage('Unit created', toast);
      await refetchUnits();
    } catch (error) {
      HandleMutationError(error, 'units-create', toast);
      throw error;
    }
  }

  async function handleUpdateUnit(row: UnitsTableRow, rowData: Partial<UnitsTableRow>) {
    try {
      const nextParentUnitId = parseParentUnitId(rowData.parent_unit_id);
      if (nextParentUnitId != null) {
        const excluded = computeDescendantIds(unitsQuery.data ?? [], row.id);
        if (excluded.has(nextParentUnitId)) {
          throw new Error('This assignment would create a circular unit reference.');
        }
      }
      await updateUnitMutation.mutateAsync({
        unitId: row.id,
        unitNumber: parseUnitNumberFromInput(rowData.unit_number),
        unitName: normalizeOptionalText(String(rowData.unit_name ?? '')),
        subcamp: normalizeOptionalText(String(rowData.subcamp ?? '')),
        contingent: normalizeOptionalText(String(rowData.contingent ?? '')),
        parentUnitId: nextParentUnitId,
      });
      ShowSuccessMessage('Unit updated', toast);
      await refetchUnits();
    } catch (error) {
      HandleMutationError(error, 'units-update', toast);
      throw error;
    }
  }

  async function handleImportUnits(rows: UnitsTableRow[]): Promise<ImportSummary> {
    if (selectedEventId == null) {
      return {
        successCount: 0,
        totalCount: rows.length,
        failedCount: rows.length,
        failedRows: rows.map((_, index) => ({
          row: index + 1,
          reason: 'Select an event before importing units.',
        })),
      };
    }
    let successCount = 0;
    const failedRows: Array<{ row: number; reason: string }> = [];
    const unitsByNumber = new Map<number, UnitRow>();
    for (const unit of unitsQuery.data ?? []) {
      unitsByNumber.set(unit.unit_number, unit);
    }

    for (const [index, rawRow] of rows.entries()) {
      try {
        const unitNumber = parseUnitNumberFromInput(rawRow.unit_number);
        const parentUnitNumberRaw = String(
          (rawRow as unknown as { parent_unit_number?: unknown }).parent_unit_number ?? ''
        ).trim();
        const parentUnitNumber =
          parentUnitNumberRaw.length > 0 ? Number.parseInt(parentUnitNumberRaw, 10) : null;
        const parentUnitId =
          parentUnitNumber == null || Number.isNaN(parentUnitNumber)
            ? null
            : unitsByNumber.get(parentUnitNumber)?.id ?? null;

        await createUnitMutation.mutateAsync({
          eventId: selectedEventId,
          unitNumber,
          unitName: normalizeOptionalText(String(rawRow.unit_name ?? '')),
          subcamp: normalizeOptionalText(String(rawRow.subcamp ?? '')),
          contingent: normalizeOptionalText(String(rawRow.contingent ?? '')),
          parentUnitId,
        });
        successCount += 1;
      } catch (error) {
        failedRows.push({
          row: index + 1,
          reason: NormalizeSupabaseError(error).message,
        });
      }
    }

    await refetchUnits();
    return {
      successCount,
      totalCount: rows.length,
      failedCount: failedRows.length,
      failedRows,
    };
  }

  async function handleCreateRoleType(rowData: Partial<UnitRoleTypeRow>) {
    if (selectedEventId == null) {
      return;
    }
    const roleTitle = normalizeRoleTitle(String(rowData.role_title ?? ''));
    if (roleTitle == null) {
      throw new Error('Role title is required.');
    }
    try {
      await createRoleTypeMutation.mutateAsync({
        eventId: selectedEventId,
        roleTitle,
      });
      ShowSuccessMessage('Role type created', toast);
      await refetchRoleTypes();
    } catch (error) {
      HandleMutationError(error, 'role-types-create', toast);
      throw error;
    }
  }

  async function handleUpdateRoleType(row: UnitRoleTypeRow, rowData: Partial<UnitRoleTypeRow>) {
    const roleTitle = normalizeRoleTitle(String(rowData.role_title ?? ''));
    if (roleTitle == null) {
      throw new Error('Role title is required.');
    }
    try {
      await updateRoleTypeMutation.mutateAsync({ roleTypeId: row.id, roleTitle });
      ShowSuccessMessage('Role type updated', toast);
      await refetchRoleTypes();
    } catch (error) {
      HandleMutationError(error, 'role-types-update', toast);
      throw error;
    }
  }

  async function handleAssignRole() {
    if (selectedUnitId == null || selectedApplicantId == null || selectedRoleTypeId == null) {
      return;
    }
    try {
      await assignRoleMutation.mutateAsync({
        unitId: selectedUnitId,
        applicationId: selectedApplicantId,
        roleTypeId: selectedRoleTypeId,
      });
      ShowSuccessMessage('Role assigned', toast);
      setSelectedApplicantId(null);
      setSelectedRoleTypeId(null);
      await refetchAssignments();
    } catch (error) {
      HandleMutationError(error, 'role-assignments-upsert', toast);
    }
  }

  async function confirmDeleteUnit() {
    if (pendingDeleteUnit == null) {
      return;
    }
    try {
      await deleteUnitMutation.mutateAsync(pendingDeleteUnit.id);
      ShowSuccessMessage('Unit deleted', toast);
      setPendingDeleteUnit(null);
      await refetchUnits();
    } catch (error) {
      HandleMutationError(error, 'units-delete', toast);
    }
  }

  async function confirmDeleteRoleType() {
    if (pendingDeleteRoleType == null) {
      return;
    }
    try {
      await deleteRoleTypeMutation.mutateAsync(pendingDeleteRoleType.id);
      ShowSuccessMessage('Role type deleted', toast);
      setPendingDeleteRoleType(null);
      await refetchRoleTypes();
    } catch (error) {
      HandleMutationError(error, 'role-types-delete', toast);
    }
  }

  async function confirmRemoveRoleAssignment() {
    if (pendingRemoveAssignment == null) {
      return;
    }
    try {
      await removeRoleAssignmentMutation.mutateAsync(pendingRemoveAssignment.assignmentId);
      ShowSuccessMessage('Role assignment removed', toast);
      setPendingRemoveAssignment(null);
      await refetchAssignments();
    } catch (error) {
      HandleMutationError(error, 'role-assignments-remove', toast);
    }
  }

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Units</h1>
        <p>Manage units and roles for {eventName}.</p>
      </header>

      {selectedEventId == null ? (
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to manage its units.</CardDescription>
          </CardHeader>
        </Card>
      ) : secureSupabase == null ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : (
        <Tabs defaultValue="units">
          <TabsList>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="role-types">Role Types</TabsTrigger>
            <TabsTrigger value="role-assignment">Role Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="units">
            <Card>
              <CardHeader>
                <CardTitle>Units</CardTitle>
                <CardDescription>
                  {unitsRows.length} units for {eventName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unitsQuery.error != null ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{NormalizeSupabaseError(unitsQuery.error).message}</AlertDescription>
                    <Button type="button" variant="outline" onClick={retryUnitsQuery}>
                      Retry
                    </Button>
                  </Alert>
                ) : (
                  <DataTable<UnitsTableRow>
                    data={unitsRows}
                    columns={unitsColumns}
                    rbac={{ pageName: 'units' }}
                    isLoading={unitsQuery.isLoading}
                    emptyState={{ description: 'No units have been created for this event.' }}
                    initialPageSize={25}
                    onCreateRow={(rowData) => handleCreateUnit(rowData)}
                    onEditRow={(row, rowData) => handleUpdateUnit(row, rowData)}
                    onImport={handleImportUnits}
                    features={{
                      search: true,
                      pagination: true,
                      sorting: true,
                      export: true,
                      grouping: true,
                      columnVisibility: true,
                      editing: true,
                      creation: true,
                      import: true,
                      filtering: false,
                      selection: false,
                      deletion: false,
                      deleteSelected: false,
                      columnReordering: false,
                      hierarchical: false,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="role-types">
            <Card>
              <CardHeader>
                <CardTitle>Role Types</CardTitle>
                <CardDescription>Define the roles available for unit assignments in this event.</CardDescription>
              </CardHeader>
              <CardContent>
                {roleTypesQuery.error != null ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{NormalizeSupabaseError(roleTypesQuery.error).message}</AlertDescription>
                    <Button type="button" variant="outline" onClick={retryRoleTypesQuery}>
                      Retry
                    </Button>
                  </Alert>
                ) : (
                  <DataTable<UnitRoleTypeRow>
                    data={roleTypesQuery.data ?? []}
                    columns={roleTypesColumns}
                    rbac={{ pageName: 'units' }}
                    isLoading={roleTypesQuery.isLoading}
                    emptyState={{ description: 'No role types have been defined for this event.' }}
                    initialPageSize={25}
                    onCreateRow={(rowData) => handleCreateRoleType(rowData)}
                    onEditRow={(row, rowData) => handleUpdateRoleType(row, rowData)}
                    features={{
                      search: true,
                      pagination: true,
                      sorting: true,
                      editing: true,
                      creation: true,
                      deletion: false,
                      import: false,
                      export: false,
                      grouping: false,
                      filtering: false,
                      selection: false,
                      deleteSelected: false,
                      columnVisibility: false,
                      columnReordering: false,
                      hierarchical: false,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="role-assignment">
            <Card>
              <CardHeader>
                <CardTitle>Role Assignment</CardTitle>
                <CardDescription>Assign roles to approved applicants within a selected unit.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Label htmlFor="units-role-assignment-selector">
                  <span>Unit</span>
                  <Select value={selectedUnitId} onValueChange={(nextValue) => setSelectedUnitId(nextValue)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {(unitsQuery.data ?? []).map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {formatUnitDisplayLabel(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>

                {selectedUnitId != null ? (
                  <>
                    {approvedApplicationsQuery.error != null ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          {NormalizeSupabaseError(approvedApplicationsQuery.error).message}
                        </AlertDescription>
                        <Button type="button" variant="outline" onClick={retryApprovedApplicationsQuery}>
                          Retry
                        </Button>
                      </Alert>
                    ) : null}

                    {assignmentsQuery.error != null ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{NormalizeSupabaseError(assignmentsQuery.error).message}</AlertDescription>
                        <Button type="button" variant="outline" onClick={retryAssignmentsQuery}>
                          Retry
                        </Button>
                      </Alert>
                    ) : null}

                    <PagePermissionGuard pageName="units" operation="update" scope={scope} fallback={null}>
                      <section className="grid gap-2 md:grid-cols-3">
                        <Label htmlFor="units-applicant-selector">
                          <span>Applicant</span>
                          <Select value={selectedApplicantId} onValueChange={setSelectedApplicantId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an applicant" />
                            </SelectTrigger>
                            <SelectContent>
                              {(approvedApplicationsQuery.data ?? []).map((application) => (
                                <SelectItem key={application.id} value={application.id}>
                                  {application.person?.preferred_name ??
                                    application.person?.first_name ??
                                    application.person?.email ??
                                    'Unknown applicant'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Label>

                        <Label htmlFor="units-role-type-selector">
                          <span>Role Type</span>
                          <Select value={selectedRoleTypeId} onValueChange={setSelectedRoleTypeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a role type" />
                            </SelectTrigger>
                            <SelectContent>
                              {(roleTypesQuery.data ?? []).map((roleType) => (
                                <SelectItem key={roleType.id} value={roleType.id}>
                                  {roleType.role_title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Label>

                        {selectedApplicantId != null && selectedRoleTypeId != null ? (
                          <Button
                            type="button"
                            onClick={() => void handleAssignRole()}
                            disabled={assignRoleMutation.isPending}
                          >
                            Assign Role
                          </Button>
                        ) : null}
                      </section>
                    </PagePermissionGuard>

                    <DataTable<(typeof assignmentRows)[number]>
                      data={assignmentRows}
                      columns={assignmentsColumns}
                      rbac={{ pageName: 'units' }}
                      isLoading={approvedApplicationsQuery.isLoading || assignmentsQuery.isLoading}
                      emptyState={{ description: 'No approved applicants were found for this event.' }}
                      initialPageSize={25}
                      features={{
                        search: true,
                        pagination: true,
                        sorting: true,
                        editing: false,
                        creation: false,
                        deletion: false,
                        import: false,
                        export: false,
                        grouping: false,
                        filtering: false,
                        selection: false,
                        deleteSelected: false,
                        columnVisibility: false,
                        columnReordering: false,
                        hierarchical: false,
                      }}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ConfirmationDialog
        open={pendingDeleteUnit != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteUnit(null);
          }
        }}
        title="Delete unit"
        description={
          pendingDeleteUnit == null
            ? undefined
            : `This will permanently delete unit ${pendingDeleteUnit.unit_number}${pendingDeleteUnit.unit_name != null ? ` ${pendingDeleteUnit.unit_name}` : ''}. Any child units and all role assignments for this unit will also be deleted.`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void confirmDeleteUnit()}
        isPending={deleteUnitMutation.isPending}
      />

      <ConfirmationDialog
        open={pendingDeleteRoleType != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteRoleType(null);
          }
        }}
        title="Delete role type"
        description={
          pendingDeleteRoleType == null
            ? undefined
            : `This will permanently delete the role type "${pendingDeleteRoleType.role_title}". Any role assignments using this type will also be removed.`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void confirmDeleteRoleType()}
        isPending={deleteRoleTypeMutation.isPending}
      />

      <ConfirmationDialog
        open={pendingRemoveAssignment != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoveAssignment(null);
          }
        }}
        title="Remove role assignment"
        description={
          pendingRemoveAssignment == null
            ? undefined
            : `Remove the role assignment for ${pendingRemoveAssignment.applicantName}?`
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => void confirmRemoveRoleAssignment()}
        isPending={removeRoleAssignmentMutation.isPending}
      />
    </main>
  );
}
