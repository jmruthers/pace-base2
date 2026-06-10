import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@solvera/pace-core/hooks';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import { useRequirementsForType } from '@/features/registrationSetup/configuration';
import {
  createDefaultRegistrationTypeDraft,
  createInitialSnapshots,
  createRequirementDraft,
  defaultEligibilityRuleType,
  mapEligibilityToDraft,
  mapRequirementsToDraft,
  mapTypeToDraft,
} from '@/features/registrationSetup/draftMappers';
import {
  buildUpsertPayloadForRequirementsSave,
  buildUpsertPayloadForTypeSave,
  reorderRequirementDrafts,
  validateRegistrationTypeDraft,
  validateRequirementDrafts,
} from '@/features/registrationSetup/stateHelpers';
import type {
  EligibilityRuleDraft,
  RegistrationTypeEligibilityRow,
  RequirementCheckType,
  RegistrationTypeRow,
  RequirementRuleDraft,
} from '@/features/registrationSetup/types';
import type { useRegistrationTypeBuilderShell } from './useRegistrationTypeBuilderShell';

export type RegistrationTypeBuilderShell = ReturnType<typeof useRegistrationTypeBuilderShell>;

function requirementSnapshotsFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  typeId: string
): RequirementRuleDraft[] {
  const cachedRequirements = queryClient.getQueryData<unknown>([
    'registration-setup',
    'requirements',
    typeId,
  ]);
  if (!Array.isArray(cachedRequirements)) {
    return [];
  }
  return mapRequirementsToDraft(cachedRequirements as never[]).map((rule, index) => ({
    ...rule,
    sort_order: index,
  }));
}

/** Draft + workflow mutations; expects parent to remount on registrationTypeId changes via React key. */
export function useRegistrationTypeBuilderDraft(shell: RegistrationTypeBuilderShell) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const editPayload =
    shell.isEditMode && shell.resolvedRow != null
      ? {
          row: shell.resolvedRow,
          eligibilityRows: (
            shell.eligibilityByTypeId[shell.resolvedRow.id] ?? []
          ) as RegistrationTypeEligibilityRow[],
        }
      : null;

  const [typeDraft, setTypeDraft] = useState(() =>
    editPayload != null ? mapTypeToDraft(editPayload.row) : createDefaultRegistrationTypeDraft()
  );
  const [eligibilityDrafts, setEligibilityDrafts] = useState<EligibilityRuleDraft[]>(() =>
    editPayload != null ? mapEligibilityToDraft(editPayload.eligibilityRows) : []
  );
  const [typeValidationErrors, setTypeValidationErrors] = useState<{
    name?: string;
    costDollars?: string;
    capacity?: string;
    eligibilityRules?: Record<string, string>;
  }>({});
  const [snapshots, setSnapshots] = useState(() => {
    if (editPayload == null) {
      return createInitialSnapshots();
    }
    const requirementSnapshots = requirementSnapshotsFromCache(queryClient, editPayload.row.id);
    return {
      typeSnapshot: editPayload.row,
      eligibilitySnapshot: editPayload.eligibilityRows,
      requirementsSnapshot: requirementSnapshots,
    };
  });

  const [requirementDrafts, setRequirementDrafts] = useState<RequirementRuleDraft[]>(() =>
    editPayload != null ? requirementSnapshotsFromCache(queryClient, editPayload.row.id) : []
  );
  const [selectedRequirementTypeToAdd, setSelectedRequirementTypeToAdd] = useState('');
  const [designatedOrgErrors, setDesignatedOrgErrors] = useState<Record<string, string>>({});

  const persistedTypeId = typeDraft.id ?? (shell.isEditMode ? shell.registrationTypeIdFromUrl : null);
  const workflowEnabled = persistedTypeId != null && persistedTypeId.length > 0;

  const requirementsQuery = useRequirementsForType(persistedTypeId, workflowEnabled);

  const requirementDraftRows =
    requirementDrafts.length > 0
      ? requirementDrafts
      : (requirementsQuery.data ?? []).map((row, index) => ({
          ...mapRequirementsToDraft([row])[0],
          sort_order: index,
        }));

  const resolvedRowSnapshot = shell.resolvedRow;

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
    if (shell.selectedEventId == null || shell.selectedOrganisationId == null) {
      return;
    }
    const validation = validateRegistrationTypeDraft(typeDraft, eligibilityDrafts);
    setTypeValidationErrors(validation);
    if (Object.keys(validation).length > 0) {
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
        eventId: shell.selectedEventId,
        organisationId: shell.selectedOrganisationId,
        draft: typeDraft,
        eligibilityDrafts,
        snapshots: payloadSnapshots,
      });
      const resolvedId = await shell.upsertMutation.mutateAsync(payload);
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'types-list', shell.selectedEventId] });
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'requirements', resolvedId] });

      const nextDraft = { ...typeDraft, id: resolvedId };
      setTypeDraft(nextDraft);
      if (resolvedRowSnapshot != null) {
        setSnapshots((current) => ({
          ...current,
          typeSnapshot: resolvedRowSnapshot,
        }));
      } else if (snapshots.typeSnapshot == null) {
        setSnapshots((current) => ({
          ...current,
          typeSnapshot: {
            id: resolvedId,
            name: nextDraft.name,
            description: nextDraft.description || null,
            eligibility_message: nextDraft.eligibility_message || null,
            cost: null,
            capacity: null,
            is_active: nextDraft.is_active,
            sort_order: null,
            organisation_id: shell.selectedOrganisationId,
            event_id: shell.selectedEventId,
            created_at: null,
          } as RegistrationTypeRow,
        }));
      }

      if (!shell.isEditMode || shell.registrationTypeIdFromUrl !== resolvedId) {
        shell.setSearchParams({ registrationTypeId: resolvedId }, { replace: true });
      }

      ShowSuccessMessage('Saved registration type settings.', toast);
    } catch (error) {
      HandleMutationError(error, 'Registration Types', toast);
    }
  };

  const reorderRequirement = (activeLocalId: string, overLocalId: string | null) => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    setRequirementDrafts(reorderRequirementDrafts(sourceRules, activeLocalId, overLocalId));
  };

  const addRequirement = () => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    if (selectedRequirementTypeToAdd.length === 0) {
      return;
    }
    const next = createRequirementDraft(selectedRequirementTypeToAdd as RequirementCheckType, sourceRules.length);
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

  const saveWorkflow = async () => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    if (
      shell.selectedEventId == null ||
      shell.selectedOrganisationId == null ||
      !workflowEnabled ||
      persistedTypeId == null
    ) {
      return;
    }
    const validation = validateRequirementDrafts(sourceRules);
    setDesignatedOrgErrors(validation.designatedOrgByRuleId);
    if (Object.keys(validation.designatedOrgByRuleId).length > 0) {
      return;
    }

    try {
      const payload = buildUpsertPayloadForRequirementsSave({
        eventId: shell.selectedEventId,
        organisationId: shell.selectedOrganisationId,
        snapshots,
        requirementDrafts: sourceRules,
      });
      const resolvedId = await shell.upsertMutation.mutateAsync(payload);
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'types-list', shell.selectedEventId] });
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'requirements', resolvedId] });
      ShowSuccessMessage('Saved approval workflow.', toast);
      setRequirementDrafts([]);
    } catch (error) {
      HandleMutationError(error, 'Registration Types', toast);
    }
  };

  return {
    upsertMutation: shell.upsertMutation,
    requirementsQuery,
    typeDraft,
    setTypeDraft,
    eligibilityDrafts,
    typeValidationErrors,
    workflowEnabled,
    requirementDraftRows,
    selectedRequirementTypeToAdd,
    setSelectedRequirementTypeToAdd,
    designatedOrgErrors,
    addEligibilityRule,
    removeEligibilityRule,
    updateEligibilityRuleType,
    updateEligibilityRuleValue,
    saveType,
    reorderRequirement,
    addRequirement,
    removeRequirement,
    updateRequireAllGuardians,
    updateReviewingOrganisation,
    saveWorkflow,
  };
}
