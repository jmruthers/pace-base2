import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : 'Not available';
}

function asNumber(value: unknown): string {
  return typeof value === 'number' ? String(value) : 'Not available';
}

export function EventDashboardPage() {
  const { selectedEvent } = useUnifiedAuth();

  if (selectedEvent == null) {
    return (
      <PagePermissionGuard pageName="event-dashboard" operation="read" fallback={<AccessDenied />}>
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Event workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Select an event from the shell context selector to load workspace details.</p>
            </CardContent>
          </Card>
        </section>
      </PagePermissionGuard>
    );
  }

  const eventRecord = selectedEvent as Record<string, unknown>;

  return (
    <PagePermissionGuard pageName="event-dashboard" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Event workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Event name: {asString(eventRecord.event_name)}</p>
            <p>Event code: {asString(eventRecord.event_code)}</p>
            <p>Registration scope: {asString(eventRecord.registration_scope)}</p>
            <p>Expected participants: {asNumber(eventRecord.expected_participants)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational entrypoints</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              <li>
                <Link to="/configuration">Event configuration</Link>
              </li>
              <li>
                <Link to="/forms">Forms</Link>
              </li>
              <li>
                <Link to="/registration-types">Registration types</Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
