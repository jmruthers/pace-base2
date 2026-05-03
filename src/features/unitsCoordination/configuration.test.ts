import { describe, expect, it } from 'vitest';
import {
  buildSubmitPreferencesRpcArgs,
  requireActorUserId,
  withCreatedAndUpdatedBy,
  withUpdatedBy,
} from './configuration';

describe('unitsCoordination configuration payload helpers', () => {
  it('requires a valid authenticated actor id', () => {
    expect(requireActorUserId({ id: 'user-1' })).toBe('user-1');
    expect(() => requireActorUserId({ id: null })).toThrow('Authenticated user is required for this action.');
    expect(() => requireActorUserId(null)).toThrow('Authenticated user is required for this action.');
  });

  it('adds created_by and updated_by to insert payloads', () => {
    const payload = withCreatedAndUpdatedBy(
      {
        unit_id: 'unit-1',
        event_id: 'event-1',
      },
      'user-1'
    );

    expect(payload).toEqual({
      unit_id: 'unit-1',
      event_id: 'event-1',
      created_by: 'user-1',
      updated_by: 'user-1',
    });
  });

  it('adds updated_by to update payloads', () => {
    const payload = withUpdatedBy({ rank: 2 }, 'user-2');
    expect(payload).toEqual({ rank: 2, updated_by: 'user-2' });
  });

  it('builds submit rpc arguments with BA08 contract keys', () => {
    const args = buildSubmitPreferencesRpcArgs({
      unitId: 'unit-123',
      eventId: 'event-456',
    });

    expect(args).toEqual({
      p_unit_id: 'unit-123',
      p_event_id: 'event-456',
    });
  });
});
