// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitPreferencesPage } from './UnitPreferencesPage';
import type { ActivityPreferenceRow, ActivitySessionRow, UnitRow } from '@/features/unitsCoordination/types';

const authState = vi.hoisted(() => ({
  selectedEventId: null as string | null,
  selectedOrganisationId: 'org-1',
  appId: 'base-app',
  selectedEvent: null as unknown,
}));

const pageState = vi.hoisted(() => ({
  units: [] as UnitRow[],
  unitsLoading: false,
  unitsError: null as Error | null,
  sessions: [] as ActivitySessionRow[],
  sessionsLoading: false,
  sessionsError: null as Error | null,
  preferences: [] as ActivityPreferenceRow[],
  preferencesLoading: false,
  preferencesError: null as Error | null,
  submitter: null as { preferred_name: string | null; first_name: string | null; last_name: string | null } | null,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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
  Input: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => (
    <section
      role="textbox"
      aria-label="input"
      data-value={value}
      onClick={() => onChange?.(value ?? '')}
    />
  ),
  Label: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading</p>,
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
  useSecureSupabase: () => ({}),
  AccessDenied: () => <main>Access Denied</main>,
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/unitsCoordination/configuration', () => ({
  useUnitsList: () => ({
    data: pageState.units,
    isLoading: pageState.unitsLoading,
    error: pageState.unitsError,
    refetch: vi.fn(),
  }),
  useActivitySessions: () => ({
    data: pageState.sessions,
    isLoading: pageState.sessionsLoading,
    error: pageState.sessionsError,
    refetch: vi.fn(),
  }),
  useUnitPreferences: () => ({
    data: pageState.preferences,
    isLoading: pageState.preferencesLoading,
    error: pageState.preferencesError,
    refetch: vi.fn(),
  }),
  useSubmitterPerson: () => ({ data: pageState.submitter }),
}));

vi.mock('@/features/unitsCoordination/unitsPreferenceMutations', () => ({
  useCreatePreferenceMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdatePreferenceRankMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePreferenceMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitPreferencesMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('UnitPreferencesPage', () => {
  afterEach(() => {
    cleanup();
    authState.selectedEventId = null;
    authState.selectedEvent = null;
    pageState.units = [];
    pageState.unitsLoading = false;
    pageState.unitsError = null;
    pageState.sessions = [];
    pageState.sessionsLoading = false;
    pageState.sessionsError = null;
    pageState.preferences = [];
    pageState.preferencesLoading = false;
    pageState.preferencesError = null;
    pageState.submitter = null;
  });

  it('shows no-event guidance when no event is selected', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UnitPreferencesPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('No event selected')).toBeTruthy();
    expect(screen.getByText('Select an event from the header to manage unit preferences.')).toBeTruthy();
  });

  it('disables unit selector while units are loading', () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    pageState.unitsLoading = true;
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UnitPreferencesPage />
      </QueryClientProvider>
    );

    expect(document.querySelector('fieldset[disabled]')).toBeTruthy();
  });

  it('shows units-empty guidance when event has no units', () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    pageState.units = [
      {
        id: 'unit-1',
        unit_number: 1,
        unit_name: 'One',
        subcamp: null,
        contingent: null,
        parent_unit_id: null,
        event_id: 'event-1',
        created_at: null,
        updated_at: null,
      },
    ];
    pageState.units = [];
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UnitPreferencesPage />
      </QueryClientProvider>
    );

    expect(
      screen.getByText('No units have been created for this event. Create units in the Units page first.')
    ).toBeTruthy();
  });

  it('normalizes units query errors in the alert', () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
    pageState.unitsError = new Error('Units failed');
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <UnitPreferencesPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Units failed')).toBeTruthy();
  });
});
