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
  DataTable,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError, formatDateTime } from '@solvera/pace-core/utils';
import { ActivityOfferingOfferingEditDialog } from '@/components/activities/ActivityOfferingOfferingEditDialog';
import type { ActivityOfferingPageController } from '@/hooks/activities/useActivityOfferingPageController';
import { ActivityOfferingDeleteSessionDialog } from '@/components/activities/ActivityOfferingDeleteSessionDialog';
import { ActivityOfferingSessionDialog } from '@/components/activities/ActivityOfferingSessionDialog';
import {
  formatOfferingCostDisplay,
} from '@/pages/activities/activityOfferingPageHelpers';
import { useActivityOfferingSessionsColumns } from '@/hooks/activities/useActivityOfferingSessionsColumns';
import { isBookingOpenNow } from '@/features/activityOfferingSetup/shared';
import type { ActivitySessionRow } from '@/features/activityOfferingSetup/types';

export function ActivityOfferingPageView({ ctl }: { ctl: ActivityOfferingPageController }) {
  const sessionColumns = useActivityOfferingSessionsColumns(ctl.scope, ctl.openEditSession, ctl.openDeleteSession);

  if (ctl.selectedEventId == null) {
    return (
      <main className="grid gap-4">
        <header className="grid gap-1">
          <Button type="button" variant="ghost" size="small" onClick={() => ctl.navigate('/activities')}>
            Back to offerings
          </Button>
          <h1>Activity offering</h1>
          <p>Activity offering — {ctl.eventName}</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to view this offering.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (ctl.secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (ctl.offeringQuery.isLoading || ctl.sessionsQuery.isLoading) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (ctl.offeringQuery.error != null) {
    return (
      <main className="grid gap-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(ctl.offeringQuery.error).message}</AlertDescription>
          <Button type="button" variant="outline" onClick={ctl.retryOfferingQuery}>
            Retry
          </Button>
        </Alert>
      </main>
    );
  }

  if (ctl.offeringQuery.data == null) {
    return (
      <main className="grid gap-4">
        <Alert variant="destructive">
          <AlertTitle>Offering not found</AlertTitle>
          <AlertDescription>This offering could not be found. It may have been deleted.</AlertDescription>
          <Button type="button" variant="outline" onClick={() => ctl.navigate('/activities')}>
            Back to offerings
          </Button>
        </Alert>
      </main>
    );
  }

  const offering = ctl.offeringQuery.data;
  const bookingOpen = isBookingOpenNow(offering);

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <Button type="button" variant="ghost" size="small" onClick={() => ctl.navigate('/activities')}>
          Back to offerings
        </Button>
        <h1>{offering.name}</h1>
        <p>Activity offering — {ctl.eventName}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{offering.name}</CardTitle>
          <CardDescription>Offering details</CardDescription>
          <PagePermissionGuard pageName="ActivitiesPage" operation="update" scope={ctl.scope} fallback={null}>
            <section>
              <Button type="button" variant="outline" onClick={() => ctl.offerEditOffering(offering)}>
                Edit offering
              </Button>
            </section>
          </PagePermissionGuard>
        </CardHeader>
        <CardContent className="grid grid-cols-[auto_1fr] gap-2">
          <div>TRAC Activity</div>
          <div>{offering.trac_activity?.name ?? 'None'}</div>
          <div>Booking Opens</div>
          <div>{offering.booking_open_at != null ? formatDateTime(offering.booking_open_at) : '—'}</div>
          <div>Booking Closes</div>
          <div>{offering.booking_close_at != null ? formatDateTime(offering.booking_close_at) : '—'}</div>
          <div>Booking Status</div>
          <div>
            <Badge variant={bookingOpen ? 'solid-main-normal' : 'outline-acc-muted'}>
              {bookingOpen ? 'Booking open' : 'Booking closed'}
            </Badge>
          </div>
          <div>Cost</div>
          <div>{formatOfferingCostDisplay(offering.cost)}</div>
          <div>Payment Due</div>
          <div>{offering.payment_due_at != null ? formatDateTime(offering.payment_due_at) : '—'}</div>
        </CardContent>
      </Card>

      {ctl.sessionsQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(ctl.sessionsQuery.error).message}</AlertDescription>
          <Button type="button" variant="outline" onClick={ctl.retrySessionsQuery}>
            Retry
          </Button>
        </Alert>
      ) : null}

      <PagePermissionGuard pageName="ActivitiesPage" operation="create" scope={ctl.scope} fallback={null}>
        <section>
          <Button type="button" onClick={ctl.offerCreateSession}>
            Add session
          </Button>
        </section>
      </PagePermissionGuard>

      <DataTable<(ActivitySessionRow & Record<string, unknown>)>
        data={ctl.sessionRows as Array<ActivitySessionRow & Record<string, unknown>>}
        columns={sessionColumns}
        rbac={{ pageName: 'ActivitiesPage' }}
        title="Sessions"
        description="Sessions for this offering."
        isLoading={ctl.sessionsQuery.isLoading}
        initialPageSize={25}
        emptyState={{ description: 'No sessions have been added to this offering yet.' }}
        features={{
          search: true,
          pagination: true,
          sorting: true,
          export: false,
          import: false,
          grouping: false,
          columnVisibility: false,
          editing: false,
          creation: false,
          filtering: false,
          selection: false,
          deletion: false,
          deleteSelected: false,
          columnReordering: false,
          hierarchical: false,
        }}
      />

      <ActivityOfferingOfferingEditDialog
        open={ctl.editOfferingOpen}
        onOpenChange={ctl.setEditOfferingOpen}
        offeringValues={ctl.offeringValues}
        setOfferingValues={ctl.setOfferingValues}
        offeringErrors={ctl.offeringErrors}
        tracActivities={ctl.tracActivitiesQuery.data ?? []}
        updateOfferingMutationIsPending={ctl.updateOfferingMutation.isPending}
        onSaveOffering={ctl.onSaveOffering}
      />

      <ActivityOfferingSessionDialog
        title="Add session"
        open={ctl.createSessionOpen}
        values={ctl.sessionValues}
        errors={ctl.sessionErrors}
        isPending={ctl.createSessionMutation.isPending}
        onValuesChange={ctl.setSessionValues}
        onOpenChange={ctl.setCreateSessionOpen}
        onSubmit={(submittedValues) => {
          ctl.setSessionValues(submittedValues);
          void ctl.onCreateSession(submittedValues);
        }}
      />

      <ActivityOfferingSessionDialog
        title="Edit session"
        open={ctl.editSession != null}
        values={ctl.sessionValues}
        errors={ctl.sessionErrors}
        isPending={ctl.updateSessionMutation.isPending}
        onValuesChange={ctl.setSessionValues}
        onOpenChange={ctl.closeEditSessionDialog}
        onSubmit={(submittedValues) => {
          ctl.setSessionValues(submittedValues);
          void ctl.onSaveSession(submittedValues);
        }}
      />

      <ActivityOfferingDeleteSessionDialog
        deleteSession={ctl.deleteSession}
        bookingCountQueryIsLoading={ctl.bookingCountQuery.isLoading}
        bookingCountData={ctl.bookingCountQuery.data ?? undefined}
        deleteAcknowledge={ctl.deleteAcknowledge}
        setDeleteAcknowledge={ctl.setDeleteAcknowledge}
        onDismiss={ctl.dismissDeleteSession}
        deleteSessionMutationIsPending={ctl.deleteSessionMutation.isPending}
        onConfirmDelete={() => void ctl.onDeleteSession()}
      />
    </main>
  );
}
