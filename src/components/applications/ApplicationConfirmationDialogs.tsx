import { ConfirmationDialog, Textarea } from '@solvera/pace-core/components';

export function ApplicationConfirmationDialogs(props: {
  approveConfirmOpen: boolean;
  setApproveConfirmOpen: (open: boolean) => void;
  rejectAppDialogOpen: boolean;
  setRejectAppDialogOpen: (open: boolean) => void;
  rejectApplicationNotes: string;
  setRejectApplicationNotes: (notes: string) => void;
  satisfyCheckConfirmOpen: boolean;
  setSatisfyCheckConfirmOpen: (open: boolean) => void;
  reissueConfirmOpen: boolean;
  setReissueConfirmOpen: (open: boolean) => void;
  rejectCheckConfirmOpen: boolean;
  setRejectCheckConfirmOpen: (open: boolean) => void;
  rejectCheckNotes: string;
  setRejectCheckNotes: (notes: string) => void;
  setActiveCheckId: (id: string | null) => void;
  handleApproveApplication: () => Promise<void>;
  handleRejectApplication: () => Promise<void>;
  handleSatisfyCheck: () => Promise<void>;
  handleRejectCheck: () => Promise<void>;
  handleReissueToken: () => Promise<void>;
  setApplicationStatusPending: boolean;
  setCheckStatusPending: boolean;
  reissueTokenPending: boolean;
}) {
  const {
    approveConfirmOpen,
    setApproveConfirmOpen,
    rejectAppDialogOpen,
    setRejectAppDialogOpen,
    rejectApplicationNotes,
    setRejectApplicationNotes,
    satisfyCheckConfirmOpen,
    setSatisfyCheckConfirmOpen,
    reissueConfirmOpen,
    setReissueConfirmOpen,
    rejectCheckConfirmOpen,
    setRejectCheckConfirmOpen,
    rejectCheckNotes,
    setRejectCheckNotes,
    setActiveCheckId,
    handleApproveApplication,
    handleRejectApplication,
    handleSatisfyCheck,
    handleRejectCheck,
    handleReissueToken,
    setApplicationStatusPending,
    setCheckStatusPending,
    reissueTokenPending,
  } = props;

  return (
    <>
      <ConfirmationDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title="Approve application"
        description="Approve this application now?"
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={() => void handleApproveApplication()}
        isPending={setApplicationStatusPending}
      />

      <ConfirmationDialog
        open={rejectAppDialogOpen}
        onOpenChange={(open) => {
          setRejectAppDialogOpen(open);
          if (!open) {
            setRejectApplicationNotes('');
          }
        }}
        title="Reject application"
        description={
          <section className="grid gap-2">
            <p>Provide notes for this rejection.</p>
            <Textarea
              value={rejectApplicationNotes}
              onChange={setRejectApplicationNotes}
              rows={4}
              placeholder="Add rejection notes"
            />
          </section>
        }
        confirmLabel="Reject application"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRejectApplication()}
        isPending={setApplicationStatusPending}
      />

      <ConfirmationDialog
        open={satisfyCheckConfirmOpen}
        onOpenChange={setSatisfyCheckConfirmOpen}
        title="Satisfy check"
        description="Mark this check as satisfied?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={() => void handleSatisfyCheck()}
        isPending={setCheckStatusPending}
      />

      <ConfirmationDialog
        open={reissueConfirmOpen}
        onOpenChange={setReissueConfirmOpen}
        title="Reissue approval link"
        description="Reissue this pending approval link?"
        confirmLabel="Reissue"
        cancelLabel="Cancel"
        onConfirm={() => void handleReissueToken()}
        isPending={reissueTokenPending}
      />

      <ConfirmationDialog
        open={rejectCheckConfirmOpen}
        onOpenChange={(open) => {
          setRejectCheckConfirmOpen(open);
          if (!open) {
            setRejectCheckNotes('');
            setActiveCheckId(null);
          }
        }}
        title="Reject check"
        description={
          <section className="grid gap-2">
            <p>Add optional notes for this check decision.</p>
            <Textarea
              value={rejectCheckNotes}
              onChange={setRejectCheckNotes}
              rows={4}
              placeholder="Add optional notes"
            />
          </section>
        }
        confirmLabel="Reject check"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => void handleRejectCheck()}
        isPending={setCheckStatusPending}
      />
    </>
  );
}
