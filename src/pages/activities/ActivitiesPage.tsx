import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
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
  LoadingSpinner,
  SaveActions,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@solvera/pace-core/components';
import { useEvents, useToast, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { PagePermissionGuard, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { HandleMutationError, NormalizeSupabaseError, ShowSuccessMessage, formatDateTime } from '@solvera/pace-core/utils';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import {
  useOfferingsList,
  useOfferingSessionCount,
  useTracActivities,
} from '@/features/activityOfferingSetup/activityOfferingQueries';
import {
  useCreateOfferingMutation,
  useDeleteOfferingMutation,
} from '@/features/activityOfferingSetup/activityOfferingMutations';
import {
  getOfferingSessionCount,
  isBookingOpenNow,
  parseOptionalCost,
  validateOfferingForm,
  type ValidationErrors,
} from '@/features/activityOfferingSetup/shared';
import type { ActivityOfferingRow, OfferingFormValues } from '@/features/activityOfferingSetup/types';

const NONE_TRAC_ACTIVITY = '__none__';

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

function eventIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'id' in selectedEvent) {
    const value = (selectedEvent as { id?: unknown }).id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function toDate(value: string | null): Date | null {
  if (value == null || value.length === 0) {
    return null;
  }
  return new Date(value);
}

function formatCost(value: number | null): string {
  if (value == null) {
    return '—';
  }
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

function buildDefaultValues(): OfferingFormValues {
  return {
    name: '',
    trac_activity_id: null,
    booking_open_at: null,
    booking_close_at: null,
    cost: '',
    payment_due_at: null,
    allow_waitlist: false,
  };
}

function OfferingDialog({
  open,
  title,
  values,
  errors,
  tracActivities,
  isPending,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  values: OfferingFormValues;
  errors: ValidationErrors;
  tracActivities: Array<{ id: string; name: string }>;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange: (next: OfferingFormValues) => void;
  onSubmit: (nextValues: OfferingFormValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form<OfferingFormValues>
            defaultValues={values}
            onSubmit={(submittedValues) => {
              onValuesChange(submittedValues);
              onSubmit(submittedValues);
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
                      id="offering-name"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        onValuesChange({ ...(methods.getValues() as OfferingFormValues), name: nextValue });
                      }}
                      placeholder="e.g. Rock Climbing"
                    />
                  )}
                />
                {errors.name != null ? <small>{errors.name}</small> : null}

                <FormField<OfferingFormValues>
                  name="trac_activity_id"
                  label="TRAC Activity"
                  render={({ field }) => (
                    <Select
                      value={(field.value ?? NONE_TRAC_ACTIVITY) as string}
                      onValueChange={(nextValue) => {
                        const nextTracValue = nextValue === NONE_TRAC_ACTIVITY ? null : nextValue;
                        field.onChange(nextTracValue);
                        onValuesChange({
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
                      value={toDate((field.value as string | null | undefined) ?? null)}
                      onChange={(nextDate) => {
                        const nextOpenValue = nextDate.toISOString();
                        field.onChange(nextOpenValue);
                        onValuesChange({
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
                      value={toDate((field.value as string | null | undefined) ?? null)}
                      onChange={(nextDate) => {
                        const nextCloseValue = nextDate.toISOString();
                        field.onChange(nextCloseValue);
                        onValuesChange({
                          ...(methods.getValues() as OfferingFormValues),
                          booking_close_at: nextCloseValue,
                        });
                      }}
                      placeholder="Select date and time"
                    />
                  )}
                />
                {errors.booking_close_at != null ? <small>{errors.booking_close_at}</small> : null}

                <FormField<OfferingFormValues>
                  name="cost"
                  label="Cost"
                  render={({ field }) => (
                    <Input
                      id="offering-cost"
                      type="number"
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        onValuesChange({ ...(methods.getValues() as OfferingFormValues), cost: nextValue });
                      }}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                    />
                  )}
                />
                {errors.cost != null ? <small>{errors.cost}</small> : null}

                <FormField<OfferingFormValues>
                  name="payment_due_at"
                  label="Payment Due"
                  render={({ field }) => (
                    <DateTimeField
                      value={toDate((field.value as string | null | undefined) ?? null)}
                      onChange={(nextDate) => {
                        const nextPaymentValue = nextDate.toISOString();
                        field.onChange(nextPaymentValue);
                        onValuesChange({
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
                      id="offering-waitlist"
                      checked={Boolean(field.value)}
                      onChange={(nextChecked) => {
                        field.onChange(nextChecked);
                        onValuesChange({
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
            onSaveClick={() => onSubmit(values)}
            saveDisabled={isPending}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ActivitiesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const selectedEventId = eventIdFromSelection(selectedEvent);
  const { selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();

  const offeringsQuery = useOfferingsList(selectedEventId);
  const tracActivitiesQuery = useTracActivities(selectedEventId);
  const createOfferingMutation = useCreateOfferingMutation();
  const deleteOfferingMutation = useDeleteOfferingMutation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteOffering, setDeleteOffering] = useState<ActivityOfferingRow | null>(null);
  const [formValues, setFormValues] = useState<OfferingFormValues>(buildDefaultValues());
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const deleteSessionCountQuery = useOfferingSessionCount(deleteOffering?.id ?? null, deleteOffering != null);

  const scope = useMemo(
    () => ({
      organisationId: organisationId ?? selectedOrganisationId,
      eventId: eventId ?? selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, eventId, organisationId, selectedEventId, selectedOrganisationId]
  );

  const eventName = eventNameFromSelection(selectedEvent);

  const tracActivities = tracActivitiesQuery.data ?? [];
  const retryOfferingsQuery = useRetryRefetchHandler(offeringsQuery);

  const tableRows = useMemo(
    () =>
      (offeringsQuery.data ?? []).map((offering) => ({
        ...offering,
        sessionCount: getOfferingSessionCount(offering),
      })),
    [offeringsQuery.data]
  );

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        cell: ({ row }: { row: (typeof tableRows)[number] }) => (
          <Button type="button" variant="outline" size="small" onClick={() => navigate(`/activities/${row.id}`)}>
            {row.name}
          </Button>
        ),
      },
      {
        id: 'sessionCount',
        accessorKey: 'sessionCount',
        header: 'Sessions',
        sortable: true,
        cell: ({ row }: { row: (typeof tableRows)[number] }) => (
          <Badge variant="solid-sec-muted">{row.sessionCount}</Badge>
        ),
      },
      {
        id: 'booking_open_at',
        accessorKey: 'booking_open_at',
        header: 'Booking Opens',
        sortable: true,
        cell: ({ row }: { row: (typeof tableRows)[number] }) =>
          row.booking_open_at != null ? formatDateTime(row.booking_open_at) : '—',
      },
      {
        id: 'booking_close_at',
        accessorKey: 'booking_close_at',
        header: 'Booking Closes',
        sortable: true,
        cell: ({ row }: { row: (typeof tableRows)[number] }) => (
          <section className="grid gap-1">
            <span>{row.booking_close_at != null ? formatDateTime(row.booking_close_at) : '—'}</span>
            <Badge variant={isBookingOpenNow(row) ? 'solid-main-normal' : 'outline-acc-muted'}>
              {isBookingOpenNow(row) ? 'Booking open' : 'Booking closed'}
            </Badge>
          </section>
        ),
      },
      {
        id: 'cost',
        accessorKey: 'cost',
        header: 'Cost',
        sortable: true,
        cell: ({ row }: { row: (typeof tableRows)[number] }) => formatCost(row.cost),
      },
      {
        id: 'trac_activity',
        accessorKey: 'trac_activity',
        header: 'TRAC Activity',
        cell: ({ row }: { row: (typeof tableRows)[number] }) => row.trac_activity?.name ?? '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: (typeof tableRows)[number] }) => (
          <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <Button type="button" variant="outline" size="small" onClick={() => navigate(`/activities/${row.id}`)}>
              View
            </Button>
            <PagePermissionGuard pageName="activities" operation="delete" scope={scope} fallback={null}>
              <Button type="button" variant="destructive" size="small" onClick={() => setDeleteOffering(row)}>
                Delete
              </Button>
            </PagePermissionGuard>
          </section>
        ),
      },
    ],
    [navigate, scope]
  );

  async function refreshOfferings() {
    await queryClient.invalidateQueries({ queryKey: ['ba09', 'offerings', selectedEventId] });
  }

  async function onCreate(values: OfferingFormValues) {
    const errors = validateOfferingForm(values);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0 || selectedEventId == null) {
      return;
    }
    try {
      parseOptionalCost(values.cost);
      await createOfferingMutation.mutateAsync({
        eventId: selectedEventId,
        values,
      });
      ShowSuccessMessage('Offering created', toast);
      setCreateDialogOpen(false);
      setFormValues(buildDefaultValues());
      await refreshOfferings();
    } catch (error) {
      HandleMutationError(error, 'activities-offering-create', toast);
    }
  }

  async function onConfirmDelete() {
    if (deleteOffering == null) {
      return;
    }
    try {
      await deleteOfferingMutation.mutateAsync(deleteOffering.id);
      ShowSuccessMessage('Offering deleted', toast);
      setDeleteOffering(null);
      await refreshOfferings();
    } catch (error) {
      HandleMutationError(error, 'activities-offering-delete', toast);
    }
  }

  if (selectedEventId == null) {
    return (
      <main className="grid gap-4">
        <header className="grid gap-1">
          <h1>Activities</h1>
          <p>Manage activity offerings and sessions for this event.</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to manage its activities.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <h1>Activities</h1>
        <p>Manage activity offerings and sessions for {eventName}.</p>
      </header>

      <PagePermissionGuard pageName="activities" operation="create" scope={scope} fallback={null}>
        <section>
          <Button
            type="button"
            onClick={() => {
              setFormValues(buildDefaultValues());
              setFormErrors({});
              setCreateDialogOpen(true);
            }}
          >
            Create offering
          </Button>
        </section>
      </PagePermissionGuard>

      {offeringsQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(offeringsQuery.error).message}</AlertDescription>
          <Button type="button" variant="outline" onClick={retryOfferingsQuery}>
            Retry
          </Button>
        </Alert>
      ) : null}

      <DataTable<(typeof tableRows)[number]>
        data={tableRows}
        columns={columns}
        rbac={{ pageName: 'activities' }}
        title="Activity Offerings"
        description={`${tableRows.length} offerings for ${eventName}`}
        isLoading={offeringsQuery.isLoading}
        initialPageSize={25}
        emptyState={{ description: 'No activity offerings have been created for this event.' }}
        features={{
          search: true,
          pagination: true,
          sorting: true,
          export: false,
          import: false,
          grouping: false,
          columnVisibility: false,
          editing: false,
          creation: false,
          filtering: false,
          selection: false,
          deletion: false,
          deleteSelected: false,
          columnReordering: false,
          hierarchical: false,
        }}
      />

      <OfferingDialog
        open={createDialogOpen}
        title="Create offering"
        values={formValues}
        errors={formErrors}
        tracActivities={tracActivities}
        isPending={createOfferingMutation.isPending}
        onOpenChange={setCreateDialogOpen}
        onValuesChange={setFormValues}
        onSubmit={(submittedValues) => {
          setFormValues(submittedValues);
          void onCreate(submittedValues);
        }}
      />

      <Dialog
        open={deleteOffering != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOffering(null);
          }
        }}
      >
        {deleteOffering != null ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete offering</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>{`Delete the offering "${deleteOffering.name}"?`}</p>
              {deleteSessionCountQuery.isLoading ? (
                <section className="grid min-h-12 place-items-center">
                  <LoadingSpinner />
                </section>
              ) : (deleteSessionCountQuery.data ?? 0) > 0 ? (
                <Alert variant="destructive">
                  <AlertDescription>All sessions must be removed before this offering can be deleted.</AlertDescription>
                </Alert>
              ) : (
                <p>This action cannot be undone.</p>
              )}
            </DialogBody>
            <DialogFooter>
              <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteOffering(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteSessionCountQuery.isLoading || (deleteSessionCountQuery.data ?? 0) > 0}
                  onClick={() => void onConfirmDelete()}
                >
                  {(deleteSessionCountQuery.data ?? 0) > 0 ? 'Cannot delete — sessions exist' : 'Delete'}
                </Button>
              </section>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </main>
  );
}
