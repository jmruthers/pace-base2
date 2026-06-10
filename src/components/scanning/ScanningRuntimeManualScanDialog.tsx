import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@solvera/pace-core/components';

import type { ScanningRuntimeReadySurface } from '@/pages/scanning/scanningRuntimeControllerTypes';

type Props = Pick<
  ScanningRuntimeReadySurface,
  | 'manualOpen'
  | 'setManualOpen'
  | 'manualSearch'
  | 'setManualSearch'
  | 'manualNotes'
  | 'setManualNotes'
  | 'manualSelected'
  | 'setManualSelected'
  | 'visibleManualResults'
  | 'manualListEligible'
  | 'recordManualScan'
  | 'showManualNotesCounter'
>;

export function ScanningRuntimeManualScanDialog(props: Props) {
  return (
    <Dialog open={props.manualOpen} onOpenChange={props.setManualOpen}>
      <DialogPortal>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manual scan</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="participantSearch">
              Participant name
              <Input
                id="participantSearch"
                name="participantSearch"
                className="h-12 min-h-12"
                value={props.manualSearch}
                onChange={(value) => props.setManualSearch(value)}
                placeholder="Search by name…"
              />
            </Label>
            {props.manualListEligible ? (
              <section className="relative" aria-label="Participant search results">
                <ul className="absolute z-50 grid max-h-60 w-full gap-0 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                  {props.visibleManualResults.length === 0 ? (
                    <li>No participants found.</li>
                  ) : (
                    props.visibleManualResults.map((row) => (
                      <li key={row.applicationId}>
                        <Button type="button" variant="ghost" onClick={() => props.setManualSelected(row)}>
                          {row.displayName}
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            ) : null}
            {props.manualSelected != null ? (
              <section className="grid grid-cols-[1fr_auto] items-center gap-2">
                <p className="min-w-0">{props.manualSelected.displayName}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear selection"
                  onClick={() => {
                    props.setManualSelected(null);
                    props.setManualSearch('');
                  }}
                >
                  ×
                </Button>
              </section>
            ) : null}
            <Label htmlFor="manual-notes">
              Notes (optional)
              <Textarea
                id="manual-notes"
                name="notes"
                value={props.manualNotes}
                onChange={(value) => props.setManualNotes(value)}
                maxLength={500}
                placeholder="Add a note for this scan."
              />
            </Label>
            {props.showManualNotesCounter ? (
              <output>{props.manualNotes.length} / 500</output>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="default" disabled={props.manualSelected == null} onClick={props.recordManualScan}>
              Record manual scan
            </Button>
            <Button type="button" variant="outline" onClick={() => props.setManualOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
