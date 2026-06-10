import {
  Alert,
  AlertDescription,
  AlertTitle,
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
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { formatUnitDisplayLabel } from '@/features/unitsCoordination/unitsDisplayAndPreferenceHelpers';
import type { UnitRoleTypeRow } from '@/features/unitsCoordination/types';
import type { UnitsPageController } from '@/pages/units/hooks/useUnitsPageController';
import { useAssignmentsTableColumns, useUnitsRoleTypesColumns } from '@/pages/units/hooks/useUnitsSupportingTableColumns';
import { useUnitsDataColumns } from '@/pages/units/hooks/useUnitsDataColumns';
import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';

export function UnitsPageView({ ctl }: { ctl: UnitsPageController }) {
  const unitsColumns = useUnitsDataColumns(ctl.scope, ctl.unitOptions, ctl.queueDeleteUnit);
  const roleTypesColumns = useUnitsRoleTypesColumns(ctl.scope, ctl.queueDeleteRoleType);
  const assignmentsColumns = useAssignmentsTableColumns(ctl.scope, ctl.queueRemoveAssignment);

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Units</h1>
        <p>Manage units and roles for {ctl.eventName}.</p>
      </header>

      {ctl.selectedEventId == null ? (
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to manage its units.</CardDescription>
          </CardHeader>
        </Card>
      ) : ctl.secureSupabase == null ? (
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
                <CardDescription>{ctl.unitsRows.length} units for {ctl.eventName}</CardDescription>
              </CardHeader>
              <CardContent>
                {ctl.unitsQuery.error != null ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{NormalizeSupabaseError(ctl.unitsQuery.error).message}</AlertDescription>
                    <Button type="button" variant="outline" onClick={ctl.retryUnitsQuery}>
                      Retry
                    </Button>
                  </Alert>
                ) : (
                  <DataTable<UnitsTableRow>
                    data={ctl.unitsRows}
                    columns={unitsColumns}
                    rbac={{ pageName: 'units' }}
                    isLoading={ctl.unitsQuery.isLoading}
                    emptyState={{ description: 'No units have been created for this event.' }}
                    initialPageSize={25}
                    onCreateRow={(rowData) => ctl.handleCreateUnit(rowData)}
                    onEditRow={(row, rowData) => ctl.handleUpdateUnit(row, rowData)}
                    onImport={ctl.handleImportUnits}
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
                {ctl.roleTypesQuery.error != null ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{NormalizeSupabaseError(ctl.roleTypesQuery.error).message}</AlertDescription>
                    <Button type="button" variant="outline" onClick={ctl.retryRoleTypesQuery}>
                      Retry
                    </Button>
                  </Alert>
                ) : (
                  <DataTable<UnitRoleTypeRow>
                    data={ctl.roleTypesQuery.data ?? []}
                    columns={roleTypesColumns}
                    rbac={{ pageName: 'units' }}
                    isLoading={ctl.roleTypesQuery.isLoading}
                    emptyState={{ description: 'No role types have been defined for this event.' }}
                    initialPageSize={25}
                    onCreateRow={(rowData) => ctl.handleCreateRoleType(rowData)}
                    onEditRow={(row, rowData) => ctl.handleUpdateRoleType(row, rowData)}
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
                  <Select value={ctl.selectedUnitId} onValueChange={(nextValue) => ctl.setSelectedUnitId(nextValue)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {(ctl.unitsQuery.data ?? []).map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {formatUnitDisplayLabel(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Label>

                {ctl.selectedUnitId != null ? (
                  <>
                    {ctl.approvedApplicationsQuery.error != null ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          {NormalizeSupabaseError(ctl.approvedApplicationsQuery.error).message}
                        </AlertDescription>
                        <Button type="button" variant="outline" onClick={ctl.retryApprovedApplicationsQuery}>
                          Retry
                        </Button>
                      </Alert>
                    ) : null}

                    {ctl.assignmentsQuery.error != null ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{NormalizeSupabaseError(ctl.assignmentsQuery.error).message}</AlertDescription>
                        <Button type="button" variant="outline" onClick={ctl.retryAssignmentsQuery}>
                          Retry
                        </Button>
                      </Alert>
                    ) : null}

                    <PagePermissionGuard pageName="units" operation="update" scope={ctl.scope} fallback={null}>
                      <section className="grid gap-2 md:grid-cols-3">
                        <Label htmlFor="units-applicant-selector">
                          <span>Applicant</span>
                          <Select value={ctl.selectedApplicantId} onValueChange={ctl.setSelectedApplicantId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an applicant" />
                            </SelectTrigger>
                            <SelectContent>
                              {(ctl.approvedApplicationsQuery.data ?? []).map((application) => (
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
                          <Select value={ctl.selectedRoleTypeId} onValueChange={ctl.setSelectedRoleTypeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a role type" />
                            </SelectTrigger>
                            <SelectContent>
                              {(ctl.roleTypesQuery.data ?? []).map((roleType) => (
                                <SelectItem key={roleType.id} value={roleType.id}>
                                  {roleType.role_title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Label>

                        {ctl.selectedApplicantId != null && ctl.selectedRoleTypeId != null ? (
                          <Button
                            type="button"
                            onClick={() => void ctl.handleAssignRole()}
                            disabled={ctl.assignRoleMutation.isPending}
                          >
                            Assign Role
                          </Button>
                        ) : null}
                      </section>
                    </PagePermissionGuard>

                    <DataTable<(typeof ctl.assignmentRows)[number]>
                      data={ctl.assignmentRows}
                      columns={assignmentsColumns}
                      rbac={{ pageName: 'units' }}
                      isLoading={ctl.approvedApplicationsQuery.isLoading || ctl.assignmentsQuery.isLoading}
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
        open={ctl.pendingDeleteUnit != null}
        onOpenChange={(open) => {
          if (!open) {
            ctl.setPendingDeleteUnit(null);
          }
        }}
        title="Delete unit"
        description={
          ctl.pendingDeleteUnit == null
            ? undefined
            : `This will permanently delete unit ${ctl.pendingDeleteUnit.unit_number}${ctl.pendingDeleteUnit.unit_name != null ? ` ${ctl.pendingDeleteUnit.unit_name}` : ''}. Any child units and all role assignments for this unit will also be deleted.`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void ctl.confirmDeleteUnit()}
        isPending={ctl.deleteUnitMutation.isPending}
      />

      <ConfirmationDialog
        open={ctl.pendingDeleteRoleType != null}
        onOpenChange={(open) => {
          if (!open) {
            ctl.setPendingDeleteRoleType(null);
          }
        }}
        title="Delete role type"
        description={
          ctl.pendingDeleteRoleType == null
            ? undefined
            : `This will permanently delete the role type "${ctl.pendingDeleteRoleType.role_title}". Any role assignments using this type will also be removed.`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void ctl.confirmDeleteRoleType()}
        isPending={ctl.deleteRoleTypeMutation.isPending}
      />

      <ConfirmationDialog
        open={ctl.pendingRemoveAssignment != null}
        onOpenChange={(open) => {
          if (!open) {
            ctl.setPendingRemoveAssignment(null);
          }
        }}
        title="Remove role assignment"
        description={
          ctl.pendingRemoveAssignment == null
            ? undefined
            : `Remove the role assignment for ${ctl.pendingRemoveAssignment.applicantName}?`
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => void ctl.confirmRemoveRoleAssignment()}
        isPending={ctl.removeRoleAssignmentMutation.isPending}
      />
    </main>
  );
}
