import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardCounts } from './dashboard';

type QueryLike = {
  queryFn: () => Promise<number | null>;
  enabled: boolean;
};

const mocks = vi.hoisted(() => {
  const queryResults = [
    { data: 0 as number | undefined, isLoading: false, isError: false },
    { data: 0 as number | undefined, isLoading: false, isError: false },
    { data: 0 as number | undefined, isLoading: false, isError: false },
    { data: 0 as number | undefined, isLoading: false, isError: false },
    { data: 0 as number | undefined, isLoading: false, isError: false },
  ];

  const latestQueries: QueryLike[] = [];
  const useQueries = vi.fn(({ queries }: { queries: QueryLike[] }) => {
    latestQueries.splice(0, latestQueries.length, ...queries);
    return queryResults;
  });

  const secureSupabaseState: {
    client: {
      from: (tableName: string) => {
        select: (...args: unknown[]) => {
          eq: (...args: unknown[]) => Promise<{ count: number | null; error: unknown }>;
        };
      };
    } | null;
  } = {
    client: null,
  };

  return { queryResults, latestQueries, useQueries, secureSupabaseState };
});

vi.mock('@tanstack/react-query', () => ({
  useQueries: mocks.useQueries,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mocks.secureSupabaseState.client,
}));

describe('eventConfiguration dashboard counts hook', () => {
  beforeEach(() => {
    mocks.queryResults[0] = { data: 0, isLoading: false, isError: false };
    mocks.queryResults[1] = { data: 0, isLoading: false, isError: false };
    mocks.queryResults[2] = { data: 0, isLoading: false, isError: false };
    mocks.queryResults[3] = { data: 0, isLoading: false, isError: false };
    mocks.queryResults[4] = { data: 0, isLoading: false, isError: false };
    mocks.latestQueries.splice(0, mocks.latestQueries.length);
    mocks.secureSupabaseState.client = null;
  });

  it('disables all count queries when event id is null', () => {
    useDashboardCounts(null);
    expect(mocks.latestQueries).toHaveLength(5);
    expect(mocks.latestQueries.every((query) => query.enabled === false)).toBe(true);
  });

  it('returns loading summary when any count query is loading', () => {
    mocks.queryResults[0] = { data: undefined, isLoading: true, isError: false };
    const result = useDashboardCounts('event-1');
    expect(result.isLoading).toBe(true);
    expect(result.forms).toBeNull();
  });

  it('query functions return counts from supabase for each dashboard metric', async () => {
    const countsByTable: Record<string, number> = {
      core_forms: 4,
      base_application: 6,
      base_registration_type: 2,
      base_units: 1,
      base_activity_offering: 3,
    };
    mocks.secureSupabaseState.client = {
      from: (tableName: string) => ({
        select: () => ({
          eq: async () => ({ count: countsByTable[tableName] ?? 0, error: null }),
        }),
      }),
    };

    useDashboardCounts('event-1');
    await expect(mocks.latestQueries[0]?.queryFn()).resolves.toBe(4);
    await expect(mocks.latestQueries[1]?.queryFn()).resolves.toBe(6);
    await expect(mocks.latestQueries[2]?.queryFn()).resolves.toBe(2);
  });

  it('query function returns null when supabase count query fails', async () => {
    mocks.secureSupabaseState.client = {
      from: () => ({
        select: () => ({
          eq: async () => ({ count: null, error: 'count failed' }),
        }),
      }),
    };

    useDashboardCounts('event-1');
    await expect(mocks.latestQueries[0]?.queryFn()).resolves.toBeNull();
  });
});
