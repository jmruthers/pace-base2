import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast, useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
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
} from '@/features/applicationsAdmin/stateHelpers';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { ApplicationTableRow } from '@/components/applications/applicationQueueTypes';
import {
  eventNameFromSelection,
  isTransitionConflict,
} from '@/pages/applications/applicationPagePure';

export function useApplicationDetailPageController() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
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

  const detailRow = useMemo<ApplicationTableRow | null>(() => {
    const row = (queueQuery.data ?? []).find((item) => item.id === applicationId);
    if (row == null) {
      return null;
    }
    return {
      ...row,
      applicantLabel: resolveApplicantName(row),
      applicantEmail: row.person?.email ?? 'No email provided',
      registrationTypeLabel: row.registration_type?.name ?? 'Unknown registration type',
      unitLabel: 'Unassigned',
      submittedLabel: resolveSubmittedLabel(row),
    };
  }, [applicationId, queueQuery.data]);

  const sortedDetailChecks = useMemo(() => sortChecksByOrder(detailRow?.checks ?? []), [detailRow]);
  const evidenceQuery = useApplicationEvidence(detailRow?.id ?? null, detailRow != null);
  const retryEvidence = useRetryRefetchHandler(evidenceQuery);

  const invalidateApplications = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['applications-admin', 'queue', selectedEventId] });
    if (detailRow != null) {
      await queryClient.invalidateQueries({ queryKey: ['applications-admin', 'evidence', detailRow.id] });
    }
  }, [detailRow, queryClient, selectedEventId]);

  const onBackToApplications = useCallback(() => {
    navigate('/applications');
  }, [navigate]);

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
      navigate('/applications');
      await invalidateApplications();
    } catch (error) {
      if (isTransitionConflict(error)) {
        setApproveConfirmOpen(false);
        toast({
          title: 'Status changed',
          description:
            "This application's status has already been updated — return to the queue and refresh to see the current state.",
          variant: 'destructive',
        });
        return;
      }
      HandleMutationError(error, 'applications-approve', toast);
    }
  }, [detailRow, invalidateApplications, navigate, setApplicationStatusMutation, toast]);

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
      navigate('/applications');
      await invalidateApplications();
    } catch (error) {
      if (isTransitionConflict(error)) {
        setRejectAppDialogOpen(false);
        toast({
          title: 'Status changed',
          description:
            "This application's status has already been updated — return to the queue and refresh to see the current state.",
          variant: 'destructive',
        });
        return;
      }
      HandleMutationError(error, 'applications-reject', toast);
    }
  }, [detailRow, invalidateApplications, navigate, rejectApplicationNotes, setApplicationStatusMutation, toast]);

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
    applicationId,
    scope,
    secureSupabase,
    selectedEventId,
    eventName,
    queueQuery,
    checkStatusRpcAvailabilityQuery,
    detailRow,
    sortedDetailChecks,
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
    onBackToApplications,
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

export type ApplicationDetailPageController = ReturnType<typeof useApplicationDetailPageController>;
