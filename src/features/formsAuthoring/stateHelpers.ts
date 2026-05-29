import type { WorkflowAuthoringState } from '@solvera/pace-core/forms';
import type { RegistrationBindingDraft } from './types';

export function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

export function ensureSingleDefaultBinding(bindings: RegistrationBindingDraft[], typeId: string) {
  return bindings.map((binding) => ({
    ...binding,
    isDefault: binding.typeId === typeId ? binding.checked : false,
  }));
}

export function updateBindingCheckedState(
  bindings: RegistrationBindingDraft[],
  typeId: string,
  checked: boolean
) {
  const next = bindings.map((binding) =>
    binding.typeId === typeId
      ? {
          ...binding,
          checked,
          isDefault: checked ? binding.isDefault : false,
        }
      : binding
  );

  const activeDefaults = next.filter((binding) => binding.checked && binding.isDefault);
  if (activeDefaults.length > 1) {
    const defaultTypeId = activeDefaults[0]?.typeId;
    return next.map((binding) => ({
      ...binding,
      isDefault: binding.typeId === defaultTypeId && binding.checked,
    }));
  }

  return next;
}

/** Keys mirrored on `field_label` / `fieldType`; omit from `displayOptions` in authoring state. */
export function omitFieldMetadataFromDisplayOptions(
  displayOptions: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (displayOptions == null) {
    return undefined;
  }
  const rest = Object.fromEntries(
    Object.entries(displayOptions).filter(([key]) => key !== 'label' && key !== 'field_type')
  );
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export function buildFieldsRpcPayload(fields: WorkflowAuthoringState['fields']) {
  return fields.map((field, index) => ({
    field_key: field.fieldKey,
    sort_order: field.sortOrder ?? index,
    is_required: field.isRequired ?? false,
    field_metadata: {
      ...(field.displayOptions ?? {}),
      label: field.fieldLabel,
      field_type: field.fieldType,
    },
  }));
}

export function buildDefinitionPayload(state: WorkflowAuthoringState) {
  const {
    max_submissions,
    confirmation_message,
    ...restWorkflowConfig
  } = (state.metadata.workflowConfig ?? {}) as {
    max_submissions?: number | null;
    confirmation_message?: string | null;
    [key: string]: unknown;
  };

  return {
    title: state.metadata.name,
    name: state.metadata.name,
    slug: state.metadata.slug,
    workflow_type: state.metadata.workflowType,
    access_mode: state.metadata.accessMode,
    workflow_config: restWorkflowConfig,
    description: state.metadata.description ?? null,
    status: state.metadata.status,
    is_primary_entrypoint: state.metadata.isPrimaryEntrypoint,
    is_active: state.metadata.isActive,
    opens_at: state.metadata.opensAt ?? null,
    closes_at: state.metadata.closesAt ?? null,
    max_submissions: max_submissions ?? null,
    confirmation_message: confirmation_message ?? null,
  };
}

export function asCount(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function sortFieldRows<T extends { sort_order: number }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.sort_order - right.sort_order);
}

export function toFieldCountMap(rows: Array<{ form_id: string }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const current = acc[row.form_id] ?? 0;
    acc[row.form_id] = current + 1;
    return acc;
  }, {});
}

export function isPublishedForm(state: WorkflowAuthoringState): boolean {
  return state.metadata.id != null && state.metadata.status === 'published';
}
