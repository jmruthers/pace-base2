import {
  Badge,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import type { ApplicationCheckRow } from '@/features/applicationsAdmin/types';
import { checkStatusVariant, checkTypeLabel } from '@/features/applicationsAdmin/stateHelpers';
import type { ApplicationTableRow } from '@/components/applications/applicationQueueTypes';
import { isTokenExpiryRelevant } from '@/pages/applications/applicationPagePure';

export function ApplicationReviewStepsDialog({
  reviewStepsRow,
  sortedReviewChecks,
  onOpenChange,
}: {
  reviewStepsRow: ApplicationTableRow | null;
  sortedReviewChecks: ApplicationCheckRow[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={reviewStepsRow != null} onOpenChange={onOpenChange}>
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
                  <p>
                    {check.requirement?.check_type != null
                      ? checkTypeLabel(check.requirement.check_type)
                      : 'Check'}
                  </p>
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
  );
}
