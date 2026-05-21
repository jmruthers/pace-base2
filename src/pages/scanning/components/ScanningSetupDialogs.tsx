import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '@solvera/pace-core/components';
import { formatDateTime } from '@solvera/pace-core/utils';
import type { ScanningSetupController } from '@/pages/scanning/hooks/useScanningSetupController';
import { ScanPointDialog } from '@/pages/scanning/components/ScanPointDialog';

export function ScanningSetupScanDialogs({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <>
      <ScanPointDialog
        open={ctl.createOpen}
        title="Create scan point"
        submitLabel="Create scan point"
        values={ctl.createValues}
        errors={ctl.createErrors}
        activityOptions={ctl.activityOptions}
        transportOptions={ctl.transportOptions}
        pending={ctl.createMutation.isPending}
        onOpenChange={ctl.setCreateOpen}
        onValuesChange={ctl.setCreateValues}
        onSubmit={(values) => void ctl.onCreateSubmit(values)}
      />

      <ScanPointDialog
        open={ctl.editOpen}
        title="Edit scan point"
        submitLabel="Save changes"
        values={ctl.editValues}
        errors={ctl.editErrors}
        activityOptions={ctl.activityOptions}
        transportOptions={ctl.transportOptions}
        pending={ctl.updateMutation.isPending}
        onOpenChange={ctl.setEditOpen}
        onValuesChange={ctl.setEditValues}
        onSubmit={(values) => void ctl.onEditSubmit(values)}
      />

      <Dialog open={ctl.deactivateOpen} onOpenChange={ctl.setDeactivateOpen}>
        <DialogPortal>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate scan point</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>
                <strong>{ctl.selectedPoint?.name ?? '—'}</strong>
              </p>
              <p>
                Deactivating this scan point will remove it from the live scanning list. Existing scan history will
                not be affected.
              </p>
            </DialogBody>
            <DialogFooter>
              <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
                <Button type="button" variant="destructive" onClick={() => void ctl.onDeactivateConfirm()}>
                  Deactivate
                </Button>
                <Button type="button" variant="outline" onClick={() => ctl.setDeactivateOpen(false)}>
                  Cancel
                </Button>
              </section>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}

export function ScanningSetupConflictDialogs({ ctl }: { ctl: ScanningSetupController }) {
  return (
    <Dialog open={ctl.conflictDetailOpen} onOpenChange={ctl.setConflictDetailOpen}>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conflict detail</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <dl className="grid grid-cols-[200px_1fr] gap-2">
              <dt>Scan point</dt>
              <dd>{ctl.selectedConflict?.scan_point_name ?? '—'}</dd>
              <dt>Card identifier</dt>
              <dd>{ctl.selectedConflict?.card_identifier ?? '—'}</dd>
              <dt>Result</dt>
              <dd>{ctl.selectedConflict?.validation_result ?? '—'}</dd>
              <dt>Original reason</dt>
              <dd>{ctl.selectedConflict?.validation_reason ?? '—'}</dd>
              <dt>Scanned at</dt>
              <dd>
                {ctl.selectedConflict?.scanned_at != null ? formatDateTime(ctl.selectedConflict.scanned_at) : '—'}
              </dd>
              <dt>Synced at</dt>
              <dd>
                {ctl.selectedConflict?.synced_at != null ? formatDateTime(ctl.selectedConflict.synced_at) : '—'}
              </dd>
              <dt>Notes</dt>
              <dd>{ctl.selectedConflict?.notes ?? '—'}</dd>
              <dt>Override by</dt>
              <dd>{ctl.selectedConflict?.override_by ?? '—'}</dd>
            </dl>
          </DialogBody>
          <DialogFooter>
            <section className="grid justify-end">
              <Button type="button" variant="outline" onClick={() => ctl.setConflictDetailOpen(false)}>
                Close
              </Button>
            </section>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
