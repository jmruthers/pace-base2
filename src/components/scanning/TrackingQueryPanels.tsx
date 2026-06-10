import { Alert, AlertDescription, Button } from '@solvera/pace-core/components';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';

export function TrackingQueryErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{NormalizeSupabaseError(error).message}</AlertDescription>
      <section>
        <Button type="button" variant="outline" size="small" onClick={onRetry}>
          Retry
        </Button>
      </section>
    </Alert>
  );
}

export function TrackingQueryCapNotice() {
  return (
    <Alert variant="default">
      <AlertDescription>
        Result set capped at 500 rows. Some data may be omitted. Consider narrowing the event scope.
      </AlertDescription>
    </Alert>
  );
}
