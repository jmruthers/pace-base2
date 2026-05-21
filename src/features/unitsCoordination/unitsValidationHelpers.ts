
export interface UnitValidationResult {
  valid: boolean;
  message: string | null;
}

export function validateUnitNumber(value: string): UnitValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Unit number is required.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'Unit number must be a positive integer.' };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { valid: false, message: 'Unit number must be a positive integer.' };
  }
  return { valid: true, message: null };
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRoleTitle(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
