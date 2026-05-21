import {
  DateTimeField,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Input,
  SaveActions,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@solvera/pace-core/components';
import type { ValidationErrors } from '@/features/activityOfferingSetup/shared';
import type { OfferingFormValues, TracActivityRow } from '@/features/activityOfferingSetup/types';
import { NONE_TRAC_ACTIVITY, toActivityOfferingDate } from '@/pages/activities/activityOfferingPageHelpers';

export function ActivityOfferingOfferingEditDialog({
  open,
  onOpenChange,
  offeringValues,
  setOfferingValues,
  offeringErrors,
  tracActivities,
  updateOfferingMutationIsPending,
  onSaveOffering,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringValues: OfferingFormValues;
  setOfferingValues: (next: OfferingFormValues) => void;
  offeringErrors: ValidationErrors;
  tracActivities: TracActivityRow[];
  updateOfferingMutationIsPending: boolean;
  onSaveOffering: (values: OfferingFormValues) => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit offering</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form<OfferingFormValues>
            defaultValues={offeringValues}
            onSubmit={(submittedValues) => {
              setOfferingValues(submittedValues);
              void onSaveOffering(submittedValues);
            }}
            className="grid gap-3"
          >
            {(methods) => (
              <>
                <FormField<OfferingFormValues>
                  name="name"
                  label="Name"
                  required
                  render={({ field }) => (
                    <Input
                      id="offering-name-edit"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          name: nextValue,
                        });
                      }}
                      placeholder="e.g. Rock Climbing"
                    />
                  )}
                />
                {offeringErrors.name != null ? <small>{offeringErrors.name}</small> : null}

                <FormField<OfferingFormValues>
                  name="trac_activity_id"
                  label="TRAC Activity"
                  render={({ field }) => (
                    <Select
                      value={(field.value ?? NONE_TRAC_ACTIVITY) as string}
                      onValueChange={(nextValue) => {
                        const nextTracValue = nextValue === NONE_TRAC_ACTIVITY ? null : nextValue;
                        field.onChange(nextTracValue);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          trac_activity_id: nextTracValue,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_TRAC_ACTIVITY}>None</SelectItem>
                        {tracActivities.map((activity) => (
                          <SelectItem key={activity.id} value={activity.id}>
                            {activity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                <FormField<OfferingFormValues>
                  name="booking_open_at"
                  label="Booking Opens"
                  render={({ field }) => (
                    <DateTimeField
                      value={toActivityOfferingDate((field.value as string | null | undefined) ?? null)}
                      onChange={(date) => {
                        const nextOpenValue = date.toISOString();
                        field.onChange(nextOpenValue);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          booking_open_at: nextOpenValue,
                        });
                      }}
                      placeholder="Select date and time"
                    />
                  )}
                />

                <FormField<OfferingFormValues>
                  name="booking_close_at"
                  label="Booking Closes"
                  render={({ field }) => (
                    <DateTimeField
                      value={toActivityOfferingDate((field.value as string | null | undefined) ?? null)}
                      onChange={(date) => {
                        const nextCloseValue = date.toISOString();
                        field.onChange(nextCloseValue);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          booking_close_at: nextCloseValue,
                        });
                      }}
                      placeholder="Select date and time"
                    />
                  )}
                />
                {offeringErrors.booking_close_at != null ? <small>{offeringErrors.booking_close_at}</small> : null}

                <FormField<OfferingFormValues>
                  name="cost"
                  label="Cost"
                  render={({ field }) => (
                    <Input
                      id="offering-cost-edit"
                      type="number"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          cost: nextValue,
                        });
                      }}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                    />
                  )}
                />
                {offeringErrors.cost != null ? <small>{offeringErrors.cost}</small> : null}

                <FormField<OfferingFormValues>
                  name="payment_due_at"
                  label="Payment Due"
                  render={({ field }) => (
                    <DateTimeField
                      value={toActivityOfferingDate((field.value as string | null | undefined) ?? null)}
                      onChange={(date) => {
                        const nextPaymentValue = date.toISOString();
                        field.onChange(nextPaymentValue);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          payment_due_at: nextPaymentValue,
                        });
                      }}
                      placeholder="Select date and time"
                    />
                  )}
                />

                <FormField<OfferingFormValues>
                  name="allow_waitlist"
                  label="Allow waitlist"
                  render={({ field }) => (
                    <Switch
                      id="offering-waitlist-edit"
                      checked={Boolean(field.value)}
                      onChange={(nextChecked) => {
                        field.onChange(nextChecked);
                        setOfferingValues({
                          ...(methods.getValues() as OfferingFormValues),
                          allow_waitlist: nextChecked,
                        });
                      }}
                    />
                  )}
                />
              </>
            )}
          </Form>
        </DialogBody>
        <DialogFooter>
          <SaveActions
            onCancel={() => onOpenChange(false)}
            saveType="submit"
            onSaveClick={() => void onSaveOffering(offeringValues)}
            saveDisabled={updateOfferingMutationIsPending}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
