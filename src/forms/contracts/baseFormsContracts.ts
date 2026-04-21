export const BASE_WORKFLOW_TYPES = ['base_registration'] as const;
export type BaseWorkflowType = (typeof BASE_WORKFLOW_TYPES)[number];

export const BASE_ACCESS_MODES = [
  'authenticated_member',
  'public',
  'organiser_only',
] as const;
export type BaseAccessMode = (typeof BASE_ACCESS_MODES)[number];

export const WORKFLOW_SUBJECT_TYPES = ['base_application', 'person'] as const;
export type WorkflowSubjectType = (typeof WORKFLOW_SUBJECT_TYPES)[number];

export interface BaseFormResponseContract {
  form_id: string;
  workflow_subject_type: WorkflowSubjectType;
  workflow_subject_id: string;
  values: Record<string, unknown>;
}

const LEGACY_FIELD_IDENTITY_KEYS = ['table_name', 'column_name'] as const;
const LEGACY_RESPONSE_TARGET_KEYS = ['target_table', 'target_record_id'] as const;

export function validateFieldKey(fieldKey: string): boolean {
  return fieldKey.trim().length > 0 && !fieldKey.includes(' ');
}

export function hasLegacyFieldIdentity(
  record: Record<string, unknown> | null | undefined
): boolean {
  if (record == null) {
    return false;
  }
  return LEGACY_FIELD_IDENTITY_KEYS.some((key) => key in record);
}

export function hasLegacyResponseTargeting(
  record: Record<string, unknown> | null | undefined
): boolean {
  if (record == null) {
    return false;
  }
  return LEGACY_RESPONSE_TARGET_KEYS.some((key) => key in record);
}
