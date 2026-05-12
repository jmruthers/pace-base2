// @vitest-environment jsdom
/* eslint-disable pace-core-compliance/prefer-pace-core-components */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanningSetupPage } from './ScanningSetupPage';

const state = vi.hoisted(() => ({
  selectedEvent: { id: 'event-1', name: 'Camp One', timezone: 'Australia/Sydney', organisation_id: 'org-1' } as unknown,
  selectedOrganisationId: 'org-1' as string | null,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  scanPoints: [
    {
      id: 'point-1',
      name: 'Main Gate',
      event_id: 'event-1',
      organisation_id: 'org-1',
      context_type: 'site',
      direction: 'both',
      resource_type: null,
      resource_id: null,
      is_active: true,
      created_at: null,
      updated_at: null,
      created_by: null,
    },
    {
      id: 'point-2',
      name: 'Bus Stop',
      event_id: 'event-1',
      organisation_id: 'org-1',
      context_type: 'transport',
      direction: 'in',
      resource_type: 'trac_activity',
      resource_id: 'trac-1',
      is_active: false,
      created_at: null,
      updated_at: null,
      created_by: null,
    },
  ] as Array<Record<string, unknown>>,
  scanPointsLoading: false,
  scanPointsError: null as unknown,
  conflicts: [
    {
      id: 'conflict-1',
      scan_point_id: 'point-1',
      scan_point_name: 'Main Gate',
      scan_card_id: 'card-1',
      card_identifier: 'CARD-1',
      validation_result: 'upload_conflict',
      validation_reason: 'duplicate',
      scanned_at: '2026-05-01T10:00:00.000Z',
      synced_at: '2026-05-01T10:05:00.000Z',
      notes: null,
      override_by: null,
      application_id: null,
    },
  ] as Array<Record<string, unknown>>,
  conflictsLoading: false,
  conflictsError: null as unknown,
  history: [
    {
      id: 'history-1',
      scan_point_id: 'point-1',
      scan_point_name: 'Main Gate',
      scan_card_id: 'card-1',
      card_identifier: 'CARD-1',
      participant_name: 'Sam Example',
      validation_result: 'accepted',
      validation_reason: null,
      scanned_at: '2026-05-01T10:00:00.000Z',
      synced_at: '2026-05-01T10:05:00.000Z',
      notes: null,
      override_by: null,
      application_id: null,
    },
  ] as Array<Record<string, unknown>>,
  historyLoading: false,
  historyError: null as unknown,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedOrganisationId: state.selectedOrganisationId,
    user: { id: 'user-1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({
    scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
  }),
  useSecureSupabase: () => ({}),
  useCan: (permission: string) => ({
    can:
      permission === 'read:page.scanning'
        ? state.canRead
        : permission === 'create:page.scanning'
          ? state.canCreate
          : state.canUpdate,
    isLoading: false,
  }),
  PagePermissionGuard: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) =>
    state.canRead ? <>{children}</> : <>{fallback ?? null}</>,
  AccessDenied: () => <main>Access Denied</main>,
}));

vi.mock('@/features/scanningSetup/configuration', () => ({
  useScanPoints: () => ({
    data: state.scanPoints,
    isLoading: state.scanPointsLoading,
    error: state.scanPointsError,
    refetch: vi.fn(async () => undefined),
  }),
  useScanConflicts: () => ({
    data: state.conflicts,
    isLoading: state.conflictsLoading,
    error: state.conflictsError,
    refetch: vi.fn(async () => undefined),
  }),
  useScanHistory: () => ({
    data: state.history,
    isLoading: state.historyLoading,
    error: state.historyError,
    refetch: vi.fn(async () => undefined),
  }),
  useActivityResourceOptions: () => ({
    data: [{ id: 'session-1', label: 'Climbing — Morning' }],
    isLoading: false,
    error: null,
  }),
  useTransportResourceOptions: () => ({
    data: [{ id: 'trac-1', label: 'Bus Route' }],
    isLoading: false,
    error: null,
  }),
  useCreateScanPointMutation: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  useUpdateScanPointMutation: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  useSetScanPointActiveMutation: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  loadManifestByContext: vi.fn(async () => []),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
  formatDateTime: (value: string) => value,
}));

vi.mock('@solvera/pace-core/icons', () => ({
  ChevronRight: () => <span>Launch</span>,
  Plus: () => <span>Activate</span>,
  SquarePen: () => <span>Edit</span>,
  X: () => <span>Deactivate</span>,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    type,
    ariaLabel,
    'aria-label': ariaLabelAttr,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    ariaLabel?: string;
    'aria-label'?: string;
  }) => (
    <button type={type ?? 'button'} onClick={onClick} aria-label={ariaLabelAttr ?? ariaLabel}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DataTable: ({
    data,
    columns,
    title,
    emptyState,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{ id?: string; header: string; cell?: (ctx: { row: Record<string, unknown> }) => React.ReactNode }>;
    title?: string;
    emptyState?: { title?: string; description?: string };
  }) => (
    <section>
      {title != null ? <h2>{title}</h2> : null}
      {data.length === 0 ? (
        <>
          {emptyState?.title != null ? <p>{emptyState.title}</p> : null}
          {emptyState?.description != null ? <p>{emptyState.description}</p> : null}
        </>
      ) : (
        data.map((row, index) => (
          <article key={String(row.id ?? index)}>
            {columns.map((column) => (
              <section key={column.id ?? column.header}>
                {column.cell != null ? column.cell({ row }) : null}
              </section>
            ))}
          </article>
        ))
      )}
    </section>
  ),
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open === false ? null : <section>{children}</section>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogPortal: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  Form: ({
    children,
    defaultValues,
  }: {
    children: React.ReactNode | ((methods: { getValues: () => Record<string, unknown> }) => React.ReactNode);
    defaultValues?: Record<string, unknown>;
    onSubmit: (values: Record<string, unknown>) => void;
  }) => (
    <section>{typeof children === 'function' ? children({ getValues: () => defaultValues ?? {} }) : children}</section>
  ),
  FormField: ({
    label,
    render,
  }: {
    label: string;
    render: (props: { field: { value?: unknown; onChange: (nextValue: unknown) => void } }) => React.ReactNode;
  }) => (
    <label>
      {label}
      {render({ field: { value: '', onChange: () => undefined } })}
    </label>
  ),
  Input: ({ value }: { value?: string }) => <input value={value ?? ''} readOnly />,
  LoadingSpinner: () => <p>Loading</p>,
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  toast: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ScanningSetupPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ScanningSetupPage', () => {
  beforeEach(() => {
    state.selectedEvent = { id: 'event-1', name: 'Camp One', timezone: 'Australia/Sydney', organisation_id: 'org-1' };
    state.canRead = true;
    state.canCreate = true;
    state.canUpdate = true;
    state.scanPointsError = null;
    state.conflictsError = null;
    state.historyError = null;
  });

  afterEach(() => cleanup());

  it('renders no-event selected blocking card when event is missing', () => {
    state.selectedEvent = null;
    renderPage();
    expect(screen.getByText('No event selected')).toBeTruthy();
    expect(screen.getByText('Select an event from the header to configure scanning.')).toBeTruthy();
  });

  it('hides create scan point actions without create permission', () => {
    state.canCreate = false;
    renderPage();
    expect(screen.queryAllByRole('button', { name: 'Create scan point' })).toHaveLength(0);
  });

  it('hides edit/deactivate/activate row actions without update permission', () => {
    state.canUpdate = false;
    renderPage();
    expect(screen.queryByRole('button', { name: 'Edit scan point' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deactivate scan point' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Activate scan point' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Launch scan point' })).toHaveLength(2);
  });

  it('opens conflict detail dialog from row action', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'View detail' }));
    expect(screen.getByText('Conflict detail')).toBeTruthy();
    expect(screen.getByText('Original reason')).toBeTruthy();
  });

  it('shows access denied when read permission is denied', () => {
    state.canRead = false;
    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });
});
