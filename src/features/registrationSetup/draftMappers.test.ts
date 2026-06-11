import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultRegistrationTypeDraft,
  createInitialSnapshots,
  createRequirementDraft,
  defaultEligibilityRuleType,
  mapEligibilityToDraft,
  mapRequirementsToDraft,
  mapTypeToDraft,
} from './draftMappers';
import type { RegistrationTypeRequirementRow, RegistrationTypeRow } from './types';

describe('BA04 draftMappers', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
  });

  it('createRequirementDraft sets guardian config and automated flag', () => {
    const draft = createRequirementDraft('guardian_approval', 0);

    expect(draft.check_type).toBe('guardian_approval');
    expect(draft.sort_order).toBe(0);
    expect(draft.is_automated).toBe(false);
    expect(draft.config).toEqual({ require_all_guardians: false });
    expect(draft.localId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('createRequirementDraft leaves null config for non-guardian types', () => {
    const payment = createRequirementDraft('payment', 1);
    expect(payment.config).toBeNull();
    expect(payment.is_automated).toBe(true);

    const review = createRequirementDraft('designated_org_review', 2);
    expect(review.config).toBeNull();
    expect(review.is_automated).toBe(false);
  });

  it('mapRequirementsToDraft preserves ids and sort order', () => {
    const rows: RegistrationTypeRequirementRow[] = [
      {
        id: 'req-1',
        check_type: 'guardian_approval',
        sort_order: 2,
        is_automated: false,
        config: { require_all_guardians: true },
      },
    ];

    const drafts = mapRequirementsToDraft(rows);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.id).toBe('req-1');
    expect(drafts[0]?.sort_order).toBe(2);
    expect(drafts[0]?.config).toEqual({ require_all_guardians: true });
  });

  it('mapTypeToDraft converts cost cents to dollars', () => {
    const row: RegistrationTypeRow = {
      id: 'type-1',
      name: 'Youth',
      description: 'Desc',
      eligibility_message: 'Eligible',
      cost: 1250,
      capacity: 40,
      is_active: true,
      sort_order: 1,
      pre_submission_checks: [],
      organisation_id: 'org-1',
      event_id: 'event-1',
      created_at: null,
    };

    const draft = mapTypeToDraft(row);
    expect(draft.name).toBe('Youth');
    expect(draft.costDollars).toBe('12.50');
    expect(draft.capacity).toBe('40');
    expect(draft.is_active).toBe(true);
  });

  it('mapEligibilityToDraft maps rule rows', () => {
    const drafts = mapEligibilityToDraft([
      {
        registration_type_id: 'type-1',
        rule_type: 'membership_type',
        value: '42',
      },
    ]);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.rule_type).toBe('membership_type');
    expect(drafts[0]?.value).toBe('42');
  });

  it('createDefaultRegistrationTypeDraft and snapshots start empty', () => {
    const draft = createDefaultRegistrationTypeDraft();
    expect(draft.name).toBe('');
    expect(draft.costDollars).toBe('0.00');
    expect(defaultEligibilityRuleType()).toBe('membership_type');
    expect(createInitialSnapshots()).toEqual({
      typeSnapshot: null,
      eligibilitySnapshot: [],
      requirementsSnapshot: [],
    });
  });
});
