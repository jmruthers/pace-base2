import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PointerSensor, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core';
import { useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  useMembershipTypesForEvent,
  useRegistrationTypesList,
  useRegistrationTypeUpsertMutation,
  useRequirementsForType,
  useReviewingOrganisationsForEvent,
  useSetRegistrationTypeActiveMutation,
} from '@/features/registrationSetup/configuration';
import {
  createDefaultRegistrationTypeDraft,
  createInitialSnapshots,
  createRequirementDraft,
  defaultEligibilityRuleType,
  mapEligibilityToDraft,
  mapRequirementsToDraft,
  mapTypeToDraft,
} from '@/features/registrationSetup/shared';
import {
  buildUpsertPayloadForRequirementsSave,
  buildUpsertPayloadForTypeSave,
  reorderRequirementDrafts,
  validateRegistrationTypeDraft,
  validateRequirementDrafts,
} from '@/features/registrationSetup/stateHelpers';
import type {
  EligibilityRuleDraft,
  RequirementCheckType,
  RegistrationTypeDraft,
  RegistrationTypeRow,
  RequirementRuleDraft,
} from '@/features/registrationSetup/types';

export type DialogStep = 'edit' | 'confirm';

function registrationScope(scope: {
  organisationId: string | null;
  eventId: string | null;
  appId: string | null;
}) {
  return {
    organisationId: scope.organisationId,
    eventId: scope.eventId ?? null,
    appId: scope.appId ?? undefined,
  };
}

export function useRegistrationTypesPageController() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedOrganisationId, selectedEventId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const scope = registrationScope({
    organisationId: organisationId ?? selectedOrganisationId,
    eventId: eventId ?? selectedEventId,
    appId,
  });

  const listQuery = useRegistrationTypesList(selectedEventId);
  const upsertMutation = useRegistrationTypeUpsertMutation();
  const activeMutation = useSetRegistrationTypeActiveMutation();

  const [activeOverrides, setActiveOverrides] = useState<Record<string, boolean>>({});

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDialogStep, setTypeDialogStep] = useState<DialogStep>('edit');
  const [typeDraft, setTypeDraft] = useState<RegistrationTypeDraft>(createDefaultRegistrationTypeDraft);
  const [eligibilityDrafts, setEligibilityDrafts] = useState<EligibilityRuleDraft[]>([]);
  const [typeValidationErrors, setTypeValidationErrors] = useState<{
    name?: string;
    costDollars?: string;
    capacity?: string;
    eligibilityRules?: Record<string, string>;
  }>({});
  const [snapshots, setSnapshots] = useState(createInitialSnapshots);

  const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false);
  const [requirementsDialogStep, setRequirementsDialogStep] = useState<DialogStep>('edit');
  const [requirementsTargetType, setRequirementsTargetType] = useState<RegistrationTypeRow | null>(null);
  const [requirementDrafts, setRequirementDrafts] = useState<RequirementRuleDraft[]>([]);
  const [selectedRequirementTypeToAdd, setSelectedRequirementTypeToAdd] = useState<string>('');
  const [designatedOrgErrors, setDesignatedOrgErrors] = useState<Record<string, string>>({});

  const requirementsQuery = useRequirementsForType(
    requirementsTargetType?.id ?? null,
    requirementsDialogOpen || (typeDialogOpen && typeDraft.id != null)
  );
  const membershipTypesQuery = useMembershipTypesForEvent(selectedEventId, typeDialogOpen);
  const reviewingOrgsQuery = useReviewingOrganisationsForEvent(selectedEventId, requirementsDialogOpen);

  const sensors = useSensors(useSensor(PointerSensor));

  const listRows = listQuery.data?.types ?? [];
  const eligibilityCounts = listQuery.data?.eligibilityCountsByTypeId ?? {};
  const eligibilityByTypeId = listQuery.data?.eligibilityByTypeId ?? {};

  const requirementDraftRows =
    requirementDrafts.length > 0
      ? requirementDrafts
      : (requirementsQuery.data ?? []).map((row, index) => ({
          ...mapRequirementsToDraft([row])[0],
          sort_order: index,
        }));

  const openCreateDialog = () => {
    setTypeDraft(createDefaultRegistrationTypeDraft());
    setEligibilityDrafts([]);
    setTypeValidationErrors({});
    setTypeDialogStep('edit');
    setSnapshots(createInitialSnapshots());
    setTypeDialogOpen(true);
  };

  const openEditDialog = (row: RegistrationTypeRow) => {
    setTypeDraft(mapTypeToDraft(row));
    setEligibilityDrafts(mapEligibilityToDraft(eligibilityByTypeId[row.id] ?? []));
    setTypeValidationErrors({});
    setTypeDialogStep('edit');
    setRequirementsTargetType(row);
    const cachedRequirements = queryClient.getQueryData<unknown>(['registration-setup', 'requirements', row.id]);
    const requirementSnapshots = Array.isArray(cachedRequirements)
      ? mapRequirementsToDraft(cachedRequirements as never[]).map((rule, index) => ({
          ...rule,
          sort_order: index,
        }))
      : [];
    setSnapshots({
      typeSnapshot: row,
      eligibilitySnapshot: eligibilityByTypeId[row.id] ?? [],
      requirementsSnapshot: requirementSnapshots,
    });
    setTypeDialogOpen(true);
  };

  const openRequirementsDialog = (row: RegistrationTypeRow) => {
    const fromList = queryClient.getQueryData<unknown>(['registration-setup', 'requirements', row.id]);
    const mapped = Array.isArray(fromList)
      ? mapRequirementsToDraft(fromList as never[]).map((rule, index) => ({ ...rule, sort_order: index }))
      : [];
    setRequirementsTargetType(row);
    setRequirementsDialogStep('edit');
    setDesignatedOrgErrors({});
    setRequirementDrafts(mapped);
    setSnapshots((current) => ({
      ...current,
      typeSnapshot: row,
      eligibilitySnapshot: eligibilityByTypeId[row.id] ?? [],
      requirementsSnapshot: mapped,
    }));
    setRequirementsDialogOpen(true);
  };

  const handleToggleActive = async (row: RegistrationTypeRow, nextValue: boolean) => {
    if (selectedEventId == null) {
      return;
    }
    const previous = activeOverrides[row.id] ?? row.is_active;
    setActiveOverrides((current) => ({ ...current, [row.id]: nextValue }));
    try {
      await activeMutation.mutateAsync({
        eventId: selectedEventId,
        registrationTypeId: row.id,
        isActive: nextValue,
      });
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'types-list', selectedEventId] });
      setSnapshots((current) => {
        if (current.typeSnapshot?.id !== row.id) {
          return current;
        }
        return {
          ...current,
          typeSnapshot: { ...current.typeSnapshot, is_active: nextValue },
        };
      });
      setTypeDraft((current) => (current.id === row.id ? { ...current, is_active: nextValue } : current));
      setRequirementsTargetType((current) =>
        current?.id === row.id ? { ...current, is_active: nextValue } : current
      );
    } catch (error) {
      setActiveOverrides((current) => ({ ...current, [row.id]: previous }));
      setSnapshots((current) => {
        if (current.typeSnapshot?.id !== row.id) {
          return current;
        }
        return {
          ...current,
          typeSnapshot: { ...current.typeSnapshot, is_active: previous },
        };
      });
      setTypeDraft((current) => (current.id === row.id ? { ...current, is_active: previous } : current));
      setRequirementsTargetType((current) =>
        current?.id === row.id ? { ...current, is_active: previous } : current
      );
      HandleMutationError(error, 'Registration Types', toast);
    }
  };

  const addEligibilityRule = () => {
    setEligibilityDrafts((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        rule_type: defaultEligibilityRuleType(),
        value: '',
      },
    ]);
  };

  const removeEligibilityRule = (localId: string) => {
    setEligibilityDrafts((current) => current.filter((rule) => rule.localId !== localId));
  };

  const updateEligibilityRuleType = (localId: string, ruleType: EligibilityRuleDraft['rule_type']) => {
    setEligibilityDrafts((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, rule_type: ruleType } : entry))
    );
  };

  const updateEligibilityRuleValue = (localId: string, value: string) => {
    setEligibilityDrafts((current) =>
      current.map((entry) => (entry.localId === localId ? { ...entry, value } : entry))
    );
  };

  const saveType = async () => {
    if (selectedEventId == null || selectedOrganisationId == null) {
      return;
    }
    const validation = validateRegistrationTypeDraft(typeDraft, eligibilityDrafts);
    setTypeValidationErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    if (typeDialogStep === 'edit') {
      setTypeDialogStep('confirm');
      return;
    }

    try {
      let payloadSnapshots = snapshots;
      if (typeDraft.id != null) {
        const requirementsResult = await requirementsQuery.refetch();
        const latestRequirements = mapRequirementsToDraft(requirementsResult.data ?? []).map((rule, index) => ({
          ...rule,
          sort_order: index,
        }));
        payloadSnapshots = {
          ...snapshots,
          requirementsSnapshot: latestRequirements,
        };
        setSnapshots(payloadSnapshots);
      }
      const payload = buildUpsertPayloadForTypeSave({
        eventId: selectedEventId,
        organisationId: selectedOrganisationId,
        draft: typeDraft,
        eligibilityDrafts,
        snapshots: payloadSnapshots,
      });
      const resolvedId = await upsertMutation.mutateAsync(payload);
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'types-list', selectedEventId] });
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'requirements', resolvedId] });
      ShowSuccessMessage('Saved registration type settings.', toast);
      setTypeDialogOpen(false);
      setTypeDialogStep('edit');
    } catch (error) {
      HandleMutationError(error, 'Registration Types', toast);
    }
  };

  const handleRequirementDragEnd = (event: DragEndEvent) => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    const overLocalId = event.over == null ? null : String(event.over.id);
    const reordered = reorderRequirementDrafts(sourceRules, String(event.active.id), overLocalId);
    setRequirementDrafts(reordered);
  };

  const addRequirement = () => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    if (selectedRequirementTypeToAdd.length === 0) {
      return;
    }
    const next = createRequirementDraft(
      selectedRequirementTypeToAdd as RequirementCheckType,
      sourceRules.length
    );
    setRequirementDrafts([...sourceRules, next]);
    setSelectedRequirementTypeToAdd('');
  };

  const removeRequirement = (localId: string) => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    setRequirementDrafts(sourceRules.filter((entry) => entry.localId !== localId));
  };

  const updateRequireAllGuardians = (localId: string, checked: boolean) => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    setRequirementDrafts(
      sourceRules.map((entry) =>
        entry.localId === localId ? { ...entry, config: { require_all_guardians: checked } } : entry
      )
    );
  };

  const updateReviewingOrganisation = (localId: string, reviewingOrgId: string) => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    setRequirementDrafts(
      sourceRules.map((entry) =>
        entry.localId === localId ? { ...entry, config: { reviewing_org_id: reviewingOrgId } } : entry
      )
    );
    setDesignatedOrgErrors((current) => {
      const next = { ...current };
      delete next[localId];
      return next;
    });
  };

  const saveRequirements = async () => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    if (selectedEventId == null || selectedOrganisationId == null) {
      return;
    }
    const validation = validateRequirementDrafts(sourceRules);
    setDesignatedOrgErrors(validation.designatedOrgByRuleId);
    if (Object.keys(validation.designatedOrgByRuleId).length > 0) {
      return;
    }

    if (requirementsDialogStep === 'edit') {
      setRequirementsDialogStep('confirm');
      return;
    }

    try {
      const payload = buildUpsertPayloadForRequirementsSave({
        eventId: selectedEventId,
        organisationId: selectedOrganisationId,
        snapshots,
        requirementDrafts: sourceRules,
      });
      const resolvedId = await upsertMutation.mutateAsync(payload);
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'types-list', selectedEventId] });
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'requirements', resolvedId] });
      ShowSuccessMessage('Saved registration requirements.', toast);
      setRequirementsDialogOpen(false);
      setRequirementsDialogStep('edit');
    } catch (error) {
      HandleMutationError(error, 'Registration Types', toast);
    }
  };

  return {
    scope,
    selectedEventId,
    listQuery,
    listRows,
    eligibilityCounts,
    activeOverrides,
    upsertMutation,
    requirementsQuery,
    membershipTypesQuery,
    reviewingOrgsQuery,
    sensors,
    typeDialogOpen,
    setTypeDialogOpen,
    typeDialogStep,
    setTypeDialogStep,
    typeDraft,
    setTypeDraft,
    eligibilityDrafts,
    typeValidationErrors,
    requirementsDialogOpen,
    setRequirementsDialogOpen,
    requirementsDialogStep,
    setRequirementsDialogStep,
    requirementsTargetType,
    requirementDraftRows,
    selectedRequirementTypeToAdd,
    setSelectedRequirementTypeToAdd,
    designatedOrgErrors,
    openCreateDialog,
    openEditDialog,
    openRequirementsDialog,
    handleToggleActive,
    addEligibilityRule,
    removeEligibilityRule,
    updateEligibilityRuleType,
    updateEligibilityRuleValue,
    saveType,
    handleRequirementDragEnd,
    addRequirement,
    removeRequirement,
    updateRequireAllGuardians,
    updateReviewingOrganisation,
    saveRequirements,
  };
}
