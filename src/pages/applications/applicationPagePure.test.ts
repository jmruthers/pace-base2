import { describe, expect, it } from 'vitest';
import {
  eventNameFromSelection,
  isOverrideAllowed,
  isReissueEligible,
  isTokenExpiryRelevant,
  isTransitionConflict,
} from './applicationPagePure';
import type { ApplicationCheckRow } from '@/features/applicationsAdmin/types';

function makeCheck(overrides: Partial<ApplicationCheckRow>): ApplicationCheckRow {
  return {
    id: 'check-1',
    status: 'pending',
    requirement_id: 'req-1',
    token_expires_at: null,
    actioned_at: null,
    notes: null,
    requirement: { check_type: 'guardian_approval', sort_order: 0, is_automated: false, config: null },
    ...overrides,
  };
}

describe('BA06 applicationPagePure', () => {
  it('detects transition conflict errors', () => {
    expect(
      isTransitionConflict(new Error('validation_error.application_status_transition_invalid'))
    ).toBe(true);
    expect(isTransitionConflict(new Error('Invalid status transition for application'))).toBe(true);
    expect(isTransitionConflict(new Error('other'))).toBe(false);
  });

  it('resolves event name from selection', () => {
    expect(eventNameFromSelection({ name: 'Camp One' })).toBe('Camp One');
    expect(eventNameFromSelection({ name: '   ' })).toBe('Selected event');
    expect(eventNameFromSelection(null)).toBe('Selected event');
  });

  it('allows reissue only for pending guardian or referee checks', () => {
    expect(isReissueEligible(makeCheck({ status: 'pending' }))).toBe(true);
    expect(
      isReissueEligible(
        makeCheck({
          status: 'pending',
          requirement: { check_type: 'referee', sort_order: 0, is_automated: false, config: null },
        })
      )
    ).toBe(true);
    expect(
      isReissueEligible(
        makeCheck({
          status: 'satisfied',
          requirement: { check_type: 'guardian_approval', sort_order: 0, is_automated: false, config: null },
        })
      )
    ).toBe(false);
    expect(
      isReissueEligible(
        makeCheck({
          status: 'pending',
          requirement: { check_type: 'payment', sort_order: 0, is_automated: true, config: null },
        })
      )
    ).toBe(false);
  });

  it('allows manual override only for submitted or under_review applications', () => {
    expect(isOverrideAllowed('submitted')).toBe(true);
    expect(isOverrideAllowed('under_review')).toBe(true);
    expect(isOverrideAllowed('approved')).toBe(false);
    expect(isOverrideAllowed('rejected')).toBe(false);
  });

  it('marks token expiry relevant for pending guardian and referee checks', () => {
    expect(isTokenExpiryRelevant(makeCheck({ status: 'pending' }))).toBe(true);
    expect(
      isTokenExpiryRelevant(
        makeCheck({
          status: 'satisfied',
          requirement: { check_type: 'guardian_approval', sort_order: 0, is_automated: false, config: null },
        })
      )
    ).toBe(false);
    expect(
      isTokenExpiryRelevant(
        makeCheck({
          status: 'pending',
          requirement: { check_type: 'event_approval', sort_order: 0, is_automated: false, config: null },
        })
      )
    ).toBe(false);
  });
});
