import { buildWorkflowPreviewTarget, type WorkflowAuthoringState, type WorkflowType } from '@solvera/pace-core/forms';
import { omitFieldMetadataFromDisplayOptions } from './stateHelpers';
import type {
  FormBuilderRecord,
  RegistrationBindingDraft,
  RegistrationTypeRow,
} from './types';

const SLUG_FALLBACK = 'event';

export const BASE_WORKFLOW_TYPES: WorkflowType[] = [
  'base_registration',
  'information_collection',
  'activity_booking',
  'merch_order',
  'consent_capture',
  'generic',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function deriveFormSlug(name: string): string {
  return slugify(name);
}

export function resolveEventSlug(selectedEvent: unknown): string {
  if (selectedEvent == null || typeof selectedEvent !== 'object') {
    return SLUG_FALLBACK;
  }

  const eventRecord = selectedEvent as Record<string, unknown>;
  const runtimeSlug = eventRecord.slug;
  if (typeof runtimeSlug === 'string' && runtimeSlug.trim().length > 0) {
    return runtimeSlug.trim();
  }

  const eventName = eventRecord.name;
  if (typeof eventName === 'string') {
    const derived = slugify(eventName);
    return derived.length > 0 ? derived : SLUG_FALLBACK;
  }

  return SLUG_FALLBACK;
}

export function toUtcMidnightIso(value: Date | null): string | null {
  if (value == null) {
    return null;
  }
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString();
}

export function toDateValue(value: string | null | undefined): Date | null {
  if (value == null || value.length === 0) {
    return null;
  }
  return new Date(value);
}

export function createInitialAuthoringState(params: {
  eventId: string | null;
  organisationId: string | null;
}): WorkflowAuthoringState {
  return {
    metadata: {
      id: undefined,
      eventId: params.eventId,
      organisationId: params.organisationId,
      slug: '',
      name: '',
      description: undefined,
      workflowType: 'generic',
      accessMode: 'authenticated_member',
      status: 'draft',
      opensAt: null,
      closesAt: null,
      workflowConfig: {},
      isActive: true,
      isPrimaryEntrypoint: false,
    },
    fields: [],
  };
}

export function mapBuilderRecordToState(record: FormBuilderRecord): WorkflowAuthoringState {
  return {
    metadata: {
      id: record.form.id,
      eventId: record.form.event_id,
      organisationId: record.form.organisation_id,
      slug: record.form.slug,
      name: record.form.name,
      description: record.form.description ?? undefined,
      workflowType: record.form.workflow_type,
      accessMode: record.form.access_mode,
      status: record.form.status,
      opensAt: record.form.opens_at ?? null,
      closesAt: record.form.closes_at ?? null,
      workflowConfig: {
        ...(record.form.workflow_config ?? {}),
        max_submissions: record.form.max_submissions ?? null,
        confirmation_message: record.form.confirmation_message ?? null,
      },
      isActive: record.form.is_active ?? true,
      isPrimaryEntrypoint: record.form.is_primary_entrypoint ?? false,
    },
    fields: record.fields.map((field) => ({
      id: field.id,
      fieldKey: field.field_key,
      fieldType: String((field.display_options as Record<string, unknown> | null)?.field_type ?? 'text'),
      fieldLabel: field.field_label ?? undefined,
      sortOrder: field.sort_order,
      isActive: field.is_active ?? true,
      isRequired: field.is_required ?? false,
      displayOptions: omitFieldMetadataFromDisplayOptions(field.display_options),
    })),
  };
}

export function createBindingDrafts(
  registrationTypes: RegistrationTypeRow[],
  existingBindings: { registration_type_id: string; is_default: boolean }[]
): RegistrationBindingDraft[] {
  const bindingsByTypeId = new Map(
    existingBindings.map((binding) => [binding.registration_type_id, binding])
  );
  return registrationTypes.map((registrationType) => {
    const existing = bindingsByTypeId.get(registrationType.id);
    return {
      typeId: registrationType.id,
      checked: existing != null,
      isDefault: existing?.is_default ?? false,
    };
  });
}

export function buildPortalUrl(params: {
  portalBaseUrl: string | undefined;
  eventSlug: string;
  form: {
    workflow_type: WorkflowType;
    slug: string;
    is_primary_entrypoint: boolean | null;
  };
}): string | null {
  const baseUrl = params.portalBaseUrl?.trim();
  if (baseUrl == null || baseUrl.length === 0) {
    return null;
  }

  const previewState: WorkflowAuthoringState = {
    metadata: {
      id: undefined,
      eventId: undefined,
      organisationId: undefined,
      slug: params.form.slug,
      name: params.form.slug,
      description: undefined,
      workflowType: params.form.workflow_type,
      accessMode: 'authenticated_member',
      status: 'draft',
      opensAt: null,
      closesAt: null,
      workflowConfig: {},
      isActive: true,
      isPrimaryEntrypoint: params.form.is_primary_entrypoint ?? false,
    },
    fields: [],
  };

  const previewTarget = buildWorkflowPreviewTarget(previewState, { eventSlug: params.eventSlug });
  return `${baseUrl}${previewTarget.path}`;
}

function countNoun(value: number, label: string): string {
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}

export function buildDeleteBlockedMessage(params: {
  formName: string;
  responseCount: number;
  registrationBindingCount: number;
}): string {
  const reasons: string[] = [];
  if (params.responseCount > 0) {
    reasons.push(countNoun(params.responseCount, 'submission'));
  }
  if (params.registrationBindingCount > 0) {
    reasons.push(countNoun(params.registrationBindingCount, 'registration type binding'));
  }

  if (reasons.length === 0) {
    return `'${params.formName}' cannot be deleted because it has related records. Remove these first before deleting.`;
  }

  if (reasons.length === 1) {
    return `'${params.formName}' cannot be deleted because it has ${reasons[0]}. Remove these first before deleting.`;
  }

  return `'${params.formName}' cannot be deleted because it has ${reasons[0]} and ${reasons[1]}. Remove these first before deleting.`;
}
