import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useQueryClient } from '@tanstack/react-query';
import {
  eventApplicationsReviewQueryKey,
  useEventApplicationsReviewList,
} from '@/hooks/useEventApplicationsReviewList';
import { useApplicationReviewActions } from '@/hooks/useApplicationReviewActions';

export function ApplicationsReviewPage() {
  const { selectedEvent } = useUnifiedAuth();
  const queryClient = useQueryClient();
  const { setApplicationStatus, reissueApprovalToken } = useApplicationReviewActions();
  const [pickedApplicationId, setPickedApplicationId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const eventId =
    selectedEvent != null && typeof selectedEvent.id === 'string' ? selectedEvent.id : null;

  const {
    data: applications = [],
    isPending,
    isError,
    error: listError,
  } = useEventApplicationsReviewList(eventId);

  const selectedApplicationId = useMemo(() => {
    if (applications.length === 0) {
      return null;
    }
    if (
      pickedApplicationId != null &&
      applications.some((application) => application.applicationId === pickedApplicationId)
    ) {
      return pickedApplicationId;
    }
    return applications[0].applicationId;
  }, [applications, pickedApplicationId]);

  const selectedApplication = useMemo(
    () =>
      selectedApplicationId == null
        ? null
        : (applications.find((application) => application.applicationId === selectedApplicationId) ?? null),
    [applications, selectedApplicationId]
  );

  const handleStatusAction = async (status: 'approved' | 'rejected' | 'under_review') => {
    if (selectedApplication == null || eventId == null) {
      return;
    }
    const result = await setApplicationStatus({
      applicationId: selectedApplication.applicationId,
      status,
    });
    if (!result.ok) {
      setStatusMessage(`Unable to update status: ${result.errorMessage ?? 'unknown error'}`);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: eventApplicationsReviewQueryKey(eventId) });
    setStatusMessage(`Application moved to ${status}.`);
  };

  const handleTokenReissue = async (checkId: string) => {
    const result = await reissueApprovalToken({ checkId });
    if (!result.ok) {
      setStatusMessage(`Unable to reissue token: ${result.errorMessage ?? 'unknown error'}`);
      return;
    }
    setStatusMessage('Approval request token reissued.');
  };

  return (
    <PagePermissionGuard pageName="applications" operation="read" fallback={<AccessDenied />}>
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {eventId == null ? (
              <p>Select an event before reviewing applications.</p>
            ) : isPending ? (
              <p>Loading applications…</p>
            ) : isError ? (
              <p>{listError.message}</p>
            ) : applications.length === 0 ? (
              <p>No applications for this event yet.</p>
            ) : (
              <ul>
                {applications.map((application) => (
                  <li key={application.applicationId}>
                    <Button onClick={() => setPickedApplicationId(application.applicationId)}>
                      Open {application.applicationId}
                    </Button>
                    <p>Registration type: {application.registrationType}</p>
                    <p>Status: {application.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {selectedApplication != null && (
          <Card>
            <CardHeader>
              <CardTitle>Application review detail</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Application: {selectedApplication.applicationId}</p>
              <p>Status: {selectedApplication.status}</p>
              <p>Review steps (read-only in MVP):</p>
              <ul>
                {selectedApplication.checks.map((check) => (
                  <li key={check.checkId}>
                    <p>{check.checkType}</p>
                    <p>{check.checkStatus}</p>
                    {check.checkStatus === 'pending' && (
                      <Button onClick={() => void handleTokenReissue(check.checkId)}>
                        Reissue request
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <Button onClick={() => void handleStatusAction('approved')}>Approve</Button>
              <Button onClick={() => void handleStatusAction('rejected')}>Reject</Button>
            </CardContent>
          </Card>
        )}

        {statusMessage.length > 0 && <p>{statusMessage}</p>}
      </section>
    </PagePermissionGuard>
  );
}
