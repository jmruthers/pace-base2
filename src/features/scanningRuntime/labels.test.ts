import { describe, expect, it } from 'vitest';
import {
  isOverridableRejection,
  rejectionDescription,
  rejectionLabel,
} from './labels';

describe('BA13 scanningRuntime labels', () => {
  it('allows override for card, registration, and booking rejections only', () => {
    expect(isOverridableRejection('card_not_valid')).toBe(true);
    expect(isOverridableRejection('registration_not_valid')).toBe(true);
    expect(isOverridableRejection('booking_not_valid')).toBe(true);
    expect(isOverridableRejection('duplicate_scan')).toBe(false);
    expect(isOverridableRejection('card_not_recognised')).toBe(false);
  });

  it('maps known rejection labels', () => {
    expect(rejectionLabel('duplicate_scan')).toBe('Duplicate scan');
    expect(rejectionLabel('booking_not_valid')).toBe('Booking not valid');
  });

  it('falls back for unknown rejection reasons', () => {
    expect(rejectionLabel('unknown_reason' as never)).toBe('Rejected');
    expect(rejectionDescription('unknown_reason' as never)).toBe('Scan could not be validated.');
  });
});
