import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  LoadingSpinner,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@solvera/pace-core/components';
import { ApplicationConfirmationDialogs } from '@/components/applications/ApplicationConfirmationDialogs';
import {
  ApplicationDetailActionBar,
  ApplicationDetailChecksSection,
  ApplicationDetailHistorySection,
  ApplicationDetailStatusMeta,
  ApplicationDetailSummarySection,
  ApplicationEvidenceSection,
} from '@/components/applications/ApplicationDetailContent';
import type { ApplicationDetailPageController } from '@/hooks/applications/useApplicationDetailPageController';

export function ApplicationDetailPageView({ ctl }: { ctl: ApplicationDetailPageController }) {
  if (ctl.selectedEventId == null) {
    return (
      <main className="grid gap-4">
        <Card>
          <CardContent>
            <p>Select an event from the header to view its applications.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (ctl.secureSupabase == null || ctl.queueQuery.isLoading) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (ctl.detailRow == null) {
    return (
      <main className="grid gap-4">
        <PageHeader
          breadcrumbItems={[
            { label: 'pace-base', href: '/' },
            { label: 'Applications', href: '/applications' },
          ]}
          title="Application not found"
          subtitle="This application is not in the queue for the selected event."
          actions={
            <Button type="button" variant="outline" onClick={ctl.onBackToApplications}>
              Back to applications
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="grid gap-4">
      <PageHeader
        breadcrumbItems={[
          { label: 'pace-base', href: '/' },
          { label: 'Applications', href: '/applications' },
          { label: ctl.detailRow.applicantLabel },
        ]}
        title={ctl.detailRow.applicantLabel}
        subtitle={ctl.detailRow.applicantEmail}
        actions={
          <Button type="button" variant="outline" onClick={ctl.onBackToApplications}>
            Back to applications
          </Button>
        }
      />

      <ApplicationDetailStatusMeta detailRow={ctl.detailRow} />

      {ctl.checkStatusRpcAvailabilityQuery.data === false ? (
        <Alert variant="destructive">
          <AlertTitle>Backend blocker</AlertTitle>
          <AlertDescription>
            Event approval actions are unavailable because `app_base_application_check_set_status` is missing in this
            environment.
          </AlertDescription>
        </Alert>
      ) : null}

      <ApplicationDetailSummarySection detailRow={ctl.detailRow} />

      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="evidence">Form evidence</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="checks">
          <ApplicationDetailChecksSection
            sortedDetailChecks={ctl.sortedDetailChecks}
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
          />
        </TabsContent>

        <TabsContent value="evidence">
          <ApplicationEvidenceSection evidenceQuery={ctl.evidenceQuery} onRetryEvidence={ctl.retryEvidence} />
        </TabsContent>

        <TabsContent value="history">
          <ApplicationDetailHistorySection detailRow={ctl.detailRow} />
        </TabsContent>
      </Tabs>

      <ApplicationDetailActionBar
        detailRow={ctl.detailRow}
        scope={ctl.scope}
        onApproveRequest={() => ctl.setApproveConfirmOpen(true)}
        onRejectRequest={() => ctl.setRejectAppDialogOpen(true)}
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
