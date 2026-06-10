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
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { formatDateTime, NormalizeSupabaseError } from '@solvera/pace-core/utils';
import {
  formatSessionDisplayLabel,
  formatUnitDisplayLabel,
} from '@/features/unitsCoordination/unitsDisplayAndPreferenceHelpers';
import type { UnitPreferencesPageController } from '@/hooks/unitPreferences/useUnitPreferencesPageController';

export function UnitPreferencesPageView({ ctl }: { ctl: UnitPreferencesPageController }) {
  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Unit Preferences</h1>
        <p>Submit ranked activity preferences on behalf of a unit for {ctl.eventName}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Unit</CardTitle>
          <CardDescription>Select a unit to manage preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="unit-preferences-selector">
            <span>Unit</span>
            <fieldset disabled={ctl.unitsQuery.isLoading} className="m-0 min-w-0 border-0 p-0">
              <Select value={ctl.selectedUnitId} onValueChange={ctl.setSelectedUnitId}>
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
            </fieldset>
          </Label>
          {ctl.unitsQuery.error != null ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{NormalizeSupabaseError(ctl.unitsQuery.error).message}</AlertDescription>
              <Button type="button" variant="outline" onClick={ctl.retryUnitsQuery}>
                Retry
              </Button>
            </Alert>
          ) : null}
          {ctl.selectedEventId != null &&
          !ctl.unitsQuery.isLoading &&
          (ctl.unitsQuery.data ?? []).length === 0 ? (
            <p>No units have been created for this event. Create units in the Units page first.</p>
          ) : null}
        </CardContent>
      </Card>

      {ctl.selectedEventId == null ? (
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to manage unit preferences.</CardDescription>
          </CardHeader>
        </Card>
      ) : ctl.secureSupabase == null ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : ctl.selectedUnitId == null ? null : ctl.sessionsQuery.isLoading || ctl.preferencesQuery.isLoading ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : ctl.sessionsQuery.error != null || ctl.preferencesQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {ctl.sessionsQuery.error != null
              ? NormalizeSupabaseError(ctl.sessionsQuery.error).message
              : NormalizeSupabaseError(ctl.preferencesQuery.error).message}
          </AlertDescription>
          <Button type="button" variant="outline" onClick={ctl.retryPreferenceData}>
            Retry
          </Button>
        </Alert>
      ) : (ctl.sessionsQuery.data ?? []).length === 0 ? (
        <Alert>
          <AlertTitle>No sessions available</AlertTitle>
          <AlertDescription>
            No activity sessions have been set up for this event yet. Sessions are created in the Activities section.
          </AlertDescription>
        </Alert>
      ) : ctl.isSubmittedState ? (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Alert>
              <AlertDescription>
                Preferences submitted on {formatDateTime(ctl.preferenceRowsSorted[0]?.submitted_at ?? '')} by{' '}
                {ctl.submitterDisplay}.
              </AlertDescription>
            </Alert>
            <section className="grid gap-2">
              {ctl.preferenceRowsSorted.map((preference) => {
                const session = (ctl.sessionsQuery.data ?? []).find(
                  (candidate) => candidate.id === preference.session_id
                );
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
              {ctl.availableSessions.length === 0 ? (
                <p>All available sessions have been added to preferences.</p>
              ) : (
                ctl.availableSessions.map((session) => (
                  <article key={session.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                    <section className="grid gap-1">
                      <p>{formatSessionDisplayLabel(session)}</p>
                      <p>{session.start_time != null ? formatDateTime(session.start_time) : 'No start time'}</p>
                    </section>
                    <PagePermissionGuard pageName="UnitPreferencesPage" operation="update" scope={ctl.scope} fallback={null}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void ctl.addPreference(session.id)}
                        disabled={ctl.createPreferenceMutation.isPending}
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
              <CardTitle>Preferences for {ctl.selectedUnitShortLabel}</CardTitle>
              <CardDescription>{ctl.selectedUnitLabel}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {ctl.preferenceRowsSorted.length === 0 ? (
                <p>No sessions added yet. Add sessions from the list on the left.</p>
              ) : (
                ctl.preferenceRowsSorted.map((preference) => {
                  const session = (ctl.sessionsQuery.data ?? []).find(
                    (candidate) => candidate.id === preference.session_id
                  );
                  return (
                    <article key={preference.id} className="grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-center">
                      <Label htmlFor={`unit-preference-rank-${preference.id}`}>
                        <span>Rank</span>
                        <Input
                          id={`unit-preference-rank-${preference.id}`}
                          type="number"
                          min={1}
                          value={String(preference.rank)}
                          onChange={(value) => ctl.reorderPreferenceOnRankChange(preference.id, value)}
                          onBlur={() => void ctl.persistRanks()}
                        />
                      </Label>
                      <section className="grid gap-1">
                        <p>{session != null ? formatSessionDisplayLabel(session) : preference.session_id}</p>
                        <p>{session?.start_time != null ? formatDateTime(session.start_time) : 'No start time'}</p>
                      </section>
                      <PagePermissionGuard pageName="UnitPreferencesPage" operation="update" scope={ctl.scope} fallback={null}>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => void ctl.removePreference(preference.id)}
                          disabled={ctl.deletePreferenceMutation.isPending}
                          aria-label={`Remove ${session != null ? formatSessionDisplayLabel(session) : preference.session_id}`}
                        >
                          Remove
                        </Button>
                      </PagePermissionGuard>
                    </article>
                  );
                })
              )}

              {!ctl.isRankSetValid && ctl.preferenceRows.length > 0 ? (
                <p>Ranks must be contiguous starting at 1 before preferences can be submitted.</p>
              ) : null}

              <PagePermissionGuard pageName="UnitPreferencesPage" operation="update" scope={ctl.scope} fallback={null}>
                <Button
                  type="button"
                  onClick={() => ctl.setPendingSubmitConfirmOpen(true)}
                  disabled={!ctl.isRankSetValid || ctl.preferenceRows.length === 0}
                >
                  Submit Preferences
                </Button>
              </PagePermissionGuard>
            </CardContent>
          </Card>
        </section>
      )}

      <ConfirmationDialog
        open={ctl.pendingSubmitConfirmOpen}
        onOpenChange={ctl.setPendingSubmitConfirmOpen}
        title="Submit preferences"
        description={`Once submitted, preferences for ${ctl.selectedUnitShortLabel} cannot be edited. Confirm you have finalised the ranked list before submitting.`}
        confirmLabel="Submit"
        onConfirm={() => void ctl.submitPreferences()}
        isPending={ctl.submitPreferencesMutation.isPending}
      />
    </main>
  );
}
