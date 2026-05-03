export type EligibilityRuleType = 'membership_type' | 'dob_before' | 'dob_after';

export type RequirementCheckType =
  | 'payment'
  | 'guardian_approval'
  | 'home_leader_approval'
  | 'referee'
  | 'designated_org_review'
  | 'event_approval';

export interface RegistrationTypeRow {
  id: string;
  name: string;
  description: string | null;
  eligibility_message: string | null;
  cost: number | null;
  capacity: number | null;
  is_active: boolean;
  sort_order: number | null;
  organisation_id: string | null;
  event_id: string | null;
  created_at: string | null;
}

export interface RegistrationTypeEligibilityRow {
  registration_type_id: string;
  rule_type: EligibilityRuleType;
  value: string;
}

export interface RegistrationTypeRequirementRow {
  id: string;
  check_type: RequirementCheckType;
  sort_order: number | null;
  is_automated: boolean;
  config: Record<string, unknown> | null;
}

export interface EligibilityRuleDraft {
  localId: string;
  rule_type: EligibilityRuleType;
  value: string;
}

export interface RequirementRuleDraft {
  localId: string;
  id: string | null;
  check_type: RequirementCheckType;
  sort_order: number;
  is_automated: boolean;
  config: Record<string, unknown> | null;
}

export interface RegistrationTypeDraft {
  id: string | null;
  name: string;
  description: string;
  eligibility_message: string;
  costDollars: string;
  capacity: string;
  is_active: boolean;
  sort_order: number | null;
}

export interface RegistrationSnapshots {
  typeSnapshot: RegistrationTypeRow | null;
  eligibilitySnapshot: RegistrationTypeEligibilityRow[];
  requirementsSnapshot: RequirementRuleDraft[];
}

export interface RegistrationTypeUpsertPayload {
  p_event_id: string;
  p_organisation_id: string;
  p_registration_type_id: string | null;
  p_registration_type: {
    name: string;
    description: string | null;
    eligibility_message: string | null;
    cost: number;
    capacity: number | null;
    is_active: boolean;
    sort_order: number | null;
  };
  p_eligibility_rules: Array<{
    rule_type: EligibilityRuleType;
    value: string;
  }>;
  p_requirement_rules: Array<{
    check_type: RequirementCheckType;
    sort_order: number;
    is_automated: boolean;
    config: Record<string, unknown> | null;
  }>;
}
