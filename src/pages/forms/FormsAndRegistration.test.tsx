/* @vitest-environment jsdom */

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormsListPage } from './FormsListPage';
import { FormBuilderPage } from './FormBuilderPage';
import { RegistrationTypesPage } from '@/pages/registration/RegistrationTypesPage';

const mockAuthState = {
  selectedEvent: { id: 'event-200' } as Record<string, unknown> | null,
};

const formsRows = [
  {
    id: 'form-001',
    slug: 'db-primary-registration',
    title: 'DB Primary registration',
    name: 'DB Primary registration',
    workflow_type: 'base_registration',
    access_mode: 'authenticated_member',
  },
];
const formFieldRows = [{ form_id: 'form-001', field_key: 'registration_primary' }];

const registrationTypeRows = [
  { id: 'rt-1', name: 'Participant', is_active: true, sort_order: null },
];

const fromMock = vi.fn((table: string) => ({
  select: () => {
    if (table === 'core_forms') {
      return {
        eq: () => ({
          order: async () => ({ data: formsRows, error: null }),
        }),
      };
    }
    if (table === 'core_form_fields') {
      return {
        in: () => ({
          order: async () => ({ data: formFieldRows, error: null }),
        }),
      };
    }
    if (table === 'base_registration_type') {
      return {
        eq: () => ({
          order: async () => ({ data: registrationTypeRows, error: null }),
        }),
      };
    }
    throw new Error(`Unexpected table query: ${table}`);
  },
}));

const rpcMock = vi.fn(async () => ({ error: null }));
const mockSecureSupabase = {
  rpc: rpcMock,
  from: fromMock,
};

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => mockAuthState,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mockSecureSupabase,
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core/components', async () => {
  const actual = await vi.importActual<typeof import('@solvera/pace-core/components')>(
    '@solvera/pace-core/components'
  );
  return {
    ...actual,
    Form: ({
      children,
      className,
      onSubmit,
    }: {
      children: ReactNode;
      className?: string;
      onSubmit?: (event: { preventDefault: () => void }) => void;
    }) =>
      createElement(
        'form',
        {
          className,
          onSubmit: (event: { preventDefault: () => void }) => {
            event.preventDefault();
            onSubmit?.(event);
          },
        },
        children
      ),
  };
});

describe('BA03 and BA04 route surfaces', () => {
  beforeEach(() => {
    rpcMock.mockClear();
    fromMock.mockClear();
    mockAuthState.selectedEvent = { id: 'event-200' };
  });

  afterEach(() => {
    cleanup();
  });

  function renderWithQueryClient(children: ReactNode) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
  }

  it('shows event-scoped forms list with preview/share links', async () => {
    renderWithQueryClient(
      <MemoryRouter>
        <FormsListPage />
      </MemoryRouter>
    );

    await screen.findByText('DB Primary registration');
    expect(screen.queryByRole('button', { name: 'Add new form' })).not.toBeNull();
    expect(screen.queryAllByRole('link', { name: 'Edit' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('link', { name: 'Preview' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('link', { name: 'Share' }).length).toBeGreaterThan(0);
    const previewLink = screen.getAllByRole('link', { name: 'Preview' })[0];
    const shareLink = screen.getAllByRole('link', { name: 'Share' })[0];
    expect(previewLink?.getAttribute('href')).toBe('/forms/preview/db-primary-registration');
    expect(shareLink?.getAttribute('href')).toBe('/forms/share/db-primary-registration');
    expect(fromMock).toHaveBeenCalledWith('core_forms');
  });

  it('saves builder payload via backend-owned rpc contract', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter initialEntries={['/form-builder']}>
        <Routes>
          <Route path="/form-builder" element={<FormBuilderPage />} />
          <Route path="/form-builder/:slug" element={<FormBuilderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Form title'), 'Policy form');
    await user.type(screen.getByLabelText('Form slug'), 'policy-form');
    await user.type(screen.getByLabelText('Semantic field key'), 'guardian_email');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const firstRpcCall = rpcMock.mock.calls[0];
    if (firstRpcCall == null) {
      throw new Error('Expected builder RPC call.');
    }
    const rpcNameValue = firstRpcCall.at(0);
    const payloadValue = firstRpcCall.at(1);
    if (typeof rpcNameValue !== 'string' || payloadValue == null) {
      throw new Error('Invalid builder RPC call shape.');
    }
    const rpcName = rpcNameValue;
    const payload = payloadValue as Record<string, unknown>;
    expect(rpcName).toBe('app_base_forms_builder_upsert');
    expect(payload.event_id).toBe('event-200');
    expect(payload.field_key).toBe('guardian_email');
    expect(payload.form_id).toBeUndefined();
  });

  it('prefills builder state from slug route', async () => {
    renderWithQueryClient(
      <MemoryRouter initialEntries={['/form-builder/db-primary-registration']}>
        <Routes>
          <Route path="/form-builder/:slug" element={<FormBuilderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByDisplayValue('DB Primary registration');
    await screen.findByDisplayValue('db-primary-registration');
  });

  it('saves edits with stable form_id when slug changes', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter initialEntries={['/form-builder/db-primary-registration']}>
        <Routes>
          <Route path="/form-builder/:slug" element={<FormBuilderPage />} />
        </Routes>
      </MemoryRouter>
    );

    const slugInput = (await screen.findByDisplayValue(
      'db-primary-registration'
    )) as HTMLInputElement;
    await user.clear(slugInput);
    await user.type(slugInput, 'db-renamed-form');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(rpcMock).toHaveBeenCalled();
    const lastRpcCall = rpcMock.mock.calls[rpcMock.mock.calls.length - 1];
    if (lastRpcCall == null) {
      throw new Error('Expected builder RPC call for edit path.');
    }
    const payloadValue = lastRpcCall.at(1);
    if (payloadValue == null || typeof payloadValue !== 'object') {
      throw new Error('Expected builder payload for edit path.');
    }
    const payload = payloadValue as Record<string, unknown>;
    expect(payload.form_id).toBe('form-001');
    expect(payload.slug).toBe('db-renamed-form');
  });

  it('saves registration policy with ordered requirements via rpc', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<RegistrationTypesPage />);

    await screen.findByText('Participant');
    await user.type(screen.getByLabelText('Registration type'), 'Leader');
    const scopeGroup = screen.getByRole('group', { name: 'Registration scope' });
    await user.click(within(scopeGroup).getByRole('button'));
    await user.click(
      within(scopeGroup).getByRole('option', { name: 'org_only', hidden: true }),
    );
    const eligibilityInput = screen.getByLabelText('Eligibility summary');
    fireEvent.change(eligibilityInput, { target: { value: 'must be active member' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(rpcMock).toHaveBeenCalled();
    const lastRpcCall = rpcMock.mock.calls[rpcMock.mock.calls.length - 1];
    if (lastRpcCall == null) {
      throw new Error('Expected registration policy RPC call.');
    }
    const rpcNameValue = lastRpcCall.at(0);
    const payloadValue = lastRpcCall.at(1);
    if (typeof rpcNameValue !== 'string' || payloadValue == null) {
      throw new Error('Invalid registration policy RPC call shape.');
    }
    const rpcName = rpcNameValue;
    const payload = payloadValue as Record<string, unknown>;
    expect(rpcName).toBe('app_base_registration_policy_upsert');
    expect(payload.event_id).toBe('event-200');
    expect(payload.registration_type_name).toBe('Leader');
    expect(payload.registration_scope).toBe('org_only');
    expect(payload.eligibility_summary).toBe('must be active member');
    const requirements = payload.requirements as Record<string, unknown>;
    expect(Array.isArray(requirements.eligibility_rules)).toBe(true);
    expect(Array.isArray(requirements.requirement_rules)).toBe(true);
    const requirementRules = requirements.requirement_rules as ReadonlyArray<Record<string, unknown>>;
    expect(requirementRules[0]).toMatchObject({
      check_type: 'guardian_approval',
      sort_order: 1,
      is_automated: false,
    });
  });
});
