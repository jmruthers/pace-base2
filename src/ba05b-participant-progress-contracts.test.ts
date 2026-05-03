import { describe, expect, it } from 'vitest';

type CheckType =
  | 'payment'
  | 'guardian_approval'
  | 'home_leader_approval'
  | 'referee'
  | 'designated_org_review'
  | 'event_approval';

type CheckStatus = 'pending' | 'satisfied' | 'failed' | 'waived';

type ProgressCheck = {
  id: string;
  requirement_id: string;
  sort_order: number;
  check_type: CheckType;
  participant_check_label: string;
  status: CheckStatus;
};

type ProgressPayload = {
  application: {
    id: string;
    event_id: string;
    organisation_id: string;
    person_id: string;
    registration_type_id: string;
    form_id: string | null;
    referee_name: string | null;
    status: string;
    submitted_at: string | null;
  };
  registration_type: {
    id: string;
    name: string;
    description: string | null;
  };
  checks: ProgressCheck[];
};

const FORBIDDEN_KEYS = new Set([
  'token_hash',
  'token_expires_at',
  'actioned_by',
  'actioned_at',
  'notes',
  'carer_person_id',
  'referee_person_id',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'status_updated_at',
  'status_updated_by',
]);

const EXPECTED_APP_KEYS = [
  'id',
  'event_id',
  'organisation_id',
  'person_id',
  'registration_type_id',
  'form_id',
  'referee_name',
  'status',
  'submitted_at',
] as const;

const EXPECTED_REGISTRATION_TYPE_KEYS = ['id', 'name', 'description'] as const;

const EXPECTED_CHECK_KEYS = [
  'id',
  'requirement_id',
  'sort_order',
  'check_type',
  'participant_check_label',
  'status',
] as const;

const CHECK_LABEL_BY_TYPE: Record<CheckType, string> = {
  payment: 'Payment',
  guardian_approval: 'Guardian approval',
  home_leader_approval: 'Home leader approval',
  referee: 'Referee approval',
  designated_org_review: 'Organisation review',
  event_approval: 'Event approval',
};

const ALLOWED_STATUSES = new Set<CheckStatus>(['pending', 'satisfied', 'failed', 'waived']);

function assertExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): void {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  expect(actualKeys).toEqual(sortedExpectedKeys);
}

function assertNoForbiddenKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertNoForbiddenKeys(entry);
    }
    return;
  }

  if (value != null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(`Forbidden key in BA05b payload: ${key}`);
      }
      assertNoForbiddenKeys(record[key]);
    }
  }
}

function assertChecksOrderingAndLabelMapping(checks: ProgressCheck[]): void {
  let previousSortOrder: number | null = null;
  for (const check of checks) {
    if (previousSortOrder != null) {
      expect(check.sort_order).toBeGreaterThanOrEqual(previousSortOrder);
    }
    previousSortOrder = check.sort_order;

    expect(ALLOWED_STATUSES.has(check.status)).toBe(true);
    expect(check.participant_check_label).toBe(CHECK_LABEL_BY_TYPE[check.check_type]);
  }
}

function assertProgressPayloadContract(payload: ProgressPayload): void {
  const topLevel = payload as unknown as Record<string, unknown>;
  assertExactKeys(topLevel, ['application', 'registration_type', 'checks']);

  assertExactKeys(payload.application as unknown as Record<string, unknown>, EXPECTED_APP_KEYS);
  assertExactKeys(
    payload.registration_type as unknown as Record<string, unknown>,
    EXPECTED_REGISTRATION_TYPE_KEYS
  );

  for (const check of payload.checks) {
    assertExactKeys(check as unknown as Record<string, unknown>, EXPECTED_CHECK_KEYS);
  }

  assertChecksOrderingAndLabelMapping(payload.checks);
  assertNoForbiddenKeys(payload);
}

function mapProgressRpcError(errorMessage: string): 'access_denied' | 'unknown_error' {
  if (errorMessage === 'base_application_access_denied') {
    return 'access_denied';
  }
  return 'unknown_error';
}

function createValidPayload(): ProgressPayload {
  return {
    application: {
      id: 'application-1',
      event_id: 'event-1',
      organisation_id: 'org-1',
      person_id: 'person-1',
      registration_type_id: 'registration-type-1',
      form_id: null,
      referee_name: 'Casey Referee',
      status: 'under_review',
      submitted_at: '2026-05-03T10:00:00.000Z',
    },
    registration_type: {
      id: 'registration-type-1',
      name: 'Standard registration',
      description: null,
    },
    checks: [
      {
        id: 'check-1',
        requirement_id: 'req-1',
        sort_order: 1,
        check_type: 'payment',
        participant_check_label: 'Payment',
        status: 'pending',
      },
      {
        id: 'check-2',
        requirement_id: 'req-2',
        sort_order: 2,
        check_type: 'guardian_approval',
        participant_check_label: 'Guardian approval',
        status: 'satisfied',
      },
    ],
  };
}

describe('BA05b participant progress contracts', () => {
  it('accepts positive applicant payload that matches the BA05b contract', () => {
    const payload = createValidPayload();
    expect(() => assertProgressPayloadContract(payload)).not.toThrow();
  });

  it('maps denied non-applicant read to access denied contract state', () => {
    expect(mapProgressRpcError('base_application_access_denied')).toBe('access_denied');
    expect(mapProgressRpcError('some_other_error')).toBe('unknown_error');
  });

  it('rejects payloads that include excluded keys', () => {
    const payload = createValidPayload() as ProgressPayload & {
      application: ProgressPayload['application'] & { referee_person_id: string };
    };
    payload.application.referee_person_id = 'should-not-be-exposed';

    expect(() => assertNoForbiddenKeys(payload as ProgressPayload)).toThrow(
      'Forbidden key in BA05b payload: referee_person_id'
    );
  });

  it('enforces checks ordering and check_type label mapping', () => {
    const payload = createValidPayload();
    payload.checks = [
      {
        ...payload.checks[0],
        sort_order: 2,
      },
      {
        ...payload.checks[1],
        sort_order: 1,
        participant_check_label: 'Wrong label',
      },
    ];

    expect(() => assertProgressPayloadContract(payload)).toThrow();
  });
});
