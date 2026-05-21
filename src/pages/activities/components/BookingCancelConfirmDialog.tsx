import { Button, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import type { BookingTableRow } from '@/features/bookingOversight/types';

export function BookingCancelConfirmDialog({
  cancelTarget,
  onOpenChange,
  onConfirmCancel,
}: {
  cancelTarget: BookingTableRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: () => void | Promise<void>;
}) {
  return (
    <Dialog open={cancelTarget != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-2">
          {cancelTarget != null ? (
            <>
              <p>
                {cancelTarget.participant} — {cancelTarget.session} —{' '}
                {cancelTarget._booking.session != null ? formatDateTime(cancelTarget._booking.session.start_time) : ''}
              </p>
              <p>
                Cancel this booking? The participant will lose their place and the capacity slot will be released (if
                confirmed).
              </p>
            </>
          ) : null}
          <DialogFooter className="text-right">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Go back
            </Button>
            <Button type="button" variant="destructive" onClick={() => void onConfirmCancel()}>
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
