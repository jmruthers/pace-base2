import { Button, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@solvera/pace-core/components';
import type { BookingTableRow } from '@/features/bookingOversight/types';

export function BookingPromoteConfirmDialog({
  promoteTarget,
  onOpenChange,
  onConfirmPromote,
}: {
  promoteTarget: BookingTableRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirmPromote: () => void | Promise<void>;
}) {
  return (
    <Dialog open={promoteTarget != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to confirmed</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-2">
          {promoteTarget != null ? (
            <p>
              Confirm promotion for {promoteTarget.participant} to {promoteTarget.session}? This will confirm the
              booking and consume one capacity slot.
            </p>
          ) : null}
          <DialogFooter className="text-right">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="default" onClick={() => void onConfirmPromote()}>
              Promote
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
