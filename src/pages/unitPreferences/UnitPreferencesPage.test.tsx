// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitPreferencesPage } from './UnitPreferencesPage';

const authState = vi.hoisted(() => ({
  selectedEventId: null as string | null,
  selectedOrganisationId: 'org-1',
  appId: 'base-app',
  selectedEvent: null as unknown,
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
  useSecureSupabase: () => ({}),
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/unitsCoordination/configuration', () => ({
  useUnitsList: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useActivitySessions: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useUnitPreferences: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useSubmitterPerson: () => ({ data: null }),
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
});
