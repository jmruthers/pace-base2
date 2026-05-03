import { describe, expect, it } from 'vitest';
import {
  WorkflowFormAuthoringShell,
  WorkflowFormFieldEditor,
  WorkflowFormMetadataEditor,
  buildWorkflowPreviewTarget,
  buildWorkflowSubmissionPayload,
  validateWorkflowAuthoringState,
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

describe('shared forms contracts', () => {
  it('resolves required CR21 exports from @solvera/pace-core/forms', () => {
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

  it('enforces duplicate fieldKey and activation-blocked contracts', () => {
    const state = createValidState();
    state.metadata.slug = 'Invalid Slug';
    state.metadata.isActive = true;
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
});
