import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  ConfirmationDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@solvera/pace-core/components';
import { useToast } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import {
  getRegistrationTypeDeleteBlockers,
  useDeleteRegistrationTypeMutation,
} from '@/features/registrationSetup/configuration';
import {
  buildDeleteBlockedMessageForRegistrationType,
  isRegistrationTypeDeleteBlocked,
} from '@/features/registrationSetup/deletePolicy';
import type { RegistrationTypeRow } from '@/features/registrationSetup/types';
import { asCount } from '@/features/formsAuthoring/stateHelpers';
import { RegistrationTypesContent } from './components/RegistrationTypesContent';
import { RegistrationTypesHeader } from './components/RegistrationTypesHeader';
import { useRegistrationTypesListController } from './hooks/useRegistrationTypesListController';

export function RegistrationTypesPage() {
  const controller = useRegistrationTypesListController();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const secureSupabase = useSecureSupabase();
  const deleteMutation = useDeleteRegistrationTypeMutation();
  const [pendingDeleteType, setPendingDeleteType] = useState<RegistrationTypeRow | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const [deleteCheckTypeId, setDeleteCheckTypeId] = useState<string | null>(null);

  const handleRequestDelete = async (row: RegistrationTypeRow) => {
    if (controller.selectedEventId == null) {
      return;
    }

    setDeleteCheckTypeId(row.id);
    try {
      const blockersResult = await getRegistrationTypeDeleteBlockers(
        secureSupabase,
        controller.selectedEventId,
        row.id
      );
      if (!blockersResult.ok) {
        HandleMutationError(new Error(blockersResult.error.message), 'registration-types-delete', toast);
        return;
      }
      if (isRegistrationTypeDeleteBlocked(blockersResult.data)) {
        setDeleteBlockedMessage(
          buildDeleteBlockedMessageForRegistrationType({
            typeName: row.name,
            applicationCount: blockersResult.data.applicationCount,
            formBindingCount: blockersResult.data.formBindingCount,
          })
        );
        return;
      }
      setPendingDeleteType(row);
    } catch (error) {
      HandleMutationError(error, 'registration-types-delete', toast);
    } finally {
      setDeleteCheckTypeId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteType == null || controller.selectedEventId == null) {
      return;
    }
    const deletedId = pendingDeleteType.id;
    const typeName = pendingDeleteType.name;

    try {
      const result = await deleteMutation.mutateAsync({
        eventId: controller.selectedEventId,
        registrationTypeId: deletedId,
      });
      setPendingDeleteType(null);

      if (!result.deleted) {
        setDeleteBlockedMessage(
          buildDeleteBlockedMessageForRegistrationType({
            typeName,
            applicationCount: asCount(result.application_count),
            formBindingCount: asCount(result.form_binding_count),
          })
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ['registration-setup', 'types-list', controller.selectedEventId],
      });
      await queryClient.invalidateQueries({ queryKey: ['registration-setup', 'requirements', deletedId] });
      ShowSuccessMessage('Registration type deleted successfully.', toast);
    } catch (error) {
      setPendingDeleteType(null);
      HandleMutationError(error, 'registration-types-delete', toast);
    }
  };

  return (
    <PagePermissionGuard
      pageName="registration-types"
      operation="read"
      scope={controller.scope}
      fallback={<AccessDenied />}
    >
      <main className="grid gap-4">
        <RegistrationTypesHeader
          selectedEventId={controller.selectedEventId}
          scope={controller.scope}
          onCreate={controller.openCreate}
        />
        <RegistrationTypesContent
          selectedEventId={controller.selectedEventId}
          scope={controller.scope}
          listQuery={controller.listQuery}
          rows={controller.listRows}
          eligibilityCounts={controller.eligibilityCounts}
          onEdit={controller.openEdit}
          deleteCheckingTypeId={deleteCheckTypeId}
          onRequestDelete={(row) => void handleRequestDelete(row)}
        />
      </main>

      <ConfirmationDialog
        open={pendingDeleteType != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteType(null);
          }
        }}
        title="Delete registration type"
        description={
          pendingDeleteType != null
            ? `Are you sure you want to delete '${pendingDeleteType.name}'? This action cannot be undone.`
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
            <DialogTitle>Cannot delete registration type</DialogTitle>
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
