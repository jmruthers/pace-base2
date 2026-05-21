import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import {
  bookingCreateOnBehalfSchema,
  buildDefaultCreateBookingOnBehalfValues,
  type CreateBookingOnBehalfFormValues,
} from '@/features/bookingOversight/bookOnBehalfForm';
import { participantDisplayName, sessionDisplayLabel } from '@/features/bookingOversight/display';
import type {
  ActivitySessionOptionRow,
  ApprovedApplicationOptionRow,
} from '@/features/bookingOversight/types';

export function BookingOnBehalfDialog({
  open,
  onOpenChange,
  bookFormKey,
  sessionsByOffering,
  applications,
  eventTimezone,
  onSubmitBooking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookFormKey: number;
  sessionsByOffering: Array<{ offeringName: string; sessions: ActivitySessionOptionRow[] }>;
  applications: ApprovedApplicationOptionRow[] | undefined;
  eventTimezone: string | null;
  onSubmitBooking: (values: CreateBookingOnBehalfFormValues) => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book on behalf</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form<CreateBookingOnBehalfFormValues>
            key={bookFormKey}
            schema={bookingCreateOnBehalfSchema}
            defaultValues={buildDefaultCreateBookingOnBehalfValues()}
            mode="onSubmit"
            onSubmit={(submitted) => {
              void onSubmitBooking(submitted);
            }}
            className="grid gap-3"
          >
            <>
              <FormField<CreateBookingOnBehalfFormValues>
                name="application_id"
                label="Participant"
                required
                render={({ field }) => (
                  <Select
                    value={(field.value as string) || ''}
                    onValueChange={(v) => {
                      field.onChange(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {(applications ?? []).map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {participantDisplayName(app.person)} — {app.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              <FormField<CreateBookingOnBehalfFormValues>
                name="session_id"
                label="Session"
                required
                render={({ field }) => (
                  <Select
                    value={(field.value as string) || ''}
                    onValueChange={(v) => {
                      field.onChange(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          sessionsByOffering.flatMap((g) => g.sessions).length === 0
                            ? 'No sessions available for this event.'
                            : 'Select session'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionsByOffering.map((group) => (
                        <SelectGroup key={group.offeringName}>
                          <SelectLabel>{group.offeringName}</SelectLabel>
                          {group.sessions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {sessionDisplayLabel(s, eventTimezone)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />

              <FormField<CreateBookingOnBehalfFormValues>
                name="override_capacity"
                label="Override capacity limit"
                render={({ field }) => (
                  <Checkbox
                    checked={Boolean(field.value)}
                    onChange={(checked) => {
                      field.onChange(checked);
                    }}
                  />
                )}
              />

              <FormField<CreateBookingOnBehalfFormValues>
                name="override_window"
                label="Override booking window"
                render={({ field }) => (
                  <Checkbox
                    checked={Boolean(field.value)}
                    onChange={(checked) => {
                      field.onChange(checked);
                    }}
                  />
                )}
              />

              <FormField<CreateBookingOnBehalfFormValues>
                name="override_conflict"
                label="Override session conflict"
                render={({ field }) => (
                  <Checkbox
                    checked={Boolean(field.value)}
                    onChange={(checked) => {
                      field.onChange(checked);
                    }}
                  />
                )}
              />

              <DialogFooter className="text-right">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default">
                  Book
                </Button>
              </DialogFooter>
            </>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
