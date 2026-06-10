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
  DataTable,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { ApplicationTableRow } from '@/pages/applications/components/applicationQueueTypes';
import type { ApplicationsPageController } from '@/pages/applications/hooks/useApplicationsPageController';
import { ApplicationQueueClipboardIcon } from '@/pages/applications/components/ApplicationQueueClipboardIcon';
import {
  ApplicationConfirmationDialogs,
} from '@/pages/applications/components/ApplicationConfirmationDialogs';
import {
  ApplicationDetailDialog,
  ApplicationReviewStepsDialog,
} from '@/pages/applications/components/ApplicationDetailDialog';

export function ApplicationsPageView({ ctl }: { ctl: ApplicationsPageController }) {
  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Applications</h1>
        <p>Manage applications for {ctl.eventName}.</p>
      </header>

      {ctl.queueQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(ctl.queueQuery.error).message}</AlertDescription>
          <section className="pt-2">
            <Button type="button" variant="outline" onClick={ctl.retryQueue}>
              Retry
            </Button>
          </section>
        </Alert>
      ) : null}

      {ctl.selectedEventId != null && ctl.secureSupabase != null && ctl.checkStatusRpcAvailabilityQuery.data === false ? (
        <Alert variant="destructive">
          <AlertTitle>Backend blocker</AlertTitle>
          <AlertDescription>
            Event approval actions are unavailable because `app_base_application_check_set_status` is missing in this
            environment.
          </AlertDescription>
        </Alert>
      ) : null}

      {ctl.selectedEventId == null ? (
        <Card>
          <CardContent>
            <p>Select an event from the header to view its applications.</p>
          </CardContent>
        </Card>
      ) : ctl.secureSupabase == null ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : (
        <section className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                <ApplicationQueueClipboardIcon />
                Application queue
              </CardTitle>
              <CardDescription>
                {ctl.queueQuery.isLoading
                  ? 'Loading applications...'
                  : `${ctl.tableRows.length} applications for ${ctl.eventName}`}
              </CardDescription>
            </CardHeader>
          </Card>
          <DataTable<ApplicationTableRow>
            data={ctl.tableRows}
            columns={ctl.tableColumns}
            rbac={{ pageName: 'applications' }}
            isLoading={ctl.queueQuery.isLoading}
            emptyState={{ description: 'No applications have been submitted for this event.' }}
            features={{
              search: true,
              pagination: true,
              sorting: true,
              filtering: true,
              import: false,
              export: false,
              selection: false,
              creation: false,
              editing: false,
              deletion: false,
              deleteSelected: false,
              grouping: false,
              columnVisibility: true,
              columnReordering: false,
              hierarchical: false,
            }}
          />
        </section>
      )}

      <ApplicationDetailDialog
        detailRow={ctl.detailRow}
        onOpenChange={(open) => {
          if (!open) {
            ctl.setDetailApplicationId(null);
          }
        }}
        evidenceQuery={ctl.evidenceQuery}
        onRetryEvidence={ctl.retryEvidence}
        sortedChecks={ctl.sortedDetailChecks}
        rpcCheckActionsEnabled={ctl.rpcCheckActionsEnabled}
        scope={ctl.scope}
        onRequestSatisfyCheck={(checkId) => {
          ctl.setActiveCheckId(checkId);
          ctl.setSatisfyCheckConfirmOpen(true);
        }}
        onRequestRejectCheck={(checkId) => {
          ctl.setActiveCheckId(checkId);
          ctl.setRejectCheckConfirmOpen(true);
        }}
        onRequestReissueLink={(checkId) => {
          ctl.setActiveCheckId(checkId);
          ctl.setReissueConfirmOpen(true);
        }}
        onApproveRequest={() => ctl.setApproveConfirmOpen(true)}
        onRejectRequest={() => ctl.setRejectAppDialogOpen(true)}
      />

      <ApplicationReviewStepsDialog
        reviewStepsRow={ctl.reviewStepsRow}
        sortedReviewChecks={ctl.sortedReviewChecks}
        onOpenChange={(open) => {
          if (!open) {
            ctl.setReviewStepsApplicationId(null);
          }
        }}
      />

      <ApplicationConfirmationDialogs
        approveConfirmOpen={ctl.approveConfirmOpen}
        setApproveConfirmOpen={ctl.setApproveConfirmOpen}
        rejectAppDialogOpen={ctl.rejectAppDialogOpen}
        setRejectAppDialogOpen={ctl.setRejectAppDialogOpen}
        rejectApplicationNotes={ctl.rejectApplicationNotes}
        setRejectApplicationNotes={ctl.setRejectApplicationNotes}
        satisfyCheckConfirmOpen={ctl.satisfyCheckConfirmOpen}
        setSatisfyCheckConfirmOpen={ctl.setSatisfyCheckConfirmOpen}
        reissueConfirmOpen={ctl.reissueConfirmOpen}
        setReissueConfirmOpen={ctl.setReissueConfirmOpen}
        rejectCheckConfirmOpen={ctl.rejectCheckConfirmOpen}
        setRejectCheckConfirmOpen={ctl.setRejectCheckConfirmOpen}
        rejectCheckNotes={ctl.rejectCheckNotes}
        setRejectCheckNotes={ctl.setRejectCheckNotes}
        setActiveCheckId={ctl.setActiveCheckId}
        handleApproveApplication={ctl.handleApproveApplication}
        handleRejectApplication={ctl.handleRejectApplication}
        handleSatisfyCheck={ctl.handleSatisfyCheck}
        handleRejectCheck={ctl.handleRejectCheck}
        handleReissueToken={ctl.handleReissueToken}
        setApplicationStatusPending={ctl.setApplicationStatusMutation.isPending}
        setCheckStatusPending={ctl.setCheckStatusMutation.isPending}
        reissueTokenPending={ctl.reissueTokenMutation.isPending}
      />
    </main>
  );
}
