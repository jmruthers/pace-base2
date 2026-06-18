// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  memberCounts: {} as Record<string, number>,
  unitsLoading: false,
  roleTypesLoading: false,
  approvedLoading: false,
  assignmentsLoading: false,
  memberCountsLoading: false,
}));

const mutationSpies = vi.hoisted(() => ({
  createUnit: vi.fn(),
}));

const toastSpies = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock('@solvera/pace-core/components', async () => {
  const { MockButton, MockFieldLabel, MockNumberField, MockTextField } = await import('@/test/paceCoreElementMocks');

  return {
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: MockButton,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  ConfirmationDialog: () => null,
  DataTable: (props: Record<string, unknown>) => {
    return <section data-testid="data-table">{JSON.stringify(Object.keys(props))}</section>;
  },
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (open ? <section>{children}</section> : null),
  DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
  Form: ({
    children,
    defaultValues,
  }: {
    children: React.ReactNode | ((methods: { getValues: () => Record<string, unknown> }) => React.ReactNode);
    defaultValues?: Record<string, unknown>;
    onSubmit: (values: Record<string, unknown>) => void;
  }) => (
    <section>
      {typeof children === 'function' ? children({ getValues: () => defaultValues ?? {} }) : children}
    </section>
  ),
  FormField: ({
    render,
  }: {
    render: (props: { field: { value?: unknown; onChange: (nextValue: unknown) => void } }) => React.ReactNode;
  }) => <>{render({ field: { value: '', onChange: () => undefined } })}</>,
  Input: ({
    type,
    onChange,
    'aria-label': ariaLabel,
    id,
    value,
    placeholder,
    disabled,
    readOnly,
  }: {
    type?: string;
    onChange?: (value: string) => void;
    'aria-label'?: string;
    id?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
  }) =>
    type === 'number' ? (
      <MockNumberField
        id={id}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={onChange}
      />
    ) : (
      <MockTextField
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-label={ariaLabel}
        onChange={onChange}
      />
    ),
  Label: MockFieldLabel,
  LoadingSpinner: () => <p>Loading</p>,
  Progress: ({ value }: { value: number }) => <meter value={value} />,
  SaveActions: ({ onSaveClick }: { onSaveClick?: () => void }) => (
    <MockButton onClick={onSaveClick}>Save</MockButton>
  ),
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Tabs: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsList: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <MockButton>{children}</MockButton>,
  };
});

vi.mock('@solvera/pace-core/hooks', () => ({
  useToast: () => ({ toast: toastSpies.toast }),
  useEvents: () => ({ selectedEvent: authState.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedEvent: authState.selectedEvent,
    selectedEventId: authState.selectedEventId,
    selectedOrganisationId: authState.selectedOrganisationId,
    appId: authState.appId,
  }),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  ShowSuccessMessage: (message: string, toast: (payload: { title: string; variant?: string }) => void) => {
    toast({ title: message, variant: 'success' });
  },
  HandleMutationError: vi.fn(),
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
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
  useEventUnitMemberCounts: () => ({
    data: unitsDataState.memberCounts,
    isLoading: unitsDataState.memberCountsLoading,
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
    unitsDataState.memberCounts = {};
    unitsDataState.unitsLoading = false;
    unitsDataState.memberCountsLoading = false;
    mutationSpies.createUnit.mockReset();
    toastSpies.toast.mockReset();
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

  it('shows success toast when unit create succeeds', async () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    unitsDataState.units = [
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
    mutationSpies.createUnit.mockResolvedValue({
      id: 'unit-2',
      unit_number: 2,
      parent_unit_id: null,
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create unit' }));
    });
    await act(async () => {
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => {
      expect(mutationSpies.createUnit).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(toastSpies.toast).toHaveBeenCalledWith({ title: 'Unit created', variant: 'success' });
    });
  });

  it('surfaces mutation errors when unit create is denied', async () => {
    const { HandleMutationError } = await import('@solvera/pace-core/utils');
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    unitsDataState.units = [
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
    mutationSpies.createUnit.mockRejectedValue(new Error('Permission denied'));

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create unit' }));
    });
    await act(async () => {
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => {
      expect(mutationSpies.createUnit).toHaveBeenCalled();
      expect(HandleMutationError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Permission denied' }),
        'units-create',
        toastSpies.toast
      );
    });
  });

  it('renders unit cards with member counts', () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    unitsDataState.units = [
      {
        id: 'unit-1',
        unit_number: 1,
        unit_name: 'Alpha',
        subcamp: 'North',
        contingent: null,
        parent_unit_id: null,
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
    ];
    unitsDataState.memberCounts = { 'unit-1': 3 };

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: '1 - Alpha' })).toBeTruthy();
    expect(screen.getByText('3 members')).toBeTruthy();
  });
});
