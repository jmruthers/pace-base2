import type { RequirementCheckType } from './types';

const checkTypeAutomation: Record<RequirementCheckType, boolean> = {
  payment: true,
  guardian_approval: false,
  home_leader_approval: false,
  referee: false,
  designated_org_review: false,
  event_approval: false,
};

export function deriveAutomatedFlag(checkType: RequirementCheckType): boolean {
  return checkTypeAutomation[checkType];
}

export function isIsoDateValue(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}
