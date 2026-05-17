import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  useMembershipTypesForEvent,
  useRegistrationTypesList,
  useRegistrationTypeUpsertMutation,
  useRequirementsForType,
  useReviewingOrganisationsForEvent,
} from '@/features/registrationSetup/configuration';
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
  RequirementCheckType,
  RegistrationTypeDraft,
  RegistrationTypeRow,
  RequirementRuleDraft,
} from '@/features/registrationSetup/types';
import { registrationScope } from '../registrationScope';
export function useRegistrationTypeBuilderController() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedOrganisationId, selectedEventId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const scope = registrationScope({
    organisationId: organisationId ?? selectedOrganisationId,
    eventId: eventId ?? selectedEventId,
    appId,
  });

  const registrationTypeIdFromUrl = searchParams.get('registrationTypeId');
  const isEditMode = registrationTypeIdFromUrl != null && registrationTypeIdFromUrl.length > 0;

  const listQuery = useRegistrationTypesList(selectedEventId);
  const upsertMutation = useRegistrationTypeUpsertMutation();

  const eligibilityByTypeId = useMemo(
    () => listQuery.data?.eligibilityByTypeId ?? {},
    [listQuery.data?.eligibilityByTypeId]
  );

  const resolvedRow = useMemo(() => {
    if (!isEditMode || registrationTypeIdFromUrl == null) {
      return null;
    }
    const rows = listQuery.data?.types ?? [];
    return rows.find((row) => row.id === registrationTypeIdFromUrl) ?? null;
  }, [isEditMode, listQuery.data?.types, registrationTypeIdFromUrl]);

  const [typeDraft, setTypeDraft] = useState<RegistrationTypeDraft>(createDefaultRegistrationTypeDraft);
  const [eligibilityDrafts, setEligibilityDrafts] = useState<EligibilityRuleDraft[]>([]);
  const [typeValidationErrors, setTypeValidationErrors] = useState<{
    name?: string;
    costDollars?: string;
    capacity?: string;
    eligibilityRules?: Record<string, string>;
  }>({});
  const [snapshots, setSnapshots] = useState(createInitialSnapshots);
  const [hydratedFromUrlId, setHydratedFromUrlId] = useState<string | null>(null);

  const [requirementDrafts, setRequirementDrafts] = useState<RequirementRuleDraft[]>([]);
  const [selectedRequirementTypeToAdd, setSelectedRequirementTypeToAdd] = useState<string>('');
  const [designatedOrgErrors, setDesignatedOrgErrors] = useState<Record<string, string>>({});

  const persistedTypeId =
    typeDraft.id ?? (isEditMode ? registrationTypeIdFromUrl : null);
  const workflowEnabled = persistedTypeId != null && persistedTypeId.length > 0;

  const requirementsQuery = useRequirementsForType(persistedTypeId, workflowEnabled);
  const membershipTypesQuery = useMembershipTypesForEvent(selectedEventId, true);
  const reviewingOrgsQuery = useReviewingOrganisationsForEvent(
    selectedEventId,
    selectedEventId != null && selectedEventId.length > 0
  );

  const requirementDraftRows =
    requirementDrafts.length > 0
      ? requirementDrafts
      : (requirementsQuery.data ?? []).map((row, index) => ({
          ...mapRequirementsToDraft([row])[0],
          sort_order: index,
        }));

  useEffect(() => {
    if (!isEditMode || registrationTypeIdFromUrl == null || resolvedRow == null) {
      return;
    }

    if (hydratedFromUrlId === registrationTypeIdFromUrl) {
      return;
    }

    const cachedRequirements = queryClient.getQueryData<unknown>([
      'registration-setup',
      'requirements',
      resolvedRow.id,
    ]);
    const requirementSnapshots = Array.isArray(cachedRequirements)
      ? mapRequirementsToDraft(cachedRequirements as never[]).map((rule, index) => ({
          ...rule,
          sort_order: index,
        }))
      : [];

    // URL-driven hydration when opening edit mode (builder remounts on registrationTypeId change).
    /* eslint-disable react-hooks/set-state-in-effect -- sync form drafts from list query row */
    setTypeDraft(mapTypeToDraft(resolvedRow));
    setEligibilityDrafts(mapEligibilityToDraft(eligibilityByTypeId[resolvedRow.id] ?? []));
    setTypeValidationErrors({});
    setRequirementDrafts(requirementSnapshots);
    setDesignatedOrgErrors({});

    setSnapshots({
      typeSnapshot: resolvedRow,
      eligibilitySnapshot: eligibilityByTypeId[resolvedRow.id] ?? [],
      requirementsSnapshot: requirementSnapshots,
    });
    setHydratedFromUrlId(registrationTypeIdFromUrl);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    eligibilityByTypeId,
    hydratedFromUrlId,
    isEditMode,
    queryClient,
    registrationTypeIdFromUrl,
    resolvedRow,
  ]);

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

      const nextDraft = { ...typeDraft, id: resolvedId };
      setTypeDraft(nextDraft);
      if (resolvedRow != null) {
        setSnapshots((current) => ({
          ...current,
          typeSnapshot: resolvedRow,
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
            organisation_id: selectedOrganisationId,
            event_id: selectedEventId,
            created_at: null,
          } as RegistrationTypeRow,
        }));
      }

      if (!isEditMode || registrationTypeIdFromUrl !== resolvedId) {
        setSearchParams({ registrationTypeId: resolvedId }, { replace: true });
        setHydratedFromUrlId(resolvedId);
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

  const saveWorkflow = async () => {
    const sourceRules = requirementDrafts.length > 0 ? requirementDrafts : requirementDraftRows;
    if (selectedEventId == null || selectedOrganisationId == null || !workflowEnabled) {
      return;
    }
    const validation = validateRequirementDrafts(sourceRules);
    setDesignatedOrgErrors(validation.designatedOrgByRuleId);
    if (Object.keys(validation.designatedOrgByRuleId).length > 0) {
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
      ShowSuccessMessage('Saved approval workflow.', toast);
      setRequirementDrafts([]);
    } catch (error) {
      HandleMutationError(error, 'Registration Types', toast);
    }
  };

  const unknownTypeId =
    isEditMode &&
    !listQuery.isLoading &&
    listQuery.error == null &&
    registrationTypeIdFromUrl != null &&
    resolvedRow == null;

  return {
    scope,
    selectedEventId,
    registrationTypeIdFromUrl,
    isEditMode,
    listQuery,
    resolvedRow,
    unknownTypeId,
    upsertMutation,
    requirementsQuery,
    membershipTypesQuery,
    reviewingOrgsQuery,
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
