import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast as paceToast } from '@solvera/pace-core/components';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { BookingOverrideIntent, CreateBookingOnBehalfFormValues } from '@/features/bookingOversight/bookOnBehalfForm';
import { resolveApplicationParticipantLabel, resolveSessionDisplay } from '@/features/bookingOversight/bookOnBehalfForm';
import {
  buildOverrideCreateConfirmationBody,
  buildOverrideCreateTitle,
  buildOverridePromoteCapacityConfirmationBody,
  getCreateBookingOverridePresetFromError,
  isBookingCapacityFullError,
} from '@/features/bookingOversight/bookingOverrideMessaging';
import type {
  ActivitySessionOptionRow,
  ApprovedApplicationOptionRow,
  BookingQueryRow,
  BookingTableRow,
} from '@/features/bookingOversight/types';
import {
  confirmedCountForSession,
  isBookingAlreadyCancelledError,
  isNonEmptyOverrideReason,
  isSessionAtCapacity,
} from '@/features/bookingOversight/rules';

export interface CreateBookingRpcParams {
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
}

interface CancelBookingMutateFn {
  (args: {
    p_booking_id: string;
    p_cancelled_by: string;
    p_source: string;
    p_reason: null;
    p_override_reason: null;
    p_override_by: null;
    p_override_at: null;
  }): Promise<unknown>;
}

export interface BookingsPageBookingHandlersDeps {
  userId: string;
  eventId: string | null;
  organisationId: string;
  eventTimezone: string | null;
  rawBookings: BookingQueryRow[];
  applicationsData: ApprovedApplicationOptionRow[] | undefined;
  sessionsData: ActivitySessionOptionRow[] | undefined;
  cancelTarget: BookingTableRow | null;
  promoteTarget: BookingTableRow | null;
  overrideIntent: BookingOverrideIntent | null;
  overrideReason: string;
  runCreateBooking: (params: CreateBookingRpcParams) => Promise<void>;
  cancelMutationMutateAsync: CancelBookingMutateFn;
  invalidateBookingsQueries: () => void;
  setBookOnBehalfOpen: Dispatch<SetStateAction<boolean>>;
  setBookFormKey: Dispatch<SetStateAction<number>>;
  setOverrideOpen: Dispatch<SetStateAction<boolean>>;
  setOverrideReason: Dispatch<SetStateAction<string>>;
  setOverrideIntent: Dispatch<SetStateAction<BookingOverrideIntent | null>>;
  setCancelTarget: Dispatch<SetStateAction<BookingTableRow | null>>;
  setPromoteTarget: Dispatch<SetStateAction<BookingTableRow | null>>;
}

export function useBookingsPageBookingHandlers(deps: BookingsPageBookingHandlersDeps) {
  const {
    userId,
    eventId,
    organisationId,
    eventTimezone,
    rawBookings,
    applicationsData,
    sessionsData,
    cancelTarget,
    promoteTarget,
    overrideIntent,
    overrideReason,
    runCreateBooking,
    cancelMutationMutateAsync,
    invalidateBookingsQueries,
    setBookOnBehalfOpen,
    setBookFormKey,
    setOverrideOpen,
    setOverrideReason,
    setOverrideIntent,
    setCancelTarget,
    setPromoteTarget,
  } = deps;

  const closeOverride = useCallback(() => {
    setOverrideOpen(false);
    setOverrideReason('');
    setOverrideIntent(null);
  }, [setOverrideIntent, setOverrideOpen, setOverrideReason]);

  const onPromoteClick = useCallback((row: BookingTableRow) => setPromoteTarget(row), [setPromoteTarget]);

  const onCancelClick = useCallback((row: BookingTableRow) => setCancelTarget(row), [setCancelTarget]);

  const onOverrideConfirm = useCallback(async () => {
    if (overrideIntent == null || userId.length === 0) {
      return;
    }
    const trimmed = overrideReason.trim();
    if (!isNonEmptyOverrideReason(trimmed)) {
      return;
    }
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
        paceToast({ title: 'Success', description: 'Booking created with override', variant: 'success' });
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
        paceToast({
          title: 'Success',
          description: 'Participant promoted to confirmed',
          variant: 'success',
        });
        closeOverride();
        setPromoteTarget(null);
      }
    } catch (error) {
      paceToast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  }, [
    closeOverride,
    overrideIntent,
    overrideReason,
    runCreateBooking,
    setBookFormKey,
    setBookOnBehalfOpen,
    setPromoteTarget,
    userId,
  ]);

  const onCreateValidSubmit = useCallback(
    async (values: CreateBookingOnBehalfFormValues) => {
      if (eventId == null || organisationId.length === 0 || userId.length === 0) {
        return;
      }

      const hasOverride = values.override_capacity || values.override_window || values.override_conflict;
      if (hasOverride) {
        const participantName = resolveApplicationParticipantLabel(applicationsData, values.application_id);
        const sessionLabel = resolveSessionDisplay(sessionsData, values.session_id, eventTimezone);
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
        paceToast({ title: 'Success', description: 'Booking created', variant: 'success' });
        setBookOnBehalfOpen(false);
        setBookFormKey((k) => k + 1);
      } catch (error) {
        const preset = getCreateBookingOverridePresetFromError(error);
        if (preset != null) {
          paceToast({
            title: 'Error',
            description: NormalizeSupabaseError(error).message,
            variant: 'destructive',
          });
          const participantName = resolveApplicationParticipantLabel(applicationsData, values.application_id);
          const sessionLabel = resolveSessionDisplay(sessionsData, values.session_id, eventTimezone);
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
        paceToast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
      }
    },
    [
      applicationsData,
      eventId,
      eventTimezone,
      organisationId,
      runCreateBooking,
      sessionsData,
      setBookFormKey,
      setBookOnBehalfOpen,
      setOverrideIntent,
      setOverrideOpen,
      setOverrideReason,
      userId,
    ]
  );

  const onConfirmCancelBooking = useCallback(async () => {
    if (cancelTarget == null || userId.length === 0) {
      return;
    }
    try {
      await cancelMutationMutateAsync({
        p_booking_id: cancelTarget.id,
        p_cancelled_by: userId,
        p_source: 'admin',
        p_reason: null,
        p_override_reason: null,
        p_override_by: null,
        p_override_at: null,
      });
      paceToast({ title: 'Success', description: 'Booking cancelled', variant: 'success' });
      setCancelTarget(null);
    } catch (error) {
      if (isBookingAlreadyCancelledError(error)) {
        paceToast({
          title: 'Error',
          description: 'This booking has already been cancelled.',
          variant: 'destructive',
        });
        setCancelTarget(null);
        invalidateBookingsQueries();
        return;
      }
      paceToast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  }, [cancelMutationMutateAsync, cancelTarget, invalidateBookingsQueries, setCancelTarget, userId]);

  const onConfirmPromote = useCallback(async () => {
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
      paceToast({
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
        paceToast({
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
      paceToast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  }, [
    eventId,
    organisationId,
    promoteTarget,
    rawBookings,
    runCreateBooking,
    setOverrideIntent,
    setOverrideOpen,
    setOverrideReason,
    setPromoteTarget,
    userId,
  ]);

  const onOverrideDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeOverride();
      }
    },
    [closeOverride]
  );

  return {
    closeOverride,
    onPromoteClick,
    onCancelClick,
    onOverrideConfirm,
    onCreateValidSubmit,
    onConfirmCancelBooking,
    onConfirmPromote,
    onOverrideDialogOpenChange,
  };
}
