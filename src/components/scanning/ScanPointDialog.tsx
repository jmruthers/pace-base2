import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  Form,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { clearResourceOnContextChange } from '@/features/scanningSetup/shared';
import type { ScanPointFormValues } from '@/features/scanningSetup/types';

export interface ScanPointDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  values: ScanPointFormValues;
  errors: Partial<Record<keyof ScanPointFormValues, string>>;
  activityOptions: Array<{ id: string; label: string }>;
  transportOptions: Array<{ id: string; label: string }>;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange: (next: ScanPointFormValues) => void;
  onSubmit: (next: ScanPointFormValues) => void;
}

export function ScanPointDialog({
  open,
  title,
  submitLabel,
  values,
  errors,
  activityOptions,
  transportOptions,
  pending,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: ScanPointDialogProps) {
  const resourceOptions = values.context_type === 'activity' ? activityOptions : transportOptions;
  const shouldShowResource = values.context_type === 'activity' || values.context_type === 'transport';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Form<ScanPointFormValues>
              defaultValues={values}
              onSubmit={(submittedValues) => {
                onValuesChange(submittedValues);
                onSubmit(submittedValues);
              }}
              className="grid gap-3"
            >
              {(methods) => (
                <>
                  <FormField<ScanPointFormValues>
                    name="name"
                    label="Name"
                    required
                    render={({ field }) => (
                      <Input
                        value={(field.value as string | undefined) ?? ''}
                        maxLength={100}
                        onChange={(nextValue) => {
                          field.onChange(nextValue);
                          onValuesChange({
                            ...(methods.getValues() as ScanPointFormValues),
                            name: nextValue,
                          });
                        }}
                        placeholder="e.g. Main gate, Activity hub entrance"
                      />
                    )}
                  />
                  <small>A short label to identify this scan point.</small>
                  {errors.name != null ? <p role="alert">{errors.name}</p> : null}

                  <FormField<ScanPointFormValues>
                    name="context_type"
                    label="Context type"
                    required
                    render={({ field }) => (
                      <Select
                        value={(field.value as string | undefined) ?? 'site'}
                        onValueChange={(nextValue) => {
                          const nextValues = clearResourceOnContextChange(
                            methods.getValues() as ScanPointFormValues,
                            nextValue as ScanPointFormValues['context_type']
                          );
                          field.onChange(nextValue);
                          onValuesChange(nextValues);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select context type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="site">Site</SelectItem>
                          <SelectItem value="activity">Activity</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="meal">Meal</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.context_type != null ? <p role="alert">{errors.context_type}</p> : null}

                  <FormField<ScanPointFormValues>
                    name="direction"
                    label="Direction"
                    required
                    render={({ field }) => (
                      <Select
                        value={(field.value as string | undefined) ?? 'neutral'}
                        onValueChange={(nextValue) => {
                          field.onChange(nextValue);
                          onValuesChange({
                            ...(methods.getValues() as ScanPointFormValues),
                            direction: nextValue as ScanPointFormValues['direction'],
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">In</SelectItem>
                          <SelectItem value="out">Out</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.direction != null ? <p role="alert">{errors.direction}</p> : null}

                  {shouldShowResource ? (
                    <>
                      <FormField<ScanPointFormValues>
                        name="resource_id"
                        label="Resource"
                        required
                        render={({ field }) => (
                          <Select
                            value={(field.value as string | undefined) ?? ''}
                            onValueChange={(nextValue) => {
                              const safeValue = nextValue ?? '';
                              field.onChange(nextValue);
                              onValuesChange({
                                ...(methods.getValues() as ScanPointFormValues),
                                resource_id: safeValue.length > 0 ? safeValue : null,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select resource" />
                            </SelectTrigger>
                            <SelectContent>
                              {resourceOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.resource_id != null ? <p role="alert">{errors.resource_id}</p> : null}
                    </>
                  ) : null}
                </>
              )}
            </Form>
          </DialogBody>
          <DialogFooter>
            <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={() => onSubmit(values)}>
                {submitLabel}
              </Button>
            </section>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
