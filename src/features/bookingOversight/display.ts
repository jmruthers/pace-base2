import type {
  BookingPersonSnippet,
  BookingQueryRow,
  BookingSessionSnippet,
  BookingTableRow,
} from './types';
import type { BookingStatusBadgeSpec } from './bookingRpcTypes';
import { bookingSourceLabel } from './labels';
import { formatDateTime, formatInTimeZone } from '@solvera/pace-core/utils';

export function participantDisplayName(person: BookingPersonSnippet | null | undefined): string {
  if (person == null) return '—';
  const preferred = person.preferred_name?.trim();
  if (preferred != null && preferred.length > 0) return preferred;
  const first = person.first_name?.trim() ?? '';
  const last = person.last_name?.trim() ?? '';
  const combined = `${first} ${last}`.trim();
  return combined.length > 0 ? combined : '—';
}

export function sessionDisplayLabel(
  session: BookingSessionSnippet | null | undefined,
  eventTimezone: string | null | undefined
): string {
  if (session == null) return '—';
  const name = session.session_name?.trim();
  if (name != null && name.length > 0) return name;
  if (eventTimezone != null && eventTimezone.length > 0) {
    try {
      return formatInTimeZone(session.start_time, eventTimezone, 'PPp');
    } catch (err: unknown) {
      void err;
      return formatDateTime(session.start_time);
    }
  }
  return formatDateTime(session.start_time);
}

export function mapBookingToTableRow(
  row: BookingQueryRow,
  eventTimezone: string | null | undefined
): BookingTableRow {
  const offeringName = row.session?.offering?.name?.trim() || '—';
  const offeringId = row.session?.offering?.id ?? '';
  const participant = participantDisplayName(row.application?.person ?? null);
  const sessionLabel = sessionDisplayLabel(row.session ?? null, eventTimezone);
  return {
    id: row.id,
    participant,
    offering: offeringName,
    session: sessionLabel,
    status: row.status,
    sourceLabel: bookingSourceLabel(row.source),
    booked_at: row.booked_at,
    session_id: row.session_id,
    offering_id: offeringId,
    application_id: row.application_id,
    organisation_id: row.organisation_id,
    _booking: row,
  };
}

export function bookingStatusBadgeProps(status: string): BookingStatusBadgeSpec {
  switch (status) {
    case 'confirmed':
      return { variant: 'solid-main-normal', label: 'Confirmed' };
    case 'waitlisted':
      return { variant: 'outline-acc-muted', label: 'Waitlisted' };
    case 'cancelled':
      return { variant: 'outline-sec-muted', label: 'Cancelled' };
    default:
      return { variant: 'outline-sec-muted', label: status };
  }
}
