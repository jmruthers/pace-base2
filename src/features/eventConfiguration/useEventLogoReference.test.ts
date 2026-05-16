import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventLogoReference } from './useEventLogoReference';

type QueryConfig = {
  queryFn: () => Promise<unknown>;
  enabled: boolean;
};

const mocks = vi.hoisted(() => {
  const useQuery = vi.fn((config: QueryConfig) => config);
  const state = {
    logoId: null as string | null,
    logoRef: null as Record<string, unknown> | null,
    eventReadError: null as unknown,
    fileReadError: null as unknown,
    fileReferenceReads: 0,
  };

  const secureSupabase = {
    from: (table: string) => {
      if (table === 'core_events') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { logo_id: state.logoId }, error: state.eventReadError }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                state.fileReferenceReads += 1;
                return { data: state.logoRef, error: state.fileReadError };
              },
            }),
          }),
        }),
      };
    },
  };

  return { useQuery, state, secureSupabase };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mocks.secureSupabase,
}));

describe('useEventLogoReference', () => {
  beforeEach(() => {
    mocks.useQuery.mockClear();
    mocks.state.logoId = null;
    mocks.state.logoRef = null;
    mocks.state.eventReadError = null;
    mocks.state.fileReadError = null;
    mocks.state.fileReferenceReads = 0;
  });

  it('returns disabled query when event id is not provided', () => {
    const result = useEventLogoReference(null) as unknown as { enabled: boolean };
    expect(result.enabled).toBe(false);
  });

  it('includes scope discriminators in logo reference query key', () => {
    const result = useEventLogoReference('event-1', {
      organisationId: 'org-1',
      eventId: 'event-1',
      appId: 'app-1',
    }) as unknown as { queryKey: unknown[] };
    expect(result.queryKey).toEqual([
      'event-logo-reference',
      'event-1',
      'org-1',
      'event-1',
      'app-1',
    ]);
  });

  it('returns null without file lookup when logo_id is null', async () => {
    mocks.state.logoId = null;

    const query = useEventLogoReference('event-1') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).resolves.toBeNull();
    expect(mocks.state.fileReferenceReads).toBe(0);
  });

  it('returns referenced public logo when logo_id resolves', async () => {
    mocks.state.logoId = 'logo-ref-1';
    mocks.state.logoRef = { id: 'logo-ref-1', is_public: true };

    const query = useEventLogoReference('event-1') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).resolves.toEqual({ id: 'logo-ref-1', is_public: true });
    expect(mocks.state.fileReferenceReads).toBe(1);
  });

  it('returns null when logo pointer is stale (missing file reference row)', async () => {
    mocks.state.logoId = 'stale-logo-ref';
    mocks.state.logoRef = null;

    const query = useEventLogoReference('event-1') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).resolves.toBeNull();
    expect(mocks.state.fileReferenceReads).toBe(1);
  });
});
