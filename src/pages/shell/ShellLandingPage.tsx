import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';

export function ShellLandingPage() {
  const {
    selectedOrganisation,
    selectedEvent,
    events,
    eventLoading,
  } = useUnifiedAuth();

  return (
    <PagePermissionGuard pageName="dashboard" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>BASE shell landing</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This authenticated route is the BASE shell entrypoint for operators and
              administrators.
            </p>
            {selectedOrganisation != null && (
              <p>Organisation context: {selectedOrganisation.display_name}</p>
            )}
            {eventLoading ? (
              <p>Loading event context...</p>
            ) : selectedEvent == null ? (
              <p>
                Select an event from the shell context selector to begin event-scoped
                operations.
              </p>
            ) : (
              <p>Event context is active. Change the event from the shell header when needed.</p>
            )}
            <p>Available event contexts: {events.length}</p>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
