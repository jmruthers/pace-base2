import type { EligibilityRuleType, RequirementCheckType } from './types';

const currencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

const eligibilityRuleTypeLabels: Record<EligibilityRuleType, string> = {
  membership_type: 'Membership type',
  dob_before: 'DOB before',
  dob_after: 'DOB after',
};

const checkTypeLabels: Record<RequirementCheckType, string> = {
  payment: 'Payment',
  guardian_approval: 'Guardian approval',
  home_leader_approval: 'Home leader approval',
  referee: 'Referee',
  designated_org_review: 'Designated organisation review',
  event_approval: 'Event approval',
};

export function eligibilityRuleTypeLabel(ruleType: EligibilityRuleType): string {
  return eligibilityRuleTypeLabels[ruleType];
}

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
