import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMMUNICATION_POOL_MODE,
  EMPTY_COMMUNICATION_FILTERS,
  buildManualPool,
  buildRecipientPool,
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

  it('builds a manual pool for specific participants', () => {
    expect(buildManualPool(['member-1', 'member-2'])).toEqual({
      type: 'manual',
      member_ids: ['member-1', 'member-2'],
    });
  });

  it('builds recipient pool descriptors based on mode', () => {
    expect(
      buildRecipientPool(
        'event-1',
        DEFAULT_COMMUNICATION_POOL_MODE,
        {
          registrationTypeIds: ['reg-1'],
          statuses: ['approved'],
          unitIds: [],
        },
        []
      )
    ).toEqual({
      type: 'event_participants',
      event_id: 'event-1',
      filters: {
        registration_type_ids: ['reg-1'],
        status: ['approved'],
        unit_ids: undefined,
      },
    });

    expect(
      buildRecipientPool(
        'event-1',
        'specific_participants',
        EMPTY_COMMUNICATION_FILTERS,
        ['member-9']
      )
    ).toEqual({
      type: 'manual',
      member_ids: ['member-9'],
    });
  });
});
