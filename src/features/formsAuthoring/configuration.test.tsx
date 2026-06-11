// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowAuthoringState } from '@solvera/pace-core/forms';
import { useSaveWorkflowFormMutation } from './configuration';

const mocks = vi.hoisted(() => {
  const callOrder: string[] = [];

  const rpc = vi.fn(async (name: string) => {
    callOrder.push(name);
    if (name === 'app_base_form_upsert') {
      return { data: [{ form_id: 'form-1' }], error: null };
    }
    if (name === 'app_base_form_fields_replace') {
      return { data: null, error: null };
    }
    if (name === 'app_base_form_registration_bindings_replace') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });

  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(),
    })),
  }));

  const supabase = { rpc, from };
  return {
    callOrder,
    rpc,
    from,
    supabase,
  };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mocks.supabase,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn }: { mutationFn: (params: unknown) => Promise<unknown> }) => ({
    mutateAsync: mutationFn,
  }),
  useQuery: vi.fn(),
}));

function createState(workflowType: WorkflowAuthoringState['metadata']['workflowType']): WorkflowAuthoringState {
  return {
    metadata: {
      id: undefined,
      eventId: 'event-1',
      organisationId: 'org-1',
      slug: 'camp-form',
      name: 'Camp Form',
      description: undefined,
      workflowType,
      accessMode: 'authenticated_member',
      status: 'draft',
      opensAt: null,
      closesAt: null,
      workflowConfig: {},
      isActive: true,
          },
    fields: [
      {
        id: 'field-1',
        fieldKey: 'generic.field_1',
        fieldType: 'text',
        fieldLabel: 'First name',
        sortOrder: 0,
        isActive: true,
        isRequired: true,
      },
    ],
  };
}

describe('formsAuthoring configuration mutation sequencing', () => {
  it('saves base registration forms with ordered RPC and binding writes', async () => {
    mocks.callOrder.length = 0;
    mocks.rpc.mockClear();

    const holder: { mutateAsync: ((params: unknown) => Promise<unknown>) | null } = { mutateAsync: null };
    function Probe() {
      holder.mutateAsync = (useSaveWorkflowFormMutation() as unknown as {
        mutateAsync: (params: unknown) => Promise<unknown>;
      }).mutateAsync;
      return null;
    }
    render(<Probe />);
    if (holder.mutateAsync == null) {
      throw new Error('mutateAsync not initialized');
    }

    await holder.mutateAsync({
      state: createState('base_registration'),
      bindings: [
        { typeId: 'type-1', checked: true, isRequired: true },
        { typeId: 'type-2', checked: false, isRequired: false },
      ],
      eventId: 'event-1',
      organisationId: 'org-1',
      userId: 'user-1',
    });

    expect(mocks.callOrder).toEqual([
      'app_base_form_upsert',
      'app_base_form_fields_replace',
      'app_base_form_registration_bindings_replace',
    ]);
  });

  it('skips binding writes for non-base workflow forms', async () => {
    mocks.callOrder.length = 0;
    mocks.rpc.mockClear();

    const holder: { mutateAsync: ((params: unknown) => Promise<unknown>) | null } = { mutateAsync: null };
    function Probe() {
      holder.mutateAsync = (useSaveWorkflowFormMutation() as unknown as {
        mutateAsync: (params: unknown) => Promise<unknown>;
      }).mutateAsync;
      return null;
    }
    render(<Probe />);
    if (holder.mutateAsync == null) {
      throw new Error('mutateAsync not initialized');
    }

    await holder.mutateAsync({
      state: createState('information_collection'),
      bindings: [{ typeId: 'type-1', checked: true, isRequired: true }],
      eventId: 'event-1',
      organisationId: 'org-1',
      userId: 'user-1',
    });

    expect(mocks.callOrder).toEqual(['app_base_form_upsert', 'app_base_form_fields_replace']);
  });
});
