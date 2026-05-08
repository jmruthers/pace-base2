import { describe, expect, it } from 'vitest';
import {
  EMPTY_COMMUNICATION_FILTERS,
  buildEventParticipantsPool,
  hasActiveCommunicationFilters,
} from './shared';

describe('communications shared helpers', () => {
  it('builds event participants pool filters from selected values', () => {
    expect(
      buildEventParticipantsPool('event-1', {
        registrationTypeIds: ['reg-1'],
        statuses: ['approved'],
        unitIds: ['unit-1'],
      })
    ).toEqual({
      type: 'event_participants',
      event_id: 'event-1',
      filters: {
        registration_type_ids: ['reg-1'],
        status: ['approved'],
        unit_ids: ['unit-1'],
      },
    });
  });

  it('treats empty filters as no constraints', () => {
    expect(buildEventParticipantsPool('event-1', EMPTY_COMMUNICATION_FILTERS)).toEqual({
      type: 'event_participants',
      event_id: 'event-1',
      filters: {
        registration_type_ids: undefined,
        status: undefined,
        unit_ids: undefined,
      },
    });
    expect(hasActiveCommunicationFilters(EMPTY_COMMUNICATION_FILTERS)).toBe(false);
    expect(
      hasActiveCommunicationFilters({
        ...EMPTY_COMMUNICATION_FILTERS,
        statuses: ['submitted'],
      })
    ).toBe(true);
  });
});
