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
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { formatDateTime, NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ApplicationTableRow } from '@/components/applications/applicationQueueTypes';
import type { ApplicationCheckRow, ApplicationEvidenceRow } from '@/features/applicationsAdmin/types';
import {
  applicationStatusLabel,
  applicationStatusVariant,
  checkStatusVariant,
  checkTypeLabel,
  evidenceFieldLabel,
  renderJsonValue,
} from '@/features/applicationsAdmin/stateHelpers';
import {
  isOverrideAllowed,
  isReissueEligible,
  isTokenExpiryRelevant,
} from '@/pages/applications/applicationPagePure';

export function ApplicationDetailSummarySection({ detailRow }: { detailRow: ApplicationTableRow }) {
  return (
    <section className="grid gap-2">
      <h2>Summary</h2>
      <dl className="grid gap-2">
        <article className="grid gap-1 md:grid-cols-[auto_1fr]">
          <dt>Registration type</dt>
          <dd>{detailRow.registrationTypeLabel}</dd>
        </article>
        <article className="grid gap-1 md:grid-cols-[auto_1fr]">
          <dt>Submitted</dt>
          <dd>{detailRow.submittedLabel}</dd>
        </article>
        <article className="grid gap-1 md:grid-cols-[auto_1fr]">
          <dt>Email</dt>
          <dd>{detailRow.applicantEmail}</dd>
        </article>
        <article className="grid gap-1 md:grid-cols-[auto_1fr]">
          <dt>Application id</dt>
          <dd>{detailRow.id}</dd>
        </article>
      </dl>
    </section>
  );
}

export function ApplicationEvidenceSection({
  evidenceQuery,
  onRetryEvidence,
}: {
  evidenceQuery: Pick<UseQueryResult<ApplicationEvidenceRow[]>, 'data' | 'isLoading' | 'error'>;
  onRetryEvidence: () => void;
}) {
  return (
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
            <Button type="button" variant="outline" onClick={onRetryEvidence}>
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
  );
}

export function ApplicationDetailChecksSection({
  sortedDetailChecks,
  rpcCheckActionsEnabled,
  scope,
  onRequestSatisfyCheck,
  onRequestRejectCheck,
  onRequestReissueLink,
}: {
  sortedDetailChecks: ApplicationCheckRow[];
  rpcCheckActionsEnabled: boolean;
  scope: { organisationId: string | undefined; eventId: string | null; appId: string | undefined };
  onRequestSatisfyCheck: (checkId: string) => void;
  onRequestRejectCheck: (checkId: string) => void;
  onRequestReissueLink: (checkId: string) => void;
}) {
  return (
    <section className="grid gap-2">
      <h3>Checks overview</h3>
      {sortedDetailChecks.length === 0 ? (
        <p>No checks were configured for this application.</p>
      ) : (
        <section className="grid gap-2">
          {sortedDetailChecks.map((check) => {
            const checkType = check.requirement?.check_type;
            const showEventActions =
              checkType === 'event_approval' && check.status === 'pending' && rpcCheckActionsEnabled;
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
                  <PagePermissionGuard pageName="ApplicationsPage" operation="update" scope={scope} fallback={null}>
                    <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <Button type="button" variant="outline" onClick={() => onRequestSatisfyCheck(check.id)}>
                        Satisfy check
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => onRequestRejectCheck(check.id)}>
                        Reject check
                      </Button>
                    </section>
                  </PagePermissionGuard>
                ) : null}

                {isReissueEligible(check) ? (
                  <PagePermissionGuard pageName="ApplicationsPage" operation="update" scope={scope} fallback={null}>
                    <section>
                      <Button type="button" variant="outline" onClick={() => onRequestReissueLink(check.id)}>
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
  );
}

export function ApplicationDetailHistorySection({ detailRow }: { detailRow: ApplicationTableRow }) {
  return (
    <section className="grid gap-2">
      <h3>Activity</h3>
      <ul>
        <li>
          <p>Application submitted</p>
          <p>{detailRow.submittedLabel}</p>
        </li>
      </ul>
    </section>
  );
}

export function ApplicationDetailActionBar({
  detailRow,
  scope,
  onApproveRequest,
  onRejectRequest,
}: {
  detailRow: ApplicationTableRow;
  scope: { organisationId: string | undefined; eventId: string | null; appId: string | undefined };
  onApproveRequest: () => void;
  onRejectRequest: () => void;
}) {
  if (!isOverrideAllowed(detailRow.status)) {
    return null;
  }

  return (
    <footer className="text-right">
      <PagePermissionGuard pageName="ApplicationsPage" operation="update" scope={scope} fallback={null}>
        <fieldset className="text-right">
          <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Button type="button" onClick={onApproveRequest}>
              Approve application
            </Button>
            <Button type="button" variant="destructive" onClick={onRejectRequest}>
              Reject application
            </Button>
          </section>
        </fieldset>
      </PagePermissionGuard>
    </footer>
  );
}

export function ApplicationDetailStatusMeta({ detailRow }: { detailRow: ApplicationTableRow }) {
  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-[auto_auto_1fr] md:items-center">
      <Badge variant={applicationStatusVariant(detailRow.status)}>{applicationStatusLabel(detailRow.status)}</Badge>
      <p>{detailRow.id}</p>
      <p>Submitted {detailRow.submittedLabel}</p>
    </section>
  );
}
