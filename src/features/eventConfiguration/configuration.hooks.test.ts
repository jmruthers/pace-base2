import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useEventConfigurationRecord,
  useSaveEventConfiguration,
  useSaveEventLogoPointer,
} from './configuration';
import type { EventConfigurationFormValues } from './types';

const mocks = vi.hoisted(() => {
  const secureSupabaseState: {
    client: {
      rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      from: (table: string) => {
        select: (...args: unknown[]) => {
          eq: (...args: unknown[]) => {
            single: () => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    } | null;
  } = {
    client: null,
  };

  const useQuery = vi.fn((config: Record<string, unknown>) => config);
  const useMutation = vi.fn(({ mutationFn }: { mutationFn: (params: unknown) => Promise<unknown> }) => ({
    mutateAsync: mutationFn,
  }));

  return {
    secureSupabaseState,
    useQuery,
    useMutation,
  };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mocks.secureSupabaseState.client,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));

function createValues(overrides: Partial<EventConfigurationFormValues> = {}): EventConfigurationFormValues {
  return {
    event_name: 'Sample Event',
    event_code: 'ABC',
    event_email: 'event@example.com',
    event_date: new Date('2026-05-12T00:00:00.000Z'),
    event_days: 2,
    event_venue: undefined,
    expected_participants: 100,
    typical_unit_size: 5,
    description: 'Description',
    registration_scope: 'hierarchy',
    is_visible: true,
    event_colours: '{"primary":"#000000"}',
    ...overrides,
  };
}

describe('eventConfiguration configuration hooks', () => {
  beforeEach(() => {
    mocks.useQuery.mockClear();
    mocks.useMutation.mockClear();
    mocks.secureSupabaseState.client = null;
  });

  it('returns disabled query when event id is not provided', () => {
    const result = useEventConfigurationRecord(null) as unknown as { enabled: boolean };
    expect(result.enabled).toBe(false);
  });

  it('includes scope discriminators in event configuration query key', () => {
    const result = useEventConfigurationRecord('event-1', {
      organisationId: 'org-1',
      eventId: 'event-1',
      appId: 'app-1',
    }) as unknown as { queryKey: unknown[] };
    expect(result.queryKey).toEqual([
      'event-configuration-record',
      'event-1',
      'org-1',
      'event-1',
      'app-1',
    ]);
  });

  it('query function resolves with record when supabase read succeeds', async () => {
    mocks.secureSupabaseState.client = {
      rpc: async () => ({ data: null, error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { event_name: 'Camp', event_days: 2, registration_scope: 'hierarchy' },
              error: null,
            }),
          }),
        }),
      }),
    };

    const query = useEventConfigurationRecord('event-1') as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(query.queryFn()).resolves.toEqual({
      event_name: 'Camp',
      event_days: 2,
      registration_scope: 'hierarchy',
    });
  });

  it('query function throws when supabase read returns an error', async () => {
    mocks.secureSupabaseState.client = {
      rpc: async () => ({ data: null, error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: 'read failed' }),
          }),
        }),
      }),
    };

    const query = useEventConfigurationRecord('event-1') as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(query.queryFn()).rejects.toBe('read failed');
  });

  it('mutation throws when secure supabase is unavailable', async () => {
    const mutation = useSaveEventConfiguration() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await expect(
      mutation.mutateAsync({
        eventId: 'event-1',
        userId: 'user-1',
        values: createValues(),
      })
    ).rejects.toThrow('Supabase client is not available');
  });

  it('mutation returns saved row when configuration RPC succeeds', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ event_name: 'Saved Event', updated_by: 'user-1' }],
      error: null,
    }));
    mocks.secureSupabaseState.client = {
      rpc,
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const mutation = useSaveEventConfiguration() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await expect(
      mutation.mutateAsync({
        eventId: 'event-1',
        userId: 'user-1',
        values: createValues({ event_name: 'Saved Event' }),
      })
    ).resolves.toEqual({
      event_name: 'Saved Event',
      updated_by: 'user-1',
    });
    expect(rpc).toHaveBeenCalledWith(
      'app_event_configuration_update',
      expect.objectContaining({
        p_event_id: 'event-1',
      })
    );
  });

  it('mutation preserves original PostgREST-style 406 error object', async () => {
    const postgrestError = {
      code: 'PGRST301',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'Results contain 0 rows, application/vnd.pgrst.object+json requires 1 row',
      hint: null,
      status: 406,
    };

    mocks.secureSupabaseState.client = {
      rpc: async () => ({ data: null, error: postgrestError }),
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const mutation = useSaveEventConfiguration() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await expect(
      mutation.mutateAsync({
        eventId: 'event-1',
        userId: 'user-1',
        values: createValues(),
      })
    ).rejects.toBe(postgrestError);
  });

  it('mutation throws scoped zero-row diagnostics when update returns no row', async () => {
    mocks.secureSupabaseState.client = {
      rpc: async () => ({ data: [], error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const mutation = useSaveEventConfiguration() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await expect(
      mutation.mutateAsync({
        eventId: 'event-1',
        userId: 'user-1',
        organisationId: 'org-1',
        scopeEventId: 'event-1',
        appId: 'app-1',
        values: createValues(),
      })
    ).rejects.toMatchObject({
      code: 'configuration-save-no-row',
      category: 'permission_or_policy',
      details: {
        eventId: 'event-1',
        organisationId: 'org-1',
        scopeEventId: 'event-1',
        appId: 'app-1',
      },
    });
  });

  it('mutation uses secure supabase RPC write path', async () => {
    const secureRpc = vi.fn(async () => ({
      data: [{ event_name: 'Saved Event' }],
      error: null,
    }));
    const secureFrom = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }));
    mocks.secureSupabaseState.client = { rpc: secureRpc, from: secureFrom };

    const mutation = useSaveEventConfiguration() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await mutation.mutateAsync({
      eventId: 'event-1',
      userId: 'user-1',
      values: createValues({ event_name: 'Saved Event' }),
    });

    expect(secureRpc).toHaveBeenCalledWith(
      'app_event_configuration_update',
      expect.objectContaining({
        p_event_id: 'event-1',
      })
    );
  });

  it('logo pointer mutation throws when secure supabase is unavailable', async () => {
    const mutation = useSaveEventLogoPointer() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await expect(
      mutation.mutateAsync({
        eventId: 'event-1',
        logoId: 'logo-ref-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Supabase client is not available');
  });

  it('logo pointer mutation updates core_events.logo_id when RPC succeeds', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ event_id: 'event-1', logo_id: 'logo-ref-1' }],
      error: null,
    }));
    mocks.secureSupabaseState.client = {
      rpc,
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const mutation = useSaveEventLogoPointer() as { mutateAsync: (params: unknown) => Promise<unknown> };
    await expect(
      mutation.mutateAsync({
        eventId: 'event-1',
        logoId: 'logo-ref-1',
        userId: 'user-1',
      })
    ).resolves.toEqual({
      event_id: 'event-1',
      logo_id: 'logo-ref-1',
    });
    expect(rpc).toHaveBeenCalledWith(
      'app_event_logo_pointer_update',
      expect.objectContaining({
        p_event_id: 'event-1',
        p_logo_id: 'logo-ref-1',
      })
    );
  });
});
