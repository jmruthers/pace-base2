// @vitest-environment jsdom

import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitPreferencesPage } from './UnitPreferencesPage';
import { useUnitPreferencesPageController } from './hooks/useUnitPreferencesPageController';
import type { ActivityPreferenceRow, ActivitySessionRow, UnitRow } from '@/features/unitsCoordination/types';

const authState = vi.hoisted(() => ({
  selectedEventId: null as string | null,
  selectedOrganisationId: 'org-1',
  appId: 'base-app',
  selectedEvent: null as unknown,
}));

const toastSpies = vi.hoisted(() => ({
  toast: vi.fn(),
}));

const submitPreferenceSpy = vi.hoisted(() => vi.fn(async () => undefined));

const selectOnValueChangeRef = vi.hoisted(() => ({
  current: undefined as ((value: string) => void) | undefined,
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

vi.mock('@solvera/pace-core/components', async () => {
  const { MockButton } = await import('@/test/paceCoreElementMocks');
  return {
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Button: MockButton,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  ConfirmationDialog: ({
    open,
    onConfirm,
    confirmLabel,
  }: {
    open?: boolean;
    onConfirm?: () => void;
    confirmLabel?: string;
  }) =>
    open === true ? (
      <MockButton type="button" onClick={onConfirm}>
        {confirmLabel ?? 'Confirm'}
      </MockButton>
    ) : null,
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
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => {
    selectOnValueChangeRef.current = onValueChange;
    return <section>{children}</section>;
  },
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <MockButton type="button" onClick={() => selectOnValueChangeRef.current?.(value)}>
      {children}
    </MockButton>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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

vi.mock('@solvera/pace-core/utils', () => ({
  ShowSuccessMessage: (message: string, toast: (payload: { title: string }) => void) => {
    toast({ title: message });
  },
  HandleMutationError: vi.fn(),
  NormalizeSupabaseError: (error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
  }),
  formatDateTime: (value: string) => value,
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
  useSubmitPreferencesMutation: () => ({ mutateAsync: submitPreferenceSpy, isPending: false }),
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
    toastSpies.toast.mockReset();
    submitPreferenceSpy.mockClear();
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

  it('submits preferences and shows success toast when ranks are valid', async () => {
    authState.selectedEventId = 'event-1';
    authState.selectedEvent = { name: 'Event One' };
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
    ];

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnitPreferencesPageController(), { wrapper });

    act(() => {
      result.current.setSelectedUnitId('unit-1');
    });

    expect(result.current.selectedUnitId).toBe('unit-1');
    expect(result.current.selectedEventId).toBe('event-1');

    await act(async () => {
      await result.current.submitPreferences();
    });

    expect(submitPreferenceSpy).toHaveBeenCalledWith({
      unitId: 'unit-1',
      eventId: 'event-1',
    });
    expect(toastSpies.toast).toHaveBeenCalledWith({ title: 'Preferences submitted' });
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
