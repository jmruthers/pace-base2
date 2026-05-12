/* eslint-disable pace-core-compliance/max-named-exports -- BA11 slice types colocated per Standard 1 */
import type { BadgeVariant } from '@solvera/pace-core/components';

export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface BookingPersonSnippet {
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface BookingOfferingSnippet {
  id: string;
  name: string;
}

export interface BookingSessionSnippet {
  id: string;
  session_name: string | null;
  start_time: string;
  end_time: string | null;
  capacity: number;
  offering: BookingOfferingSnippet | null;
}

export interface BookingApplicationSnippet {
  id: string;
  person: BookingPersonSnippet | null;
}

/** Row shape returned by the §7.1 booking list query (nested joins). */
export interface BookingQueryRow {
  id: string;
  event_id: string;
  organisation_id: string;
  session_id: string;
  application_id: string;
  status: BookingStatus;
  source: string;
  booked_at: string;
  cancelled_at: string | null;
  session: BookingSessionSnippet | null;
  application: BookingApplicationSnippet | null;
}

export interface ApprovedApplicationOptionRow {
  id: string;
  status: string;
  person: BookingPersonSnippet | null;
}

export interface ActivitySessionOptionRow {
  id: string;
  session_name: string | null;
  start_time: string;
  end_time: string | null;
  capacity: number;
  offering_id: string;
  offering: BookingOfferingSnippet | null;
}

/** Flattened row for DataTable (search/filter/sort). */
export interface BookingTableRow extends Record<string, unknown> {
  id: string;
  participant: string;
  offering: string;
  session: string;
  status: BookingStatus;
  sourceLabel: string;
  booked_at: string;
  session_id: string;
  offering_id: string;
  application_id: string;
  organisation_id: string;
  /** Original nested row for dialogs and capacity checks. */
  _booking: BookingQueryRow;
}

export interface BookingStatusBadgeSpec {
  variant: BadgeVariant;
  label: string;
}

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

export interface CancelBookingRpcParams {
  p_booking_id: string;
  p_cancelled_by: string;
  p_source: string;
  p_reason: null;
  p_override_reason: null;
  p_override_by: null;
  p_override_at: null;
}
