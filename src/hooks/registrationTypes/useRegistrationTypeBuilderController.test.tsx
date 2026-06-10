// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegistrationTypeBuilderController } from './useRegistrationTypeBuilderController';

const mocks = vi.hoisted(() => {
  const toast = vi.fn();
  const showSuccess = vi.fn();
  const handleMutationError = vi.fn();
  const invalidateQueries = vi.fn();
  const getQueryData = vi.fn();
  const refetchRequirements = vi.fn(async () => ({ data: [] as unknown[] }));
  const upsertMutateAsync = vi.fn(async () => 'type-1');
  const setSearchParams = vi.fn();
  let registrationTypeId: string | null = null;

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
    setSearchParams,
    get registrationTypeId() {
      return registrationTypeId;
    },
    set registrationTypeId(value: string | null) {
      registrationTypeId = value;
    },
    listData,
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useSearchParams: () => [
      {
        get: (key: string) => (key === 'registrationTypeId' ? mocks.registrationTypeId : null),
      },
      mocks.setSearchParams,
    ],
  };
});

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: mocks.toast }),
  useUnifiedAuth: () => ({
    selectedOrganisationId: 'org-1',
    selectedEventId: 'event-1',
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({
    organisationId: 'org-1',
    eventId: 'event-1',
    appId: 'base-app',
    isLoading: false,
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

describe('useRegistrationTypeBuilderController', () => {
  beforeEach(() => {
    mocks.registrationTypeId = null;
    mocks.toast.mockClear();
    mocks.showSuccess.mockClear();
    mocks.handleMutationError.mockClear();
    mocks.invalidateQueries.mockClear();
    mocks.getQueryData.mockReset();
    mocks.refetchRequirements.mockClear();
    mocks.upsertMutateAsync.mockClear();
    mocks.setSearchParams.mockClear();
  });

  it('starts with empty draft in create mode', () => {
    const { result } = renderHook(() => useRegistrationTypeBuilderController());
    expect(result.current.typeDraft.name).toBe('');
    expect(result.current.workflowEnabled).toBe(false);
  });

  it('reorders requirements when move up is used in edit mode', async () => {
    mocks.registrationTypeId = 'type-1';
    mocks.getQueryData.mockReturnValue([
      { id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null },
      { id: 'req-2', check_type: 'referee', sort_order: 1, is_automated: false, config: null },
    ]);
    const { result } = renderHook(() => useRegistrationTypeBuilderController());

    act(() => {
      result.current.reorderRequirement('req-2', 'req-1');
    });

    expect(result.current.requirementDraftRows.map((entry: { localId: string }) => entry.localId)).toEqual([
      'req-2',
      'req-1',
    ]);
  });

  it('populates validation errors when save data is invalid', async () => {
    const { result } = renderHook(() => useRegistrationTypeBuilderController());

    await act(async () => {
      await result.current.saveType();
    });

    expect(result.current.typeValidationErrors.name).toBe('Name is required.');
    expect(mocks.upsertMutateAsync).not.toHaveBeenCalled();
  });

  it('populates cost and capacity validation errors when values are invalid', async () => {
    const { result } = renderHook(() => useRegistrationTypeBuilderController());

    act(() => {
      result.current.setTypeDraft({
        ...result.current.typeDraft,
        name: 'Youth camp',
        costDollars: '-1',
        capacity: '0',
      });
    });

    await act(async () => {
      await result.current.saveType();
    });

    expect(result.current.typeValidationErrors.costDollars).toBe(
      'Cost must be a valid amount greater than or equal to 0.'
    );
    expect(result.current.typeValidationErrors.capacity).toBe(
      'Capacity must be an integer greater than or equal to 1.'
    );
    expect(mocks.upsertMutateAsync).not.toHaveBeenCalled();
  });

  it('surfaces designated organisation validation when saving invalid workflow', async () => {
    mocks.registrationTypeId = 'type-1';
    mocks.getQueryData.mockReturnValue([
      {
        id: 'req-1',
        check_type: 'designated_org_review',
        sort_order: 0,
        is_automated: false,
        config: null,
      },
    ]);
    const { result } = renderHook(() => useRegistrationTypeBuilderController());

    await act(async () => {
      await result.current.saveWorkflow();
    });

    expect(result.current.designatedOrgErrors['req-1']).toBe('Select a reviewing organisation');
    expect(mocks.upsertMutateAsync).not.toHaveBeenCalled();
  });

  it('saves existing type and refetches latest requirements snapshot', async () => {
    mocks.registrationTypeId = 'type-1';
    mocks.getQueryData.mockReturnValue([
      { id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null },
    ]);
    mocks.refetchRequirements.mockResolvedValueOnce({
      data: [{ id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null }],
    });
    const { result } = renderHook(() => useRegistrationTypeBuilderController());

    act(() => {
      result.current.setTypeDraft({ ...result.current.typeDraft, name: 'Updated name' });
    });

    await act(async () => {
      await result.current.saveType();
    });

    expect(mocks.refetchRequirements).toHaveBeenCalled();
    expect(mocks.upsertMutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.showSuccess).toHaveBeenCalledWith('Saved registration type settings.', mocks.toast);
  });

  it('sets registrationTypeId in URL after first create save', async () => {
    const { result } = renderHook(() => useRegistrationTypeBuilderController());

    act(() => {
      result.current.setTypeDraft({
        ...result.current.typeDraft,
        name: 'New type',
        costDollars: '0',
      });
    });

    await act(async () => {
      await result.current.saveType();
    });

    expect(mocks.setSearchParams).toHaveBeenCalledWith({ registrationTypeId: 'type-1' }, { replace: true });
  });
});
