import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { buildWorkflowPreviewTarget, workflowTypeDisplayLabel } from '@solvera/pace-core/forms';
import { AccessDenied, PagePermissionGuard, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage, formatDate } from '@solvera/pace-core/utils';
import {
  getFormDeleteBlockers,
  useDeleteFormMutation,
  useFormFieldCounts,
  useFormsList,
} from '@/features/formsAuthoring/configuration';
import { isFormDeleteBlocked } from '@/features/formsAuthoring/deletePolicy';
import { buildDeleteBlockedMessage, resolveEventSlug } from '@/features/formsAuthoring/shared';
import { asCount } from '@/features/formsAuthoring/stateHelpers';
import type { CoreFormListRow } from '@/features/formsAuthoring/types';

const PORTAL_CONFIG_ERROR = 'Portal URL is not configured. Set VITE_PORTAL_BASE_URL.';

function iconSizeClass() {
  return 'size-4';
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconSizeClass()} aria-hidden>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconSizeClass()} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconSizeClass()} aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function statusVariant(status: CoreFormListRow['status']) {
  if (status === 'published') {
    return 'solid-main-normal';
  }
  if (status === 'closed') {
    return 'outline-sec-muted';
  }
  return 'soft-sec-muted';
}

function formScheduleLine(form: Pick<CoreFormListRow, 'opens_at' | 'closes_at'>): string | null {
  const parts: string[] = [];
  if (form.opens_at != null) {
    parts.push(`Opens: ${formatDate(form.opens_at)}`);
  }
  if (form.closes_at != null) {
    parts.push(`Closes: ${formatDate(form.closes_at)}`);
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(' · ');
}

function fieldCountLabel(params: {
  formId: string;
  counts: Record<string, number> | undefined;
  isCountsLoading: boolean;
  countError: Error | null;
}) {
  if (params.countError != null) {
    return '? fields';
  }
  if (params.isCountsLoading && params.counts == null) {
    return '— fields';
  }
  return `${params.counts?.[params.formId] ?? 0} fields`;
}

export function FormsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const secureSupabase = useSecureSupabase();
  const formsQuery = useFormsList(selectedEventId);
  const fieldCountsQuery = useFormFieldCounts(selectedEventId, formsQuery.data);
  const deleteMutation = useDeleteFormMutation();

  const [pendingDeleteForm, setPendingDeleteForm] = useState<CoreFormListRow | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const [deleteCheckFormId, setDeleteCheckFormId] = useState<string | null>(null);

  const eventSlug = useMemo(() => resolveEventSlug(selectedEvent), [selectedEvent]);

  const scope = {
    organisationId,
    eventId,
    appId: appId ?? undefined,
  };

  const portalBaseUrl = import.meta.env.VITE_PORTAL_BASE_URL as string | undefined;

  const withPortalUrl = (form: CoreFormListRow): string | null => {
    const configuredBase = portalBaseUrl?.trim();
    if (configuredBase == null || configuredBase.length === 0) {
      return null;
    }
    const previewTarget = buildWorkflowPreviewTarget(
      {
        metadata: {
          id: undefined,
          eventId: selectedEventId ?? undefined,
          organisationId: selectedOrganisationId ?? undefined,
          slug: form.slug,
          name: form.name,
          description: undefined,
          workflowType: form.workflow_type,
          accessMode: 'authenticated_member',
          status: 'draft',
          opensAt: null,
          closesAt: null,
          workflowConfig: {},
          isActive: true,
          isPrimaryEntrypoint: form.is_primary_entrypoint ?? false,
        },
        fields: [],
      },
      { eventSlug }
    );
    return `${configuredBase}${previewTarget.path}`;
  };

  const handlePreview = (form: CoreFormListRow) => {
    const url = withPortalUrl(form);
    if (url == null) {
      toast({
        title: 'Portal URL Missing',
        description: PORTAL_CONFIG_ERROR,
        variant: 'destructive',
      });
      return;
    }
    window.open(url, '_blank');
  };

  const handleRequestDelete = async (form: CoreFormListRow) => {
    if (selectedEventId == null) {
      return;
    }

    setDeleteCheckFormId(form.id);
    try {
      const blockersResult = await getFormDeleteBlockers(secureSupabase, selectedEventId, form.id);
      if (!blockersResult.ok) {
        HandleMutationError(new Error(blockersResult.error.message), 'forms-delete', toast);
        return;
      }
      if (isFormDeleteBlocked(blockersResult.data)) {
        setDeleteBlockedMessage(
          buildDeleteBlockedMessage({
            formName: form.name,
            responseCount: blockersResult.data.responseCount,
            registrationBindingCount: blockersResult.data.registrationBindingCount,
          })
        );
        return;
      }
      setPendingDeleteForm(form);
    } catch (error) {
      HandleMutationError(error, 'forms-delete', toast);
    } finally {
      setDeleteCheckFormId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteForm == null || selectedEventId == null) {
      return;
    }

    try {
      const result = await deleteMutation.mutateAsync({
        eventId: selectedEventId,
        formId: pendingDeleteForm.id,
      });
      setPendingDeleteForm(null);

      if (!result.deleted) {
        setDeleteBlockedMessage(
          buildDeleteBlockedMessage({
            formName: pendingDeleteForm.name,
            responseCount: asCount(result.response_count),
            registrationBindingCount: asCount(result.registration_binding_count),
          })
        );
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['forms-authoring', 'forms-list', selectedEventId] });
      await queryClient.invalidateQueries({ queryKey: ['forms-authoring', 'field-counts', selectedEventId] });
      ShowSuccessMessage('Form deleted successfully.', toast);
    } catch (error) {
      setPendingDeleteForm(null);
      HandleMutationError(error, 'forms-delete', toast);
    }
  };

  return (
    <PagePermissionGuard pageName="FormsPage" operation="read" scope={scope} fallback={<AccessDenied />}>
      <main className="grid gap-4">
        <section className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <header className="grid gap-1">
            <h1>Forms</h1>
            <p>Manage workflow forms for this event.</p>
          </header>

          {selectedEventId != null ? (
            <PagePermissionGuard pageName="FormsPage" operation="create" scope={scope} fallback={null}>
              <Button type="button" onClick={() => navigate('/form-builder')}>
                Create Form
              </Button>
            </PagePermissionGuard>
          ) : null}
        </section>

        {selectedEventId == null ? (
          <Card>
            <CardContent>
              <p>Select an event from the header to manage forms.</p>
            </CardContent>
          </Card>
        ) : formsQuery.isLoading ? (
          <section className="grid min-h-[24vh] place-items-center">
            <LoadingSpinner />
          </section>
        ) : formsQuery.error != null ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{NormalizeSupabaseError(formsQuery.error).message}</AlertDescription>
          </Alert>
        ) : (formsQuery.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent>
              <p>No forms yet. Create your first form to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(formsQuery.data ?? []).map((form) => {
              const scheduleLine = formScheduleLine(form);
              const portalUrl = withPortalUrl(form);
              return (
              <Card key={form.id} className="grid h-full grid-rows-[1fr_auto]">
                <CardHeader className="grid content-start gap-2">
                  <section className="grid gap-1 md:grid-cols-[1fr_auto] md:items-start">
                    <CardTitle>{form.name}</CardTitle>
                    <Badge variant={statusVariant(form.status)}>{form.status}</Badge>
                  </section>
                  <CardDescription>{fieldCountLabel({
                    formId: form.id,
                    counts: fieldCountsQuery.data,
                    isCountsLoading: fieldCountsQuery.isLoading,
                    countError: fieldCountsQuery.error,
                  })}</CardDescription>
                  <p>{workflowTypeDisplayLabel(form.workflow_type)}</p>
                  {scheduleLine != null ? <p>{scheduleLine}</p> : null}
                  {portalUrl != null ? (
                    <p className="break-all">
                      <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                        {portalUrl}
                      </a>
                    </p>
                  ) : null}
                </CardHeader>

                <CardFooter className="grid grid-flow-col auto-cols-max gap-2">
                  <Button
                    type="button"
                    aria-label={`Edit ${form.name}`}
                    onClick={() => navigate(`/form-builder?formId=${form.id}`)}
                  >
                    <EditIcon />
                  </Button>
                  <Button type="button" aria-label={`Preview ${form.name}`} onClick={() => handlePreview(form)}>
                    <PreviewIcon />
                  </Button>
                  <PagePermissionGuard pageName="FormsPage" operation="update" scope={scope} fallback={null}>
                    <Button
                      type="button"
                      aria-label={`Delete ${form.name}`}
                      disabled={deleteCheckFormId === form.id}
                      onClick={() => void handleRequestDelete(form)}
                    >
                      <DeleteIcon />
                    </Button>
                  </PagePermissionGuard>
                </CardFooter>
              </Card>
            );
            })}
          </section>
        )}
      </main>

      <ConfirmationDialog
        open={pendingDeleteForm != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteForm(null);
          }
        }}
        title="Delete form"
        description={
          pendingDeleteForm != null
            ? `Are you sure you want to delete '${pendingDeleteForm.name}'? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleConfirmDelete()}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={deleteBlockedMessage != null} onOpenChange={(open) => !open && setDeleteBlockedMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot delete form</DialogTitle>
            <DialogDescription>{deleteBlockedMessage ?? ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setDeleteBlockedMessage(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PagePermissionGuard>
  );
}
