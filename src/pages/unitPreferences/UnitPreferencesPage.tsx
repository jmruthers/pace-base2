import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Input,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage, formatDateTime } from '@solvera/pace-core/utils';
import {
  useActivitySessions,
  useCreatePreferenceMutation,
  useDeletePreferenceMutation,
  useSubmitPreferencesMutation,
  useSubmitterPerson,
  useUnitPreferences,
  useUnitsList,
  useUpdatePreferenceRankMutation,
} from '@/features/unitsCoordination/configuration';
import {
  arePreferenceRanksContiguous,
  formatSessionDisplayLabel,
  formatUnitDisplayLabel,
  hasDuplicateSessionPreference,
  normalizePreferenceRanks,
  resolveApplicantName,
} from '@/features/unitsCoordination/stateHelpers';
import { retryRefetch, useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { ActivityPreferenceRow } from '@/features/unitsCoordination/types';

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

// eslint-disable-next-line max-lines-per-function
export function UnitPreferencesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent, selectedEventId, selectedOrganisationId, appId } = useUnifiedAuth();
  const { selectedEvent: selectedEventFromService } = useEvents();

  const scope = useMemo(
    () => ({
      organisationId: selectedOrganisationId,
      eventId: selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, selectedEventId, selectedOrganisationId]
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

  const eventName = eventNameFromSelection(selectedEvent ?? selectedEventFromService);

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

  async function refetchPreferences() {
    await queryClient.invalidateQueries({ queryKey: ['ba08', 'unit-preferences', selectedUnitId, selectedEventId] });
  }

  async function addPreference(sessionId: string) {
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
  }

  async function removePreference(preferenceId: string) {
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
  }

  function reorderPreferenceOnRankChange(preferenceId: string, rankValue: string) {
    const parsedRank = Number.parseInt(rankValue, 10);
    if (!Number.isInteger(parsedRank) || parsedRank < 1) {
      return;
    }
    setOptimisticPreferenceRows((currentRows) =>
      normalizePreferenceRanks(currentRows ?? preferenceRows, preferenceId, parsedRank)
    );
  }

  async function persistRanks() {
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
  }

  async function submitPreferences() {
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
  }

  const selectedUnitLabel = selectedUnit != null ? formatUnitDisplayLabel(selectedUnit) : '';
  const selectedUnitShortLabel = selectedUnit != null ? `${selectedUnit.unit_number}` : 'selected unit';

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Unit Preferences</h1>
        <p>Submit ranked activity preferences on behalf of a unit for {eventName}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Unit</CardTitle>
          <CardDescription>Select a unit to manage preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="unit-preferences-selector">
            <span>Unit</span>
            <Select
              value={selectedUnitId}
              onValueChange={setSelectedUnitId}
            >
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
          {unitsQuery.error != null ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{String(unitsQuery.error)}</AlertDescription>
              <Button type="button" variant="outline" onClick={retryUnitsQuery}>
                Retry
              </Button>
            </Alert>
          ) : null}
          {selectedEventId != null && !unitsQuery.isLoading && (unitsQuery.data ?? []).length === 0 ? (
            <p>No units have been created for this event. Create units in the Units page first.</p>
          ) : null}
        </CardContent>
      </Card>

      {selectedEventId == null ? (
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to manage unit preferences.</CardDescription>
          </CardHeader>
        </Card>
      ) : secureSupabase == null ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : selectedUnitId == null ? null : sessionsQuery.isLoading || preferencesQuery.isLoading ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : sessionsQuery.error != null || preferencesQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {sessionsQuery.error != null ? String(sessionsQuery.error) : String(preferencesQuery.error)}
          </AlertDescription>
          <Button type="button" variant="outline" onClick={retryPreferenceData}>
            Retry
          </Button>
        </Alert>
      ) : (sessionsQuery.data ?? []).length === 0 ? (
        <Alert>
          <AlertTitle>No sessions available</AlertTitle>
          <AlertDescription>
            No activity sessions have been set up for this event yet. Sessions are created in the Activities section.
          </AlertDescription>
        </Alert>
      ) : isSubmittedState ? (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Alert>
              <AlertDescription>
                Preferences submitted on{' '}
                {formatDateTime(preferenceRowsSorted[0]?.submitted_at ?? '')} by {submitterDisplay}.
              </AlertDescription>
            </Alert>
            <section className="grid gap-2">
              {preferenceRowsSorted.map((preference) => {
                const session = (sessionsQuery.data ?? []).find((candidate) => candidate.id === preference.session_id);
                return (
                  <article key={preference.id} className="grid gap-1">
                    <p>
                      {preference.rank}. {session != null ? formatSessionDisplayLabel(session) : preference.session_id}
                    </p>
                    <p>{session?.start_time != null ? formatDateTime(session.start_time) : 'No start time'}</p>
                  </article>
                );
              })}
            </section>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Available Sessions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {availableSessions.length === 0 ? (
                <p>All available sessions have been added to preferences.</p>
              ) : (
                availableSessions.map((session) => (
                  <article key={session.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                    <section className="grid gap-1">
                      <p>{formatSessionDisplayLabel(session)}</p>
                      <p>{session.start_time != null ? formatDateTime(session.start_time) : 'No start time'}</p>
                    </section>
                    <PagePermissionGuard pageName="unit-preferences" operation="update" scope={scope} fallback={null}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void addPreference(session.id)}
                        disabled={createPreferenceMutation.isPending}
                      >
                        Add
                      </Button>
                    </PagePermissionGuard>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences for {selectedUnitShortLabel}</CardTitle>
              <CardDescription>{selectedUnitLabel}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {preferenceRowsSorted.length === 0 ? (
                <p>No sessions added yet. Add sessions from the list on the left.</p>
              ) : (
                preferenceRowsSorted.map((preference) => {
                  const session = (sessionsQuery.data ?? []).find((candidate) => candidate.id === preference.session_id);
                  return (
                    <article key={preference.id} className="grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-center">
                      <Label htmlFor={`unit-preference-rank-${preference.id}`}>
                        <span>Rank</span>
                        <Input
                          id={`unit-preference-rank-${preference.id}`}
                          type="number"
                          min={1}
                          value={String(preference.rank)}
                          onChange={(value) => reorderPreferenceOnRankChange(preference.id, value)}
                          onBlur={() => void persistRanks()}
                        />
                      </Label>
                      <section className="grid gap-1">
                        <p>{session != null ? formatSessionDisplayLabel(session) : preference.session_id}</p>
                        <p>{session?.start_time != null ? formatDateTime(session.start_time) : 'No start time'}</p>
                      </section>
                      <PagePermissionGuard pageName="unit-preferences" operation="update" scope={scope} fallback={null}>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => void removePreference(preference.id)}
                          disabled={deletePreferenceMutation.isPending}
                          aria-label={`Remove ${session != null ? formatSessionDisplayLabel(session) : preference.session_id}`}
                        >
                          Remove
                        </Button>
                      </PagePermissionGuard>
                    </article>
                  );
                })
              )}

              {!isRankSetValid && preferenceRows.length > 0 ? (
                <p>Ranks must be contiguous starting at 1 before preferences can be submitted.</p>
              ) : null}

              <PagePermissionGuard pageName="unit-preferences" operation="update" scope={scope} fallback={null}>
                <Button
                  type="button"
                  onClick={() => setPendingSubmitConfirmOpen(true)}
                  disabled={!isRankSetValid || preferenceRows.length === 0}
                >
                  Submit Preferences
                </Button>
              </PagePermissionGuard>
            </CardContent>
          </Card>
        </section>
      )}

      <ConfirmationDialog
        open={pendingSubmitConfirmOpen}
        onOpenChange={setPendingSubmitConfirmOpen}
        title="Submit preferences"
        description={`Once submitted, preferences for ${selectedUnitShortLabel} cannot be edited. Confirm you have finalised the ranked list before submitting.`}
        confirmLabel="Submit"
        onConfirm={() => void submitPreferences()}
        isPending={submitPreferencesMutation.isPending}
      />
    </main>
  );
}
