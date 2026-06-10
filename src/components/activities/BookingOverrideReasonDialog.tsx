import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@solvera/pace-core/components';
import type { BookingOverrideIntent } from '@/features/bookingOversight/bookOnBehalfForm';
import { isNonEmptyOverrideReason } from '@/features/bookingOversight/rules';

export function BookingOverrideReasonDialog({
  open,
  onOpenChange,
  overrideIntent,
  overrideReason,
  setOverrideReason,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overrideIntent: BookingOverrideIntent | null;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{overrideIntent?.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          {overrideIntent?.confirmationBody != null ? <p>{overrideIntent.confirmationBody}</p> : null}
          <Label htmlFor="override_reason">Override reason</Label>
          <Textarea
            id="override_reason"
            name="override_reason"
            value={overrideReason}
            maxLength={500}
            rows={4}
            placeholder="Reason for override (required)"
            onChange={(next) => setOverrideReason(next)}
          />
          <small>Required. Explain why this override is necessary (max 500 characters).</small>
          <DialogFooter className="text-right">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isNonEmptyOverrideReason(overrideReason)}
              onClick={() => void onConfirm()}
            >
              {overrideIntent?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
