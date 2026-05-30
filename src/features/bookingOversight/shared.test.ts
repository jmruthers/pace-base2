// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { bookingStatusBadgeProps, mapBookingToTableRow, participantDisplayName } from './display';
import { bookingSourceLabel } from './labels';
import {
  buildOverrideCreateConfirmationBody,
  buildOverrideCreateTitle,
  buildOverridePromoteCapacityConfirmationBody,
  getCreateBookingOverridePresetFromError,
  isBookingCapacityFullError,
} from './bookingOverrideMessaging';
import {
  isBookingAlreadyCancelledError,
  isNonEmptyOverrideReason,
  shouldShowCancelAction,
  shouldShowPromoteAction,
  confirmedCountForSession,
  isSessionAtCapacity,
} from './rules';
import {
  bookingCreateOnBehalfSchema,
  resolveApplicationParticipantLabel,
  resolveSessionDisplay,
} from './bookOnBehalfForm';
import type { BookingQueryRow } from './types';

describe('BA11 booking oversight display', () => {
  it('maps booking status to badge variants and labels', () => {
    expect(bookingStatusBadgeProps('confirmed')).toEqual({
      variant: 'solid-main-normal',
      label: 'Confirmed',
    });
    expect(bookingStatusBadgeProps('waitlisted')).toEqual({
      variant: 'outline-acc-muted',
      label: 'Waitlisted',
    });
    expect(bookingStatusBadgeProps('cancelled')).toEqual({
      variant: 'outline-sec-muted',
      label: 'Cancelled',
    });
  });

  it('maps participant display from person', () => {
    expect(
      participantDisplayName({
        preferred_name: 'Sam',
        first_name: 'S',
        last_name: 'L',
      })
    ).toBe('Sam');
  });

  it('maps query row to table row', () => {
    const row: BookingQueryRow = {
      id: 'b1',
      event_id: 'e1',
      organisation_id: 'o1',
      session_id: 's1',
      application_id: 'a1',
      status: 'confirmed',
      source: 'self',
      booked_at: '2026-05-01T10:00:00.000Z',
      cancelled_at: null,
      session: {
        id: 's1',
        session_name: 'Morn',
        start_time: '2026-05-01T09:00:00.000Z',
        end_time: null,
        capacity: 5,
        offering: { id: 'of1', name: 'Climb' },
      },
      application: {
        id: 'a1',
        person: { preferred_name: null, first_name: 'A', last_name: 'B' },
      },
    };
    const tr = mapBookingToTableRow(row, 'UTC');
    expect(tr.participant).toBe('A B');
    expect(tr.sourceLabel).toBe('Self');
  });
});

describe('BA11 booking oversight labels', () => {
  it('maps source values', () => {
    expect(bookingSourceLabel('self')).toBe('Self');
    expect(bookingSourceLabel('admin_assigned')).toBe('Admin assigned');
    expect(bookingSourceLabel('other')).toBe('other');
    expect(bookingSourceLabel(null)).toBe('');
  });
});

describe('BA11 booking oversight rules', () => {
  it('controls Promote visibility by waitlist status and update permission', () => {
    expect(shouldShowPromoteAction('waitlisted', true)).toBe(true);
    expect(shouldShowPromoteAction('waitlisted', false)).toBe(false);
    expect(shouldShowPromoteAction('confirmed', true)).toBe(false);
    expect(shouldShowPromoteAction('cancelled', true)).toBe(false);
  });

  it('controls Cancel visibility by status and delete permission', () => {
    expect(shouldShowCancelAction('confirmed', true)).toBe(true);
    expect(shouldShowCancelAction('waitlisted', true)).toBe(true);
    expect(shouldShowCancelAction('cancelled', true)).toBe(false);
    expect(shouldShowCancelAction('confirmed', false)).toBe(false);
  });

  it('requires non-whitespace override reason', () => {
    expect(isNonEmptyOverrideReason('')).toBe(false);
    expect(isNonEmptyOverrideReason('   ')).toBe(false);
    expect(isNonEmptyOverrideReason('x')).toBe(true);
  });

  it('builds override dialog titles for create flow', () => {
    expect(
      buildOverrideCreateTitle({
        overrideCapacity: true,
        overrideWindow: false,
        overrideConflict: false,
      })
    ).toBe('Override capacity limit and book');
    expect(
      buildOverrideCreateTitle({
        overrideCapacity: true,
        overrideWindow: true,
        overrideConflict: false,
      })
    ).toContain('capacity limit');
  });

  it('detects already-cancelled booking RPC errors', () => {
    expect(isBookingAlreadyCancelledError(new Error('base_booking_already_cancelled'))).toBe(true);
    expect(isBookingAlreadyCancelledError(new Error('other'))).toBe(false);
  });

  it('builds override confirmation body for create flow', () => {
    expect(
      buildOverrideCreateConfirmationBody({
        participantName: 'Sam Lee',
        sessionLabel: 'Morning — May 1',
        overrideCapacity: true,
        overrideWindow: false,
        overrideConflict: false,
      })
    ).toBe('Override capacity limit for Sam Lee in Morning — May 1?');
    expect(
      buildOverrideCreateConfirmationBody({
        participantName: 'Sam Lee',
        sessionLabel: 'Morning — May 1',
        overrideCapacity: true,
        overrideWindow: true,
        overrideConflict: false,
      })
    ).toContain('capacity limit');
    expect(
      buildOverrideCreateConfirmationBody({
        participantName: 'Sam Lee',
        sessionLabel: 'Morning — May 1',
        overrideCapacity: false,
        overrideWindow: false,
        overrideConflict: false,
      })
    ).toContain('this restriction');
  });

  it('builds promote capacity override confirmation body', () => {
    expect(buildOverridePromoteCapacityConfirmationBody('Sam Lee')).toBe(
      'Override the capacity limit and promote Sam Lee?'
    );
  });

  it('maps override-eligible create RPC errors to preset flags', () => {
    expect(
      getCreateBookingOverridePresetFromError(new Error('base_booking_capacity_full'))
    ).toEqual({
      override_capacity: true,
      override_window: false,
      override_conflict: false,
    });
    expect(
      getCreateBookingOverridePresetFromError(new Error('base_booking_window_closed'))
    ).toEqual({
      override_capacity: false,
      override_window: true,
      override_conflict: false,
    });
    expect(getCreateBookingOverridePresetFromError(new Error('base_booking_conflict'))).toEqual({
      override_capacity: false,
      override_window: false,
      override_conflict: true,
    });
    expect(getCreateBookingOverridePresetFromError(new Error('base_booking_duplicate'))).toBeNull();
  });

  it('detects capacity full RPC errors', () => {
    expect(isBookingCapacityFullError(new Error('base_booking_capacity_full'))).toBe(true);
    expect(isBookingCapacityFullError(new Error('other'))).toBe(false);
  });

  it('counts confirmed bookings per session', () => {
    const bookings: BookingQueryRow[] = [
      {
        id: 'b1',
        event_id: 'e1',
        organisation_id: 'o1',
        session_id: 's1',
        application_id: 'a1',
        status: 'confirmed',
        source: 'self',
        booked_at: '2026-05-01T10:00:00.000Z',
        cancelled_at: null,
        session: null,
        application: null,
      },
      {
        id: 'b2',
        event_id: 'e1',
        organisation_id: 'o1',
        session_id: 's1',
        application_id: 'a2',
        status: 'waitlisted',
        source: 'self',
        booked_at: '2026-05-01T10:00:00.000Z',
        cancelled_at: null,
        session: null,
        application: null,
      },
      {
        id: 'b3',
        event_id: 'e1',
        organisation_id: 'o1',
        session_id: 's2',
        application_id: 'a3',
        status: 'confirmed',
        source: 'self',
        booked_at: '2026-05-01T10:00:00.000Z',
        cancelled_at: null,
        session: null,
        application: null,
      },
    ];
    expect(confirmedCountForSession(bookings, 's1')).toBe(1);
    expect(confirmedCountForSession(bookings, 's2')).toBe(1);
    expect(confirmedCountForSession(bookings, 'missing')).toBe(0);
  });

  it('detects session at capacity with edge cases', () => {
    expect(isSessionAtCapacity(10, 10)).toBe(true);
    expect(isSessionAtCapacity(9, 10)).toBe(false);
    expect(isSessionAtCapacity(0, 0)).toBe(true);
    expect(isSessionAtCapacity(5, Number.NaN)).toBe(false);
    expect(isSessionAtCapacity(5, -1)).toBe(false);
  });
});

describe('BA11 book on behalf form', () => {
  it('rejects empty participant and session in schema', () => {
    const result = bookingCreateOnBehalfSchema.safeParse({
      application_id: '',
      session_id: '',
      override_capacity: false,
      override_window: false,
      override_conflict: false,
    });
    expect(result.success).toBe(false);
  });

  it('resolves participant and session labels with fallbacks', () => {
    expect(
      resolveApplicationParticipantLabel(
        [{ id: 'app-1', status: 'approved', person: { preferred_name: 'Sam', first_name: 'S', last_name: 'L' } }],
        'app-1'
      )
    ).toBe('Sam');
    expect(resolveApplicationParticipantLabel(undefined, 'app-missing')).toBe('app-missing');
    expect(
      resolveSessionDisplay(
        [
          {
            id: 'sess-1',
            session_name: 'Morning',
            start_time: '2026-05-01T09:00:00.000Z',
            end_time: null,
            capacity: 10,
            offering_id: 'off-1',
            offering: { id: 'off-1', name: 'Climb' },
          },
        ],
        'sess-1',
        'UTC'
      )
    ).toBe('Morning');
    expect(resolveSessionDisplay(undefined, 'sess-missing', null)).toBe('sess-missing');
  });
});
