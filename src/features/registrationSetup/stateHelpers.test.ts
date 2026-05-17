import { describe, expect, it } from 'vitest';
import { createInitialSnapshots } from './draftMappers';
import {
  buildUpsertPayloadForRequirementsSave,
  buildUpsertPayloadForTypeSave,
  reorderRequirementDrafts,
  validateRegistrationTypeDraft,
  validateRequirementDrafts,
} from './stateHelpers';
import type {
  EligibilityRuleDraft,
  RegistrationSnapshots,
  RegistrationTypeDraft,
  RequirementRuleDraft,
} from './types';

function createDraft(overrides: Partial<RegistrationTypeDraft> = {}): RegistrationTypeDraft {
  return {
    id: 'type-1',
    name: 'Youth',
    description: 'Sample',
    eligibility_message: 'Message',
    costDollars: '12.50',
    capacity: '50',
    is_active: true,
    sort_order: 2,
    ...overrides,
  };
}

function createRequirement(localId: string, sortOrder: number): RequirementRuleDraft {
  return {
    localId,
    id: localId,
    check_type: 'payment',
    sort_order: sortOrder,
    is_automated: true,
    config: null,
  };
}

function createSnapshots(): RegistrationSnapshots {
  return {
    typeSnapshot: {
      id: 'type-1',
      name: 'Youth',
      description: 'Sample',
      eligibility_message: 'Message',
      cost: 1250,
      capacity: 50,
      is_active: true,
      sort_order: 2,
      organisation_id: 'org-1',
      event_id: 'event-1',
      created_at: null,
    },
    eligibilitySnapshot: [{ registration_type_id: 'type-1', rule_type: 'membership_type', value: '7' }],
    requirementsSnapshot: [createRequirement('req-1', 0)],
  };
}

describe('registrationSetup stateHelpers', () => {
  it('validates registration type fields and eligibility boundaries', () => {
    const eligibilityRules: EligibilityRuleDraft[] = [
      { localId: 'rule-1', rule_type: 'membership_type', value: '' },
      { localId: 'rule-2', rule_type: 'dob_before', value: '03-04-2026' },
    ];
    const errors = validateRegistrationTypeDraft(
      createDraft({ name: '  ', costDollars: '-1', capacity: '0' }),
      eligibilityRules
    );
    expect(errors.name).toBe('Name is required.');
    expect(errors.costDollars).toBe('Cost must be a valid amount greater than or equal to 0.');
    expect(errors.capacity).toBe('Capacity must be an integer greater than or equal to 1.');
    expect(errors.eligibilityRules?.['rule-1']).toBe('Value is required.');
    expect(errors.eligibilityRules?.['rule-2']).toBe('Date must be in YYYY-MM-DD format.');
  });

  it('validates designated organisation requirement config', () => {
    const errors = validateRequirementDrafts([
      {
        localId: 'req-1',
        id: null,
        check_type: 'designated_org_review',
        sort_order: 0,
        is_automated: true,
        config: { reviewing_org_id: '' },
      },
    ]);
    expect(errors.designatedOrgByRuleId['req-1']).toBe('Select a reviewing organisation');
  });

  it('builds type-save payload using current type and eligibility with requirements snapshot', () => {
    const snapshots = createSnapshots();
    const payload = buildUpsertPayloadForTypeSave({
      eventId: 'event-1',
      organisationId: 'org-1',
      draft: createDraft({ costDollars: '10.00', capacity: '' }),
      eligibilityDrafts: [{ localId: 'rule-1', rule_type: 'dob_after', value: '2026-01-01' }],
      snapshots,
    });

    expect(payload.p_registration_type.cost).toBe(1000);
    expect(payload.p_registration_type.capacity).toBeNull();
    expect(payload.p_registration_type.is_active).toBe(true);
    expect(payload.p_eligibility_rules).toEqual([{ rule_type: 'dob_after', value: '2026-01-01' }]);
    expect(payload.p_requirement_rules).toEqual([
      {
        check_type: 'payment',
        sort_order: 0,
        is_automated: true,
        config: null,
      },
    ]);
  });

  it('sends is_active from draft when creating a registration type', () => {
    const draft: RegistrationTypeDraft = {
      id: null,
      name: 'New',
      description: '',
      eligibility_message: '',
      costDollars: '0.00',
      capacity: '',
      is_active: true,
      sort_order: null,
    };
    const payload = buildUpsertPayloadForTypeSave({
      eventId: 'event-1',
      organisationId: 'org-1',
      draft,
      eligibilityDrafts: [],
      snapshots: createInitialSnapshots(),
    });
    expect(payload.p_registration_type.is_active).toBe(true);
  });

  it('builds requirements-save payload preserving type and eligibility snapshots', () => {
    const snapshots = createSnapshots();
    const payload = buildUpsertPayloadForRequirementsSave({
      eventId: 'event-1',
      organisationId: 'org-1',
      snapshots,
      requirementDrafts: [
        {
          localId: 'req-2',
          id: null,
          check_type: 'guardian_approval',
          sort_order: 0,
          is_automated: true,
          config: { require_all_guardians: true },
        },
      ],
    });

    expect(payload.p_registration_type_id).toBe('type-1');
    expect(payload.p_registration_type.name).toBe('Youth');
    expect(payload.p_eligibility_rules).toEqual([{ rule_type: 'membership_type', value: '7' }]);
    expect(payload.p_requirement_rules).toEqual([
      {
        check_type: 'guardian_approval',
        sort_order: 0,
        is_automated: false,
        config: { require_all_guardians: true },
      },
    ]);
  });

  it('reorders requirement drafts deterministically by active and over ids', () => {
    const reordered = reorderRequirementDrafts(
      [createRequirement('req-1', 0), createRequirement('req-2', 1), createRequirement('req-3', 2)],
      'req-3',
      'req-1'
    );
    expect(reordered.map((entry) => entry.localId)).toEqual(['req-3', 'req-1', 'req-2']);
    expect(reordered.map((entry) => entry.sort_order)).toEqual([0, 1, 2]);
  });
});
