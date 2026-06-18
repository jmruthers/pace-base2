// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationsPage } from './ApplicationsPage';

const navigateSpy = vi.hoisted(() => vi.fn());

const authState = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  selectedOrganisationId: 'org-1' as string | null,
  appId: 'app-1' as string | null,
}));

const eventsState = vi.hoisted(() => ({
  selectedEvent: { name: 'Camp Bravo' } as unknown,
}));

const secureSupabaseState = vi.hoisted(() => ({
  client: {} as object | null,
}));

const queueState = vi.hoisted(() => ({
  data: [] as Array<Record<string, unknown>>,
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(async () => undefined),
}));

const rpcAvailabilityState = vi.hoisted(() => ({
  data: true as boolean | undefined,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => eventsState,
  useUnifiedAuth: () => authState,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({
    organisationId: authState.selectedOrganisationId,
    eventId: authState.selectedEventId,
    appId: authState.appId,
    isLoading: false,
  }),
  PagePermissionGuard: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) =>
    children ?? fallback ?? null,
  AccessDenied: () => <main>Access Denied</main>,
  useSecureSupabase: () => secureSupabaseState.client,
}));

vi.mock('@/features/applicationsAdmin/configuration', () => ({
  useApplicationsQueue: () => queueState,
  useCheckStatusRpcAvailability: () => rpcAvailabilityState,
}));

vi.mock('@solvera/pace-core/utils', () => ({
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
  formatDateTime: (value: string) => value,
}));

vi.mock('@solvera/pace-core/icons', () => ({
  ClipboardList: () => <span>ClipboardList</span>,
}));

vi.mock('@solvera/pace-core/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/components')>();
  const { MockButton } = await import('@/test/paceCoreElementMocks');
  return {
    ...actual,
    Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Button: MockButton,
    Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
    CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DataTable: ({
      data,
      columns,
    }: {
      data: Array<Record<string, unknown>>;
      columns: Array<{ id?: string; accessorKey?: string; header: string; cell?: (info: { row: Record<string, unknown>; getValue: () => unknown; index: number }) => React.ReactNode }>;
    }) => (
      <section>
        {data.map((row, rowIndex) => (
          <article key={String(row.id ?? rowIndex)}>
            {columns.map((column) => (
              <section key={column.id ?? column.accessorKey ?? column.header}>
                {column.cell != null
                  ? column.cell({
                      row,
                      getValue: () => (column.accessorKey != null ? row[column.accessorKey] : undefined),
                      index: rowIndex,
                    })
                  : column.accessorKey != null
                    ? String(row[column.accessorKey] ?? '')
                    : null}
              </section>
            ))}
          </article>
        ))}
      </section>
    ),
    Dialog: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    DialogClose: ({ children }: { children: React.ReactNode }) => <MockButton>{children}</MockButton>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
    LoadingSpinner: () => <p>Loading...</p>,
  };
});

describe('ApplicationsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigateSpy.mockReset();
    authState.selectedEventId = 'event-1';
    secureSupabaseState.client = {};
    queueState.data = [];
    queueState.isLoading = false;
    queueState.error = null;
    queueState.refetch.mockClear();
    rpcAvailabilityState.data = true;
  });

  it('shows select-event card when no event is selected', () => {
    authState.selectedEventId = null;
    render(<ApplicationsPage />);
    expect(screen.getByText('Select an event from the header to view its applications.')).toBeTruthy();
  });

  it('hides review-steps action for rows with zero checks', () => {
    queueState.data = [
      {
        id: 'application-1',
        event_id: 'event-1',
        person_id: 'person-1',
        status: 'submitted',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Pat', first_name: 'Pat', last_name: 'Lee', email: 'pat@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    expect(screen.getByRole('button', { name: 'Review' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View review steps' })).toBeNull();
  });

  it('navigates to application detail when Review is clicked', () => {
    queueState.data = [
      {
        id: 'application-1',
        event_id: 'event-1',
        person_id: 'person-1',
        status: 'submitted',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Pat', first_name: 'Pat', last_name: 'Lee', email: 'pat@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(navigateSpy).toHaveBeenCalledWith('/applications/application-1');
  });

  it('shows queue retry and refetches on list error', () => {
    queueState.error = new Error('queue failure');
    render(<ApplicationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(queueState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows backend blocker when check-status RPC is unavailable', () => {
    rpcAvailabilityState.data = false;
    queueState.data = [
      {
        id: 'application-rpc-blocked',
        event_id: 'event-1',
        person_id: 'person-2',
        status: 'submitted',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Sam', first_name: 'Sam', last_name: 'Nash', email: 'sam@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    expect(
      screen.getByText(
        'Event approval actions are unavailable because `app_base_application_check_set_status` is missing in this environment.'
      )
    ).toBeTruthy();
  });
});
