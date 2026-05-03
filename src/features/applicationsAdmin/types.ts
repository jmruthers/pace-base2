export type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export type CheckStatus = 'pending' | 'satisfied' | 'failed' | 'waived';

export type CheckType =
  | 'payment'
  | 'guardian_approval'
  | 'home_leader_approval'
  | 'referee'
  | 'designated_org_review'
  | 'event_approval';

interface ApplicationPerson {
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ApplicationRegistrationType {
  id: string;
  name: string;
}

interface ApplicationCheckRequirement {
  check_type: CheckType;
  sort_order: number | null;
  is_automated: boolean | null;
  config: Record<string, unknown> | null;
}

export interface ApplicationCheckRow {
  id: string;
  status: CheckStatus;
  requirement_id: string | null;
  token_expires_at: string | null;
  actioned_at: string | null;
  notes: string | null;
  requirement: ApplicationCheckRequirement | null;
}

export interface ApplicationQueueRow {
  id: string;
  event_id: string;
  person_id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  created_at: string | null;
  registration_type_id: string | null;
  person: ApplicationPerson | null;
  registration_type: ApplicationRegistrationType | null;
  checks: ApplicationCheckRow[];
}

interface FormFieldRow {
  id: string;
  label: string | null;
  field_key: string | null;
}

export interface FormResponseValueRow {
  field_key: string | null;
  form_field_id: string | null;
  value_text: string | null;
  value_json: unknown;
  field: FormFieldRow | null;
}

interface FormMetadataRow {
  id: string;
  name: string | null;
}

export interface ApplicationEvidenceRow {
  id: string;
  submitted_at: string | null;
  form: FormMetadataRow | null;
  values: FormResponseValueRow[];
}
