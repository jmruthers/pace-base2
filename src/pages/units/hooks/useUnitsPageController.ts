import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ImportSummary } from '@solvera/pace-core/components';
import { useToast, useUnifiedAuth, useEvents } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  composeAssignmentsTableRows,
  computeDescendantIds,
  formatParentUnitLabel,
  formatUnitDisplayLabel,
} from '@/features/unitsCoordination/unitsDisplayAndPreferenceHelpers';
import {
  useApprovedApplications,
  useRoleTypesList,
  useUnitRoleAssignments,
  useUnitsList,
} from '@/features/unitsCoordination/configuration';
import {
  useAssignRoleMutation,
  useCreateRoleTypeMutation,
  useCreateUnitMutation,
  useDeleteRoleTypeMutation,
  useDeleteUnitMutation,
  useRemoveRoleAssignmentMutation,
  useUpdateRoleTypeMutation,
  useUpdateUnitMutation,
} from '@/features/unitsCoordination/unitsUnitAndRoleMutations';
import {
  normalizeOptionalText,
  normalizeRoleTitle,
} from '@/features/unitsCoordination/unitsValidationHelpers';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { UnitRoleTypeRow, UnitRow } from '@/features/unitsCoordination/types';
import {
  importUnitsRowsFromCsv,
  parseParentUnitId,
  parseUnitNumberFromInput,
  unitsEventNameFromSelection,
} from '@/pages/units/unitsPageHelpers';
import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';

export function useUnitsPageController() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent, selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
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

  const eventName = unitsEventNameFromSelection(selectedEvent ?? eventFromService);
  const scope = useMemo(
    () => ({
      organisationId: organisationId ?? selectedOrganisationId,
      eventId: eventId ?? selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, eventId, organisationId, selectedEventId, selectedOrganisationId]
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

  const editableParentOptionIdsByUnitId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const allUnits = unitsQuery.data ?? [];
    for (const unit of allUnits) {
      const excluded = computeDescendantIds(allUnits, unit.id);
      const allowed = new Set<string>();
      for (const candidate of allUnits) {
        if (!excluded.has(candidate.id)) {
          allowed.add(candidate.id);
        }
      }
      map.set(unit.id, allowed);
    }
    return map;
  }, [unitsQuery.data]);

  const assignmentRows = useMemo(
    () => composeAssignmentsTableRows(approvedApplicationsQuery.data ?? [], assignmentsQuery.data ?? []),
    [approvedApplicationsQuery.data, assignmentsQuery.data]
  );

  const refetchUnits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'units', selectedEventId] });
  }, [queryClient, selectedEventId]);

  const refetchRoleTypes = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'role-types', selectedEventId] });
  }, [queryClient, selectedEventId]);

  const refetchAssignments = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'unit-role-assignments', selectedUnitId] });
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'approved-applications', selectedEventId] });
  }, [queryClient, selectedEventId, selectedUnitId]);

  const queueDeleteUnit = useCallback((row: UnitsTableRow) => setPendingDeleteUnit(row), []);

  const queueDeleteRoleType = useCallback((row: UnitRoleTypeRow) => setPendingDeleteRoleType(row), []);

  const queueRemoveAssignment = useCallback((assignmentId: string, applicantName: string) =>
    setPendingRemoveAssignment({ assignmentId, applicantName }), []);

  const handleCreateUnit = useCallback(
    async (rowData: Partial<UnitsTableRow>) => {
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
    },
    [createUnitMutation, refetchUnits, selectedEventId, toast]
  );

  const handleUpdateUnit = useCallback(
    async (row: UnitsTableRow, rowData: Partial<UnitsTableRow>) => {
      try {
        const nextParentUnitId = parseParentUnitId(rowData.parent_unit_id);
        if (nextParentUnitId != null) {
          const allowedParentOptionIds = editableParentOptionIdsByUnitId.get(row.id);
          if (allowedParentOptionIds != null && !allowedParentOptionIds.has(nextParentUnitId)) {
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
    },
    [editableParentOptionIdsByUnitId, refetchUnits, toast, updateUnitMutation]
  );

  const handleImportUnits = useCallback(
    async (rows: UnitsTableRow[]): Promise<ImportSummary> => {
      const summary = await importUnitsRowsFromCsv(rows, selectedEventId, unitsQuery.data ?? [], (vars) =>
        createUnitMutation.mutateAsync(vars)
      );
      await refetchUnits();
      return summary;
    },
    [createUnitMutation, refetchUnits, selectedEventId, unitsQuery.data]
  );

  const handleCreateRoleType = useCallback(
    async (rowData: Partial<UnitRoleTypeRow>) => {
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
    },
    [createRoleTypeMutation, refetchRoleTypes, selectedEventId, toast]
  );

  const handleUpdateRoleType = useCallback(
    async (row: UnitRoleTypeRow, rowData: Partial<UnitRoleTypeRow>) => {
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
    },
    [refetchRoleTypes, toast, updateRoleTypeMutation]
  );

  const handleAssignRole = useCallback(async () => {
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
  }, [assignRoleMutation, refetchAssignments, selectedApplicantId, selectedRoleTypeId, selectedUnitId, toast]);

  const confirmDeleteUnit = useCallback(async () => {
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
  }, [deleteUnitMutation, pendingDeleteUnit, refetchUnits, toast]);

  const confirmDeleteRoleType = useCallback(async () => {
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
  }, [deleteRoleTypeMutation, pendingDeleteRoleType, refetchRoleTypes, toast]);

  const confirmRemoveRoleAssignment = useCallback(async () => {
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
  }, [pendingRemoveAssignment, refetchAssignments, removeRoleAssignmentMutation, toast]);

  return {
    eventName,
    selectedEventId,
    secureSupabase,
    scope,
    unitsQuery,
    roleTypesQuery,
    approvedApplicationsQuery,
    selectedUnitId,
    setSelectedUnitId,
    assignmentsQuery,
    pendingDeleteUnit,
    setPendingDeleteUnit,
    pendingDeleteRoleType,
    setPendingDeleteRoleType,
    pendingRemoveAssignment,
    setPendingRemoveAssignment,
    selectedApplicantId,
    setSelectedApplicantId,
    selectedRoleTypeId,
    setSelectedRoleTypeId,
    deleteUnitMutation,
    deleteRoleTypeMutation,
    removeRoleAssignmentMutation,
    assignRoleMutation,
    retryUnitsQuery,
    retryRoleTypesQuery,
    retryApprovedApplicationsQuery,
    retryAssignmentsQuery,
    unitsRows,
    assignmentRows,
    handleCreateUnit,
    handleUpdateUnit,
    handleImportUnits,
    handleCreateRoleType,
    handleUpdateRoleType,
    handleAssignRole,
    confirmDeleteUnit,
    confirmDeleteRoleType,
    confirmRemoveRoleAssignment,
    queueDeleteUnit,
    queueDeleteRoleType,
    queueRemoveAssignment,
    unitOptions,
  };
}

export type UnitsPageController = ReturnType<typeof useUnitsPageController>;
