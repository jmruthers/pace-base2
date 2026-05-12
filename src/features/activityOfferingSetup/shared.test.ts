import { describe, expect, it } from 'vitest';
import {
  filterTracActivitiesForEvent,
  validateOfferingForm,
  validateSessionForm,
} from './shared';
import type { OfferingFormValues, SessionFormValues } from './types';

function buildOfferingValues(overrides: Partial<OfferingFormValues> = {}): OfferingFormValues {
  return {
    name: 'Rock Climbing',
    trac_activity_id: null,
    booking_open_at: null,
    booking_close_at: null,
    cost: '',
    payment_due_at: null,
    allow_waitlist: false,
    ...overrides,
  };
}

function buildSessionValues(overrides: Partial<SessionFormValues> = {}): SessionFormValues {
  return {
    session_name: 'Morning',
    start_time: '2026-05-12T08:00:00.000Z',
    end_time: '2026-05-12T09:00:00.000Z',
    location_display_name: '',
    capacity: '10',
    ...overrides,
  };
}

describe('BA09 validators', () => {
  it('BR-NAME-REQUIRED enforces non-empty trimmed names', () => {
    expect(validateOfferingForm(buildOfferingValues({ name: '' })).name).toBe('Offering name is required.');
    expect(validateOfferingForm(buildOfferingValues({ name: '   ' })).name).toBe('Offering name is required.');
    expect(validateOfferingForm(buildOfferingValues({ name: '  Canoe  ' })).name).toBeUndefined();
    expect(validateOfferingForm(buildOfferingValues({ name: 'Canoe' })).name).toBeUndefined();
  });

  it('BR-BW validates booking window ordering and null permissiveness', () => {
    expect(
      validateOfferingForm(
        buildOfferingValues({
          booking_open_at: '2026-05-12T10:00:00.000Z',
          booking_close_at: '2026-05-12T09:00:00.000Z',
        })
      ).booking_close_at
    ).toBe('Booking close time must be on or after booking open time.');

    expect(
      validateOfferingForm(
        buildOfferingValues({
          booking_open_at: '2026-05-12T10:00:00.000Z',
          booking_close_at: '2026-05-12T10:00:00.000Z',
        })
      ).booking_close_at
    ).toBeUndefined();

    expect(
      validateOfferingForm(
        buildOfferingValues({
          booking_open_at: '2026-05-12T10:00:00.000Z',
          booking_close_at: '2026-05-12T11:00:00.000Z',
        })
      ).booking_close_at
    ).toBeUndefined();

    expect(
      validateOfferingForm(
        buildOfferingValues({
          booking_open_at: null,
          booking_close_at: '2026-05-12T11:00:00.000Z',
        })
      ).booking_close_at
    ).toBeUndefined();
  });

  it('BR-SO validates session time ordering including equal timestamps', () => {
    expect(
      validateSessionForm(
        buildSessionValues({
          start_time: '2026-05-12T08:00:00.000Z',
          end_time: '2026-05-12T08:00:00.000Z',
        })
      ).end_time
    ).toBe('End time must be after start time.');

    expect(
      validateSessionForm(
        buildSessionValues({
          start_time: '2026-05-12T08:00:00.000Z',
          end_time: '2026-05-12T07:59:00.000Z',
        })
      ).end_time
    ).toBe('End time must be after start time.');

    expect(
      validateSessionForm(
        buildSessionValues({
          start_time: '2026-05-12T08:00:00.000Z',
          end_time: '2026-05-12T08:01:00.000Z',
        })
      ).end_time
    ).toBeUndefined();

    expect(
      validateSessionForm(
        buildSessionValues({
          start_time: '2026-05-12T08:30:00.000Z',
          end_time: '2026-05-12T08:31:00.000Z',
        })
      ).end_time
    ).toBeUndefined();
  });

  it('BR-CAP enforces positive whole-number capacity', () => {
    expect(validateSessionForm(buildSessionValues({ capacity: '10' })).capacity).toBeUndefined();
    expect(validateSessionForm(buildSessionValues({ capacity: '0' })).capacity).toBe(
      'Capacity must be a positive whole number.'
    );
    expect(validateSessionForm(buildSessionValues({ capacity: '-2' })).capacity).toBe(
      'Capacity must be a positive whole number.'
    );
    expect(validateSessionForm(buildSessionValues({ capacity: '1.5' })).capacity).toBe(
      'Capacity must be a positive whole number.'
    );
  });
});

describe('BA09 TRAC activity scoping', () => {
  it('filters TRAC selector options by selected event id', () => {
    const scoped = filterTracActivitiesForEvent(
      [
        { id: 'a-1', name: 'Kayak', event_id: 'event-1' },
        { id: 'a-2', name: 'Archery', event_id: 'event-2' },
        { id: 'a-3', name: 'Abseil', event_id: 'event-1' },
      ],
      'event-1'
    );

    expect(scoped.map((item) => item.id)).toEqual(['a-3', 'a-1']);
    expect(scoped.every((item) => item.event_id === 'event-1')).toBe(true);
  });
});
