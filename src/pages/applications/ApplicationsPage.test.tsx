// @vitest-environment jsdom
/* eslint-disable pace-core-compliance/prefer-pace-core-components */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationsPage } from './ApplicationsPage';

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

vi.mock('@solvera/pace-core/icons', () => ({
  ClipboardList: () => <span>ClipboardList</span>,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
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
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Cancel
        </button>
      </section>
    ) : null,
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
  DialogClose: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  LoadingSpinner: () => <p>Loading...</p>,
  Textarea: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

describe('ApplicationsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    toastSpy.mockReset();
    authState.selectedEventId = 'event-1';
    secureSupabaseState.client = {};
    queueState.data = [];
    queueState.isLoading = false;
    queueState.error = null;
    queueState.refetch.mockClear();
    evidenceState.data = [];
    evidenceState.isLoading = false;
    evidenceState.error = null;
    evidenceState.refetch.mockClear();
    rpcAvailabilityState.data = true;
    mutationState.appStatusMutateAsync.mockReset();
    mutationState.checkStatusMutateAsync.mockReset();
    mutationState.reissueMutateAsync.mockReset();
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
    expect(screen.getByRole('button', { name: 'View' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View review steps' })).toBeNull();
  });

  it('shows queue retry and refetches on list error', () => {
    queueState.error = new Error('queue failure');
    render(<ApplicationsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(queueState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows evidence retry and refetches on evidence error', () => {
    evidenceState.error = new Error('evidence failure');
    queueState.data = [
      {
        id: 'application-5',
        event_id: 'event-1',
        person_id: 'person-5',
        status: 'submitted',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Kim', first_name: 'Kim', last_name: 'West', email: 'kim@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(evidenceState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows event approval and reissue actions only when applicable', () => {
    queueState.data = [
      {
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
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
    expect(screen.getByRole('button', { name: 'Satisfy check' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject check' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reissue link' })).toBeTruthy();
  });

  it('hides event approval actions and shows blocker when check-status RPC is unavailable', () => {
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
        ],
      },
    ];
    render(<ApplicationsPage />);
    expect(
      screen.getByText(
        'Event approval actions are unavailable because `app_base_application_check_set_status` is missing in this environment.'
      )
    ).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
    expect(screen.queryByRole('button', { name: 'Satisfy check' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject check' })).toBeNull();
  });

  it('hides application override buttons for non-override statuses', () => {
    queueState.data = [
      {
        id: 'application-3',
        event_id: 'event-1',
        person_id: 'person-3',
        status: 'approved',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Ari', first_name: 'Ari', last_name: 'Cole', email: 'ari@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
    expect(screen.queryByRole('button', { name: 'Approve application' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject application' })).toBeNull();
  });

  it('shows concurrency toast when approve conflicts', async () => {
    mutationState.appStatusMutateAsync.mockRejectedValueOnce(
      new Error('validation_error.application_status_transition_invalid')
    );
    queueState.data = [
      {
        id: 'application-4',
        event_id: 'event-1',
        person_id: 'person-4',
        status: 'under_review',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Lee', first_name: 'Lee', last_name: 'North', email: 'lee@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
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
    queueState.data = [
      {
        id: 'application-6',
        event_id: 'event-1',
        person_id: 'person-6',
        status: 'under_review',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Kai', first_name: 'Kai', last_name: 'Stone', email: 'kai@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
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
    queueState.data = [
      {
        id: 'application-7',
        event_id: 'event-1',
        person_id: 'person-7',
        status: 'under_review',
        submitted_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        registration_type_id: 'type-1',
        person: { preferred_name: 'Nia', first_name: 'Nia', last_name: 'Bryn', email: 'nia@example.com' },
        registration_type: { id: 'type-1', name: 'Camper' },
        checks: [],
      },
    ];
    render(<ApplicationsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Reject application' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Needs follow-up documents' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject application' })[1]!);
    await Promise.resolve();

    expect(mutationState.appStatusMutateAsync).toHaveBeenCalledWith({
      applicationId: 'application-7',
      targetStatus: 'rejected',
      notes: 'Needs follow-up documents',
    });
  });
});
