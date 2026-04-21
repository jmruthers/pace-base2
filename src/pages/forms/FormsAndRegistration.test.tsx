/* @vitest-environment jsdom */

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormsListPage } from './FormsListPage';
import { FormBuilderPage } from './FormBuilderPage';
import { RegistrationTypesPage } from '@/pages/registration/RegistrationTypesPage';

const mockAuthState = {
  selectedEvent: { id: 'event-200' } as Record<string, unknown> | null,
};

const rpcMock = vi.fn(async () => ({ error: null }));
const mockSecureSupabase = {
  rpc: rpcMock,
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
    }: {
      children: ReactNode;
      className?: string;
    }) => createElement('section', { className }, children),
  };
});

describe('BA03 and BA04 route surfaces', () => {
  beforeEach(() => {
    rpcMock.mockClear();
    mockAuthState.selectedEvent = { id: 'event-200' };
  });

  afterEach(() => {
    cleanup();
  });

  it('shows event-scoped forms list with preview/share links', () => {
    render(
      <MemoryRouter>
        <FormsListPage />
      </MemoryRouter>
    );

    expect(screen.queryByText('Event scope: event-200')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Create or edit forms' })).not.toBeNull();
    expect(screen.queryAllByRole('link', { name: 'Preview' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('link', { name: 'Share' }).length).toBeGreaterThan(0);
  });

  it('saves builder payload via backend-owned rpc contract', async () => {
    const user = userEvent.setup();
    render(<FormBuilderPage />);

    await user.type(screen.getByLabelText('Form title'), 'Policy form');
    await user.type(screen.getByLabelText('Form slug'), 'policy-form');
    await user.type(screen.getByLabelText('Semantic field key'), 'guardian_email');
    await user.click(screen.getByRole('button', { name: 'Save form definition' }));

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
  });

  it('saves registration policy with ordered requirements via rpc', async () => {
    const user = userEvent.setup();
    render(<RegistrationTypesPage />);

    await user.type(screen.getByLabelText('Registration type'), 'Leader');
    await user.type(screen.getByLabelText('Registration scope'), 'member');
    await user.type(screen.getByLabelText('Eligibility summary'), 'must be active member');
    await user.click(screen.getByRole('button', { name: 'Save registration policy' }));

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
    expect(payload.registration_scope).toBe('member');
    expect(Array.isArray(payload.requirements)).toBe(true);
  });
});
