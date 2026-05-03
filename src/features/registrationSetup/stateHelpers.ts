import type {
  EligibilityRuleDraft,
  RegistrationSnapshots,
  RegistrationTypeDraft,
  RegistrationTypeUpsertPayload,
  RequirementRuleDraft,
} from './types';
import { deriveAutomatedFlag, isIsoDateValue } from './rules';

export interface RegistrationTypeValidationErrors {
  name?: string;
  costDollars?: string;
  capacity?: string;
  eligibilityRules?: Record<string, string>;
}

export interface RequirementValidationErrors {
  designatedOrgByRuleId: Record<string, string>;
}

export function parseDollarsToCents(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Cost must be a valid number greater than or equal to 0.');
  }
  return Math.round(amount * 100);
}

export function parseCapacityToNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Capacity must be an integer greater than or equal to 1.');
  }
  return parsed;
}

export function validateRegistrationTypeDraft(
  draft: RegistrationTypeDraft,
  eligibilityRules: EligibilityRuleDraft[]
): RegistrationTypeValidationErrors {
  const errors: RegistrationTypeValidationErrors = {};

  if (draft.name.trim().length === 0) {
    errors.name = 'Name is required.';
  }

  try {
    parseDollarsToCents(draft.costDollars);
  } catch {
    errors.costDollars = 'Cost must be a valid amount greater than or equal to 0.';
  }

  try {
    parseCapacityToNullableInteger(draft.capacity);
  } catch {
    errors.capacity = 'Capacity must be an integer greater than or equal to 1.';
  }

  const eligibilityErrors: Record<string, string> = {};
  for (const rule of eligibilityRules) {
    const value = rule.value.trim();
    if (value.length === 0) {
      eligibilityErrors[rule.localId] = 'Value is required.';
      continue;
    }
    if ((rule.rule_type === 'dob_before' || rule.rule_type === 'dob_after') && !isIsoDateValue(value)) {
      eligibilityErrors[rule.localId] = 'Date must be in YYYY-MM-DD format.';
    }
  }
  if (Object.keys(eligibilityErrors).length > 0) {
    errors.eligibilityRules = eligibilityErrors;
  }

  return errors;
}

export function validateRequirementDrafts(rules: RequirementRuleDraft[]): RequirementValidationErrors {
  const designatedOrgByRuleId: Record<string, string> = {};
  for (const rule of rules) {
    if (rule.check_type !== 'designated_org_review') {
      continue;
    }
    const reviewingOrgId = rule.config?.reviewing_org_id;
    if (typeof reviewingOrgId !== 'string' || reviewingOrgId.trim().length === 0) {
      designatedOrgByRuleId[rule.localId] = 'Select a reviewing organisation';
    }
  }
  return { designatedOrgByRuleId };
}

export function reorderRequirementDrafts(
  drafts: RequirementRuleDraft[],
  activeLocalId: string,
  overLocalId: string | null
): RequirementRuleDraft[] {
  if (overLocalId == null || activeLocalId === overLocalId) {
    return drafts;
  }
  const activeIndex = drafts.findIndex((draft) => draft.localId === activeLocalId);
  const overIndex = drafts.findIndex((draft) => draft.localId === overLocalId);
  if (activeIndex < 0 || overIndex < 0) {
    return drafts;
  }

  const next = [...drafts];
  const [moved] = next.splice(activeIndex, 1);
  next.splice(overIndex, 0, moved);

  return next.map((rule, index) => ({
    ...rule,
    sort_order: index,
  }));
}

function toEligibilityPayload(rules: EligibilityRuleDraft[]): RegistrationTypeUpsertPayload['p_eligibility_rules'] {
  return rules.map((rule) => ({
    rule_type: rule.rule_type,
    value: rule.value.trim(),
  }));
}

function toRequirementPayload(rules: RequirementRuleDraft[]): RegistrationTypeUpsertPayload['p_requirement_rules'] {
  return rules.map((rule, index) => ({
    check_type: rule.check_type,
    sort_order: index,
    is_automated: deriveAutomatedFlag(rule.check_type),
    config: rule.config,
  }));
}

function nullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function buildUpsertPayloadForTypeSave(params: {
  eventId: string;
  organisationId: string;
  draft: RegistrationTypeDraft;
  eligibilityDrafts: EligibilityRuleDraft[];
  snapshots: RegistrationSnapshots;
}): RegistrationTypeUpsertPayload {
  const cost = parseDollarsToCents(params.draft.costDollars);
  const capacity = parseCapacityToNullableInteger(params.draft.capacity);

  return {
    p_event_id: params.eventId,
    p_organisation_id: params.organisationId,
    p_registration_type_id: params.draft.id,
    p_registration_type: {
      name: params.draft.name.trim(),
      description: nullableTrimmed(params.draft.description),
      eligibility_message: nullableTrimmed(params.draft.eligibility_message),
      cost,
      capacity,
      is_active: params.draft.id == null ? false : params.draft.is_active,
      sort_order: params.draft.sort_order,
    },
    p_eligibility_rules: toEligibilityPayload(params.eligibilityDrafts),
    p_requirement_rules: toRequirementPayload(params.snapshots.requirementsSnapshot),
  };
}

export function buildUpsertPayloadForRequirementsSave(params: {
  eventId: string;
  organisationId: string;
  snapshots: RegistrationSnapshots;
  requirementDrafts: RequirementRuleDraft[];
}): RegistrationTypeUpsertPayload {
  if (params.snapshots.typeSnapshot == null) {
    throw new Error('Type snapshot is required before saving requirements.');
  }

  return {
    p_event_id: params.eventId,
    p_organisation_id: params.organisationId,
    p_registration_type_id: params.snapshots.typeSnapshot.id,
    p_registration_type: {
      name: params.snapshots.typeSnapshot.name,
      description: params.snapshots.typeSnapshot.description,
      eligibility_message: params.snapshots.typeSnapshot.eligibility_message,
      cost: params.snapshots.typeSnapshot.cost ?? 0,
      capacity: params.snapshots.typeSnapshot.capacity,
      is_active: params.snapshots.typeSnapshot.is_active,
      sort_order: params.snapshots.typeSnapshot.sort_order,
    },
    p_eligibility_rules: params.snapshots.eligibilitySnapshot.map((rule) => ({
      rule_type: rule.rule_type,
      value: rule.value,
    })),
    p_requirement_rules: toRequirementPayload(params.requirementDrafts),
  };
}
