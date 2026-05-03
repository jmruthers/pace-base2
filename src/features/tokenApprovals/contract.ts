export const BA07_TOKEN_ERROR_MESSAGES = {
  tokenRequired: 'Token is required',
  invalidOrExpiredResolve: 'Invalid or expired token',
  invalidExpiredOrUsedSubmit: 'Invalid, expired, or already used token',
  invalidOutcome: 'Outcome must be approve or reject',
  commentsRequiredForReject: 'Comments are required for reject',
} as const;

export interface ResolveTokenPayload {
  check_id: string;
  application_id: string;
  requirement_id: string;
  expires_at: string | null;
  check_type: string;
  event_title: string;
  registration_type_name: string;
  applicant_display_name: string;
}

export interface SubmitTokenPayload {
  check_id: string;
  previous_status: string;
  new_status: string;
}

export interface ReissueTokenPayload {
  check_id: string;
  token: string;
  token_expires_at: string;
}

const resolveTokenKeys = [
  'check_id',
  'application_id',
  'requirement_id',
  'expires_at',
  'check_type',
  'event_title',
  'registration_type_name',
  'applicant_display_name',
] as const;

const submitTokenKeys = ['check_id', 'previous_status', 'new_status'] as const;

const reissueTokenKeys = ['check_id', 'token', 'token_expires_at'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`Expected keys [${expected.join(', ')}] but received [${actual.join(', ')}]`);
  }
}

function assertStringField(value: Record<string, unknown>, field: string): string {
  const target = value[field];
  if (typeof target !== 'string' || target.trim().length === 0) {
    throw new Error(`Expected non-empty string for '${field}'`);
  }
  return target;
}

export function parseResolveTokenPayload(payload: unknown): ResolveTokenPayload {
  if (!isRecord(payload)) {
    throw new Error('Resolve payload must be an object');
  }
  assertExactKeys(payload, resolveTokenKeys);
  const expiresAt = payload.expires_at;
  if (expiresAt != null && typeof expiresAt !== 'string') {
    throw new Error("Expected 'expires_at' to be string or null");
  }
  return {
    check_id: assertStringField(payload, 'check_id'),
    application_id: assertStringField(payload, 'application_id'),
    requirement_id: assertStringField(payload, 'requirement_id'),
    expires_at: expiresAt,
    check_type: assertStringField(payload, 'check_type'),
    event_title: assertStringField(payload, 'event_title'),
    registration_type_name: assertStringField(payload, 'registration_type_name'),
    applicant_display_name: assertStringField(payload, 'applicant_display_name'),
  };
}

export function parseSubmitTokenPayload(payload: unknown): SubmitTokenPayload {
  if (!isRecord(payload)) {
    throw new Error('Submit payload must be an object');
  }
  assertExactKeys(payload, submitTokenKeys);
  return {
    check_id: assertStringField(payload, 'check_id'),
    previous_status: assertStringField(payload, 'previous_status'),
    new_status: assertStringField(payload, 'new_status'),
  };
}

export function parseReissueTokenPayload(payload: unknown): ReissueTokenPayload {
  if (!isRecord(payload)) {
    throw new Error('Reissue payload must be an object');
  }
  assertExactKeys(payload, reissueTokenKeys);
  return {
    check_id: assertStringField(payload, 'check_id'),
    token: assertStringField(payload, 'token'),
    token_expires_at: assertStringField(payload, 'token_expires_at'),
  };
}
