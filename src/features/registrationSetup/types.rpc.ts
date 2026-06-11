import type { EligibilityRuleType, RequirementCheckType } from './types';

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
    pre_submission_checks: string[];
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

export interface DeleteRegistrationTypeRpcResult {
  deleted: boolean;
  application_count: number | string | null;
  form_binding_count: number | string | null;
}
