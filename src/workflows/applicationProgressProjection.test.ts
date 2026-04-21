import { describe, expect, it } from 'vitest';
import { toParticipantProgressProjection } from './applicationProgressProjection';

describe('BA05b participant-safe application progress projection', () => {
  it('maps unresolved, resolved, and optional checks to participant-safe states', () => {
    const projection = toParticipantProgressProjection({
      application: {
        application_id: 'app-100',
        status: 'under_review',
      },
      checks: [
        {
          check_id: 'check-1',
          check_type: 'guardian_approval',
          required: true,
          resolved_at: null,
          token_hash: 'should-not-leak',
        },
        {
          check_id: 'check-2',
          check_type: 'home_leader_approval',
          required: true,
          resolved_at: '2026-04-01T00:00:00Z',
          reviewer_id: 'reviewer-1',
        },
        {
          check_id: 'check-3',
          check_type: 'designated_org_review',
          required: false,
        },
      ],
    });

    expect(projection).toEqual({
      application_id: 'app-100',
      status: 'under_review',
      checks: [
        { check_id: 'check-1', check_type: 'guardian_approval', state: 'pending' },
        { check_id: 'check-2', check_type: 'home_leader_approval', state: 'completed' },
        { check_id: 'check-3', check_type: 'designated_org_review', state: 'not_required' },
      ],
    });
  });

  it('does not expose token or privileged reviewer fields in projection output', () => {
    const projection = toParticipantProgressProjection({
      application: { application_id: 'app-200', status: 'approved' },
      checks: [
        {
          check_id: 'check-9',
          check_type: 'guardian_approval',
          required: true,
          resolved_at: null,
          token_hash: 'hidden-token',
          token_expires_at: '2026-05-01T00:00:00Z',
          reviewer_id: 'admin-user',
        },
      ],
    });

    const firstCheck = projection.checks[0] as unknown as Record<string, unknown>;
    expect('token_hash' in firstCheck).toBe(false);
    expect('token_expires_at' in firstCheck).toBe(false);
    expect('reviewer_id' in firstCheck).toBe(false);
  });
});
