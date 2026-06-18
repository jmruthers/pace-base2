import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRegistrationTypeDeleteBlockers,
  useDeleteRegistrationTypeMutation,
  useMembershipTypesForEvent,
  useRegistrationTypeUpsertMutation,
  useRegistrationTypesList,
  useRequirementsForType,
  useReviewingOrganisationsForEvent,
  useSetRegistrationTypeActiveMutation,
} from './configuration';
import type { RegistrationTypeUpsertPayload } from './types.rpc';

type SelectResult = { data: unknown; error: unknown };

const mocks = vi.hoisted(() => {
  const store = {
    registrationTypes: [] as unknown[],
    eligibilityRows: [] as unknown[],
    applicationRows: [] as unknown[],
    requirementsRows: [] as unknown[],
    eventOrganisation: { organisation_id: 'org-1' } as { organisation_id: string | null },
    membershipRows: [] as unknown[],
    organisationRows: [] as unknown[],
    descendants: ['org-child-1'] as string[],
    rpcError: null as unknown,
    upsertResponse: [{ registration_type_id: 'type-1' }] as Array<{ registration_type_id: string }>,
    setActiveResponse: [{ registration_type_id: 'type-1', is_active: true }] as Array<{
      registration_type_id: string;
      is_active: boolean;
    }>,
    deleteResponse: [
      { deleted: true, application_count: 0, form_binding_count: 0 },
    ] as Array<{ deleted: boolean; application_count: number; form_binding_count: number }>,
    tableErrors: {} as Record<string, unknown>,
  };

  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        const chain = {
          eq: vi.fn(() => chain),
          neq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          order: vi.fn(async () => {
            if (table === 'base_registration_type') {
              return { data: store.registrationTypes, error: store.tableErrors[table] ?? null };
            }
            if (table === 'base_registration_type_eligibility') {
              return { data: store.eligibilityRows, error: store.tableErrors[table] ?? null };
            }
            if (table === 'base_registration_type_requirement') {
              return { data: store.requirementsRows, error: store.tableErrors[table] ?? null };
            }
            if (table === 'core_membership_type') {
              return { data: store.membershipRows, error: store.tableErrors[table] ?? null };
            }
            if (table === 'core_organisations') {
              return { data: store.organisationRows, error: store.tableErrors[table] ?? null };
            }
            if (table === 'base_application') {
              return { data: store.applicationRows, error: store.tableErrors[table] ?? null };
            }
            return { data: [], error: store.tableErrors[table] ?? null };
          }),
          single: vi.fn(async () => ({ data: store.eventOrganisation, error: store.tableErrors[table] ?? null })),
        };
        return chain;
      }),
    })),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>): Promise<SelectResult> => {
      if (name === 'get_org_descendants') {
        return { data: store.descendants, error: null };
      }
      if (name === 'app_base_registration_type_upsert') {
        return { data: store.upsertResponse, error: store.rpcError };
      }
      if (name === 'app_base_registration_type_set_active') {
        return { data: store.setActiveResponse, error: store.rpcError };
      }
      if (name === 'app_base_registration_type_delete') {
        return { data: store.deleteResponse, error: store.rpcError };
      }
      return { data: { name, args }, error: null };
    }),
  };

  const useQuery = vi.fn((config: Record<string, unknown>) => config);
  const useMutation = vi.fn(({ mutationFn }: { mutationFn: (params: unknown) => Promise<unknown> }) => ({
    mutateAsync: mutationFn,
  }));

  return {
    store,
    supabase,
    useQuery,
    useMutation,
  };
});

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mocks.supabase,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
}));

describe('registrationSetup configuration hooks', () => {
  beforeEach(() => {
    mocks.store.registrationTypes = [];
    mocks.store.eligibilityRows = [];
    mocks.store.requirementsRows = [];
    mocks.store.membershipRows = [];
    mocks.store.organisationRows = [];
    mocks.store.descendants = ['org-child-1'];
    mocks.store.eventOrganisation = { organisation_id: 'org-1' };
    mocks.store.rpcError = null;
    mocks.store.upsertResponse = [{ registration_type_id: 'type-1' }];
    mocks.store.setActiveResponse = [{ registration_type_id: 'type-1', is_active: true }];
    mocks.store.deleteResponse = [{ deleted: true, application_count: 0, form_binding_count: 0 }];
    mocks.store.tableErrors = {};
  });

  it('aggregates registration types and eligibility counts', async () => {
    mocks.store.registrationTypes = [
      { id: 'type-2', name: 'Zulu', sort_order: null },
      { id: 'type-1', name: 'Alpha', sort_order: 1 },
    ];
    mocks.store.eligibilityRows = [
      { registration_type_id: 'type-1', rule_type: 'membership_type', value: '1' },
      { registration_type_id: 'type-1', rule_type: 'dob_after', value: '2020-01-01' },
    ];

    const query = useRegistrationTypesList('event-1') as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(query.queryFn()).resolves.toEqual({
      types: [
        { id: 'type-1', name: 'Alpha', sort_order: 1 },
        { id: 'type-2', name: 'Zulu', sort_order: null },
      ],
      eligibilityCountsByTypeId: { 'type-1': 2 },
      applicationCountsByTypeId: {},
      eligibilityByTypeId: {
        'type-1': [
          { registration_type_id: 'type-1', rule_type: 'membership_type', value: '1' },
          { registration_type_id: 'type-1', rule_type: 'dob_after', value: '2020-01-01' },
        ],
      },
    });
  });

  it('returns requirements rows for a type and supports enabled gate', async () => {
    const disabled = useRequirementsForType(null, true) as unknown as { enabled: boolean };
    expect(disabled.enabled).toBe(false);

    mocks.store.requirementsRows = [
      { id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null },
    ];
    const enabled = useRequirementsForType('type-1', true) as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(enabled.queryFn()).resolves.toEqual([
      { id: 'req-1', check_type: 'payment', sort_order: 0, is_automated: true, config: null },
    ]);
  });

  it('resolves membership and reviewing organisations from event organisation context', async () => {
    mocks.store.membershipRows = [{ id: 2, name: 'Member' }];
    mocks.store.organisationRows = [{ id: 'org-child-1', name: 'Child Org', display_name: null }];

    const membershipQuery = useMembershipTypesForEvent('event-1', true) as unknown as {
      queryFn: () => Promise<unknown>;
    };
    const organisationsQuery = useReviewingOrganisationsForEvent('event-1', true) as unknown as {
      queryFn: () => Promise<unknown>;
    };

    await expect(membershipQuery.queryFn()).resolves.toEqual([{ id: 2, name: 'Member' }]);
    await expect(organisationsQuery.queryFn()).resolves.toEqual([
      { id: 'org-child-1', name: 'Child Org', display_name: null },
    ]);
  });

  it('upsert and set-active mutations return ids/results on success', async () => {
    const upsert = useRegistrationTypeUpsertMutation() as {
      mutateAsync: (payload: RegistrationTypeUpsertPayload) => Promise<unknown>;
    };
    const setActive = useSetRegistrationTypeActiveMutation() as {
      mutateAsync: (params: unknown) => Promise<unknown>;
    };

    await expect(
      upsert.mutateAsync({
        p_event_id: 'event-1',
        p_organisation_id: 'org-1',
        p_registration_type_id: null,
        p_registration_type: {
          name: 'New Type',
          description: null,
          eligibility_message: null,
          cost: 0,
          capacity: null,
          is_active: false,
          sort_order: null,
          pre_submission_checks: [],
        },
        p_eligibility_rules: [],
        p_requirement_rules: [],
      })
    ).resolves.toBe('type-1');

    await expect(
      setActive.mutateAsync({
        eventId: 'event-1',
        registrationTypeId: 'type-1',
        isActive: true,
      })
    ).resolves.toEqual({ registration_type_id: 'type-1', is_active: true });
  });

  it('throws when list read returns an error', async () => {
    mocks.store.tableErrors.base_registration_type = 'types failed';
    const query = useRegistrationTypesList('event-1') as unknown as { queryFn: () => Promise<unknown> };
    await expect(query.queryFn()).rejects.toThrow('types failed');
  });

  it('returns empty lists when event has no organisation or no descendants', async () => {
    mocks.store.eventOrganisation = { organisation_id: null };
    const membershipQuery = useMembershipTypesForEvent('event-1', true) as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(membershipQuery.queryFn()).resolves.toEqual([]);

    mocks.store.eventOrganisation = { organisation_id: 'org-1' };
    mocks.store.descendants = ['org-1'];
    const orgQuery = useReviewingOrganisationsForEvent('event-1', true) as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(orgQuery.queryFn()).resolves.toEqual([]);
  });

  it('delete mutation returns first RPC row', async () => {
    const del = useDeleteRegistrationTypeMutation() as {
      mutateAsync: (params: unknown) => Promise<unknown>;
    };
    await expect(
      del.mutateAsync({ eventId: 'event-1', registrationTypeId: 'type-1' })
    ).resolves.toEqual({
      deleted: true,
      application_count: 0,
      form_binding_count: 0,
    });
  });

  it('getRegistrationTypeDeleteBlockers returns ApiResult when supabase is unavailable', async () => {
    const result = await getRegistrationTypeDeleteBlockers(null, 'event-1', 'type-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Supabase client unavailable');
    }
  });

  it('delete mutation surfaces normalized messages for object-shaped rpc errors', async () => {
    mocks.store.rpcError = {
      message: 'Registration type cannot be deleted while applications exist',
      code: 'P0001',
    };
    const del = useDeleteRegistrationTypeMutation() as {
      mutateAsync: (params: unknown) => Promise<unknown>;
    };
    await expect(
      del.mutateAsync({ eventId: 'event-1', registrationTypeId: 'type-1' })
    ).rejects.toThrow('Registration type cannot be deleted while applications exist');
  });

  it('throws for upsert/set-active rpc errors and missing rpc payload results', async () => {
    const upsert = useRegistrationTypeUpsertMutation() as {
      mutateAsync: (payload: RegistrationTypeUpsertPayload) => Promise<unknown>;
    };
    const setActive = useSetRegistrationTypeActiveMutation() as {
      mutateAsync: (params: unknown) => Promise<unknown>;
    };

    mocks.store.rpcError = 'rpc failed';
    await expect(
      upsert.mutateAsync({
        p_event_id: 'event-1',
        p_organisation_id: 'org-1',
        p_registration_type_id: null,
        p_registration_type: {
          name: 'New Type',
          description: null,
          eligibility_message: null,
          cost: 0,
          capacity: null,
          is_active: false,
          sort_order: null,
          pre_submission_checks: [],
        },
        p_eligibility_rules: [],
        p_requirement_rules: [],
      })
    ).rejects.toThrow('rpc failed');
    await expect(
      setActive.mutateAsync({ eventId: 'event-1', registrationTypeId: 'type-1', isActive: true })
    ).rejects.toThrow('rpc failed');

    mocks.store.rpcError = null;
    mocks.store.upsertResponse = [];
    mocks.store.setActiveResponse = [];
    await expect(
      upsert.mutateAsync({
        p_event_id: 'event-1',
        p_organisation_id: 'org-1',
        p_registration_type_id: null,
        p_registration_type: {
          name: 'New Type',
          description: null,
          eligibility_message: null,
          cost: 0,
          capacity: null,
          is_active: false,
          sort_order: null,
          pre_submission_checks: [],
        },
        p_eligibility_rules: [],
        p_requirement_rules: [],
      })
    ).rejects.toThrow('Registration type save returned no id');
    await expect(
      setActive.mutateAsync({ eventId: 'event-1', registrationTypeId: 'type-1', isActive: true })
    ).rejects.toThrow('Set active returned no result');
  });
});
