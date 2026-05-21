import type { BadgeVariant } from '@solvera/pace-core/components';

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
