import { z } from '@solvera/pace-core/utils';
import type { AddressValue } from '@solvera/pace-core/forms';
import type {
  EventConfigurationFormValues,
  EventConfigurationRecord,
  EventLike,
} from './types';

export const eventConfigurationSchema = z.object({
  event_name: z.string().trim().min(1, 'Event name is required').max(255, 'Event name cannot exceed 255 characters'),
  event_code: z
    .union([
      z
        .string()
        .trim()
        .max(50, 'Event code cannot exceed 50 characters')
        .regex(/^[A-Z0-9-]+$/, 'Event code can only contain uppercase letters, numbers, and hyphens'),
      z.literal(''),
      z.null(),
    ])
    .transform((value) => (value == null || value === '' ? null : value)),
  event_email: z
    .union([
      z.string().trim().email('Event email must be a valid email address').max(254, 'Event email cannot exceed 254 characters'),
      z.literal(''),
      z.null(),
    ])
    .transform((value) => (value == null || value === '' ? null : value)),
  event_date: z.date().nullable(),
  event_days: z
    .number()
    .int('Event days must be a whole number')
    .min(1, 'Event days must be at least 1')
    .max(365, 'Event days cannot exceed 365'),
  event_venue: z.any().optional() as z.ZodType<AddressValue | undefined>,
  expected_participants: z
    .number()
    .int('Expected participants must be a whole number')
    .min(0, 'Participants cannot be negative'),
  typical_unit_size: z
    .number()
    .int('Typical unit size must be a whole number')
    .min(0, 'Typical unit size cannot be negative'),
  description: z
    .union([z.string().max(5000, 'Description cannot exceed 5000 characters'), z.literal(''), z.null()])
    .transform((value) => (value == null || value === '' ? null : value)),
  registration_scope: z
    .preprocess(
      (value) => (value == null || value === '' ? null : value),
      z.enum(['org_only', 'hierarchy', 'open']).nullable()
    )
    .refine((value): value is 'org_only' | 'hierarchy' | 'open' => value != null, {
      message: 'Registration scope is required',
    }),
  is_visible: z.boolean(),
  event_colours: z
    .union([z.string().max(5000, 'Event Colours JSON exceeds maximum length of 5000 characters'), z.literal(''), z.null()])
    .transform((value) => (value == null || value === '' ? null : value)),
});

export type EventConfigurationSchema = z.infer<typeof eventConfigurationSchema>;

export function normaliseOptionalString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toEventDateIso(value: Date | null): string | null {
  if (value == null) {
    return null;
  }
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString();
}

export function serialiseAddressToVenue(value: AddressValue | undefined): string | null {
  return value?.formattedAddress?.trim() ? value.formattedAddress : null;
}

export function parseEventColours(value: string | null): unknown {
  if (value == null || value.trim() === '') {
    return null;
  }
  if (value.length > 5000) {
    throw new Error('Event Colours JSON exceeds maximum length of 5000 characters');
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
    throw new Error(`Invalid JSON in Event Colours field: ${message}`);
  }
}

export function formatEventLogoFallback(eventName: string | null | undefined): string {
  if (eventName == null || eventName.trim() === '') {
    return 'EV';
  }

  const tokens = eventName.split(/[\s\-_]+/).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return 'EV';
  }

  return tokens
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3);
}

export function computeEventEndDate(startDate: string | null | undefined, eventDays: number | null | undefined) {
  if (startDate == null) {
    return null;
  }
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const days = Math.max(eventDays ?? 1, 1);
  const offset = days - 1;
  const endDate = new Date(parsed);
  endDate.setUTCDate(endDate.getUTCDate() + offset);
  return endDate;
}

export function mapRecordToFormValues(record: EventConfigurationRecord): EventConfigurationFormValues {
  const eventDate = record.event_date ? new Date(record.event_date) : null;
  return {
    event_name: record.event_name ?? '',
    event_code: record.event_code ?? null,
    event_email: record.event_email ?? null,
    event_date: Number.isNaN(eventDate?.getTime() ?? 0) ? null : eventDate,
    event_days: record.event_days ?? 1,
    event_venue: undefined,
    expected_participants: record.expected_participants ?? 0,
    typical_unit_size: record.typical_unit_size ?? 0,
    description: record.description ?? null,
    registration_scope: record.registration_scope ?? null,
    is_visible: record.is_visible ?? true,
    event_colours: record.event_colours == null ? null : JSON.stringify(record.event_colours, null, 2),
  };
}

export function eventNameFromSelection(selectedEvent: EventLike | null): string {
  return typeof selectedEvent?.event_name === 'string' ? selectedEvent.event_name : 'Event';
}
