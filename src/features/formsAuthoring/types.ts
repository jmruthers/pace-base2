import type {
  WorkflowAccessMode,
  WorkflowAuthoringState,
  WorkflowFormStatus,
  WorkflowType,
} from '@solvera/pace-core/forms';

export interface CoreFormListRow {
  id: string;
  name: string;
  slug: string;
  status: WorkflowFormStatus;
  workflow_type: WorkflowType;
  is_active: boolean | null;
  is_primary_entrypoint: boolean | null;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CoreFormDetailRow {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  slug: string;
  status: WorkflowFormStatus;
  workflow_type: WorkflowType;
  access_mode: WorkflowAccessMode;
  workflow_config: Record<string, unknown> | null;
  is_active: boolean | null;
  is_primary_entrypoint: boolean | null;
  opens_at: string | null;
  closes_at: string | null;
  max_submissions: number | null;
  confirmation_message: string | null;
  event_id: string;
  organisation_id: string;
  owner_app_id: string | null;
}

export interface CoreFormFieldRow {
  id: string;
  form_id: string;
  field_key: string;
  field_label: string | null;
  is_required: boolean | null;
  is_active: boolean | null;
  sort_order: number;
  display_options: Record<string, unknown> | null;
}

export interface RegistrationTypeRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface FormRegistrationBindingRow {
  registration_type_id: string;
  sort_order: number;
  is_default: boolean;
}

export interface RegistrationBindingDraft {
  typeId: string;
  checked: boolean;
  isDefault: boolean;
}

export interface DeleteFormRpcResult {
  deleted: boolean;
  response_count: number | string | null;
  registration_binding_count: number | string | null;
}

export interface FormBuilderRecord {
  form: CoreFormDetailRow;
  fields: CoreFormFieldRow[];
  bindings: FormRegistrationBindingRow[];
}

export interface SaveFormParams {
  state: WorkflowAuthoringState;
  bindings: RegistrationBindingDraft[];
  eventId: string;
  organisationId: string;
  userId: string | null;
}
