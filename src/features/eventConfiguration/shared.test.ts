import { describe, expect, it } from 'vitest';
import {
  computeEventEndDate,
  eventConfigurationSchema,
  formatEventLogoFallback,
  mapRecordToFormValues,
  parseEventColours,
  serialiseAddressToVenue,
  toEventDateIso,
} from './shared';

describe('event configuration shared helpers', () => {
  it('computes end date from start date and days', () => {
    const endDate = computeEventEndDate('2026-04-05T00:00:00.000Z', 3);
    expect(endDate?.toISOString()).toBe('2026-04-07T00:00:00.000Z');
  });

  it('returns null end date when start date is absent', () => {
    expect(computeEventEndDate(null, 5)).toBeNull();
  });

  it('formats logo fallback abbreviation from event name', () => {
    expect(formatEventLogoFallback('Awesome Event 2026')).toBe('AE2');
    expect(formatEventLogoFallback('')).toBe('EV');
  });

  it('serialises address venue from formattedAddress only', () => {
    expect(serialiseAddressToVenue(undefined)).toBeNull();
    expect(
      serialiseAddressToVenue({
        line1: '1 Main St',
        locality: 'Town',
        countryCode: 'AU',
        formattedAddress: '1 Main St, Town',
      })
    ).toBe('1 Main St, Town');
  });

  it('normalises date value to midnight UTC ISO', () => {
    const iso = toEventDateIso(new Date(2026, 7, 20, 15, 22, 0));
    expect(iso).toBe('2026-08-20T00:00:00.000Z');
  });

  it('parses valid colours JSON and rejects invalid JSON', () => {
    expect(parseEventColours('{"primary":"#000000"}')).toEqual({ primary: '#000000' });
    expect(() => parseEventColours('{invalid json}')).toThrow('Invalid JSON in Event Colours field');
  });

  it('requires event name and registration scope', () => {
    const result = eventConfigurationSchema.safeParse({
      event_name: '',
      event_code: null,
      event_email: null,
      event_date: null,
      event_days: 1,
      event_venue: undefined,
      expected_participants: 0,
      typical_unit_size: 0,
      description: null,
      registration_scope: null,
      is_visible: true,
      event_colours: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain('Event name is required');
      expect(messages).toContain('Registration scope is required');
    }
  });

  it('hydrates venue text into formattedAddress for form defaults', () => {
    const values = mapRecordToFormValues({
      event_id: 'event-1',
      event_name: 'Camp',
      event_code: null,
      event_email: null,
      event_date: null,
      event_days: 1,
      event_venue: 'Main Hall',
      expected_participants: 0,
      typical_unit_size: 0,
      event_colours: null,
      is_visible: true,
      organisation_id: 'org-1',
      description: null,
      registration_scope: 'org_only',
      created_at: null,
      created_by: null,
      updated_at: null,
      updated_by: null,
    });

    expect(values.event_venue?.formattedAddress).toBe('Main Hall');
  });
});
