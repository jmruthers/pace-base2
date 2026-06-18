import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  ConfirmationDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@solvera/pace-core/components';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { buildWorkflowPreviewTarget } from '@solvera/pace-core/forms';
import { AccessDenied, PagePermissionGuard, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  getFormDeleteBlockers,
  useDeleteFormMutation,
  useFormFieldCounts,
  useFormResponseCounts,
  useFormsList,
} from '@/features/formsAuthoring/configuration';
import { isFormDeleteBlocked } from '@/features/formsAuthoring/deletePolicy';
import { buildDeleteBlockedMessage, resolveEventSlug } from '@/features/formsAuthoring/shared';
import { asCount } from '@/features/formsAuthoring/stateHelpers';
import type { CoreFormListRow } from '@/features/formsAuthoring/types';
import {
  mapFormsListTableRows,
  useFormsListTableColumns,
  type FormsListTableRow,
} from '@/hooks/forms/useFormsListTableColumns';

const PORTAL_CONFIG_ERROR = 'Portal URL is not configured. Set VITE_PORTAL_BASE_URL.';

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
  const responseCountsQuery = useFormResponseCounts(selectedEventId, formsQuery.data);
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

  const handleEdit = (form: CoreFormListRow) => {
    navigate(`/form-builder?formId=${form.id}`);
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
      await queryClient.invalidateQueries({ queryKey: ['forms-authoring', 'response-counts', selectedEventId] });
      ShowSuccessMessage('Form deleted successfully.', toast);
    } catch (error) {
      setPendingDeleteForm(null);
      HandleMutationError(error, 'forms-delete', toast);
    }
  };

  const tableRows = useMemo(
    () => mapFormsListTableRows(formsQuery.data ?? []),
    [formsQuery.data]
  );

  const tableColumns = useFormsListTableColumns({
    scope,
    fieldCounts: fieldCountsQuery.data,
    fieldCountsLoading: fieldCountsQuery.isLoading,
    fieldCountsError: fieldCountsQuery.error,
    responseCounts: responseCountsQuery.data,
    responseCountsLoading: responseCountsQuery.isLoading,
    responseCountsError: responseCountsQuery.error,
    deleteCheckFormId,
    onEdit: handleEdit,
    onPreview: handlePreview,
    onRequestDelete: handleRequestDelete,
  });

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
                New form
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
        ) : formsQuery.error != null ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{NormalizeSupabaseError(formsQuery.error).message}</AlertDescription>
          </Alert>
        ) : (
          <DataTable<FormsListTableRow>
            data={tableRows}
            columns={tableColumns}
            rbac={{ pageName: 'FormsPage' }}
            isLoading={formsQuery.isLoading}
            getRowId={(row) => row.id}
            onRowActivate={(row) => navigate(`/form-builder?formId=${row.id}`)}
            emptyState={{ description: 'No forms yet. Create your first form to get started.' }}
            features={{
              search: true,
              pagination: true,
              sorting: true,
              filtering: false,
              import: false,
              export: false,
              selection: false,
              creation: false,
              editing: false,
              deletion: false,
              deleteSelected: false,
              grouping: false,
              columnVisibility: false,
              columnReordering: false,
              hierarchical: false,
            }}
          />
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
