import { useCallback, useMemo, useState } from 'react';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useCan, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import type { BookingOverrideIntent } from '@/features/bookingOversight/bookOnBehalfForm';
import {
  useActivitySessionsForBookingsQuery,
  useApprovedApplicationsForBookingsQuery,
  useBookingsList,
  useCancelBookingMutation,
  useCreateBookingMutation,
  useInvalidateBookingsQueries,
} from '@/features/bookingOversight/configuration';
import type { BookingQueryRow, BookingTableRow } from '@/features/bookingOversight/types';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import {
  bookingEventIdFromSelection,
  bookingEventNameFromSelection,
  bookingEventTimezoneFromSelection,
} from '@/pages/activities/bookingsPageHelpers';
import {
  CreateBookingRpcParams,
  useBookingsPageBookingHandlers,
} from '@/hooks/activities/useBookingsPageBookingHandlers';

export function useBookingsPageController() {
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { user } = useUnifiedAuth();
  const { scope } = useResolvedScope();

  const eventId = bookingEventIdFromSelection(selectedEvent);
  const eventName = bookingEventNameFromSelection(selectedEvent);
  const eventTimezone = bookingEventTimezoneFromSelection(selectedEvent);

  const organisationId =
    selectedEvent != null &&
    typeof selectedEvent === 'object' &&
    'organisation_id' in selectedEvent &&
    typeof (selectedEvent as { organisation_id?: unknown }).organisation_id === 'string'
      ? (selectedEvent as { organisation_id: string }).organisation_id
      : scope.organisationId ?? '';

  const { can: canReadBookings, isLoading: readBookingsLoading } = useCan('read:page.BookingsPage', scope);
  const { can: canCreateBookings, isLoading: createPermLoading } = useCan('create:page.BookingsPage', scope);
  const { can: canUpdateBookings, isLoading: updatePermLoading } = useCan('update:page.BookingsPage', scope);
  const { can: canDeleteBookings, isLoading: deletePermLoading } = useCan('delete:page.BookingsPage', scope);

  const bookingsQuery = useBookingsList(eventId, eventTimezone);
  const applicationsQuery = useApprovedApplicationsForBookingsQuery(eventId);
  const sessionsQuery = useActivitySessionsForBookingsQuery(eventId);

  const createMutation = useCreateBookingMutation();
  const cancelMutation = useCancelBookingMutation();
  const invalidateBookings = useInvalidateBookingsQueries();

  const retryBookings = useRetryRefetchHandler(bookingsQuery);

  const rawBookings = useMemo<BookingQueryRow[]>(() => bookingsQuery.data?.raw ?? [], [bookingsQuery.data]);

  const tableRows = useMemo<BookingTableRow[]>(
    () => bookingsQuery.data?.tableRows ?? [],
    [bookingsQuery.data]
  );

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
    for (const sessionItem of sessions) {
      const offeringName = sessionItem.offering?.name?.trim() || 'Offering';
      const existing = groups.get(offeringName);
      if (existing != null) {
        existing.sessions.push(sessionItem);
      } else {
        groups.set(offeringName, { offeringName, sessions: [sessionItem] });
      }
    }
    return [...groups.values()].sort((left, right) => left.offeringName.localeCompare(right.offeringName));
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
    const labels = [...new Set(tableRows.map((bookingRow) => bookingRow.session as string))].sort((a, b) =>
      a.localeCompare(b)
    );
    return labels.map((label) => ({ value: label, label }));
  }, [tableRows]);

  const offeringFilterOptions = useMemo(() => {
    const labels = [...new Set(tableRows.map((bookingRow) => bookingRow.offering as string))].sort((a, b) =>
      a.localeCompare(b)
    );
    return labels.map((label) => ({ value: label, label }));
  }, [tableRows]);

  const userId = user?.id ?? '';

  const runCreateBooking = useCallback(
    async (params: CreateBookingRpcParams) => {
      await createMutation.mutateAsync(params);
    },
    [createMutation]
  );

  const {
    closeOverride,
    onPromoteClick,
    onCancelClick,
    onOverrideConfirm,
    onCreateValidSubmit,
    onConfirmCancelBooking,
    onConfirmPromote,
    onOverrideDialogOpenChange,
  } = useBookingsPageBookingHandlers({
    userId,
    eventId,
    organisationId,
    eventTimezone,
    rawBookings,
    applicationsData: applicationsQuery.data,
    sessionsData: sessionsQuery.data,
    cancelTarget,
    promoteTarget,
    overrideIntent,
    overrideReason,
    runCreateBooking,
    cancelMutationMutateAsync: cancelMutation.mutateAsync,
    invalidateBookingsQueries: invalidateBookings,
    setBookOnBehalfOpen,
    setBookFormKey,
    setOverrideOpen,
    setOverrideReason,
    setOverrideIntent,
    setCancelTarget,
    setPromoteTarget,
  });

  const permLoading =
    readBookingsLoading || createPermLoading || updatePermLoading || deletePermLoading;

  const openBookingOnBehalf = useCallback(() => {
    setBookFormKey((k) => k + 1);
    setBookOnBehalfOpen(true);
  }, []);

  return {
    scope,
    secureSupabase,
    eventId,
    eventName,
    eventTimezone,
    canReadBookings,
    canCreateBookings,
    canUpdateBookings,
    canDeleteBookings,
    permLoading,
    bookingsQuery,
    applicationsQuery,
    sessionsQuery,
    tableRows,
    sessionsByOffering,
    retryBookings,
    bookOnBehalfOpen,
    setBookOnBehalfOpen,
    bookFormKey,
    offeringFilterOptions,
    sessionFilterOptions,
    statusFilterOptions,
    openBookingOnBehalf,
    overrideOpen,
    overrideIntent,
    overrideReason,
    setOverrideReason,
    closeOverride,
    onOverrideDialogOpenChange,
    onOverrideConfirm,
    onCreateValidSubmit,
    cancelTarget,
    setCancelTarget,
    promoteTarget,
    setPromoteTarget,
    onPromoteClick,
    onCancelClick,
    onConfirmCancelBooking,
    onConfirmPromote,
  };
}

export type BookingsPageController = ReturnType<typeof useBookingsPageController>;
