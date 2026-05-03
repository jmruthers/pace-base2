import { useMemo, useState } from 'react';
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
  CardHeader,
  CardTitle,
  ConfirmationDialog,
  DataTable,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
  Textarea,
} from '@solvera/pace-core/components';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { PagePermissionGuard, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage, formatDateTime } from '@solvera/pace-core/utils';
import {
  useApplicationEvidence,
  useApplicationsQueue,
  useReissueCheckTokenMutation,
  useSetApplicationStatusMutation,
  useSetCheckStatusMutation,
} from '@/features/applicationsAdmin/configuration';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import {
  applicationStatusLabel,
  applicationStatusVariant,
  checkStatusVariant,
  checkTypeLabel,
  evidenceFieldLabel,
  getChecksSummary,
  renderJsonValue,
  resolveApplicantName,
  resolveSubmittedLabel,
  sortChecksByOrder,
} from '@/features/applicationsAdmin/stateHelpers';
import type { ApplicationCheckRow, ApplicationQueueRow } from '@/features/applicationsAdmin/types';

type ApplicationTableRow = ApplicationQueueRow & Record<string, unknown> & {
  applicantLabel: string;
  applicantEmail: string;
  registrationTypeLabel: string;
  submittedLabel: string;
};

function isTransitionConflict(error: unknown): boolean {
  const message = String(error ?? '');
  return (
    message.includes('validation_error.application_status_transition_invalid') ||
    message.toLowerCase().includes('status transition')
  );
}

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'Selected event';
}

function isReissueEligible(check: ApplicationCheckRow): boolean {
  const checkType = check.requirement?.check_type;
  return (checkType === 'guardian_approval' || checkType === 'referee') && check.status === 'pending';
}

function isOverrideAllowed(status: ApplicationQueueRow['status']): boolean {
  return status === 'submitted' || status === 'under_review';
}

function isTokenExpiryRelevant(check: ApplicationCheckRow): boolean {
  const checkType = check.requirement?.check_type;
  return check.status === 'pending' && (checkType === 'guardian_approval' || checkType === 'referee');
}

function ClipboardListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M8 11h8" />
      <path d="M8 15h8" />
    </svg>
  );
}

// eslint-disable-next-line max-lines-per-function
export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const secureSupabase = useSecureSupabase();
  const { toast } = useToast();
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId, appId } = useUnifiedAuth();
  const queueQuery = useApplicationsQueue(selectedEventId);
  const setApplicationStatusMutation = useSetApplicationStatusMutation();
  const setCheckStatusMutation = useSetCheckStatusMutation();
  const reissueTokenMutation = useReissueCheckTokenMutation();

  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null);
  const [reviewStepsApplicationId, setReviewStepsApplicationId] = useState<string | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectAppDialogOpen, setRejectAppDialogOpen] = useState(false);
  const [rejectApplicationNotes, setRejectApplicationNotes] = useState('');
  const [satisfyCheckConfirmOpen, setSatisfyCheckConfirmOpen] = useState(false);
  const [rejectCheckConfirmOpen, setRejectCheckConfirmOpen] = useState(false);
  const [rejectCheckNotes, setRejectCheckNotes] = useState('');
  const [reissueConfirmOpen, setReissueConfirmOpen] = useState(false);
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

  const scope = {
    organisationId: selectedOrganisationId,
    eventId: selectedEventId ?? null,
    appId: appId ?? undefined,
  };

  const eventName = eventNameFromSelection(selectedEvent);
  const tableRows = useMemo<ApplicationTableRow[]>(
    () =>
      (queueQuery.data ?? []).map((row) => ({
        ...row,
        applicantLabel: resolveApplicantName(row),
        applicantEmail: row.person?.email ?? 'No email provided',
        registrationTypeLabel: row.registration_type?.name ?? 'Unknown registration type',
        submittedLabel: resolveSubmittedLabel(row),
      })),
    [queueQuery.data]
  );

  const statusFilterOptions = useMemo(
    () =>
      Array.from(new Set(tableRows.map((row) => row.status))).map((value) => ({
        value,
        label: applicationStatusLabel(value),
      })),
    [tableRows]
  );

  const registrationTypeFilterOptions = useMemo(
    () =>
      Array.from(new Set(tableRows.map((row) => row.registrationTypeLabel))).map((value) => ({
        value,
        label: value,
      })),
    [tableRows]
  );

  const detailRow = useMemo(
    () => tableRows.find((row) => row.id === detailApplicationId) ?? null,
    [detailApplicationId, tableRows]
  );
  const reviewStepsRow = useMemo(
    () => tableRows.find((row) => row.id === reviewStepsApplicationId) ?? null,
    [reviewStepsApplicationId, tableRows]
  );

  const sortedDetailChecks = useMemo(
    () => sortChecksByOrder(detailRow?.checks ?? []),
    [detailRow]
  );
  const sortedReviewChecks = useMemo(
    () => sortChecksByOrder(reviewStepsRow?.checks ?? []),
    [reviewStepsRow]
  );
  const evidenceQuery = useApplicationEvidence(detailRow?.id ?? null, detailRow != null);
  const retryQueue = useRetryRefetchHandler(queueQuery);
  const retryEvidence = useRetryRefetchHandler(evidenceQuery);

  const tableColumns = useMemo(
    () => [
      {
        id: 'applicantLabel',
        accessorKey: 'applicantLabel',
        header: 'Applicant',
        sortable: true,
      },
      {
        id: 'applicantEmail',
        accessorKey: 'applicantEmail',
        header: 'Email',
        sortable: true,
      },
      {
        id: 'registrationTypeLabel',
        accessorKey: 'registrationTypeLabel',
        header: 'Registration type',
        sortable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: registrationTypeFilterOptions,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        sortable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: statusFilterOptions,
        cell: ({ row }: { row: ApplicationTableRow }) => (
          <Badge variant={applicationStatusVariant(row.status)}>{applicationStatusLabel(row.status)}</Badge>
        ),
      },
      {
        id: 'submittedLabel',
        accessorKey: 'submittedLabel',
        header: 'Submitted',
        sortable: true,
      },
      {
        id: 'checks',
        accessorKey: 'checks',
        header: 'Checks',
        cell: ({ row }: { row: ApplicationTableRow }) => {
          const summary = getChecksSummary(row.checks);
          if (summary == null) {
            return null;
          }
          return <Badge variant={summary.variant}>{summary.label}</Badge>;
        },
      },
      {
        id: 'queueActions',
        header: 'Actions',
        cell: ({ row }: { row: ApplicationTableRow }) => (
          <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setDetailApplicationId(row.id)}>
              View
            </Button>
            {row.checks.length > 0 ? (
              <Button type="button" variant="outline" onClick={() => setReviewStepsApplicationId(row.id)}>
                View review steps
              </Button>
            ) : null}
          </section>
        ),
      },
    ],
    [registrationTypeFilterOptions, statusFilterOptions]
  );

  const invalidateApplications = async () => {
    await queryClient.invalidateQueries({ queryKey: ['applications-admin', 'queue', selectedEventId] });
    if (detailRow != null) {
      await queryClient.invalidateQueries({ queryKey: ['applications-admin', 'evidence', detailRow.id] });
    }
  };

  const handleApproveApplication = async () => {
    if (detailRow == null) {
      return;
    }
    try {
      await setApplicationStatusMutation.mutateAsync({
        applicationId: detailRow.id,
        targetStatus: 'approved',
        notes: null,
      });
      ShowSuccessMessage('Application approved', toast);
      setApproveConfirmOpen(false);
      setDetailApplicationId(null);
      await invalidateApplications();
    } catch (error) {
      if (isTransitionConflict(error)) {
        setApproveConfirmOpen(false);
        toast({
          title: 'Status changed',
          description:
            "This application's status has already been updated — close this dialog and refresh the queue to see the current state.",
          variant: 'destructive',
        });
        return;
      }
      HandleMutationError(error, 'applications-approve', toast);
    }
  };

  const handleRejectApplication = async () => {
    if (detailRow == null) {
      return;
    }
    const normalizedNotes = rejectApplicationNotes.trim();
    if (normalizedNotes.length === 0) {
      toast({
        title: 'Rejection notes required',
        description: 'Provide notes before rejecting this application.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await setApplicationStatusMutation.mutateAsync({
        applicationId: detailRow.id,
        targetStatus: 'rejected',
        notes: normalizedNotes,
      });
      ShowSuccessMessage('Application rejected', toast);
      setRejectAppDialogOpen(false);
      setRejectApplicationNotes('');
      setDetailApplicationId(null);
      await invalidateApplications();
    } catch (error) {
      if (isTransitionConflict(error)) {
        setRejectAppDialogOpen(false);
        toast({
          title: 'Status changed',
          description:
            "This application's status has already been updated — close this dialog and refresh the queue to see the current state.",
          variant: 'destructive',
        });
        return;
      }
      HandleMutationError(error, 'applications-reject', toast);
    }
  };

  const handleSatisfyCheck = async () => {
    if (activeCheckId == null) {
      return;
    }
    try {
      await setCheckStatusMutation.mutateAsync({
        checkId: activeCheckId,
        targetStatus: 'satisfied',
        notes: null,
      });
      ShowSuccessMessage('Check satisfied', toast);
      setSatisfyCheckConfirmOpen(false);
      setActiveCheckId(null);
      await invalidateApplications();
    } catch (error) {
      HandleMutationError(error, 'applications-check-satisfy', toast);
    }
  };

  const handleRejectCheck = async () => {
    if (activeCheckId == null) {
      return;
    }
    try {
      await setCheckStatusMutation.mutateAsync({
        checkId: activeCheckId,
        targetStatus: 'failed',
        notes: rejectCheckNotes.trim().length > 0 ? rejectCheckNotes.trim() : null,
      });
      ShowSuccessMessage('Check rejected', toast);
      setRejectCheckConfirmOpen(false);
      setRejectCheckNotes('');
      setActiveCheckId(null);
      await invalidateApplications();
    } catch (error) {
      HandleMutationError(error, 'applications-check-reject', toast);
    }
  };

  const handleReissueToken = async () => {
    if (activeCheckId == null) {
      return;
    }
    try {
      await reissueTokenMutation.mutateAsync({ checkId: activeCheckId });
      ShowSuccessMessage('Approval link reissued', toast);
      setReissueConfirmOpen(false);
      setActiveCheckId(null);
      await invalidateApplications();
    } catch (error) {
      HandleMutationError(error, 'applications-reissue-token', toast);
    }
  };

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Applications</h1>
        <p>Manage applications for {eventName}.</p>
      </header>

      {queueQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(queueQuery.error).message}</AlertDescription>
          <section className="pt-2">
            <Button type="button" variant="outline" onClick={retryQueue}>
              Retry
            </Button>
          </section>
        </Alert>
      ) : null}

      {selectedEventId == null ? (
        <Card>
          <CardContent>
            <p>Select an event from the header to view its applications.</p>
          </CardContent>
        </Card>
      ) : secureSupabase == null ? (
        <section className="grid min-h-[24vh] place-items-center">
          <LoadingSpinner />
        </section>
      ) : (
        <section className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                <ClipboardListIcon />
                Application queue
              </CardTitle>
              <CardDescription>
                {queueQuery.isLoading
                  ? 'Loading applications...'
                  : `${tableRows.length} applications for ${eventName}`}
              </CardDescription>
            </CardHeader>
          </Card>
          <DataTable<ApplicationTableRow>
            data={tableRows}
            columns={tableColumns}
            rbac={{ pageName: 'applications' }}
            isLoading={queueQuery.isLoading}
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

      <Dialog
        open={detailRow != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailApplicationId(null);
          }
        }}
      >
        {detailRow != null ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{detailRow.applicantLabel}</DialogTitle>
              <DialogDescription className="inline-grid grid-flow-col auto-cols-max items-center gap-2">
                <span>{detailRow.applicantEmail}</span>
                <Badge variant={applicationStatusVariant(detailRow.status)}>
                  {applicationStatusLabel(detailRow.status)}
                </Badge>
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <section className="grid gap-2">
                <p>Registration type: {detailRow.registrationTypeLabel}</p>
              </section>

              <section className="grid gap-2">
                <h3>Form evidence</h3>
                {evidenceQuery.isLoading ? (
                  <section className="grid min-h-24 place-items-center">
                    <LoadingSpinner />
                  </section>
                ) : evidenceQuery.error != null ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{NormalizeSupabaseError(evidenceQuery.error).message}</AlertDescription>
                    <section className="pt-2">
                      <Button type="button" variant="outline" onClick={retryEvidence}>
                        Retry
                      </Button>
                    </section>
                  </Alert>
                ) : (evidenceQuery.data?.length ?? 0) === 0 ? (
                  <p>No linked form responses were found for this application.</p>
                ) : (
                  <section className="grid gap-3">
                    {(evidenceQuery.data ?? []).map((evidence) => (
                      <Card key={evidence.id}>
                        <CardHeader>
                          <CardTitle>{evidence.form?.name ?? 'Form response'}</CardTitle>
                          <CardDescription>
                            Submitted {evidence.submitted_at != null ? formatDateTime(evidence.submitted_at) : 'Unknown'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            {evidence.values.map((value, index) => {
                              if (value.value_text == null && value.value_json == null) {
                                return null;
                              }
                              const label = evidenceFieldLabel(value);
                              const jsonRendered = renderJsonValue(value.value_json);
                              return (
                                <article key={`${evidence.id}-${value.form_field_id ?? value.field_key ?? index}`} className="grid gap-1">
                                  <h4>{label}</h4>
                                  {value.value_text != null ? <p>{value.value_text}</p> : null}
                                  {jsonRendered == null ? null : typeof jsonRendered === 'string' ? (
                                    <p>{jsonRendered}</p>
                                  ) : (
                                    <section className="grid grid-cols-2 gap-1">
                                      {Object.entries(jsonRendered).map(([key, renderedValue]) => (
                                        <article key={`${label}-${key}`} className="grid grid-cols-2 gap-1">
                                          <p>{key}</p>
                                          <p>{renderedValue}</p>
                                        </article>
                                      ))}
                                    </section>
                                  )}
                                </article>
                              );
                            })}
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                )}
              </section>

              <section className="grid gap-2">
                <h3>Checks overview</h3>
                {(sortedDetailChecks.length === 0) ? (
                  <p>No checks were configured for this application.</p>
                ) : (
                  <section className="grid gap-2">
                    {sortedDetailChecks.map((check) => {
                      const checkType = check.requirement?.check_type;
                      const showEventActions = checkType === 'event_approval' && check.status === 'pending';
                      return (
                        <article key={check.id} className="grid gap-1 border rounded-md p-2">
                          <section className="grid grid-cols-1 gap-1 md:grid-cols-[1fr_auto] md:items-center">
                            <p>{checkType != null ? checkTypeLabel(checkType) : 'Check'}</p>
                            <Badge variant={checkStatusVariant(check.status)}>{check.status}</Badge>
                          </section>
                          {check.token_expires_at != null && isTokenExpiryRelevant(check) ? (
                            <p>Token expires {formatDateTime(check.token_expires_at)}</p>
                          ) : null}
                          {check.notes != null ? <p>Notes: {check.notes}</p> : null}

                          {showEventActions ? (
                            <PagePermissionGuard pageName="applications" operation="update" scope={scope} fallback={null}>
                              <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveCheckId(check.id);
                                    setSatisfyCheckConfirmOpen(true);
                                  }}
                                >
                                  Satisfy check
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() => {
                                    setActiveCheckId(check.id);
                                    setRejectCheckConfirmOpen(true);
                                  }}
                                >
                                  Reject check
                                </Button>
                              </section>
                            </PagePermissionGuard>
                          ) : null}

                          {isReissueEligible(check) ? (
                            <PagePermissionGuard pageName="applications" operation="update" scope={scope} fallback={null}>
                              <section>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveCheckId(check.id);
                                    setReissueConfirmOpen(true);
                                  }}
                                >
                                  Reissue link
                                </Button>
                              </section>
                            </PagePermissionGuard>
                          ) : null}
                        </article>
                      );
                    })}
                  </section>
                )}
              </section>
            </DialogBody>
            <DialogFooter className="text-right">
              {isOverrideAllowed(detailRow.status) ? (
                <PagePermissionGuard pageName="applications" operation="update" scope={scope} fallback={null}>
                  <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Button type="button" onClick={() => setApproveConfirmOpen(true)}>
                      Approve application
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => setRejectAppDialogOpen(true)}>
                      Reject application
                    </Button>
                  </section>
                </PagePermissionGuard>
              ) : null}
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={reviewStepsRow != null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewStepsApplicationId(null);
          }
        }}
      >
        {reviewStepsRow != null ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review steps</DialogTitle>
              <DialogDescription>{reviewStepsRow.applicantLabel}</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <section className="grid gap-2">
                {sortedReviewChecks.map((check, index) => (
                  <article key={check.id} className="grid gap-1 border rounded-md p-2">
                    <p>Step {index + 1}</p>
                    <p>{check.requirement?.check_type != null ? checkTypeLabel(check.requirement.check_type) : 'Check'}</p>
                    <Badge variant={checkStatusVariant(check.status)}>{check.status}</Badge>
                    {check.token_expires_at != null && isTokenExpiryRelevant(check) ? (
                      <p>Token expires {formatDateTime(check.token_expires_at)}</p>
                    ) : null}
                    {check.actioned_at != null ? <p>Actioned {formatDateTime(check.actioned_at)}</p> : null}
                    {check.notes != null ? <p>Notes: {check.notes}</p> : null}
                  </article>
                ))}
              </section>
            </DialogBody>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmationDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title="Approve application"
        description="Approve this application now?"
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={() => void handleApproveApplication()}
        isPending={setApplicationStatusMutation.isPending}
      />

      <ConfirmationDialog
        open={rejectAppDialogOpen}
        onOpenChange={(open) => {
          setRejectAppDialogOpen(open);
          if (!open) {
            setRejectApplicationNotes('');
          }
        }}
        title="Reject application"
        description={
          <section className="grid gap-2">
            <p>Provide notes for this rejection.</p>
            <Textarea
              value={rejectApplicationNotes}
              onChange={setRejectApplicationNotes}
              rows={4}
              placeholder="Add rejection notes"
            />
          </section>
        }
        confirmLabel="Reject application"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRejectApplication()}
        isPending={setApplicationStatusMutation.isPending}
      />

      <ConfirmationDialog
        open={satisfyCheckConfirmOpen}
        onOpenChange={setSatisfyCheckConfirmOpen}
        title="Satisfy check"
        description="Mark this check as satisfied?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={() => void handleSatisfyCheck()}
        isPending={setCheckStatusMutation.isPending}
      />

      <ConfirmationDialog
        open={reissueConfirmOpen}
        onOpenChange={setReissueConfirmOpen}
        title="Reissue approval link"
        description="Reissue this pending approval link?"
        confirmLabel="Reissue"
        cancelLabel="Cancel"
        onConfirm={() => void handleReissueToken()}
        isPending={reissueTokenMutation.isPending}
      />

      <ConfirmationDialog
        open={rejectCheckConfirmOpen}
        onOpenChange={(open) => {
          setRejectCheckConfirmOpen(open);
          if (!open) {
            setRejectCheckNotes('');
            setActiveCheckId(null);
          }
        }}
        title="Reject check"
        description={
          <section className="grid gap-2">
            <p>Add optional notes for this check decision.</p>
            <Textarea
              value={rejectCheckNotes}
              onChange={setRejectCheckNotes}
              rows={4}
              placeholder="Add optional notes"
            />
          </section>
        }
        confirmLabel="Reject check"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRejectCheck()}
        isPending={setCheckStatusMutation.isPending}
      />

    </main>
  );
}
