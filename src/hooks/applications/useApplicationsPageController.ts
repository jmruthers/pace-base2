import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast, useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  HandleMutationError,
  ShowSuccessMessage,
} from '@solvera/pace-core/utils';
import {
  useApplicationEvidence,
  useApplicationsQueue,
  useCheckStatusRpcAvailability,
  useReissueCheckTokenMutation,
  useSetApplicationStatusMutation,
  useSetCheckStatusMutation,
} from '@/features/applicationsAdmin/configuration';
import {
  resolveApplicantName,
  resolveSubmittedLabel,
  sortChecksByOrder,
  applicationStatusLabel,
} from '@/features/applicationsAdmin/stateHelpers';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { ApplicationTableRow } from '@/pages/applications/components/applicationQueueTypes';
import {
  eventNameFromSelection,
  isTransitionConflict,
} from '@/pages/applications/applicationPagePure';
import { useApplicationsTableColumns } from '@/pages/applications/hooks/useApplicationsTableColumns';

export function useApplicationsPageController() {
  const queryClient = useQueryClient();
  const secureSupabase = useSecureSupabase();
  const { toast } = useToast();
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const queueQuery = useApplicationsQueue(selectedEventId);
  const checkStatusRpcAvailabilityQuery = useCheckStatusRpcAvailability(selectedEventId);
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
    organisationId: organisationId ?? selectedOrganisationId ?? undefined,
    eventId: eventId ?? selectedEventId ?? null,
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

  const sortedDetailChecks = useMemo(() => sortChecksByOrder(detailRow?.checks ?? []), [detailRow]);
  const sortedReviewChecks = useMemo(
    () => sortChecksByOrder(reviewStepsRow?.checks ?? []),
    [reviewStepsRow]
  );

  const evidenceQuery = useApplicationEvidence(detailRow?.id ?? null, detailRow != null);
  const retryQueue = useRetryRefetchHandler(queueQuery);
  const retryEvidence = useRetryRefetchHandler(evidenceQuery);

  const onViewDetail = useCallback((applicationId: string) => setDetailApplicationId(applicationId), []);
  const onViewReviewSteps = useCallback((applicationId: string) => setReviewStepsApplicationId(applicationId), []);

  const tableColumns = useApplicationsTableColumns({
    registrationTypeFilterOptions,
    statusFilterOptions,
    onViewDetail,
    onViewReviewSteps,
  });

  const invalidateApplications = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['applications-admin', 'queue', selectedEventId] });
    if (detailRow != null) {
      await queryClient.invalidateQueries({ queryKey: ['applications-admin', 'evidence', detailRow.id] });
    }
  }, [detailRow, queryClient, selectedEventId]);

  const handleApproveApplication = useCallback(async () => {
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
  }, [detailRow, invalidateApplications, setApplicationStatusMutation, toast]);

  const handleRejectApplication = useCallback(async () => {
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
  }, [detailRow, invalidateApplications, rejectApplicationNotes, setApplicationStatusMutation, toast]);

  const handleSatisfyCheck = useCallback(async () => {
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
  }, [activeCheckId, invalidateApplications, setCheckStatusMutation, toast]);

  const handleRejectCheck = useCallback(async () => {
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
  }, [activeCheckId, invalidateApplications, rejectCheckNotes, setCheckStatusMutation, toast]);

  const handleReissueToken = useCallback(async () => {
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
  }, [activeCheckId, invalidateApplications, reissueTokenMutation, toast]);

  const rpcCheckActionsEnabled = checkStatusRpcAvailabilityQuery.data !== false;

  return {
    scope,
    secureSupabase,
    selectedEventId,
    eventName,
    queueQuery,
    checkStatusRpcAvailabilityQuery,
    tableRows,
    tableColumns,
    retryQueue,
    detailApplicationId,
    setDetailApplicationId,
    detailRow,
    reviewStepsApplicationId,
    setReviewStepsApplicationId,
    reviewStepsRow,
    sortedDetailChecks,
    sortedReviewChecks,
    evidenceQuery,
    retryEvidence,
    rpcCheckActionsEnabled,
    approveConfirmOpen,
    setApproveConfirmOpen,
    rejectAppDialogOpen,
    setRejectAppDialogOpen,
    rejectApplicationNotes,
    setRejectApplicationNotes,
    satisfyCheckConfirmOpen,
    setSatisfyCheckConfirmOpen,
    rejectCheckConfirmOpen,
    setRejectCheckConfirmOpen,
    rejectCheckNotes,
    setRejectCheckNotes,
    reissueConfirmOpen,
    setReissueConfirmOpen,
    activeCheckId,
    setActiveCheckId,
    handleApproveApplication,
    handleRejectApplication,
    handleSatisfyCheck,
    handleRejectCheck,
    handleReissueToken,
    setApplicationStatusMutation,
    setCheckStatusMutation,
    reissueTokenMutation,
  };
}

export type ApplicationsPageController = ReturnType<typeof useApplicationsPageController>;
