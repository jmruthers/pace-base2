import type {
  ActivityOfferingRow,
  OfferingFormValues,
  SessionFormValues,
  TracActivityRow,
} from './types';

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseOptionalCost(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Cost must be a non-negative number.');
  }
  return parsed;
}

export function getOfferingSessionCount(offering: ActivityOfferingRow): number {
  const count = offering.sessions?.[0]?.count;
  return typeof count === 'number' ? count : 0;
}

export function isBookingOpenNow(offering: ActivityOfferingRow, nowIso: string = new Date().toISOString()): boolean {
  if (offering.booking_open_at == null || offering.booking_close_at == null) {
    return false;
  }
  return nowIso >= offering.booking_open_at && nowIso <= offering.booking_close_at;
}

export function filterTracActivitiesForEvent(
  activities: TracActivityRow[],
  selectedEventId: string
): TracActivityRow[] {
  return activities
    .filter((activity) => activity.event_id === selectedEventId)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function validateOfferingForm(values: OfferingFormValues): ValidationErrors {
  const errors: ValidationErrors = {};
  if (values.name.trim().length === 0) {
    errors.name = 'Offering name is required.';
  }

  if (values.booking_open_at != null && values.booking_close_at != null) {
    if (values.booking_close_at < values.booking_open_at) {
      errors.booking_close_at = 'Booking close time must be on or after booking open time.';
    }
  }

  if (values.cost.trim().length > 0) {
    const parsedCost = Number(values.cost);
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      errors.cost = 'Cost must be a non-negative number.';
    }
  }

  return errors;
}

export function validateSessionForm(values: SessionFormValues): ValidationErrors {
  const errors: ValidationErrors = {};

  if (values.start_time == null || values.start_time.length === 0) {
    errors.start_time = 'Start time is required.';
  }

  if (values.end_time == null || values.end_time.length === 0) {
    errors.end_time = 'End time is required.';
  }

  if (
    values.start_time != null &&
    values.start_time.length > 0 &&
    values.end_time != null &&
    values.end_time.length > 0 &&
    values.end_time <= values.start_time
  ) {
    errors.end_time = 'End time must be after start time.';
  }

  const parsedCapacity = Number(values.capacity);
  if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
    errors.capacity = 'Capacity must be a positive whole number.';
  }

  return errors;
}
