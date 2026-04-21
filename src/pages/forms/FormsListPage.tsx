import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';

interface FormListItem {
  id: string;
  slug: string;
  title: string;
  workflowType: string;
  accessMode: string;
}

function createEventScopedForms(eventId: string): ReadonlyArray<FormListItem> {
  return [
    {
      id: `${eventId}-registration-primary`,
      slug: 'registration-primary',
      title: 'Primary registration',
      workflowType: 'base_registration',
      accessMode: 'authenticated_member',
    },
    {
      id: `${eventId}-medical-intake`,
      slug: 'medical-intake',
      title: 'Medical intake',
      workflowType: 'base_registration',
      accessMode: 'authenticated_member',
    },
  ];
}

export function FormsListPage() {
  const { selectedEvent } = useUnifiedAuth();
  const [hiddenFormIds, setHiddenFormIds] = useState<ReadonlyArray<string>>([]);

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;

  const forms = useMemo(() => {
    if (eventId == null) {
      return [];
    }
    return createEventScopedForms(eventId).filter((form) => !hiddenFormIds.includes(form.id));
  }, [eventId, hiddenFormIds]);

  if (eventId == null) {
    return (
      <PagePermissionGuard pageName="forms" operation="read" fallback={<AccessDenied />}>
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Select an event before managing form authoring.</p>
            </CardContent>
          </Card>
        </section>
      </PagePermissionGuard>
    );
  }

  return (
    <PagePermissionGuard pageName="forms" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Event scope: {eventId}</p>
            <p>
              <Link to="/form-builder">Create or edit forms</Link>
            </p>
            <ul>
              {forms.map((form) => (
                <li key={form.id}>
                  <p>{form.title}</p>
                  <p>Slug: {form.slug}</p>
                  <p>Workflow: {form.workflowType}</p>
                  <p>Access mode: {form.accessMode}</p>
                  <p>
                    <a href={`/preview/${form.slug}`}>Preview</a>
                  </p>
                  <p>
                    <a href={`/share/${form.slug}`}>Share</a>
                  </p>
                  <Button
                    onClick={() =>
                      setHiddenFormIds((previous) => [...previous, form.id])
                    }
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
