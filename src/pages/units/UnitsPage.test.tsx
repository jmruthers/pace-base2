// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitsPage } from './UnitsPage';

const authState = vi.hoisted(() => ({
  selectedEventId: null as string | null,
  selectedOrganisationId: 'org-1',
  appId: 'base-app',
  selectedEvent: null as unknown,
}));

const rbacState = vi.hoisted(() => ({
  secureSupabase: {} as Record<string, unknown> | null,
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
  DataTable: () => null,
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
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/unitsCoordination/configuration', () => ({
  useUnitsList: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useRoleTypesList: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useApprovedApplications: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUnitRoleAssignments: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useCreateUnitMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
});
