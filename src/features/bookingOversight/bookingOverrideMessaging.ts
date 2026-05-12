/** §5 / §7.2 — override dialog copy and preset flags from RPC errors. */

export function rpcErrorMessageText(error: unknown): string {
  if (
    error != null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return String(error ?? '');
}

function overrideCreateConstraintParts(params: {
  overrideCapacity: boolean;
  overrideWindow: boolean;
  overrideConflict: boolean;
}): string[] {
  const parts: string[] = [];
  if (params.overrideCapacity) parts.push('capacity limit');
  if (params.overrideWindow) parts.push('booking window');
  if (params.overrideConflict) parts.push('session conflict');
  return parts;
}

export function buildOverrideCreateTitle(params: {
  overrideCapacity: boolean;
  overrideWindow: boolean;
  overrideConflict: boolean;
}): string {
  const parts = overrideCreateConstraintParts(params);
  if (parts.length === 0) return 'Override and book';
  if (parts.length === 1) {
    return `Override ${parts[0] ?? ''} and book`;
  }
  return `Override ${parts.join(', ')} and book`;
}

/** §5 confirmation-table body for create-on-behalf override. */
export function buildOverrideCreateConfirmationBody(params: {
  participantName: string;
  sessionLabel: string;
  overrideCapacity: boolean;
  overrideWindow: boolean;
  overrideConflict: boolean;
}): string {
  const parts = overrideCreateConstraintParts({
    overrideCapacity: params.overrideCapacity,
    overrideWindow: params.overrideWindow,
    overrideConflict: params.overrideConflict,
  });
  const constraintList =
    parts.length === 0 ? 'this restriction' : parts.length === 1 ? (parts[0] ?? '') : parts.join(', ');
  return `Override ${constraintList} for ${params.participantName} in ${params.sessionLabel}?`;
}

/** §5 confirmation-table body for promote + capacity override. */
export function buildOverridePromoteCapacityConfirmationBody(participantName: string): string {
  return `Override the capacity limit and promote ${participantName}?`;
}

/**
 * §7.2 — When create is rejected with an override-eligible code, map to the preset flags
 * for a guided override retry (client-side confirmation still required).
 */
export function getCreateBookingOverridePresetFromError(error: unknown): {
  override_capacity: boolean;
  override_window: boolean;
  override_conflict: boolean;
} | null {
  const text = rpcErrorMessageText(error);
  if (text.includes('base_booking_capacity_full')) {
    return { override_capacity: true, override_window: false, override_conflict: false };
  }
  if (text.includes('base_booking_window_closed')) {
    return { override_capacity: false, override_window: true, override_conflict: false };
  }
  if (text.includes('base_booking_conflict')) {
    return { override_capacity: false, override_window: false, override_conflict: true };
  }
  return null;
}

export function isBookingCapacityFullError(error: unknown): boolean {
  return rpcErrorMessageText(error).includes('base_booking_capacity_full');
}
