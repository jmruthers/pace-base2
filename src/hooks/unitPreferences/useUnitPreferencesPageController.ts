import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  HandleMutationError,
  ShowSuccessMessage,
} from '@solvera/pace-core/utils';
import {
  useActivitySessions,
  useSubmitterPerson,
  useUnitPreferences,
  useUnitsList,
} from '@/features/unitsCoordination/configuration';
import {
  useCreatePreferenceMutation,
  useDeletePreferenceMutation,
  useSubmitPreferencesMutation,
  useUpdatePreferenceRankMutation,
} from '@/features/unitsCoordination/unitsPreferenceMutations';
import {
  arePreferenceRanksContiguous,
  formatUnitDisplayLabel,
  hasDuplicateSessionPreference,
  normalizePreferenceRanks,
  resolveApplicantName,
} from '@/features/unitsCoordination/unitsDisplayAndPreferenceHelpers';
import { retryRefetch, useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { ActivityPreferenceRow } from '@/features/unitsCoordination/types';
import { unitPreferencesEventNameFromSelection } from '@/pages/unitPreferences/unitPreferencesHelpers';

export function useUnitPreferencesPageController() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent, selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const { selectedEvent: selectedEventFromService } = useEvents();

  const scope = useMemo(
    () => ({
      organisationId: organisationId ?? selectedOrganisationId,
      eventId: eventId ?? selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, eventId, organisationId, selectedEventId, selectedOrganisationId]
  );

  const unitsQuery = useUnitsList(selectedEventId);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const sessionsQuery = useActivitySessions(selectedEventId);
  const preferencesQuery = useUnitPreferences(selectedUnitId, selectedEventId);

  const createPreferenceMutation = useCreatePreferenceMutation();
  const updatePreferenceRankMutation = useUpdatePreferenceRankMutation();
  const deletePreferenceMutation = useDeletePreferenceMutation();
  const submitPreferencesMutation = useSubmitPreferencesMutation();

  const [optimisticPreferenceRows, setOptimisticPreferenceRows] = useState<ActivityPreferenceRow[] | null>(null);
  const [pendingSubmitConfirmOpen, setPendingSubmitConfirmOpen] = useState(false);
  const preferenceRows = useMemo(
    () => optimisticPreferenceRows ?? (preferencesQuery.data ?? []),
    [optimisticPreferenceRows, preferencesQuery.data]
  );

  const retryUnitsQuery = useRetryRefetchHandler(unitsQuery);
  const retryPreferenceData = useMemo(
    () => () => {
      void Promise.all([retryRefetch(sessionsQuery), retryRefetch(preferencesQuery)]);
    },
    [preferencesQuery, sessionsQuery]
  );

  const eventName = unitPreferencesEventNameFromSelection(selectedEvent ?? selectedEventFromService);

  const selectedUnit = useMemo(
    () => (unitsQuery.data ?? []).find((unit) => unit.id === selectedUnitId) ?? null,
    [selectedUnitId, unitsQuery.data]
  );

  const isSubmittedState = useMemo(
    () => preferenceRows.some((row) => row.submitted_at != null),
    [preferenceRows]
  );
  const submittedByUserId = useMemo(
    () => preferenceRows.find((row) => row.submitted_by != null)?.submitted_by ?? null,
    [preferenceRows]
  );
  const submitterPersonQuery = useSubmitterPerson(submittedByUserId, isSubmittedState);

  const preferenceRowsSorted = useMemo(
    () => [...preferenceRows].sort((left, right) => left.rank - right.rank),
    [preferenceRows]
  );

  const availableSessions = useMemo(() => {
    const selectedSessionIds = new Set(preferenceRows.map((row) => row.session_id));
    return (sessionsQuery.data ?? []).filter((session) => !selectedSessionIds.has(session.id));
  }, [preferenceRows, sessionsQuery.data]);

  const isRankSetValid = useMemo(() => {
    if (preferenceRows.length === 0) {
      return false;
    }
    if (hasDuplicateSessionPreference(preferenceRows)) {
      return false;
    }
    return arePreferenceRanksContiguous(preferenceRows);
  }, [preferenceRows]);

  const submitterDisplay = useMemo(() => {
    if (submittedByUserId == null) {
      return 'Unknown submitter';
    }
    const person = submitterPersonQuery.data;
    if (person == null) {
      return submittedByUserId;
    }
    return resolveApplicantName({
      preferred_name: person.preferred_name,
      first_name: person.first_name,
      last_name: person.last_name,
      email: null,
    });
  }, [submitterPersonQuery.data, submittedByUserId]);

  const refetchPreferences = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'unit-preferences', selectedUnitId, selectedEventId] });
  }, [queryClient, selectedEventId, selectedUnitId]);

  const addPreference = useCallback(
    async (sessionId: string) => {
      if (selectedUnitId == null || selectedEventId == null) {
        return;
      }
      const nextRank = preferenceRows.length + 1;
      const optimisticRow: ActivityPreferenceRow = {
        id: `temp-${sessionId}`,
        unit_id: selectedUnitId,
        session_id: sessionId,
        rank: nextRank,
        submitted_at: null,
        submitted_by: null,
        event_id: selectedEventId,
      };
      const rollbackRows = preferenceRows;
      setOptimisticPreferenceRows((currentRows) =>
        normalizePreferenceRanks([...(currentRows ?? preferenceRows), optimisticRow])
      );

      try {
        await createPreferenceMutation.mutateAsync({
          unitId: selectedUnitId,
          eventId: selectedEventId,
          sessionId,
          rank: nextRank,
        });
        setOptimisticPreferenceRows(null);
        await refetchPreferences();
      } catch (error) {
        setOptimisticPreferenceRows(rollbackRows);
        HandleMutationError(error, 'unit-preferences-add', toast);
      }
    },
    [
      createPreferenceMutation,
      preferenceRows,
      refetchPreferences,
      selectedEventId,
      selectedUnitId,
      toast,
    ]
  );

  const removePreference = useCallback(
    async (preferenceId: string) => {
      const rollbackRows = preferenceRows;
      setOptimisticPreferenceRows((currentRows) =>
        normalizePreferenceRanks((currentRows ?? preferenceRows).filter((preference) => preference.id !== preferenceId))
      );

      try {
        await deletePreferenceMutation.mutateAsync(preferenceId);
        setOptimisticPreferenceRows(null);
        await refetchPreferences();
      } catch (error) {
        setOptimisticPreferenceRows(rollbackRows);
        HandleMutationError(error, 'unit-preferences-remove', toast);
      }
    },
    [deletePreferenceMutation, preferenceRows, refetchPreferences, toast]
  );

  const reorderPreferenceOnRankChange = useCallback(
    (preferenceId: string, rankValue: string) => {
      const parsedRank = Number.parseInt(rankValue, 10);
      if (!Number.isInteger(parsedRank) || parsedRank < 1) {
        return;
      }
      setOptimisticPreferenceRows((currentRows) =>
        normalizePreferenceRanks(currentRows ?? preferenceRows, preferenceId, parsedRank)
      );
    },
    [preferenceRows]
  );

  const persistRanks = useCallback(async () => {
    const confirmedRows = preferencesQuery.data ?? [];
    try {
      const currentRows = normalizePreferenceRanks(preferenceRows);
      for (const row of currentRows) {
        const original = confirmedRows.find((candidate) => candidate.id === row.id);
        if (original == null) {
          continue;
        }
        if (original.rank === row.rank) {
          continue;
        }
        await updatePreferenceRankMutation.mutateAsync({ preferenceId: row.id, rank: row.rank });
      }
      setOptimisticPreferenceRows(null);
      await refetchPreferences();
    } catch (error) {
      setOptimisticPreferenceRows(confirmedRows);
      HandleMutationError(error, 'unit-preferences-rank-update', toast);
    }
  }, [
    preferenceRows,
    preferencesQuery.data,
    refetchPreferences,
    toast,
    updatePreferenceRankMutation,
  ]);

  const submitPreferences = useCallback(async () => {
    if (selectedUnitId == null || selectedEventId == null) {
      return;
    }
    try {
      await submitPreferencesMutation.mutateAsync({
        unitId: selectedUnitId,
        eventId: selectedEventId,
      });
      ShowSuccessMessage('Preferences submitted', toast);
      setPendingSubmitConfirmOpen(false);
      await refetchPreferences();
    } catch (error) {
      HandleMutationError(error, 'unit-preferences-submit', toast);
    }
  }, [refetchPreferences, selectedEventId, selectedUnitId, submitPreferencesMutation, toast]);

  const selectedUnitLabel = selectedUnit != null ? formatUnitDisplayLabel(selectedUnit) : '';
  const selectedUnitShortLabel = selectedUnit != null ? `${selectedUnit.unit_number}` : 'selected unit';

  return {
    scope,
    secureSupabase,
    selectedEventId,
    eventName,
    unitsQuery,
    selectedUnitId,
    setSelectedUnitId,
    sessionsQuery,
    preferencesQuery,
    createPreferenceMutation,
    deletePreferenceMutation,
    submitPreferencesMutation,
    preferenceRowsSorted,
    availableSessions,
    isRankSetValid,
    preferenceRows,
    retryUnitsQuery,
    retryPreferenceData,
    submitterDisplay,
    isSubmittedState,
    pendingSubmitConfirmOpen,
    setPendingSubmitConfirmOpen,
    selectedUnitLabel,
    selectedUnitShortLabel,
    addPreference,
    removePreference,
    reorderPreferenceOnRankChange,
    persistRanks,
    submitPreferences,
  };
}

export type UnitPreferencesPageController = ReturnType<typeof useUnitPreferencesPageController>;
