/* eslint-disable max-lines-per-function, react-hooks/exhaustive-deps */

import { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import {
  AccessDenied,
  PagePermissionGuard,
  useCan,
  useResolvedScope,
  useSecureSupabase,
} from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError, formatDateTime } from '@solvera/pace-core/utils';
import {
  bookingCreateOnBehalfSchema,
  buildDefaultCreateBookingOnBehalfValues,
  resolveApplicationParticipantLabel,
  resolveSessionDisplay,
  type BookingOverrideIntent,
  type CreateBookingOnBehalfFormValues,
} from '@/features/bookingOversight/bookOnBehalfForm';
import {
  buildOverrideCreateConfirmationBody,
  buildOverrideCreateTitle,
  buildOverridePromoteCapacityConfirmationBody,
  getCreateBookingOverridePresetFromError,
  isBookingCapacityFullError,
} from '@/features/bookingOversight/bookingOverrideMessaging';
import { bookingStatusBadgeProps, participantDisplayName, sessionDisplayLabel } from '@/features/bookingOversight/display';
import {
  confirmedCountForSession,
  isBookingAlreadyCancelledError,
  isNonEmptyOverrideReason,
  isSessionAtCapacity,
  shouldShowCancelAction,
  shouldShowPromoteAction,
} from '@/features/bookingOversight/rules';
import type { BookingQueryRow, BookingTableRow } from '@/features/bookingOversight/types';
import {
  useActivitySessionsForBookingsQuery,
  useApprovedApplicationsForBookingsQuery,
  useBookingsList,
  useCancelBookingMutation,
  useCreateBookingMutation,
  useInvalidateBookingsQueries,
} from '@/features/bookingOversight/configuration';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';

function eventIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'id' in selectedEvent) {
    const value = (selectedEvent as { id?: unknown }).id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

function eventTimezoneFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'timezone' in selectedEvent) {
    const value = (selectedEvent as { timezone?: unknown }).timezone;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function BookingsPage() {
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { user } = useUnifiedAuth();
  const { scope } = useResolvedScope();

  const eventId = eventIdFromSelection(selectedEvent);
  const eventName = eventNameFromSelection(selectedEvent);
  const eventTimezone = eventTimezoneFromSelection(selectedEvent);

  const organisationId =
    selectedEvent != null &&
    typeof selectedEvent === 'object' &&
    'organisation_id' in selectedEvent &&
    typeof (selectedEvent as { organisation_id?: unknown }).organisation_id === 'string'
      ? (selectedEvent as { organisation_id: string }).organisation_id
      : scope.organisationId ?? '';

  const { can: canReadBookings, isLoading: readBookingsLoading } = useCan('read:page.bookings', scope);
  const { can: canCreateBookings, isLoading: createPermLoading } = useCan('create:page.bookings', scope);
  const { can: canUpdateBookings, isLoading: updatePermLoading } = useCan('update:page.bookings', scope);
  const { can: canDeleteBookings, isLoading: deletePermLoading } = useCan('delete:page.bookings', scope);

  const bookingsQuery = useBookingsList(eventId, eventTimezone);
  const applicationsQuery = useApprovedApplicationsForBookingsQuery(eventId);
  const sessionsQuery = useActivitySessionsForBookingsQuery(eventId);

  const createMutation = useCreateBookingMutation();
  const cancelMutation = useCancelBookingMutation();
  const invalidateBookings = useInvalidateBookingsQueries();

  const retryBookings = useRetryRefetchHandler(bookingsQuery);

  const rawBookings: BookingQueryRow[] = bookingsQuery.data?.raw ?? [];
  const tableRows: BookingTableRow[] = bookingsQuery.data?.tableRows ?? [];

  const [bookOnBehalfOpen, setBookOnBehalfOpen] = useState(false);
  const [bookFormKey, setBookFormKey] = useState(0);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideIntent, setOverrideIntent] = useState<BookingOverrideIntent | null>(null);

  const [cancelTarget, setCancelTarget] = useState<BookingTableRow | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<BookingTableRow | null>(null);

  const sessionsByOffering = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    const groups = new Map<string, { offeringName: string; sessions: typeof sessions }>();
    for (const s of sessions) {
      const offeringName = s.offering?.name?.trim() || 'Offering';
      const existing = groups.get(offeringName);
      if (existing != null) {
        existing.sessions.push(s);
      } else {
        groups.set(offeringName, { offeringName, sessions: [s] });
      }
    }
    return [...groups.values()].sort((a, b) => a.offeringName.localeCompare(b.offeringName));
  }, [sessionsQuery.data]);

  const statusFilterOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const row of tableRows) {
      unique.add(row.status);
    }
    return [...unique].sort().map((status) => ({
      value: status,
      label:
        status === 'confirmed'
          ? 'Confirmed'
          : status === 'waitlisted'
            ? 'Waitlisted'
            : status === 'cancelled'
              ? 'Cancelled'
              : status,
    }));
  }, [tableRows]);

  const sessionFilterOptions = useMemo(() => {
    const labels = [...new Set(tableRows.map((r) => r.session as string))].sort((a, b) =>
      a.localeCompare(b)
    );
    return labels.map((label) => ({ value: label, label }));
  }, [tableRows]);

  const offeringFilterOptions = useMemo(() => {
    const labels = [...new Set(tableRows.map((r) => r.offering as string))].sort((a, b) =>
      a.localeCompare(b)
    );
    return labels.map((label) => ({ value: label, label }));
  }, [tableRows]);

  const columns = useMemo(
    () => [
      {
        id: 'participant',
        accessorKey: 'participant',
        header: 'Participant',
        sortable: true,
        searchable: true,
      },
      {
        id: 'offering',
        accessorKey: 'offering',
        header: 'Offering',
        sortable: true,
        searchable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: offeringFilterOptions,
      },
      {
        id: 'session',
        accessorKey: 'session',
        header: 'Session',
        sortable: true,
        searchable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: sessionFilterOptions,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        sortable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: statusFilterOptions,
        cell: ({
          row,
        }: {
          row: BookingTableRow;
        }) => {
          const spec = bookingStatusBadgeProps(row.status);
          return <Badge variant={spec.variant}>{spec.label}</Badge>;
        },
      },
      {
        id: 'sourceLabel',
        accessorKey: 'sourceLabel',
        header: 'Source',
        sortable: true,
      },
      {
        id: 'booked_at',
        accessorKey: 'booked_at',
        header: 'Booked',
        sortable: true,
        cell: ({
          row,
        }: {
          row: BookingTableRow;
        }) => formatDateTime(row.booked_at),
      },
      {
        id: 'row_actions',
        accessorKey: 'id',
        header: 'Actions',
        sortable: false,
        searchable: false,
        cell: ({ row }: { row: BookingTableRow }) => (
          <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
            {shouldShowPromoteAction(row.status, canUpdateBookings) ? (
              <Button
                type="button"
                size="small"
                variant="default"
                onClick={() => {
                  setPromoteTarget(row);
                }}
              >
                Promote
              </Button>
            ) : null}
            {shouldShowCancelAction(row.status, canDeleteBookings) ? (
              <Button
                type="button"
                size="small"
                variant="destructive"
                onClick={() => {
                  setCancelTarget(row);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </section>
        ),
      },
    ],
    [
      offeringFilterOptions,
      sessionFilterOptions,
      statusFilterOptions,
      canUpdateBookings,
      canDeleteBookings,
    ]
  );

  const userId = user?.id ?? '';

  const runCreateBooking = async (params: {
    p_event_id: string;
    p_application_id: string;
    p_session_id: string;
    p_organisation_id: string;
    p_source: string;
    p_promote_from_waitlist: boolean;
    p_override_capacity: boolean;
    p_override_window: boolean;
    p_override_conflict: boolean;
    p_override_reason: string | null;
    p_override_by: string | null;
  }) => {
    await createMutation.mutateAsync(params);
  };

  const closeOverride = () => {
    setOverrideOpen(false);
    setOverrideReason('');
    setOverrideIntent(null);
  };

  const onOverrideConfirm = async () => {
    if (overrideIntent == null || userId.length === 0) return;
    const trimmed = overrideReason.trim();
    if (!isNonEmptyOverrideReason(trimmed)) return;
    try {
      if (overrideIntent.kind === 'create') {
        await runCreateBooking({
          p_event_id: overrideIntent.eventId,
          p_application_id: overrideIntent.applicationId,
          p_session_id: overrideIntent.sessionId,
          p_organisation_id: overrideIntent.organisationId,
          p_source: 'admin_assigned',
          p_promote_from_waitlist: false,
          p_override_capacity: overrideIntent.p_override_capacity,
          p_override_window: overrideIntent.p_override_window,
          p_override_conflict: overrideIntent.p_override_conflict,
          p_override_reason: trimmed,
          p_override_by: userId,
        });
        toast({ title: 'Success', description: 'Booking created with override', variant: 'success' });
        closeOverride();
        setBookOnBehalfOpen(false);
        setBookFormKey((k) => k + 1);
      } else {
        await runCreateBooking({
          p_event_id: overrideIntent.eventId,
          p_application_id: overrideIntent.applicationId,
          p_session_id: overrideIntent.sessionId,
          p_organisation_id: overrideIntent.organisationId,
          p_source: 'admin_assigned',
          p_promote_from_waitlist: true,
          p_override_capacity: overrideIntent.p_override_capacity,
          p_override_window: false,
          p_override_conflict: false,
          p_override_reason: trimmed,
          p_override_by: userId,
        });
        toast({
          title: 'Success',
          description: 'Participant promoted to confirmed',
          variant: 'success',
        });
        closeOverride();
        setPromoteTarget(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  };

  const onCreateValidSubmit = async (values: CreateBookingOnBehalfFormValues) => {
    if (eventId == null || organisationId.length === 0 || userId.length === 0) return;

    const hasOverride =
      values.override_capacity || values.override_window || values.override_conflict;
    if (hasOverride) {
      const participantName = resolveApplicationParticipantLabel(
        applicationsQuery.data,
        values.application_id
      );
      const sessionLabel = resolveSessionDisplay(sessionsQuery.data, values.session_id, eventTimezone);
      setOverrideIntent({
        kind: 'create',
        title: buildOverrideCreateTitle({
          overrideCapacity: values.override_capacity,
          overrideWindow: values.override_window,
          overrideConflict: values.override_conflict,
        }),
        confirmationBody: buildOverrideCreateConfirmationBody({
          participantName,
          sessionLabel,
          overrideCapacity: values.override_capacity,
          overrideWindow: values.override_window,
          overrideConflict: values.override_conflict,
        }),
        confirmLabel: 'Book with override',
        eventId,
        organisationId,
        applicationId: values.application_id,
        sessionId: values.session_id,
        p_override_capacity: values.override_capacity,
        p_override_window: values.override_window,
        p_override_conflict: values.override_conflict,
      });
      setOverrideReason('');
      setBookOnBehalfOpen(false);
      setOverrideOpen(true);
      return;
    }
    try {
      await runCreateBooking({
        p_event_id: eventId,
        p_application_id: values.application_id,
        p_session_id: values.session_id,
        p_organisation_id: organisationId,
        p_source: 'admin_assigned',
        p_promote_from_waitlist: false,
        p_override_capacity: false,
        p_override_window: false,
        p_override_conflict: false,
        p_override_reason: null,
        p_override_by: null,
      });
      toast({ title: 'Success', description: 'Booking created', variant: 'success' });
      setBookOnBehalfOpen(false);
      setBookFormKey((k) => k + 1);
    } catch (error) {
      const preset = getCreateBookingOverridePresetFromError(error);
      if (preset != null) {
        toast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
        const participantName = resolveApplicationParticipantLabel(
          applicationsQuery.data,
          values.application_id
        );
        const sessionLabel = resolveSessionDisplay(sessionsQuery.data, values.session_id, eventTimezone);
        setOverrideIntent({
          kind: 'create',
          title: buildOverrideCreateTitle({
            overrideCapacity: preset.override_capacity,
            overrideWindow: preset.override_window,
            overrideConflict: preset.override_conflict,
          }),
          confirmationBody: buildOverrideCreateConfirmationBody({
            participantName,
            sessionLabel,
            overrideCapacity: preset.override_capacity,
            overrideWindow: preset.override_window,
            overrideConflict: preset.override_conflict,
          }),
          confirmLabel: 'Book with override',
          eventId,
          organisationId,
          applicationId: values.application_id,
          sessionId: values.session_id,
          p_override_capacity: preset.override_capacity,
          p_override_window: preset.override_window,
          p_override_conflict: preset.override_conflict,
        });
        setOverrideReason('');
        setBookOnBehalfOpen(false);
        setOverrideOpen(true);
        return;
      }
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  };

  const onConfirmCancelBooking = async () => {
    if (cancelTarget == null || userId.length === 0) return;
    try {
      await cancelMutation.mutateAsync({
        p_booking_id: cancelTarget.id,
        p_cancelled_by: userId,
        p_source: 'admin',
        p_reason: null,
        p_override_reason: null,
        p_override_by: null,
        p_override_at: null,
      });
      toast({ title: 'Success', description: 'Booking cancelled', variant: 'success' });
      setCancelTarget(null);
    } catch (error) {
      if (isBookingAlreadyCancelledError(error)) {
        toast({
          title: 'Error',
          description: 'This booking has already been cancelled.',
          variant: 'destructive',
        });
        setCancelTarget(null);
        invalidateBookings();
        return;
      }
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  };

  const onConfirmPromote = async () => {
    if (promoteTarget == null || eventId == null || organisationId.length === 0 || userId.length === 0) {
      return;
    }
    const b = promoteTarget._booking;
    const session = b.session;
    const cap = session?.capacity ?? 0;
    const confirmed = confirmedCountForSession(rawBookings, b.session_id);
    const atCapacity = isSessionAtCapacity(confirmed, cap);

    if (atCapacity) {
      setPromoteTarget(null);
      setOverrideIntent({
        kind: 'promote',
        title: 'Override capacity and promote',
        confirmationBody: buildOverridePromoteCapacityConfirmationBody(promoteTarget.participant),
        confirmLabel: 'Promote with override',
        eventId,
        organisationId,
        applicationId: b.application_id,
        sessionId: b.session_id,
        p_override_capacity: true,
      });
      setOverrideReason('');
      setOverrideOpen(true);
      return;
    }
    try {
      await runCreateBooking({
        p_event_id: eventId,
        p_application_id: b.application_id,
        p_session_id: b.session_id,
        p_organisation_id: organisationId,
        p_source: 'admin_assigned',
        p_promote_from_waitlist: true,
        p_override_capacity: false,
        p_override_window: false,
        p_override_conflict: false,
        p_override_reason: null,
        p_override_by: null,
      });
      toast({
        title: 'Success',
        description: 'Participant promoted to confirmed',
        variant: 'success',
      });
      setPromoteTarget(null);
    } catch (error) {
      if (
        promoteTarget != null &&
        eventId != null &&
        organisationId.length > 0 &&
        userId.length > 0 &&
        isBookingCapacityFullError(error)
      ) {
        const row = promoteTarget;
        const pt = row.participant;
        const appId = row._booking.application_id;
        const sessId = row._booking.session_id;
        toast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
        setPromoteTarget(null);
        setOverrideIntent({
          kind: 'promote',
          title: 'Override capacity and promote',
          confirmationBody: buildOverridePromoteCapacityConfirmationBody(pt),
          confirmLabel: 'Promote with override',
          eventId,
          organisationId,
          applicationId: appId,
          sessionId: sessId,
          p_override_capacity: true,
        });
        setOverrideReason('');
        setOverrideOpen(true);
        return;
      }
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  };

  const permLoading =
    readBookingsLoading || createPermLoading || updatePermLoading || deletePermLoading;
  if (permLoading) {
    return null;
  }

  if (!canReadBookings) {
    return <AccessDenied />;
  }

  if (secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <PagePermissionGuard pageName="bookings" operation="read" scope={scope} fallback={<AccessDenied />}>
      <main className="grid gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid gap-2">
          <h1>Bookings</h1>
          <p>{eventName} — Manage activity bookings for this event.</p>
        </header>

        {eventId == null ? (
          <Card>
            <CardHeader>
              <CardTitle>No event selected</CardTitle>
              <CardDescription>
                Select an event from the header to manage its bookings.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {canCreateBookings ? (
              <section className="grid justify-items-start">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    setBookFormKey((k) => k + 1);
                    setBookOnBehalfOpen(true);
                  }}
                >
                  Book on behalf
                </Button>
              </section>
            ) : null}

            {bookingsQuery.error != null ? (
              <Alert variant="destructive">
                <AlertDescription>{NormalizeSupabaseError(bookingsQuery.error).message}</AlertDescription>
                <section className="grid justify-items-start">
                  <Button type="button" variant="outline" size="small" onClick={retryBookings}>
                    Retry
                  </Button>
                </section>
              </Alert>
            ) : (
              <DataTable<BookingTableRow>
                data={tableRows}
                columns={columns}
                rbac={{ pageName: 'bookings' }}
                title="Activity Bookings"
                description={`${tableRows.length} bookings for ${eventName}`}
                isLoading={bookingsQuery.isLoading}
                initialPageSize={50}
                initialSorting={[{ id: 'booked_at', desc: true }]}
                emptyState={{ description: 'No bookings have been created for this event.' }}
                features={{
                  search: true,
                  pagination: true,
                  sorting: true,
                  filtering: true,
                  export: false,
                  import: false,
                  grouping: false,
                  columnVisibility: false,
                  editing: false,
                  creation: false,
                  selection: false,
                  deletion: false,
                  deleteSelected: false,
                  columnReordering: false,
                  hierarchical: false,
                }}
              />
            )}

            <Dialog
              open={bookOnBehalfOpen}
              onOpenChange={(open) => {
                setBookOnBehalfOpen(open);
              }}
            >
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
                      void onCreateValidSubmit(submitted);
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
                                {(applicationsQuery.data ?? []).map((app) => (
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
                                    (sessionsQuery.data ?? []).length === 0
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
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setBookOnBehalfOpen(false);
                            }}
                          >
                            Cancel
                          </Button>
                          {/* eslint-disable-next-line pace-core-compliance/persistence-save-label -- BA11 BC-PA-03 footer label Book */}
                          <Button type="submit" variant="default">
                            Book
                          </Button>
                        </DialogFooter>
                      </>
                  </Form>
                </DialogBody>
              </DialogContent>
            </Dialog>

            <Dialog
              open={overrideOpen && overrideIntent != null}
              onOpenChange={(open) => {
                if (!open) {
                  closeOverride();
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{overrideIntent?.title}</DialogTitle>
                </DialogHeader>
                <DialogBody className="grid gap-3">
                  {overrideIntent?.confirmationBody != null ? (
                    <p>{overrideIntent.confirmationBody}</p>
                  ) : null}
                  <Label htmlFor="override_reason">Override reason</Label>
                  <Textarea
                    id="override_reason"
                    name="override_reason"
                    value={overrideReason}
                    maxLength={500}
                    rows={4}
                    placeholder="Reason for override (required)"
                    onChange={(next) => {
                      setOverrideReason(next);
                    }}
                  />
                  <small>Required. Explain why this override is necessary (max 500 characters).</small>
                  <DialogFooter className="text-right">
                    <Button type="button" variant="outline" onClick={closeOverride}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!isNonEmptyOverrideReason(overrideReason)}
                      onClick={() => {
                        void onOverrideConfirm();
                      }}
                    >
                      {overrideIntent?.confirmLabel ?? 'Confirm'}
                    </Button>
                  </DialogFooter>
                </DialogBody>
              </DialogContent>
            </Dialog>

            <Dialog
              open={cancelTarget != null}
              onOpenChange={(open) => {
                if (!open) setCancelTarget(null);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel booking</DialogTitle>
                </DialogHeader>
                <DialogBody className="grid gap-2">
                  {cancelTarget != null ? (
                    <>
                      <p>
                        {cancelTarget.participant} — {cancelTarget.session} —{' '}
                        {cancelTarget._booking.session != null
                          ? formatDateTime(cancelTarget._booking.session.start_time)
                          : ''}
                      </p>
                      <p>
                        Cancel this booking? The participant will lose their place and the capacity slot will be
                        released (if confirmed).
                      </p>
                    </>
                  ) : null}
                  <DialogFooter className="text-right">
                    <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
                      Go back
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => void onConfirmCancelBooking()}>
                      Cancel booking
                    </Button>
                  </DialogFooter>
                </DialogBody>
              </DialogContent>
            </Dialog>

            <Dialog
              open={promoteTarget != null}
              onOpenChange={(open) => {
                if (!open) setPromoteTarget(null);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Promote to confirmed</DialogTitle>
                </DialogHeader>
                <DialogBody className="grid gap-2">
                  {promoteTarget != null ? (
                    <p>
                      Confirm promotion for {promoteTarget.participant} to {promoteTarget.session}? This will
                      confirm the booking and consume one capacity slot.
                    </p>
                  ) : null}
                  <DialogFooter className="text-right">
                    <Button type="button" variant="outline" onClick={() => setPromoteTarget(null)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="default" onClick={() => void onConfirmPromote()}>
                      Promote
                    </Button>
                  </DialogFooter>
                </DialogBody>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </PagePermissionGuard>
  );
}
