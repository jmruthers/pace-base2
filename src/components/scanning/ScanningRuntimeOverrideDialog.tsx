import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  Label,
  Textarea,
} from '@solvera/pace-core/components';

import { rejectionDescription } from '@/features/scanningRuntime/labels';
import type { ScanningRuntimeReadySurface } from '@/pages/scanning/scanningRuntimeControllerTypes';

type Props = Pick<
  ScanningRuntimeReadySurface,
  | 'overrideOpen'
  | 'overrideDialogOpenChange'
  | 'pendingOverride'
  | 'overrideNotes'
  | 'setOverrideNotes'
  | 'handleConfirmOverride'
  | 'showNotesCounter'
>;

export function ScanningRuntimeOverrideDialog(props: Props) {
  return (
    <Dialog open={props.overrideOpen} onOpenChange={props.overrideDialogOpenChange}>
      <DialogPortal>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Override scan result</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>{props.pendingOverride != null ? rejectionDescription(props.pendingOverride.reason) : null}</p>
            <Label htmlFor="override-notes">
              Notes (optional)
              <Textarea
                id="override-notes"
                name="notes"
                value={props.overrideNotes}
                onChange={(value) => props.setOverrideNotes(value)}
                maxLength={500}
                placeholder="Add a note for this scan."
              />
            </Label>
            {props.showNotesCounter ? (
              <output>
                {props.overrideNotes.length} / 500
              </output>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="default"
              onClick={() => {
                void props.handleConfirmOverride();
              }}
            >
              Confirm override
            </Button>
            <Button type="button" variant="outline" onClick={() => props.overrideDialogOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
