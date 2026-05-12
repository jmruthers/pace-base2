import type { RuntimeRejectionReason } from './types';

export function rejectionLabel(reason: RuntimeRejectionReason): string {
  switch (reason) {
    case 'card_not_recognised':
      return 'Card not recognised';
    case 'card_not_valid':
      return 'Card inactive';
    case 'registration_not_valid':
      return 'Registration not valid';
    case 'booking_not_valid':
      return 'Booking not valid';
    case 'duplicate_scan':
      return 'Duplicate scan';
    default:
      return 'Rejected';
  }
}

export function rejectionDescription(reason: RuntimeRejectionReason): string {
  switch (reason) {
    case 'card_not_recognised':
      return 'Card not recognised. No PACE identity matches this card identifier.';
    case 'card_not_valid':
      return 'Card inactive. This card exists but has been deactivated.';
    case 'registration_not_valid':
      return 'Registration not valid. No approved registration found for this participant at this event.';
    case 'booking_not_valid':
      return 'Booking not valid. No confirmed booking for this participant at this scan point.';
    case 'duplicate_scan':
      return 'Duplicate scan. This card has already been scanned at this point.';
    default:
      return 'Scan could not be validated.';
  }
}

export function acceptedBodyText(): string {
  return 'Card accepted. Participant entry recorded.';
}

export function overrideBodyText(): string {
  return 'Override recorded. Participant entry accepted by override.';
}

export function isOverridableRejection(reason: RuntimeRejectionReason): boolean {
  return (
    reason === 'card_not_valid' ||
    reason === 'registration_not_valid' ||
    reason === 'booking_not_valid'
  );
}

export function directionBadgeLabel(direction: string): string {
  const d = direction.toLowerCase();
  if (d === 'in') {
    return 'In';
  }
  if (d === 'out') {
    return 'Out';
  }
  if (d === 'both') {
    return 'Both';
  }
  if (d === 'neutral') {
    return 'Neutral';
  }
  return 'Neutral';
}
