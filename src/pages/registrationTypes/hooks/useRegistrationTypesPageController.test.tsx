// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegistrationTypesPageController } from './useRegistrationTypesPageController';

const mocks = vi.hoisted(() => {
  const toast = vi.fn();
  const showSuccess = vi.fn();
  const handleMutationError = vi.fn();
  const invalidateQueries = vi.fn();
  const getQueryData = vi.fn();
  const refetchRequirements = vi.fn(async () => ({ data: [] as unknown[] }));
  const upsertMutateAsync = vi.fn(async () => 'type-1');
  const activeMutateAsync = vi.fn(async () => ({ registration_type_id: 'type-1', is_active: true }));

  const listData = {
    types: [
      {
        id: 'type-1',
        name: 'Youth',
        description: 'Sample type',
        eligibility_message: null,
        cost: 1000,
        capacity: null,
        is_active: true,
        sort_order: 0,
        organisation_id: 'org-1',
        event_id: 'event-1',
        created_at: null,
      },
    ],
    eligibilityCountsByTypeId: { 'type-1': 1 },
    eligibilityByTypeId: {
      'type-1': [{ registration_type_id: 'type-1', rule_type: 'membership_type', value: '7' }],
    },
  };

  return {
    toast,
    showSuccess,
    handleMutationError,
    invalidateQueries,
    getQueryData,
    refetchRequirements,
    upsertMutateAsync,
    activeMutateAsync,
    listData,
  };
});

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: mocks.toast }),
  useUnifiedAuth: () => ({
    selectedOrganisationId: 'org-1',
    selectedEventId: 'event-1',
    appId: 'base-app',
  }),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  ShowSuccessMessage: (...args: unknown[]) => mocks.showSuccess(...args),
  HandleMutationError: (...args: unknown[]) => mocks.handleMutationError(...args),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
      getQueryData: mocks.getQueryData,
    }),
  };
});

vi.mock('@/features/registrationSetup/configuration', () => ({
  useRegistrationTypesList: () => ({
    data: mocks.listData,
    isLoading: false,
    error: null,
  }),
  useRegistrationTypeUpsertMutation: () => ({
    isPending: false,
    mutateAsync: mocks.upsertMutateAsync,
  }),
  useSetRegistrationTypeActiveMutation: () => ({
    mutateAsync: mocks.activeMutateAsync,
  }),
  useRequirementsForType: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: mocks.refetchRequirements,
  }),
  useMembershipTypesForEvent: () => ({
    data: [{ id: 7, name: 'Member' }],
  }),
  useReviewingOrganisationsForEvent: () => ({
    data: [{ id: 'org-child-1', name: 'Child Org', display_name: null }],
  }),
}));

describe('useRegistrationTypesPageController', () => {
  beforeEach(() => {
    mocks.toast.mockClear();
    mocks.showSuccess.mockClear();
    mocks.handleMutationError.mockClear();
    mocks.invalidateQueries.mockClear();
    mocks.getQueryData.mockReset();
    mocks.refetchRequirements.mockClear();
    mocks.upsertMutateAsync.mockClear();
    mocks.activeMutateAsync.mockClear();
  });

  it('opens create dialog with reset draft and edit step', () => {
    const { result } = renderHook(() => useRegistrationTypesPageController());

    act(() => {
      result.current.openCreateDialog();
    });

    expect(result.current.typeDialogOpen).toBe(true);
    expect(result.current.typeDialogStep).toBe('edit');
    expect(result.current.typeDraft.name).toBe('');
    expect(result.current.eligibilityDrafts).toEqual([]);
  });

  it('reorders requirements on drag end after opening requirements dialog', () => {
    mocks.getQueryData.mockReturnValue([
      { id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null },
      { id: 'req-2', check_type: 'referee', sort_order: 1, is_automated: false, config: null },
    ]);
    const { result } = renderHook(() => useRegistrationTypesPageController());
    const row = mocks.listData.types[0];

    act(() => {
      result.current.openRequirementsDialog(row);
    });

    act(() => {
      result.current.handleRequirementDragEnd({
        active: { id: 'req-2' },
        over: { id: 'req-1' },
      } as never);
    });

    expect(result.current.requirementDraftRows.map((entry) => entry.localId)).toEqual(['req-2', 'req-1']);
    expect(result.current.requirementDraftRows.map((entry) => entry.sort_order)).toEqual([0, 1]);
  });

  it('keeps type dialog in edit step and populates validation errors when save data is invalid', async () => {
    const { result } = renderHook(() => useRegistrationTypesPageController());

    act(() => {
      result.current.openCreateDialog();
    });

    await act(async () => {
      await result.current.saveType();
    });

    expect(result.current.typeDialogStep).toBe('edit');
    expect(result.current.typeValidationErrors.name).toBe('Name is required.');
    expect(mocks.upsertMutateAsync).not.toHaveBeenCalled();
  });

  it('surfaces designated organisation validation when saving invalid requirements', async () => {
    mocks.getQueryData.mockReturnValue([
      {
        id: 'req-1',
        check_type: 'designated_org_review',
        sort_order: 0,
        is_automated: false,
        config: null,
      },
    ]);
    const { result } = renderHook(() => useRegistrationTypesPageController());
    const row = mocks.listData.types[0];

    act(() => {
      result.current.openRequirementsDialog(row);
    });

    await act(async () => {
      await result.current.saveRequirements();
    });

    expect(result.current.designatedOrgErrors['req-1']).toBe('Select a reviewing organisation');
    expect(mocks.upsertMutateAsync).not.toHaveBeenCalled();
  });

  it('saves existing type after confirmation and refetches latest requirements snapshot', async () => {
    mocks.getQueryData.mockReturnValue([
      { id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null },
    ]);
    mocks.refetchRequirements.mockResolvedValueOnce({
      data: [{ id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null }],
    });
    const { result } = renderHook(() => useRegistrationTypesPageController());
    const row = mocks.listData.types[0];

    act(() => {
      result.current.openEditDialog(row);
    });
    act(() => {
      result.current.setTypeDraft({ ...result.current.typeDraft, name: 'Updated name' });
    });

    await act(async () => {
      await result.current.saveType();
    });
    expect(result.current.typeDialogStep).toBe('confirm');

    await act(async () => {
      await result.current.saveType();
    });

    expect(mocks.refetchRequirements).toHaveBeenCalled();
    expect(mocks.upsertMutateAsync).toHaveBeenCalled();
    expect(mocks.showSuccess).toHaveBeenCalledWith('Saved registration type settings.', mocks.toast);
    expect(result.current.typeDialogOpen).toBe(false);
  });

  it('reverts active override and reports mutation error when toggle fails', async () => {
    mocks.activeMutateAsync.mockRejectedValueOnce(new Error('toggle failed'));
    const { result } = renderHook(() => useRegistrationTypesPageController());
    const row = mocks.listData.types[0];

    await act(async () => {
      await result.current.handleToggleActive(row, false);
    });

    expect(result.current.activeOverrides[row.id]).toBe(true);
    expect(mocks.handleMutationError).toHaveBeenCalled();
  });
});
