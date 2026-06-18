import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import {
  useApplicationsQueue,
  useCheckStatusRpcAvailability,
} from '@/features/applicationsAdmin/configuration';
import {
  resolveApplicantName,
  resolveSubmittedLabel,
  sortChecksByOrder,
  applicationStatusLabel,
} from '@/features/applicationsAdmin/stateHelpers';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import type { ApplicationTableRow } from '@/components/applications/applicationQueueTypes';
import { eventNameFromSelection } from '@/pages/applications/applicationPagePure';
import { useApplicationsTableColumns } from '@/hooks/applications/useApplicationsTableColumns';

export function useApplicationsPageController() {
  const navigate = useNavigate();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { selectedEventId, selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();
  const queueQuery = useApplicationsQueue(selectedEventId);
  const checkStatusRpcAvailabilityQuery = useCheckStatusRpcAvailability(selectedEventId);

  const [reviewStepsApplicationId, setReviewStepsApplicationId] = useState<string | null>(null);

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
        unitLabel: 'Unassigned',
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

  const reviewStepsRow = useMemo(
    () => tableRows.find((row) => row.id === reviewStepsApplicationId) ?? null,
    [reviewStepsApplicationId, tableRows]
  );

  const sortedReviewChecks = useMemo(
    () => sortChecksByOrder(reviewStepsRow?.checks ?? []),
    [reviewStepsRow]
  );

  const retryQueue = useRetryRefetchHandler(queueQuery);

  const onViewDetail = useCallback(
    (applicationId: string) => {
      navigate(`/applications/${applicationId}`);
    },
    [navigate]
  );
  const tableColumns = useApplicationsTableColumns({
    registrationTypeFilterOptions,
    statusFilterOptions,
    onViewDetail,
  });

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
    reviewStepsApplicationId,
    setReviewStepsApplicationId,
    reviewStepsRow,
    sortedReviewChecks,
  };
}

export type ApplicationsPageController = ReturnType<typeof useApplicationsPageController>;
