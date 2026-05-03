import type {
  EligibilityRuleDraft,
  EligibilityRuleType,
  RegistrationSnapshots,
  RegistrationTypeDraft,
  RegistrationTypeEligibilityRow,
  RegistrationTypeRequirementRow,
  RegistrationTypeRow,
  RequirementCheckType,
  RequirementRuleDraft,
} from './types';
import { deriveAutomatedFlag } from './rules';

const currencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

const checkTypeLabels: Record<RequirementCheckType, string> = {
  payment: 'Payment',
  guardian_approval: 'Guardian approval',
  home_leader_approval: 'Home leader approval',
  referee: 'Referee',
  designated_org_review: 'Designated organisation review',
  event_approval: 'Event approval',
};

export function formatCurrencyFromCents(cents: number | null): string {
  const dollars = (cents ?? 0) / 100;
  return currencyFormatter.format(dollars);
}

export function requirementTypeLabel(checkType: RequirementCheckType): string {
  return checkTypeLabels[checkType];
}

export function allRequirementTypes(): RequirementCheckType[] {
  return Object.keys(checkTypeLabels) as RequirementCheckType[];
}

function defaultRequirementConfig(checkType: RequirementCheckType): Record<string, unknown> | null {
  if (checkType === 'guardian_approval') {
    return { require_all_guardians: false };
  }
  return null;
}

export function createRequirementDraft(checkType: RequirementCheckType, sortOrder: number): RequirementRuleDraft {
  return {
    localId: crypto.randomUUID(),
    id: null,
    check_type: checkType,
    sort_order: sortOrder,
    is_automated: deriveAutomatedFlag(checkType),
    config: defaultRequirementConfig(checkType),
  };
}

export function mapRequirementsToDraft(rows: RegistrationTypeRequirementRow[]): RequirementRuleDraft[] {
  return rows.map((row, index) => ({
    localId: row.id,
    id: row.id,
    check_type: row.check_type,
    sort_order: row.sort_order ?? index,
    is_automated: row.is_automated,
    config: row.config,
  }));
}

export function mapEligibilityToDraft(rows: RegistrationTypeEligibilityRow[]): EligibilityRuleDraft[] {
  return rows.map((row) => ({
    localId: crypto.randomUUID(),
    rule_type: row.rule_type,
    value: row.value,
  }));
}

export function createDefaultRegistrationTypeDraft(): RegistrationTypeDraft {
  return {
    id: null,
    name: '',
    description: '',
    eligibility_message: '',
    costDollars: '0.00',
    capacity: '',
    is_active: false,
    sort_order: null,
  };
}

export function mapTypeToDraft(row: RegistrationTypeRow): RegistrationTypeDraft {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    eligibility_message: row.eligibility_message ?? '',
    costDollars: ((row.cost ?? 0) / 100).toFixed(2),
    capacity: row.capacity == null ? '' : String(row.capacity),
    is_active: row.is_active,
    sort_order: row.sort_order,
  };
}

export function createInitialSnapshots(): RegistrationSnapshots {
  return {
    typeSnapshot: null,
    eligibilitySnapshot: [],
    requirementsSnapshot: [],
  };
}

export function defaultEligibilityRuleType(): EligibilityRuleType {
  return 'membership_type';
}
