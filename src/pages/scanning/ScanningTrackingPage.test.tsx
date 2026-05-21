// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanningTrackingPage } from './ScanningTrackingPage';
import * as trackingDataHook from '@/features/scanningTracking/useTrackingDashboardData';

const state = vi.hoisted(() => ({
  selectedEvent: { id: 'event-1', name: 'Camp One' } as unknown,
  selectedOrganisation: { id: 'org-1' } as unknown,
}));
const toastMock = vi.hoisted(() => vi.fn());

const queryMocks = vi.hoisted(() => ({
  loadTrackingScanPoints: vi.fn(async () => ({ ok: true, data: [
    {
      id: 'point-site-in',
      name: 'Main Gate',
      context_type: 'site',
      direction: 'in',
      resource_type: null,
      resource_id: null,
      is_active: true,
      event_id: 'event-1',
      organisation_id: 'org-1',
    },
    {
      id: 'point-site-out',
      name: 'Main Gate Exit',
      context_type: 'site',
      direction: 'out',
      resource_type: null,
      resource_id: null,
      is_active: true,
      event_id: 'event-1',
      organisation_id: 'org-1',
    },
    {
      id: 'point-activity',
      name: 'Archery Range',
      context_type: 'activity',
      direction: 'both',
      resource_type: null,
      resource_id: null,
      is_active: true,
      event_id: 'event-1',
      organisation_id: 'org-1',
    },
  ] })),
  loadApprovedParticipants: vi.fn(async () => ({ ok: true, data: [
    {
      id: 'app-1',
      person_id: 'person-1',
      event_id: 'event-1',
      status: 'approved',
      core_person: { preferred_name: 'Ari', first_name: 'Ari', last_name: 'One' },
    },
    {
      id: 'app-2',
      person_id: 'person-2',
      event_id: 'event-1',
      status: 'approved',
      core_person: { preferred_name: 'Bee', first_name: 'Bee', last_name: 'Two' },
    },
  ] })),
  loadMembersByPersonIds: vi.fn(async () => ({ ok: true, data: [
    { id: 'member-1', person_id: 'person-1', organisation_id: 'org-1' },
    { id: 'member-2', person_id: 'person-2', organisation_id: 'org-1' },
  ] })),
  loadTrackingEvents: vi.fn(async (_supabase: unknown, _scanPointIds: string[], options?: { memberId?: string }) => {
    if (options?.memberId === 'member-1') {
      return { ok: true, data: [
        {
          id: 'history-1',
          scan_point_id: 'point-site-in',
          member_id: 'member-1',
          validation_result: 'upload_conflict',
          validation_reason: 'duplicate',
          scanned_at: '2026-05-01T10:00:00.000Z',
          device_id: null,
          override_by: null,
          notes: null,
        },
      ] };
    }
    return { ok: true, data: [
      {
        id: 'event-1',
        scan_point_id: 'point-site-in',
        member_id: 'member-1',
        validation_result: 'accepted',
        validation_reason: null,
        scanned_at: '2026-05-01T09:00:00.000Z',
        device_id: null,
        override_by: null,
        notes: null,
      },
      {
        id: 'event-2',
        scan_point_id: 'point-site-out',
        member_id: 'member-2',
        validation_result: 'accepted',
        validation_reason: null,
        scanned_at: '2026-05-01T09:05:00.000Z',
        device_id: null,
        override_by: null,
        notes: null,
      },
      {
        id: 'event-3',
        scan_point_id: 'point-activity',
        member_id: 'member-2',
        validation_result: 'accepted',
        validation_reason: null,
        scanned_at: '2026-05-01T09:06:00.000Z',
        device_id: null,
        override_by: null,
        notes: null,
      },
    ] };
  }),
  searchTrackingParticipants: vi.fn(async () => ({ ok: true, data: [
    {
      applicationId: 'app-1',
      personId: 'person-1',
      memberId: 'member-1',
      displayName: 'Ari',
      cardIdentifier: 'CARD-1',
    },
  ] })),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({
    selectedEvent: state.selectedEvent,
    selectedOrganisation: state.selectedOrganisation,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
  useResolvedScope: () => ({
    organisationId: state.selectedOrganisation != null ? 'org-1' : null,
    eventId: state.selectedEvent != null ? 'event-1' : null,
    appId: 'base-app',
  }),
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AccessDenied: () => <main>Access Denied</main>,
}));

vi.mock('@solvera/pace-core/utils', () => ({
  formatDateTime: (value: string) => value,
  NormalizeSupabaseError: (error: unknown) => {
    if (error instanceof Error) {
      return { message: error.message };
    }
    if (error != null && typeof error === 'object' && 'message' in error) {
      return { message: String((error as { message?: unknown }).message ?? 'Unknown error') };
    }
    return { message: String(error) };
  },
}));

vi.mock('@solvera/pace-core/icons', () => ({
  ChevronLeft: () => <span>Back</span>,
}));

vi.mock('@solvera/pace-core/components', async () => {
  const { MockButton, MockFieldLabel, MockTextField } = await import('@/test/paceCoreElementMocks');
  return {
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Badge: ({
    children,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    variant?: string;
    'aria-label'?: string;
  }) => <span aria-label={ariaLabel}>{children}</span>,
  Button: MockButton,
  Card: ({ children, ...props }: { children: React.ReactNode; role?: string; 'aria-label'?: string }) => (
    <section {...props}>{children}</section>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DataTable: ({
    data,
    columns,
    emptyState,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id: string;
      cell: (ctx: { row: Record<string, unknown> }) => React.ReactNode;
    }>;
    emptyState?: { description?: string };
  }) => (
    <section>
      {data.length === 0 && emptyState?.description != null ? <p>{emptyState.description}</p> : null}
      {data.map((row, index) => (
        <article key={String(row.id ?? index)}>
          {columns.map((column) => (
            <section key={column.id}>{column.cell({ row })}</section>
          ))}
        </article>
      ))}
    </section>
  ),
  Input: MockTextField,
  Label: MockFieldLabel,
  LoadingSpinner: () => <p>Loading</p>,
  Tabs: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <nav data-testid="tracking-tabs-list" className={className}>
      {children}
    </nav>
  ),
  TabsTrigger: ({
    children,
    value,
    className,
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => (
    <section role="tab" aria-label={`tab-${value}`} className={className}>
      {children}
    </section>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  toast: toastMock,
  };
});

vi.mock('@/features/scanningTracking/configuration', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/scanningTracking/configuration')>();
  return {
    ...actual,
    loadTrackingScanPoints: queryMocks.loadTrackingScanPoints,
    loadApprovedParticipants: queryMocks.loadApprovedParticipants,
    loadMembersByPersonIds: queryMocks.loadMembersByPersonIds,
    loadTrackingEvents: queryMocks.loadTrackingEvents,
    searchTrackingParticipants: queryMocks.searchTrackingParticipants,
  };
});

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ScanningTrackingPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ScanningTrackingPage', () => {
  beforeEach(() => {
    state.selectedEvent = { id: 'event-1', name: 'Camp One' };
    state.selectedOrganisation = { id: 'org-1' };
    queryMocks.loadTrackingScanPoints.mockClear();
    queryMocks.loadApprovedParticipants.mockClear();
    queryMocks.loadMembersByPersonIds.mockClear();
    queryMocks.loadTrackingEvents.mockClear();
    queryMocks.searchTrackingParticipants.mockClear();
    toastMock.mockClear();
  });

  afterEach(() => cleanup());

  it('renders blocking no-event card when no event is selected', async () => {
    state.selectedEvent = null;
    renderPage();
    expect(await screen.findByText('No event selected')).toBeTruthy();
    expect(
      screen.getByText('Select an event from the header to view tracking data.')
    ).toBeTruthy();
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(refreshButton.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(refreshButton);
    expect(queryMocks.loadTrackingScanPoints).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('renders site presence headline counts from derived data', async () => {
    renderPage();
    expect(await screen.findByLabelText('On-site: 1 participants')).toBeTruthy();
    expect(screen.getByLabelText('Off-site: 1 participants')).toBeTruthy();
    expect(screen.getByLabelText('Never Scanned: 0 participants')).toBeTruthy();
  });

  it('searches participant history and renders upload conflict badge rows', async () => {
    renderPage();

    const input = await screen.findByRole('textbox', { name: 'participant-search' });
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'r' });

    await waitFor(() => {
      expect(queryMocks.searchTrackingParticipants).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Ari/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Upload conflict — see participant history for details')).toBeTruthy();
    });
  });

  it('renders tabs list with mobile two-row layout classes', async () => {
    renderPage();
    expect(await screen.findByText('Tracking Dashboard')).toBeTruthy();
    const tabsList = screen.getByTestId('tracking-tabs-list');
    expect(tabsList.getAttribute('class') ?? '').toContain('grid');
    expect(tabsList.getAttribute('class') ?? '').toContain('grid-cols-2');
  });

  it('refreshes tracking queries and updates data', async () => {
    renderPage();
    await screen.findByLabelText('On-site: 1 participants');
    const initialCalls = queryMocks.loadTrackingScanPoints.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(queryMocks.loadTrackingScanPoints.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('shows destructive toast when refresh fails', async () => {
    const hookSpy = vi.spyOn(trackingDataHook, 'useTrackingDashboardData').mockReturnValue({
      scanPointsQuery: {
        data: [],
        error: null,
        isLoading: false,
        isFetching: false,
      },
      approvedParticipantsQuery: { data: [], error: null, isLoading: false },
      memberQuery: { data: [], isLoading: false },
      allEventsQuery: { data: [], error: null, isLoading: false },
      acceptedEventsQuery: { data: [], error: null, isLoading: false },
      searchResultsQuery: { data: [], error: null, isLoading: false },
      participantHistoryQuery: { data: [], error: null, isLoading: false },
      refreshing: false,
      lastUpdatedAt: null,
      refreshTrackingData: vi.fn(async () => false),
      retryScanPoints: vi.fn(),
      retryApprovedParticipants: vi.fn(),
      retryAcceptedEvents: vi.fn(),
      retryAllEvents: vi.fn(),
      retrySearchResults: vi.fn(),
      retryParticipantHistory: vi.fn(),
    } as unknown as ReturnType<typeof trackingDataHook.useTrackingDashboardData>);

    renderPage();
    await screen.findByText('Tracking Dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive' })
      );
    });
    hookSpy.mockRestore();
  });
});
