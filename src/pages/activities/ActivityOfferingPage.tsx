import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
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
  Label,
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
  useCreateSessionMutation,
  useDeleteSessionMutation,
  useOffering,
  useOfferingSessions,
  useSessionBookingCount,
  useTracActivities,
  useUpdateOfferingMutation,
  useUpdateSessionMutation,
} from '@/features/activityOfferingSetup/configuration';
import {
  isBookingOpenNow,
  parseOptionalCost,
  validateOfferingForm,
  validateSessionForm,
  type ValidationErrors,
} from '@/features/activityOfferingSetup/shared';
import type { ActivitySessionRow, OfferingFormValues, SessionFormValues } from '@/features/activityOfferingSetup/types';

const NONE_TRAC_ACTIVITY = '__none__';

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

function buildOfferingValues(offering: {
  name: string;
  trac_activity_id: string | null;
  booking_open_at: string | null;
  booking_close_at: string | null;
  cost: number | null;
  payment_due_at: string | null;
  allow_waitlist: boolean;
}): OfferingFormValues {
  return {
    name: offering.name,
    trac_activity_id: offering.trac_activity_id,
    booking_open_at: offering.booking_open_at,
    booking_close_at: offering.booking_close_at,
    cost: offering.cost == null ? '' : String(offering.cost),
    payment_due_at: offering.payment_due_at,
    allow_waitlist: offering.allow_waitlist,
  };
}

function buildDefaultSessionValues(): SessionFormValues {
  return {
    session_name: '',
    start_time: null,
    end_time: null,
    location_display_name: '',
    capacity: '',
  };
}

function buildSessionValues(row: ActivitySessionRow): SessionFormValues {
  return {
    session_name: row.session_name ?? '',
    start_time: row.start_time,
    end_time: row.end_time,
    location_display_name: row.location_display_name ?? '',
    capacity: String(row.capacity),
  };
}

function SessionDialog({
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
                      value={toDate((field.value as string | null | undefined) ?? null)}
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
                      value={toDate((field.value as string | null | undefined) ?? null)}
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

// eslint-disable-next-line max-lines-per-function,complexity
export function ActivityOfferingPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const selectedEventId = eventIdFromSelection(selectedEvent);
  const { selectedOrganisationId } = useUnifiedAuth();
  const { organisationId, eventId, appId } = useResolvedScope();

  const offeringQuery = useOffering(offeringId ?? null);
  const sessionsQuery = useOfferingSessions(offeringId ?? null);
  const tracActivitiesQuery = useTracActivities(selectedEventId);
  const updateOfferingMutation = useUpdateOfferingMutation();
  const createSessionMutation = useCreateSessionMutation();
  const updateSessionMutation = useUpdateSessionMutation();
  const deleteSessionMutation = useDeleteSessionMutation();

  const [editOfferingOpen, setEditOfferingOpen] = useState(false);
  const [offeringValues, setOfferingValues] = useState<OfferingFormValues>({
    name: '',
    trac_activity_id: null,
    booking_open_at: null,
    booking_close_at: null,
    cost: '',
    payment_due_at: null,
    allow_waitlist: false,
  });
  const [offeringErrors, setOfferingErrors] = useState<ValidationErrors>({});

  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [editSession, setEditSession] = useState<ActivitySessionRow | null>(null);
  const [deleteSession, setDeleteSession] = useState<ActivitySessionRow | null>(null);
  const [sessionValues, setSessionValues] = useState<SessionFormValues>(buildDefaultSessionValues());
  const [sessionErrors, setSessionErrors] = useState<ValidationErrors>({});
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);

  const bookingCountQuery = useSessionBookingCount(deleteSession?.id ?? null, deleteSession != null);
  const retryOfferingQuery = useRetryRefetchHandler(offeringQuery);
  const retrySessionsQuery = useRetryRefetchHandler(sessionsQuery);

  const scope = useMemo(
    () => ({
      organisationId: organisationId ?? selectedOrganisationId,
      eventId: eventId ?? selectedEventId ?? null,
      appId: appId ?? undefined,
    }),
    [appId, eventId, organisationId, selectedEventId, selectedOrganisationId]
  );

  const eventName =
    selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent
      ? String((selectedEvent as { name?: unknown }).name ?? 'selected event')
      : 'selected event';

  const sessionRows = sessionsQuery.data ?? [];

  const sessionColumns = useMemo(
    () => [
      {
        id: 'session_name',
        accessorKey: 'session_name',
        header: 'Session Name',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => row.session_name ?? '—',
      },
      {
        id: 'start_time',
        accessorKey: 'start_time',
        header: 'Starts',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => formatDateTime(row.start_time),
      },
      {
        id: 'end_time',
        accessorKey: 'end_time',
        header: 'Ends',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => formatDateTime(row.end_time),
      },
      {
        id: 'capacity',
        accessorKey: 'capacity',
        header: 'Capacity',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => <Badge variant="solid-sec-muted">{row.capacity}</Badge>,
      },
      {
        id: 'location_display_name',
        accessorKey: 'location_display_name',
        header: 'Location',
        sortable: true,
        cell: ({ row }: { row: ActivitySessionRow }) => row.location_display_name ?? '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: ActivitySessionRow }) => (
          <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <PagePermissionGuard pageName="activities" operation="update" scope={scope} fallback={null}>
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => {
                  setEditSession(row);
                  setSessionValues(buildSessionValues(row));
                  setSessionErrors({});
                }}
              >
                Edit
              </Button>
            </PagePermissionGuard>
            <PagePermissionGuard pageName="activities" operation="delete" scope={scope} fallback={null}>
              <Button type="button" variant="destructive" size="small" onClick={() => setDeleteSession(row)}>
                Delete
              </Button>
            </PagePermissionGuard>
          </section>
        ),
      },
    ],
    [scope]
  );

  async function refreshPageData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ba09', 'offering', offeringId] }),
      queryClient.invalidateQueries({ queryKey: ['ba09', 'sessions', offeringId] }),
      queryClient.invalidateQueries({ queryKey: ['ba09', 'offerings', selectedEventId] }),
    ]);
  }

  async function onSaveOffering(values: OfferingFormValues) {
    if (offeringId == null) {
      return;
    }
    const errors = validateOfferingForm(values);
    setOfferingErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    try {
      parseOptionalCost(values.cost);
      await updateOfferingMutation.mutateAsync({ offeringId, values });
      ShowSuccessMessage('Offering saved', toast);
      setEditOfferingOpen(false);
      await refreshPageData();
    } catch (error) {
      HandleMutationError(error, 'activities-offering-save', toast);
    }
  }

  async function onCreateSession(values: SessionFormValues) {
    if (offeringId == null) {
      return;
    }
    const errors = validateSessionForm(values);
    setSessionErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    try {
      await createSessionMutation.mutateAsync({ offeringId, values });
      ShowSuccessMessage('Session added', toast);
      setCreateSessionOpen(false);
      setSessionValues(buildDefaultSessionValues());
      await refreshPageData();
    } catch (error) {
      HandleMutationError(error, 'activities-session-create', toast);
    }
  }

  async function onSaveSession(values: SessionFormValues) {
    if (editSession == null) {
      return;
    }
    const errors = validateSessionForm(values);
    setSessionErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    try {
      await updateSessionMutation.mutateAsync({ sessionId: editSession.id, values });
      ShowSuccessMessage('Session saved', toast);
      setEditSession(null);
      await refreshPageData();
    } catch (error) {
      HandleMutationError(error, 'activities-session-update', toast);
    }
  }

  async function onDeleteSession() {
    if (deleteSession == null) {
      return;
    }
    try {
      await deleteSessionMutation.mutateAsync(deleteSession.id);
      ShowSuccessMessage('Session deleted', toast);
      setDeleteSession(null);
      setDeleteAcknowledge(false);
      await refreshPageData();
    } catch (error) {
      HandleMutationError(error, 'activities-session-delete', toast);
    }
  }

  if (selectedEventId == null) {
    return (
      <main className="grid gap-4">
        <header className="grid gap-1">
          <Button type="button" variant="ghost" size="small" onClick={() => navigate('/activities')}>
            Back to offerings
          </Button>
          <h1>Activity offering</h1>
          <p>Activity offering — {eventName}</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>No event selected</CardTitle>
            <CardDescription>Select an event from the header to view this offering.</CardDescription>
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

  if (offeringQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (offeringQuery.error != null) {
    return (
      <main className="grid gap-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(offeringQuery.error).message}</AlertDescription>
          <Button type="button" variant="outline" onClick={retryOfferingQuery}>
            Retry
          </Button>
        </Alert>
      </main>
    );
  }

  if (offeringQuery.data == null) {
    return (
      <main className="grid gap-4">
        <Alert variant="destructive">
          <AlertTitle>Offering not found</AlertTitle>
          <AlertDescription>This offering could not be found. It may have been deleted.</AlertDescription>
          <Button type="button" variant="outline" onClick={() => navigate('/activities')}>
            Back to offerings
          </Button>
        </Alert>
      </main>
    );
  }

  const offering = offeringQuery.data;
  const bookingOpen = isBookingOpenNow(offering);

  return (
    <main className="grid gap-4">
      <header className="grid gap-1">
        <Button type="button" variant="ghost" size="small" onClick={() => navigate('/activities')}>
          Back to offerings
        </Button>
        <h1>{offering.name}</h1>
        <p>Activity offering — {eventName}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{offering.name}</CardTitle>
          <CardDescription>Offering details</CardDescription>
          <PagePermissionGuard pageName="activities" operation="update" scope={scope} fallback={null}>
            <section>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOfferingValues(buildOfferingValues(offering));
                  setOfferingErrors({});
                  setEditOfferingOpen(true);
                }}
              >
                Edit offering
              </Button>
            </section>
          </PagePermissionGuard>
        </CardHeader>
        <CardContent className="grid grid-cols-[auto_1fr] gap-2">
          <div>TRAC Activity</div>
          <div>{offering.trac_activity?.name ?? 'None'}</div>
          <div>Booking Opens</div>
          <div>{offering.booking_open_at != null ? formatDateTime(offering.booking_open_at) : '—'}</div>
          <div>Booking Closes</div>
          <div>{offering.booking_close_at != null ? formatDateTime(offering.booking_close_at) : '—'}</div>
          <div>Booking Status</div>
          <div>
            <Badge variant={bookingOpen ? 'solid-main-normal' : 'outline-acc-muted'}>
              {bookingOpen ? 'Booking open' : 'Booking closed'}
            </Badge>
          </div>
          <div>Cost</div>
          <div>{formatCost(offering.cost)}</div>
          <div>Payment Due</div>
          <div>{offering.payment_due_at != null ? formatDateTime(offering.payment_due_at) : '—'}</div>
        </CardContent>
      </Card>

      {sessionsQuery.error != null ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{NormalizeSupabaseError(sessionsQuery.error).message}</AlertDescription>
          <Button type="button" variant="outline" onClick={retrySessionsQuery}>
            Retry
          </Button>
        </Alert>
      ) : null}

      <PagePermissionGuard pageName="activities" operation="create" scope={scope} fallback={null}>
        <section>
          <Button
            type="button"
            onClick={() => {
              setSessionValues(buildDefaultSessionValues());
              setSessionErrors({});
              setCreateSessionOpen(true);
            }}
          >
            Add session
          </Button>
        </section>
      </PagePermissionGuard>

      <DataTable<(ActivitySessionRow & Record<string, unknown>)>
        data={sessionRows as Array<ActivitySessionRow & Record<string, unknown>>}
        columns={sessionColumns}
        rbac={{ pageName: 'activities' }}
        title="Sessions"
        description="Sessions for this offering."
        isLoading={sessionsQuery.isLoading}
        initialPageSize={25}
        emptyState={{ description: 'No sessions have been added to this offering yet.' }}
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

      <Dialog open={editOfferingOpen} onOpenChange={setEditOfferingOpen}>
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
                          {(tracActivitiesQuery.data ?? []).map((activity) => (
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
                        value={toDate((field.value as string | null | undefined) ?? null)}
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
                        value={toDate((field.value as string | null | undefined) ?? null)}
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
              onCancel={() => setEditOfferingOpen(false)}
              saveType="submit"
              onSaveClick={() => void onSaveOffering(offeringValues)}
              saveDisabled={updateOfferingMutation.isPending}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SessionDialog
        title="Add session"
        open={createSessionOpen}
        values={sessionValues}
        errors={sessionErrors}
        isPending={createSessionMutation.isPending}
        onValuesChange={setSessionValues}
        onOpenChange={setCreateSessionOpen}
        onSubmit={(submittedValues) => {
          setSessionValues(submittedValues);
          void onCreateSession(submittedValues);
        }}
      />

      <SessionDialog
        title="Edit session"
        open={editSession != null}
        values={sessionValues}
        errors={sessionErrors}
        isPending={updateSessionMutation.isPending}
        onValuesChange={setSessionValues}
        onOpenChange={(open) => {
          if (!open) {
            setEditSession(null);
          }
        }}
        onSubmit={(submittedValues) => {
          setSessionValues(submittedValues);
          void onSaveSession(submittedValues);
        }}
      />

      <Dialog
        open={deleteSession != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSession(null);
            setDeleteAcknowledge(false);
          }
        }}
      >
        {deleteSession != null ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete session</DialogTitle>
            </DialogHeader>
            <DialogBody className="grid gap-2">
              {bookingCountQuery.isLoading ? (
                <section className="grid min-h-12 place-items-center">
                  <LoadingSpinner />
                </section>
              ) : (
                <>
                  <p>Delete the session starting {formatDateTime(deleteSession.start_time)}?</p>
                  {(bookingCountQuery.data ?? 0) > 0 ? (
                    <>
                      <Alert variant="destructive">
                        <AlertDescription>
                          This session has {bookingCountQuery.data ?? 0} booking(s). Deleting it will remove those bookings permanently.
                        </AlertDescription>
                      </Alert>
                      <Label htmlFor="delete-session-acknowledge">
                        <span>I understand this will remove existing bookings.</span>
                        <Checkbox
                          id="delete-session-acknowledge"
                          checked={deleteAcknowledge}
                          onChange={setDeleteAcknowledge}
                        />
                      </Label>
                    </>
                  ) : (
                    <p>This action cannot be undone.</p>
                  )}
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeleteSession(null);
                    setDeleteAcknowledge(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    bookingCountQuery.isLoading ||
                    ((bookingCountQuery.data ?? 0) > 0 && !deleteAcknowledge)
                  }
                  onClick={() => void onDeleteSession()}
                >
                  Delete
                </Button>
              </section>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </main>
  );
}
