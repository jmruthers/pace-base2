// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnitsPageController } from './useUnitsPageController';
import type { UnitRow } from '@/features/unitsCoordination/types';
import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';

const toastSpy = vi.hoisted(() => vi.fn());
const updateUnitMutate = vi.hoisted(() => vi.fn(async () => undefined));

const unitsState = vi.hoisted(() => ({
  units: [] as UnitRow[],
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: toastSpy }),
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
    data: unitsState.units,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRoleTypesList: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useApprovedApplications: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUnitRoleAssignments: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/features/unitsCoordination/unitsUnitAndRoleMutations', () => ({
  useCreateUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateUnitMutation: () => ({ mutateAsync: updateUnitMutate, isPending: false }),
  useDeleteUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRoleTypeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRoleTypeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRoleTypeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignRoleMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRoleAssignmentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/features/applicationsAdmin/queryHelpers', () => ({
  useRetryRefetchHandler: () => vi.fn(),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  ShowSuccessMessage: vi.fn(),
  HandleMutationError: vi.fn(),
}));

function renderControllerHook() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useUnitsPageController(), { wrapper });
}

describe('BA08 useUnitsPageController', () => {
  beforeEach(() => {
    updateUnitMutate.mockClear();
    unitsState.units = [
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
      {
        id: 'unit-2',
        unit_number: 2,
        unit_name: 'Beta',
        subcamp: null,
        contingent: null,
        parent_unit_id: 'unit-1',
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
    ];
  });

  it('rejects update that would create a circular parent reference', async () => {
    const { HandleMutationError } = await import('@solvera/pace-core/utils');
    const { result } = renderControllerHook();

    const row: UnitsTableRow = {
      id: 'unit-1',
      unit_number: 1,
      unit_name: 'Alpha',
      subcamp: null,
      contingent: null,
      parent_unit_id: null,
      event_id: 'event-1',
      created_at: null,
      updated_at: null,
      parent_unit_label: '',
    };

    await expect(
      act(async () => {
        await result.current.handleUpdateUnit(row, { parent_unit_id: 'unit-2' });
      })
    ).rejects.toThrow('This assignment would create a circular unit reference.');

    expect(updateUnitMutate).not.toHaveBeenCalled();
    expect(HandleMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      'units-update',
      toastSpy
    );
  });
});
