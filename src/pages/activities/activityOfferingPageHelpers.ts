import type { ActivitySessionRow, OfferingFormValues, SessionFormValues } from '@/features/activityOfferingSetup/types';

export const NONE_TRAC_ACTIVITY = '__none__';

export function eventIdFromOfferingSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'id' in selectedEvent) {
    const value = (selectedEvent as { id?: unknown }).id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function offeringEventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

export function toActivityOfferingDate(value: string | null): Date | null {
  if (value == null || value.length === 0) {
    return null;
  }
  return new Date(value);
}

export function formatOfferingCostDisplay(value: number | null): string {
  if (value == null) {
    return '—';
  }
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

export function buildOfferingFormValues(offering: {
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

export function buildDefaultActivitySessionValues(): SessionFormValues {
  return {
    session_name: '',
    start_time: null,
    end_time: null,
    location_display_name: '',
    capacity: '',
  };
}

export function buildActivitySessionValues(row: ActivitySessionRow): SessionFormValues {
  return {
    session_name: row.session_name ?? '',
    start_time: row.start_time,
    end_time: row.end_time,
    location_display_name: row.location_display_name ?? '',
    capacity: String(row.capacity),
  };
}
