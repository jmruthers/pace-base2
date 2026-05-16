// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useFormBuilderRecord } from './configuration';

const mocks = vi.hoisted(() => {
  let bindingsRpcArgs: Record<string, unknown> | undefined;

  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === 'data_base_form_registration_bindings_get') {
      bindingsRpcArgs = args;
      return { data: [], error: null };
    }
    return { data: null, error: null };
  });

  const formRow = {
    id: 'form-1',
    name: 'Test',
    title: null,
    description: null,
    slug: 'test',
    status: 'draft' as const,
    workflow_type: 'base_registration' as const,
    access_mode: 'authenticated_member' as const,
    workflow_config: null,
    is_active: true,
    is_primary_entrypoint: false,
    opens_at: null,
    closes_at: null,
    max_submissions: null,
    confirmation_message: null,
    event_id: 'event-1',
    organisation_id: 'org-from-form-row',
    owner_app_id: null,
  };

  const from = vi.fn((table: string) => {
    if (table === 'core_forms') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: formRow, error: null })),
            })),
          })),
        })),
      };
    }
    if (table === 'core_form_fields') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { rpc, from, supabase: { rpc, from }, getBindingsRpcArgs: () => bindingsRpcArgs };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mocks.supabase,
}));

describe('useFormBuilderRecord', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mocks.rpc.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('calls data_base_form_registration_bindings_get with form organisation_id', async () => {
    const { result } = renderHook(() => useFormBuilderRecord('event-1', 'form-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mocks.getBindingsRpcArgs()).toEqual({
      p_form_id: 'form-1',
      p_event_id: 'event-1',
      p_organisation_id: 'org-from-form-row',
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'data_base_form_registration_bindings_get',
      expect.any(Object)
    );
  });
});
