import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import type { ActivitySessionRow } from '@/features/activityOfferingSetup/types';

export function ActivityOfferingDeleteSessionDialog({
  deleteSession,
  bookingCountQueryIsLoading,
  bookingCountData,
  deleteAcknowledge,
  setDeleteAcknowledge,
  onDismiss,
  deleteSessionMutationIsPending,
  onConfirmDelete,
}: {
  deleteSession: ActivitySessionRow | null;
  bookingCountQueryIsLoading: boolean;
  bookingCountData: number | undefined;
  deleteAcknowledge: boolean;
  setDeleteAcknowledge: (value: boolean) => void;
  onDismiss: () => void;
  deleteSessionMutationIsPending: boolean;
  onConfirmDelete: () => void;
}) {
  return (
    <Dialog
      open={deleteSession != null}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss();
        }
      }}
    >
      {deleteSession != null ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete session</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-2">
            {bookingCountQueryIsLoading ? (
              <section className="grid min-h-12 place-items-center">
                <LoadingSpinner />
              </section>
            ) : (
              <>
                <p>Delete the session starting {formatDateTime(deleteSession.start_time)}?</p>
                {(bookingCountData ?? 0) > 0 ? (
                  <>
                    <Alert variant="destructive">
                      <AlertDescription>
                        This session has {bookingCountData ?? 0} booking(s). Deleting it will remove those bookings
                        permanently.
                      </AlertDescription>
                    </Alert>
                    <Label htmlFor="delete-session-acknowledge">
                      <span>I understand this will remove existing bookings.</span>
                      <Checkbox
                        id="delete-session-acknowledge"
                        checked={deleteAcknowledge}
                        onChange={setDeleteAcknowledge}
                      />
                    </Label>
                  </>
                ) : (
                  <p>This action cannot be undone.</p>
                )}
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
              <Button type="button" variant="outline" onClick={onDismiss} disabled={deleteSessionMutationIsPending}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  deleteSessionMutationIsPending ||
                  bookingCountQueryIsLoading ||
                  ((bookingCountData ?? 0) > 0 && !deleteAcknowledge)
                }
                onClick={onConfirmDelete}
              >
                Delete
              </Button>
            </section>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
