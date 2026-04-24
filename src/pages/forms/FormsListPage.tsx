import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  LoadingSpinner,
  CardTitle,
} from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useDeleteEventForm } from '@/hooks/useDeleteEventForm';
import { useEventFormsList } from '@/hooks/useEventFormsList';

export function FormsListPage() {
  const navigate = useNavigate();
  const { selectedEvent } = useUnifiedAuth();
  const [statusMessage, setStatusMessage] = useState('');

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;
  const formsQuery = useEventFormsList(eventId);
  const deleteMutation = useDeleteEventForm(eventId);

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
            <Button type="button" onClick={() => navigate('/form-builder')}>
              Add new form
            </Button>
            {formsQuery.isLoading && (
              <p>
                <LoadingSpinner />
              </p>
            )}
            {formsQuery.isError && <p>Unable to load forms: {formsQuery.error.message}</p>}
            {statusMessage.length > 0 && <p>{statusMessage}</p>}
            {!formsQuery.isLoading &&
              !formsQuery.isError &&
              (formsQuery.data?.length ?? 0) === 0 && <p>No forms found for this event.</p>}
            <section className="grid gap-4 md:grid-cols-2">
              {(formsQuery.data ?? []).map((form) => (
                <Card key={form.id}>
                  <CardHeader>
                    <CardTitle>{form.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Slug: {form.slug}</p>
                    <p>Workflow: {form.workflowType}</p>
                    <p>Access mode: {form.accessMode}</p>
                    <section className="grid gap-2 md:grid-cols-4">
                      <Link to={`/form-builder/${form.slug}`}>Edit</Link>
                      <Link to={`/forms/preview/${form.slug}`}>Preview</Link>
                      <Link to={`/forms/share/${form.slug}`}>Share</Link>
                      <Button
                        onClick={() => {
                          setStatusMessage('');
                          deleteMutation.mutate(form.id, {
                            onSuccess: () => {
                              setStatusMessage('Form deleted.');
                            },
                            onError: (error) => {
                              setStatusMessage(
                                error instanceof Error ? error.message : 'Unable to delete form.'
                              );
                            },
                          });
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </section>
                  </CardContent>
                </Card>
              ))}
            </section>
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
