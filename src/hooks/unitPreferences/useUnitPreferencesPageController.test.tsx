// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnitPreferencesPageController } from './useUnitPreferencesPageController';
import type { ActivityPreferenceRow, UnitRow } from '@/features/unitsCoordination/types';

const submitPreferenceSpy = vi.hoisted(() => vi.fn(async () => undefined));

const pageState = vi.hoisted(() => ({
  units: [] as UnitRow[],
  preferences: [] as ActivityPreferenceRow[],
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useEvents: () => ({ selectedEvent: { name: 'Camp One' } }),
  useUnifiedAuth: () => ({
    selectedEvent: { name: 'Camp One' },
    selectedEventId: 'event-1',
    selectedOrganisationId: 'org-1',
    appId: 'base-app',
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({
    organisationId: 'org-1',
    eventId: 'event-1',
    appId: 'base-app',
    isLoading: false,
  }),
  useSecureSupabase: () => ({}),
}));

vi.mock('@/features/unitsCoordination/configuration', () => ({
  useUnitsList: () => ({
    data: pageState.units,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useActivitySessions: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUnitPreferences: () => ({
    data: pageState.preferences,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSubmitterPerson: () => ({ data: null }),
}));

vi.mock('@/features/unitsCoordination/unitsPreferenceMutations', () => ({
  useCreatePreferenceMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePreferenceRankMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePreferenceMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitPreferencesMutation: () => ({ mutateAsync: submitPreferenceSpy, isPending: false }),
}));

vi.mock('@/features/applicationsAdmin/queryHelpers', () => ({
  useRetryRefetchHandler: () => vi.fn(),
  retryRefetch: vi.fn(),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  ShowSuccessMessage: vi.fn(),
  HandleMutationError: vi.fn(),
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
  formatDateTime: (value: string) => value,
}));

function renderControllerHook() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useUnitPreferencesPageController(), { wrapper });
}

describe('BA08 useUnitPreferencesPageController', () => {
  beforeEach(() => {
    submitPreferenceSpy.mockClear();
    pageState.units = [
      {
        id: 'unit-1',
        unit_number: 1,
        unit_name: 'Alpha',
        subcamp: null,
        contingent: null,
        parent_unit_id: null,
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
    ];
    pageState.preferences = [
      {
        id: 'pref-1',
        unit_id: 'unit-1',
        session_id: 'session-1',
        rank: 1,
        submitted_at: null,
        submitted_by: null,
        event_id: 'event-1',
      },
      {
        id: 'pref-2',
        unit_id: 'unit-1',
        session_id: 'session-2',
        rank: 3,
        submitted_at: null,
        submitted_by: null,
        event_id: 'event-1',
      },
    ];
  });

  it('marks rank set invalid when ranks are not contiguous', () => {
    const { result } = renderControllerHook();

    act(() => {
      result.current.setSelectedUnitId('unit-1');
    });

    expect(result.current.isRankSetValid).toBe(false);
  });

  it('marks rank set invalid when duplicate sessions exist', () => {
    pageState.preferences = [
      {
        id: 'pref-1',
        unit_id: 'unit-1',
        session_id: 'session-1',
        rank: 1,
        submitted_at: null,
        submitted_by: null,
        event_id: 'event-1',
      },
      {
        id: 'pref-2',
        unit_id: 'unit-1',
        session_id: 'session-1',
        rank: 2,
        submitted_at: null,
        submitted_by: null,
        event_id: 'event-1',
      },
    ];

    const { result } = renderControllerHook();

    act(() => {
      result.current.setSelectedUnitId('unit-1');
    });

    expect(result.current.isRankSetValid).toBe(false);
  });
});
