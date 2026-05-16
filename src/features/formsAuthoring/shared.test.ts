import { describe, expect, it } from 'vitest';
import {
  buildDeleteBlockedMessage,
  deriveFormSlug,
  mapBuilderRecordToState,
  resolveEventSlug,
  toUtcMidnightIso,
} from './shared';
import type { FormBuilderRecord } from './types';
import { buildDefinitionPayload } from './stateHelpers';
import type { WorkflowAuthoringState } from '@solvera/pace-core/forms';

function createState(): WorkflowAuthoringState {
  return {
    metadata: {
      id: 'form-1',
      eventId: 'event-1',
      organisationId: 'org-1',
      slug: 'camp-form',
      name: 'Camp Form',
      description: 'Description',
      workflowType: 'generic',
      accessMode: 'authenticated_member',
      status: 'draft',
      opensAt: null,
      closesAt: null,
      workflowConfig: {
        max_submissions: 50,
        confirmation_message: 'Thanks',
        returnUrl: '/done',
      },
      isActive: true,
      isPrimaryEntrypoint: false,
    },
    fields: [],
  };
}

describe('formsAuthoring shared helpers', () => {
  it('derives form slug from name', () => {
    expect(deriveFormSlug('Camp 2026 Registration!')).toBe('camp-2026-registration');
  });

  it('resolves event slug from runtime slug then name fallback', () => {
    expect(resolveEventSlug({ slug: 'alpha-event' })).toBe('alpha-event');
    expect(resolveEventSlug({ name: 'Alpha Event' })).toBe('alpha-event');
  });

  it('falls back to default event slug when no usable source', () => {
    expect(resolveEventSlug({})).toBe('event');
  });

  it('converts Date into UTC midnight ISO', () => {
    const value = new Date('2026-03-15T14:35:00.000Z');
    const expected = new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
    ).toISOString();
    expect(toUtcMidnightIso(value)).toBe(expected);
  });

  it('builds delete-blocked message with both counts', () => {
    expect(
      buildDeleteBlockedMessage({
        formName: 'Camp Form',
        responseCount: 3,
        registrationBindingCount: 2,
      })
    ).toContain('3 submissions and 2 registration type bindings');
  });

  it('maps field_label to fieldLabel and strips label/field_type from displayOptions', () => {
    const record: FormBuilderRecord = {
      form: {
        id: 'form-1',
        name: 'Test',
        title: null,
        description: null,
        slug: 'test',
        status: 'draft',
        workflow_type: 'generic',
        access_mode: 'authenticated_member',
        workflow_config: null,
        is_active: true,
        is_primary_entrypoint: false,
        opens_at: null,
        closes_at: null,
        max_submissions: null,
        confirmation_message: null,
        event_id: 'event-1',
        organisation_id: 'org-1',
        owner_app_id: null,
      },
      fields: [
        {
          id: 'field-1',
          form_id: 'form-1',
          field_key: 'generic.name',
          field_label: 'Saved label',
          is_required: false,
          is_active: true,
          sort_order: 0,
          display_options: {
            label: 'Stale in JSON',
            field_type: 'email',
            placeholder: 'Name',
          },
        },
      ],
      bindings: [],
    };
    const state = mapBuilderRecordToState(record);
    expect(state.fields[0]?.fieldLabel).toBe('Saved label');
    expect(state.fields[0]?.fieldType).toBe('email');
    expect(state.fields[0]?.displayOptions).toEqual({ placeholder: 'Name' });
  });

  it('strips max_submissions and confirmation_message from workflow_config in definition payload', () => {
    const payload = buildDefinitionPayload(createState());
    expect(payload.max_submissions).toBe(50);
    expect(payload.confirmation_message).toBe('Thanks');
    expect(payload.workflow_config).toEqual({ returnUrl: '/done' });
  });
});
