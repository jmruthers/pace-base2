import { describe, expect, it } from 'vitest';
import { buildDeleteBlockedMessage, deriveFormSlug, resolveEventSlug, toUtcMidnightIso } from './shared';
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

  it('strips max_submissions and confirmation_message from workflow_config in definition payload', () => {
    const payload = buildDefinitionPayload(createState());
    expect(payload.max_submissions).toBe(50);
    expect(payload.confirmation_message).toBe('Thanks');
    expect(payload.workflow_config).toEqual({ returnUrl: '/done' });
  });
});
