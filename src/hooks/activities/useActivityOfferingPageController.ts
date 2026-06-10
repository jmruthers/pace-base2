import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, ShowSuccessMessage } from '@solvera/pace-core/utils';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import {
  useOffering,
  useOfferingSessions,
  useSessionBookingCount,
  useTracActivities,
} from '@/features/activityOfferingSetup/activityOfferingQueries';
import {
  useCreateSessionMutation,
  useDeleteSessionMutation,
  useUpdateOfferingMutation,
  useUpdateSessionMutation,
} from '@/features/activityOfferingSetup/activityOfferingMutations';
import {
  parseOptionalCost,
  validateOfferingForm,
  validateSessionForm,
  type ValidationErrors,
} from '@/features/activityOfferingSetup/shared';
import type { ActivitySessionRow, ActivityOfferingRow, OfferingFormValues, SessionFormValues } from '@/features/activityOfferingSetup/types';
import {
  buildActivitySessionValues,
  buildDefaultActivitySessionValues,
  buildOfferingFormValues,
  eventIdFromOfferingSelection,
  offeringEventNameFromSelection,
} from '@/pages/activities/activityOfferingPageHelpers';

export function useActivityOfferingPageController() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const selectedEventId = eventIdFromOfferingSelection(selectedEvent);
  const { selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();

  const offeringQuery = useOffering(offeringId ?? null);
  const sessionsQuery = useOfferingSessions(offeringId ?? null);
  const tracActivitiesQuery = useTracActivities(selectedEventId);
  const updateOfferingMutation = useUpdateOfferingMutation();
  const createSessionMutation = useCreateSessionMutation();
  const updateSessionMutation = useUpdateSessionMutation();
  const deleteSessionMutation = useDeleteSessionMutation();

  const [editOfferingOpen, setEditOfferingOpen] = useState(false);
  const [offeringValues, setOfferingValues] = useState<OfferingFormValues>({
    name: '',
    trac_activity_id: null,
    booking_open_at: null,
    booking_close_at: null,
    cost: '',
    payment_due_at: null,
    allow_waitlist: false,
  });
  const [offeringErrors, setOfferingErrors] = useState<ValidationErrors>({});

  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [editSession, setEditSession] = useState<ActivitySessionRow | null>(null);
  const [deleteSession, setDeleteSession] = useState<ActivitySessionRow | null>(null);
  const [sessionValues, setSessionValues] = useState<SessionFormValues>(buildDefaultActivitySessionValues());
  const [sessionErrors, setSessionErrors] = useState<ValidationErrors>({});
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);

  const bookingCountQuery = useSessionBookingCount(deleteSession?.id ?? null, deleteSession != null);
  const retryOfferingQuery = useRetryRefetchHandler(offeringQuery);
  const retrySessionsQuery = useRetryRefetchHandler(sessionsQuery);

  const scope = useMemo(
    () => ({
      organisationId: organisationId ?? selectedOrganisationId,
      eventId: eventId ?? selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, eventId, organisationId, selectedEventId, selectedOrganisationId]
  );

  const eventName = offeringEventNameFromSelection(selectedEvent);

  const sessionRows = sessionsQuery.data ?? [];

  const refreshPageData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ba09', 'offering', offeringId] }),
      queryClient.invalidateQueries({ queryKey: ['ba09', 'sessions', offeringId] }),
      queryClient.invalidateQueries({ queryKey: ['ba09', 'offerings', selectedEventId] }),
    ]);
  }, [offeringId, queryClient, selectedEventId]);

  const openEditSession = useCallback((row: ActivitySessionRow) => {
    setEditSession(row);
    setSessionValues(buildActivitySessionValues(row));
    setSessionErrors({});
  }, []);

  const openDeleteSession = useCallback((row: ActivitySessionRow) => {
    setDeleteSession(row);
  }, []);

  const dismissDeleteSession = useCallback(() => {
    setDeleteSession(null);
    setDeleteAcknowledge(false);
  }, []);

  const offerCreateSession = useCallback(() => {
    setSessionValues(buildDefaultActivitySessionValues());
    setSessionErrors({});
    setCreateSessionOpen(true);
  }, []);

  const offerEditOffering = useCallback((offering: ActivityOfferingRow) => {
    setOfferingValues(buildOfferingFormValues(offering));
    setOfferingErrors({});
    setEditOfferingOpen(true);
  }, []);

  const onSaveOffering = useCallback(
    async (values: OfferingFormValues) => {
      if (offeringId == null) {
        return;
      }
      const errors = validateOfferingForm(values);
      setOfferingErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }
      try {
        parseOptionalCost(values.cost);
        await updateOfferingMutation.mutateAsync({ offeringId, values });
        ShowSuccessMessage('Offering saved', toast);
        setEditOfferingOpen(false);
        await refreshPageData();
      } catch (error) {
        HandleMutationError(error, 'activities-offering-save', toast);
      }
    },
    [offeringId, refreshPageData, toast, updateOfferingMutation]
  );

  const onCreateSession = useCallback(
    async (values: SessionFormValues) => {
      if (offeringId == null) {
        return;
      }
      const errors = validateSessionForm(values);
      setSessionErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }
      try {
        await createSessionMutation.mutateAsync({ offeringId, values });
        ShowSuccessMessage('Session added', toast);
        setCreateSessionOpen(false);
        setSessionValues(buildDefaultActivitySessionValues());
        await refreshPageData();
      } catch (error) {
        HandleMutationError(error, 'activities-session-create', toast);
      }
    },
    [createSessionMutation, offeringId, refreshPageData, toast]
  );

  const onSaveSession = useCallback(
    async (values: SessionFormValues) => {
      if (editSession == null) {
        return;
      }
      const errors = validateSessionForm(values);
      setSessionErrors(errors);
      if (Object.keys(errors).length > 0) {
        return;
      }
      try {
        await updateSessionMutation.mutateAsync({ sessionId: editSession.id, values });
        ShowSuccessMessage('Session saved', toast);
        setEditSession(null);
        await refreshPageData();
      } catch (error) {
        HandleMutationError(error, 'activities-session-update', toast);
      }
    },
    [editSession, refreshPageData, toast, updateSessionMutation]
  );

  const onDeleteSession = useCallback(async () => {
    if (deleteSession == null) {
      return;
    }
    try {
      await deleteSessionMutation.mutateAsync(deleteSession.id);
      ShowSuccessMessage('Session deleted', toast);
      setDeleteSession(null);
      setDeleteAcknowledge(false);
      await refreshPageData();
    } catch (error) {
      HandleMutationError(error, 'activities-session-delete', toast);
    }
  }, [deleteSession, deleteSessionMutation, refreshPageData, toast]);

  const closeEditSessionDialog = useCallback((open: boolean) => {
    if (!open) {
      setEditSession(null);
    }
  }, []);

  return {
    navigate,
    offeringId,
    selectedEventId,
    eventName,
    secureSupabase,
    scope,
    offeringQuery,
    sessionsQuery,
    tracActivitiesQuery,
    updateOfferingMutation,
    createSessionMutation,
    updateSessionMutation,
    deleteSessionMutation,
    editOfferingOpen,
    setEditOfferingOpen,
    offeringValues,
    setOfferingValues,
    offeringErrors,
    createSessionOpen,
    setCreateSessionOpen,
    editSession,
    deleteSession,
    sessionValues,
    setSessionValues,
    sessionErrors,
    retryOfferingQuery,
    retrySessionsQuery,
    sessionRows,
    bookingCountQuery,
    deleteAcknowledge,
    setDeleteAcknowledge,
    openEditSession,
    openDeleteSession,
    dismissDeleteSession,
    offerCreateSession,
    offerEditOffering,
    onSaveOffering,
    onCreateSession,
    onSaveSession,
    onDeleteSession,
    closeEditSessionDialog,
  };
}

export type ActivityOfferingPageController = ReturnType<typeof useActivityOfferingPageController>;
