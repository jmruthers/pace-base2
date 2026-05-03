import { describe, expect, it, vi } from 'vitest';
import { buildEventConfigurationUpdatePayload } from './configuration';
import type { EventConfigurationFormValues } from './types';

describe('event configuration payload', () => {
  it('builds payload with required transforms and excludes out-of-scope columns', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'));

    const values: EventConfigurationFormValues = {
      event_name: '  Sample Event  ',
      event_code: 'ABC-123',
      event_email: 'event@example.com',
      event_date: new Date(2026, 4, 12, 18, 23, 0),
      event_days: 2,
      event_venue: {
        line1: '1 Main St',
        locality: 'Town',
        countryCode: 'AU',
        formattedAddress: '1 Main St, Town',
      },
      expected_participants: 100,
      typical_unit_size: 6,
      description: 'Event description',
      registration_scope: 'hierarchy',
      is_visible: true,
      event_colours: '{"primary":"#000000"}',
    };

    const payload = buildEventConfigurationUpdatePayload({
      eventId: 'evt-1',
      userId: 'user-1',
      values,
    });

    expect(payload.event_name).toBe('Sample Event');
    expect(payload.event_date).toBe('2026-05-12T00:00:00.000Z');
    expect(payload.event_venue).toBe('1 Main St, Town');
    expect(payload.updated_by).toBe('user-1');
    expect(payload.updated_at).toBe('2026-05-01T10:00:00.000Z');
    expect(payload.event_colours).toEqual({ primary: '#000000' });
    expect('event_id' in payload).toBe(false);
    expect('organisation_id' in payload).toBe(false);
    expect('created_at' in payload).toBe(false);
    expect('participant_blurb' in payload).toBe(false);

    vi.useRealTimers();
  });
});
