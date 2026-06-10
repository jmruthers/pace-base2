import { Button, Card, CardContent } from '@solvera/pace-core/components';

import type { ScanQueueEntry } from '@/features/scanningRuntime/types';
import { queueFailureReasonLabel } from '@/components/scanning/scanSetupHelpers';

type Props = {
  failedQueueEntries: ScanQueueEntry[];
  handleRetryFailed: (entry: ScanQueueEntry) => Promise<void>;
};

export function ScanningRuntimeFailedUploadsCard({ failedQueueEntries, handleRetryFailed }: Props) {
  if (failedQueueEntries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="grid gap-2 pt-6">
        <strong>Failed uploads</strong>
        <ul className="grid gap-2">
          {failedQueueEntries.map((entry) => (
            <li key={entry.local_id} className="rounded-md border border-border">
              <section className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2">
                <article className="grid">
                  <small>{entry.local_id}</small>
                  <small>{queueFailureReasonLabel(entry.failure_reason)}</small>
                </article>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => {
                    void handleRetryFailed(entry);
                  }}
                  aria-label={`Retry failed queue entry ${entry.local_id}`}
                >
                  Retry
                </Button>
              </section>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
