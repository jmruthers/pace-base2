import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useApplicationReviewActions } from '@/hooks/useApplicationReviewActions';

interface ApplicationCheck {
  checkId: string;
  checkType: string;
  resolved: boolean;
}

interface ApplicationReviewItem {
  applicationId: string;
  registrationType: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  checks: ReadonlyArray<ApplicationCheck>;
}

const INITIAL_APPLICATIONS: ReadonlyArray<ApplicationReviewItem> = [
  {
    applicationId: 'app-1',
    registrationType: 'Leader',
    status: 'under_review',
    checks: [
      { checkId: 'check-1', checkType: 'guardian_approval', resolved: false },
      { checkId: 'check-2', checkType: 'home_leader_approval', resolved: true },
    ],
  },
  {
    applicationId: 'app-2',
    registrationType: 'Participant',
    status: 'submitted',
    checks: [{ checkId: 'check-3', checkType: 'designated_org_review', resolved: false }],
  },
];

export function ApplicationsReviewPage() {
  const { setApplicationStatus, reissueApprovalToken } = useApplicationReviewActions();
  const [applications, setApplications] =
    useState<ReadonlyArray<ApplicationReviewItem>>(INITIAL_APPLICATIONS);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('app-1');
  const [statusMessage, setStatusMessage] = useState('');

  const selectedApplication = useMemo(
    () => applications.find((application) => application.applicationId === selectedApplicationId) ?? null,
    [applications, selectedApplicationId]
  );

  const handleStatusAction = async (status: 'approved' | 'rejected' | 'under_review') => {
    if (selectedApplication == null) {
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

    setApplications((previous) =>
      previous.map((application) =>
        application.applicationId === selectedApplication.applicationId
          ? { ...application, status }
          : application
      )
    );
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
            <ul>
              {applications.map((application) => (
                <li key={application.applicationId}>
                  <Button onClick={() => setSelectedApplicationId(application.applicationId)}>
                    Open {application.applicationId}
                  </Button>
                  <p>Registration type: {application.registrationType}</p>
                  <p>Status: {application.status}</p>
                </li>
              ))}
            </ul>
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
                    <p>{check.resolved ? 'completed' : 'pending'}</p>
                    {!check.resolved && (
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
