// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitsPage } from './UnitsPage';
import type { UnitRoleTypeRow, UnitRow } from '@/features/unitsCoordination/types';

const authState = vi.hoisted(() => ({
  selectedEventId: null as string | null,
  selectedOrganisationId: 'org-1',
  appId: 'base-app',
  selectedEvent: null as unknown,
}));

const rbacState = vi.hoisted(() => ({
  secureSupabase: {} as Record<string, unknown> | null,
}));

const unitsDataState = vi.hoisted(() => ({
  units: [] as UnitRow[],
  roleTypes: [] as UnitRoleTypeRow[],
  approvedApplications: [] as Array<{
    id: string;
    status: string;
    person: { preferred_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;
  }>,
  assignments: [] as Array<{
    id: string;
    unit_id: string;
    application_id: string;
    role_type_id: string;
    role_type: { id: string; role_title: string } | null;
    application: {
      id: string;
      status: string;
      person: { preferred_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null;
    } | null;
  }>,
  unitsLoading: false,
  roleTypesLoading: false,
  approvedLoading: false,
  assignmentsLoading: false,
}));

const mutationSpies = vi.hoisted(() => ({
  createUnit: vi.fn(),
}));

const tableCapture = vi.hoisted(() => ({
  instances: [] as Array<Record<string, unknown>>,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <section role="button" tabIndex={0} onClick={onClick} aria-disabled={disabled}>
      {children}
    </section>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  ConfirmationDialog: () => null,
  DataTable: (props: Record<string, unknown>) => {
    tableCapture.instances.push(props);
    return null;
  },
  Label: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading</p>,
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Tabs: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsList: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <section role="button" tabIndex={0}>{children}</section>,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useEvents: () => ({ selectedEvent: authState.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedEvent: authState.selectedEvent,
    selectedEventId: authState.selectedEventId,
    selectedOrganisationId: authState.selectedOrganisationId,
    appId: authState.appId,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({
    organisationId: authState.selectedOrganisationId,
    eventId: authState.selectedEventId,
    appId: authState.appId,
    isLoading: false,
  }),
  useSecureSupabase: () => rbacState.secureSupabase,
  AccessDenied: () => <main>Access Denied</main>,
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/unitsCoordination/configuration', () => ({
  useUnitsList: () => ({
    data: unitsDataState.units,
    isLoading: unitsDataState.unitsLoading,
    error: null,
    refetch: vi.fn(),
  }),
  useRoleTypesList: () => ({
    data: unitsDataState.roleTypes,
    isLoading: unitsDataState.roleTypesLoading,
    error: null,
    refetch: vi.fn(),
  }),
  useApprovedApplications: () => ({
    data: unitsDataState.approvedApplications,
    isLoading: unitsDataState.approvedLoading,
    error: null,
    refetch: vi.fn(),
  }),
  useUnitRoleAssignments: () => ({
    data: unitsDataState.assignments,
    isLoading: unitsDataState.assignmentsLoading,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/unitsCoordination/unitsUnitAndRoleMutations', () => ({
  useCreateUnitMutation: () => ({ mutateAsync: mutationSpies.createUnit, isPending: false }),
  useUpdateUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRoleTypeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRoleTypeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRoleTypeMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignRoleMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveRoleAssignmentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('UnitsPage', () => {
  afterEach(() => {
    cleanup();
    authState.selectedEventId = null;
    authState.selectedEvent = null;
    rbacState.secureSupabase = {};
    unitsDataState.units = [];
    unitsDataState.roleTypes = [];
    unitsDataState.approvedApplications = [];
    unitsDataState.assignments = [];
    unitsDataState.unitsLoading = false;
    tableCapture.instances = [];
    mutationSpies.createUnit.mockReset();
  });

  it('shows no-event guidance when no event is selected', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('No event selected')).toBeTruthy();
    expect(screen.getByText('Select an event from the header to manage its units.')).toBeTruthy();
  });

  it('shows loading spinner when secure client is unavailable', () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    rbacState.secureSupabase = null;
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('resolves parent references created earlier in the same import payload', async () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    unitsDataState.units = [];
    mutationSpies.createUnit.mockImplementation(async ({ unitNumber, parentUnitId }) => ({
      id: `unit-${unitNumber}`,
      unit_number: unitNumber,
      parent_unit_id: parentUnitId ?? null,
    }));

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>
    );

    const unitsTableProps = tableCapture.instances[0] as {
      onImport: (rows: Array<Record<string, unknown>>) => Promise<{
        successCount: number;
        totalCount: number;
        failedCount: number;
        failedRows: Array<{ row: number; reason: string }>;
      }>;
    };

    const summary = await unitsTableProps.onImport([
      { unit_number: '2', unit_name: 'Parent' },
      { unit_number: '3', unit_name: 'Child', parent_unit_number: '2' },
    ]);

    expect(summary.successCount).toBe(2);
    expect(mutationSpies.createUnit).toHaveBeenCalledTimes(2);
    expect(mutationSpies.createUnit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ parentUnitId: 'unit-2' })
    );
  });
});
