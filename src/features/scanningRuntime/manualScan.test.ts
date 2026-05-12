import { describe, expect, it } from 'vitest';
import { buildQueueEntry } from './queue/scanQueueIdb';

describe('buildQueueEntry manual scan', () => {
  it('allows null card_identifier for accepted_override', () => {
    const e = buildQueueEntry({
      scanPointId: 'sp',
      cardIdentifier: null,
      scannedAt: 1,
      validationResult: 'accepted_override',
      validationReason: null,
      overrideBy: 'user-1',
      notes: null,
    });
    expect(e.card_identifier).toBeNull();
    expect(e.override_by).toBe('user-1');
    expect(e.validation_result).toBe('accepted_override');
  });
});
