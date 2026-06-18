// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDetailPage } from './ApplicationDetailPage';

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

const evidenceState = vi.hoisted(() => ({
  data: [] as Array<Record<string, unknown>>,
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(async () => undefined),
}));

const rpcAvailabilityState = vi.hoisted(() => ({
  data: true as boolean | undefined,
}));

const mutationState = vi.hoisted(() => ({
  appStatusMutateAsync: vi.fn(async () => undefined),
  checkStatusMutateAsync: vi.fn(async () => undefined),
  reissueMutateAsync: vi.fn(async () => undefined),
}));

const toastSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateSpy,
    useParams: () => ({ applicationId: 'application-2' }),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(async () => undefined),
  }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => eventsState,
  useUnifiedAuth: () => authState,
  useToast: () => ({ toast: toastSpy }),
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
  useApplicationEvidence: () => evidenceState,
  useSetApplicationStatusMutation: () => ({ isPending: false, mutateAsync: mutationState.appStatusMutateAsync }),
  useSetCheckStatusMutation: () => ({ isPending: false, mutateAsync: mutationState.checkStatusMutateAsync }),
  useReissueCheckTokenMutation: () => ({ isPending: false, mutateAsync: mutationState.reissueMutateAsync }),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  HandleMutationError: vi.fn(),
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
  ShowSuccessMessage: vi.fn(),
  formatDateTime: (value: string) => value,
}));

vi.mock('@solvera/pace-core/components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/components')>();
  const { MockButton, MockTextField } = await import('@/test/paceCoreElementMocks');
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
    ConfirmationDialog: ({
      open,
      title,
      confirmLabel,
      onConfirm,
      onOpenChange,
      description,
    }: {
      open: boolean;
      title: string;
      confirmLabel: string;
      onConfirm: () => void;
      onOpenChange?: (open: boolean) => void;
      description?: React.ReactNode;
    }) =>
      open ? (
        <section>
          <h3>{title}</h3>
          {description ?? null}
          <MockButton onClick={onConfirm}>{confirmLabel}</MockButton>
          <MockButton onClick={() => onOpenChange?.(false)}>Cancel</MockButton>
        </section>
      ) : null,
    LoadingSpinner: () => <p>Loading...</p>,
    PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
      <header>
        <h1>{title}</h1>
        {actions}
      </header>
    ),
    Tabs: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    TabsList: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
    TabsTrigger: ({ children }: { children: React.ReactNode }) => <MockButton>{children}</MockButton>,
    TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    Textarea: MockTextField,
  };
});

const sampleApplication = {
  id: 'application-2',
  event_id: 'event-1',
  person_id: 'person-2',
  status: 'submitted',
  submitted_at: '2026-05-01T00:00:00.000Z',
  created_at: '2026-05-01T00:00:00.000Z',
  registration_type_id: 'type-1',
  person: { preferred_name: 'Sam', first_name: 'Sam', last_name: 'Nash', email: 'sam@example.com' },
  registration_type: { id: 'type-1', name: 'Camper' },
  checks: [
    {
      id: 'check-event',
      status: 'pending',
      requirement_id: 'req-event',
      token_expires_at: null,
      actioned_at: null,
      notes: null,
      requirement: { check_type: 'event_approval', sort_order: 1, is_automated: false, config: null },
    },
    {
      id: 'check-guardian',
      status: 'pending',
      requirement_id: 'req-guardian',
      token_expires_at: '2026-06-01T00:00:00.000Z',
      actioned_at: null,
      notes: null,
      requirement: { check_type: 'guardian_approval', sort_order: 2, is_automated: false, config: null },
    },
  ],
};

describe('ApplicationDetailPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    toastSpy.mockReset();
    navigateSpy.mockReset();
    authState.selectedEventId = 'event-1';
    secureSupabaseState.client = {};
    queueState.data = [sampleApplication];
    queueState.isLoading = false;
    queueState.error = null;
    evidenceState.data = [];
    evidenceState.isLoading = false;
    evidenceState.error = null;
    evidenceState.refetch.mockClear();
    rpcAvailabilityState.data = true;
    mutationState.appStatusMutateAsync.mockReset();
    mutationState.checkStatusMutateAsync.mockReset();
    mutationState.reissueMutateAsync.mockReset();
  });

  it('renders applicant detail with back link', () => {
    render(<ApplicationDetailPage />);
    expect(screen.getByRole('heading', { name: 'Sam Nash' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to applications' })).toBeTruthy();
  });

  it('shows not found when application is missing from queue', () => {
    queueState.data = [];
    render(<ApplicationDetailPage />);
    expect(screen.getByRole('heading', { name: 'Application not found' })).toBeTruthy();
  });

  it('shows evidence retry and refetches on evidence error', () => {
    evidenceState.error = new Error('evidence failure');
    render(<ApplicationDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(evidenceState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows event approval and reissue actions only when applicable', () => {
    render(<ApplicationDetailPage />);
    expect(screen.getByRole('button', { name: 'Satisfy check' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject check' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reissue link' })).toBeTruthy();
  });

  it('hides event approval actions when check-status RPC is unavailable', () => {
    rpcAvailabilityState.data = false;
    render(<ApplicationDetailPage />);
    expect(screen.queryByRole('button', { name: 'Satisfy check' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject check' })).toBeNull();
  });

  it('hides application override buttons for non-override statuses', () => {
    queueState.data = [{ ...sampleApplication, status: 'approved' }];
    render(<ApplicationDetailPage />);
    expect(screen.queryByRole('button', { name: 'Approve application' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject application' })).toBeNull();
  });

  it('shows concurrency toast when approve conflicts', async () => {
    mutationState.appStatusMutateAsync.mockRejectedValueOnce(
      new Error('validation_error.application_status_transition_invalid')
    );
    queueState.data = [{ ...sampleApplication, status: 'under_review' }];
    render(<ApplicationDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve application' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await Promise.resolve();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Status changed',
      })
    );
  });

  it('blocks reject application without notes', async () => {
    queueState.data = [{ ...sampleApplication, status: 'under_review' }];
    render(<ApplicationDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject application' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject application' })[1]!);
    await Promise.resolve();

    expect(mutationState.appStatusMutateAsync).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rejection notes required',
      })
    );
  });

  it('submits reject application when notes are present', async () => {
    queueState.data = [{ ...sampleApplication, status: 'under_review' }];
    render(<ApplicationDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject application' }));
    const textbox = screen.getByRole('textbox');
    for (const char of 'Needs follow-up documents') {
      fireEvent.keyDown(textbox, { key: char });
    }
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject application' })[1]!);
    await Promise.resolve();

    expect(mutationState.appStatusMutateAsync).toHaveBeenCalledWith({
      applicationId: 'application-2',
      targetStatus: 'rejected',
      notes: 'Needs follow-up documents',
    });
  });

  it('navigates back to applications when back is clicked', () => {
    render(<ApplicationDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to applications' }));
    expect(navigateSpy).toHaveBeenCalledWith('/applications');
  });
});
