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
} from '@solvera/pace-core/components';
import type { ValidationErrors } from '@/features/activityOfferingSetup/shared';
import type { SessionFormValues } from '@/features/activityOfferingSetup/types';
import { toActivityOfferingDate } from '@/pages/activities/activityOfferingPageHelpers';

export function ActivityOfferingSessionDialog({
  title,
  open,
  values,
  errors,
  isPending,
  onValuesChange,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  values: SessionFormValues;
  errors: ValidationErrors;
  isPending: boolean;
  onValuesChange: (next: SessionFormValues) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (nextValues: SessionFormValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form<SessionFormValues>
            defaultValues={values}
            onSubmit={(submittedValues) => {
              onValuesChange(submittedValues);
              onSubmit(submittedValues);
            }}
            className="grid gap-3"
          >
            {(methods) => (
              <>
                <FormField<SessionFormValues>
                  name="session_name"
                  label="Session name"
                  render={({ field }) => (
                    <Input
                      id="session-name"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        onValuesChange({ ...(methods.getValues() as SessionFormValues), session_name: nextValue });
                      }}
                      placeholder="e.g. Morning session"
                    />
                  )}
                />

                <FormField<SessionFormValues>
                  name="start_time"
                  label="Start Time"
                  required
                  render={({ field }) => (
                    <DateTimeField
                      value={toActivityOfferingDate((field.value as string | null | undefined) ?? null)}
                      onChange={(date) => {
                        const nextStartValue = date.toISOString();
                        field.onChange(nextStartValue);
                        onValuesChange({
                          ...(methods.getValues() as SessionFormValues),
                          start_time: nextStartValue,
                        });
                      }}
                      placeholder="Select date and time"
                    />
                  )}
                />
                {errors.start_time != null ? <small>{errors.start_time}</small> : null}

                <FormField<SessionFormValues>
                  name="end_time"
                  label="End Time"
                  required
                  render={({ field }) => (
                    <DateTimeField
                      value={toActivityOfferingDate((field.value as string | null | undefined) ?? null)}
                      onChange={(date) => {
                        const nextEndValue = date.toISOString();
                        field.onChange(nextEndValue);
                        onValuesChange({
                          ...(methods.getValues() as SessionFormValues),
                          end_time: nextEndValue,
                        });
                      }}
                      placeholder="Select date and time"
                    />
                  )}
                />
                {errors.end_time != null ? <small>{errors.end_time}</small> : null}

                <FormField<SessionFormValues>
                  name="location_display_name"
                  label="Location"
                  render={({ field }) => (
                    <Input
                      id="session-location"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        onValuesChange({
                          ...(methods.getValues() as SessionFormValues),
                          location_display_name: nextValue,
                        });
                      }}
                      placeholder="e.g. Main arena, Campsite B"
                    />
                  )}
                />

                <FormField<SessionFormValues>
                  name="capacity"
                  label="Capacity"
                  required
                  render={({ field }) => (
                    <Input
                      id="session-capacity"
                      type="number"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        onValuesChange({ ...(methods.getValues() as SessionFormValues), capacity: nextValue });
                      }}
                      placeholder="0"
                      min={1}
                      step={1}
                    />
                  )}
                />
                {errors.capacity != null ? <small>{errors.capacity}</small> : null}
              </>
            )}
          </Form>
        </DialogBody>
        <DialogFooter>
          <SaveActions
            onCancel={() => onOpenChange(false)}
            saveType="submit"
            onSaveClick={() => onSubmit(values)}
            saveDisabled={isPending}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
