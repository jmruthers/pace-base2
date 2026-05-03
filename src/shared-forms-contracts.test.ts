import { describe, expect, it } from 'vitest';
import {
  WorkflowFormRenderer,
  WorkflowFormAuthoringShell,
  WorkflowFormFieldEditor,
  WorkflowFormMetadataEditor,
  WorkflowPreSubmissionChecks,
  buildWorkflowPreviewTarget,
  buildWorkflowSubmissionPayload,
  validateWorkflowAuthoringState,
  type WorkflowEntrypointState,
  type WorkflowAuthoringState,
} from '@solvera/pace-core/forms';

function createValidState(): WorkflowAuthoringState {
  return {
    metadata: {
      id: 'form-1',
      eventId: 'event-1',
      organisationId: 'org-1',
      slug: 'camp-application',
      name: 'Camp application',
      description: 'Primary registration form',
      workflowType: 'base_registration',
      accessMode: 'public',
      status: 'draft',
      workflowConfig: {},
      isActive: false,
      isPrimaryEntrypoint: false,
    },
    fields: [
      {
        id: 'field-1',
        fieldKey: 'person.first_name',
        fieldType: 'text',
        sortOrder: 0,
        isActive: true,
        isRequired: true,
      },
    ],
  };
}

function resolveTimeWindowEntrypointState(params: {
  isActive: boolean;
  opensAt: string | null;
  closesAt: string | null;
  nowIsoUtc: string;
}): WorkflowEntrypointState {
  if (!params.isActive) {
    return 'not_found';
  }

  const now = new Date(params.nowIsoUtc).getTime();
  const opensAt = params.opensAt == null ? null : new Date(params.opensAt).getTime();
  const closesAt = params.closesAt == null ? null : new Date(params.closesAt).getTime();

  if (opensAt != null && opensAt > now) {
    return 'not_yet_open';
  }

  if (closesAt != null && closesAt < now) {
    return 'closed';
  }

  return 'ready';
}

describe('shared forms contracts', () => {
  it('resolves required CR21 exports from @solvera/pace-core/forms', () => {
    expect(WorkflowFormRenderer).toBeTypeOf('function');
    expect(WorkflowPreSubmissionChecks).toBeTypeOf('function');
    expect(WorkflowFormAuthoringShell).toBeTypeOf('function');
    expect(WorkflowFormMetadataEditor).toBeTypeOf('function');
    expect(WorkflowFormFieldEditor).toBeTypeOf('function');
    expect(validateWorkflowAuthoringState).toBeTypeOf('function');
    expect(buildWorkflowPreviewTarget).toBeTypeOf('function');
  });

  it('rejects workflow types outside the approved taxonomy', () => {
    const state = createValidState();
    state.metadata.workflowType = 'invalid_workflow_type' as never;

    const result = validateWorkflowAuthoringState(state);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((issue) => issue.code === 'invalid_workflow_type')
    ).toBe(true);
  });

  it('enforces duplicate fieldKey contract', () => {
    const state = createValidState();
    state.fields.push({
      id: 'field-2',
      fieldKey: 'person.first_name',
      fieldType: 'text',
      sortOrder: 1,
      isActive: true,
      isRequired: false,
    });

    const result = validateWorkflowAuthoringState(state);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'duplicate_field_key')).toBe(
      true
    );
  });

  it('enforces activation-blocked contract when form is invalid and active', () => {
    const state = createValidState();
    state.metadata.name = '';
    state.metadata.isActive = true;

    const result = validateWorkflowAuthoringState(state);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'activation_blocked')).toBe(
      true
    );
  });

  it('enforces org_signup access-mode constraint', () => {
    const state = createValidState();
    state.metadata.workflowType = 'org_signup';
    state.metadata.accessMode = 'public';

    const result = validateWorkflowAuthoringState(state);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (issue) => issue.code === 'invalid_workflow_access_combination'
      )
    ).toBe(true);
  });

  it('enforces primary-entrypoint workflow restriction', () => {
    const state = createValidState();
    state.metadata.workflowType = 'information_collection';
    state.metadata.isPrimaryEntrypoint = true;

    const result = validateWorkflowAuthoringState(state);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'invalid_entrypoint')).toBe(
      true
    );
  });

  it('builds base primary preview target path', () => {
    const state = createValidState();
    state.metadata.isPrimaryEntrypoint = true;

    const target = buildWorkflowPreviewTarget(state, { eventSlug: 'camp-alpha' });

    expect(target.path).toBe('/camp-alpha/application');
    expect(target.reason).toBe('base_primary_entrypoint');
  });

  it('resolves not_yet_open when opensAt is in the future', () => {
    const state = resolveTimeWindowEntrypointState({
      isActive: true,
      opensAt: '2027-01-01T00:00:00.000Z',
      closesAt: null,
      nowIsoUtc: '2026-12-31T00:00:00.000Z',
    });

    expect(state).toBe('not_yet_open');
  });

  it('resolves closed when closesAt is in the past', () => {
    const state = resolveTimeWindowEntrypointState({
      isActive: true,
      opensAt: null,
      closesAt: '2026-01-01T00:00:00.000Z',
      nowIsoUtc: '2026-02-01T00:00:00.000Z',
    });

    expect(state).toBe('closed');
  });

  it('builds fieldKey-keyed submission payload values', () => {
    const payload = buildWorkflowSubmissionPayload({
      formId: 'form-1',
      workflowType: 'base_registration',
      fields: [
        {
          id: 'field-1',
          fieldKey: 'person.first_name',
          fieldType: 'text',
          sortOrder: 0,
          isActive: true,
        },
      ],
      values: {
        'person.first_name': 'Jess',
      },
      visibilityContext: {
        values: {
          'person.first_name': 'Jess',
        },
      },
      preSubmissionChecks: [],
    });

    expect(payload.values).toEqual([
      { fieldKey: 'person.first_name', value: 'Jess' },
    ]);
    expect(
      payload.values.some(
        (entry) =>
          Object.prototype.hasOwnProperty.call(entry as object, 'table_name') ||
          Object.prototype.hasOwnProperty.call(entry as object, 'column_name')
      )
    ).toBe(false);
  });

  it('preserves pre-submission checks in payload for base_registration', () => {
    const payload = buildWorkflowSubmissionPayload({
      formId: 'form-1',
      workflowType: 'base_registration',
      fields: [
        {
          id: 'field-1',
          fieldKey: 'person.last_name',
          fieldType: 'text',
          sortOrder: 0,
          isActive: true,
        },
      ],
      values: {
        'person.last_name': 'Citizen',
      },
      visibilityContext: {
        values: {
          'person.last_name': 'Citizen',
        },
      },
      registrationTypeId: 'registration-type-1',
      preSubmissionChecks: ['guardian-consent', 'medical-declaration'],
      metadata: {
        consentSnapshots: {
          'guardian-consent': 'I confirm guardian approval is in place.',
          'medical-declaration': 'I confirm this medical declaration is accurate.',
        },
      },
    });

    expect(payload.workflowType).toBe('base_registration');
    expect(payload.registrationTypeId).toBe('registration-type-1');
    expect(payload.preSubmissionChecks).toEqual([
      'guardian-consent',
      'medical-declaration',
    ]);
    expect(payload.metadata).toEqual({
      consentSnapshots: {
        'guardian-consent': 'I confirm guardian approval is in place.',
        'medical-declaration': 'I confirm this medical declaration is accurate.',
      },
    });
  });
});
