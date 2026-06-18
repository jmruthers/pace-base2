// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormsListPage } from './FormsListPage';

const state = vi.hoisted(() => ({
  selectedEvent: null as unknown,
  selectedEventId: null as string | null,
  selectedOrganisationId: 'org-1' as string | null,
  appId: 'base-app' as string | null,
  allowRead: true,
  allowCreate: true,
  allowUpdate: true,
  formsLoading: false,
  formsError: null as Error | null,
  fieldCountsLoading: false,
  fieldCountsError: null as Error | null,
  fieldCountsData: {} as Record<string, number>,
  responseCountsLoading: false,
  responseCountsError: null as Error | null,
  responseCountsData: {} as Record<string, number>,
  formsData: [] as Array<{
    id: string;
    name: string;
    slug: string;
    status: 'draft' | 'published' | 'closed';
    workflow_type: 'information_collection';
    is_active: boolean | null;
    opens_at: string | null;
    closes_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>,
  toastMock: vi.fn(),
  deleteMutateAsync: vi.fn(async () => ({ deleted: true, response_count: 0, registration_binding_count: 0 })),
  getDeleteBlockers: vi.fn(async () => ({
    ok: true as const,
    data: {
      responseCount: 0,
      registrationBindingCount: 0,
    },
  })),
  invalidateQueries: vi.fn(),
}));

const resolvedScopeState = vi.hoisted(() => ({
  organisationId: 'org-1' as string | null,
  eventId: 'event-1' as string | null,
  appId: 'base-app' as string | null,
  isLoading: false,
}));

const guardPropsState = vi.hoisted(() => ({
  calls: [] as Array<Record<string, unknown>>,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedEventId: state.selectedEventId,
    selectedOrganisationId: state.selectedOrganisationId,
  }),
  useToast: () => ({ toast: state.toastMock }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  useSecureSupabase: () => ({}),
  useResolvedScope: () => resolvedScopeState,
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
    ...props
  }: {
    operation: 'read' | 'create' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  } & Record<string, unknown>) => {
    guardPropsState.calls.push({ operation, fallback, ...props });
    const allowed =
      operation === 'read'
        ? state.allowRead
        : operation === 'create'
          ? state.allowCreate
          : state.allowUpdate;
    if (!allowed) {
      return <>{fallback ?? null}</>;
    }
    return <>{children}</>;
  },
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { type: 'button', onClick, ...props }, children),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  ConfirmationDialog: ({
    open,
    title,
    description,
    onConfirm,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    onConfirm?: () => void;
  }) =>
    open ? (
      <section>
        <h3>{title}</h3>
        <p>{description}</p>
        <article role="button" aria-label="confirm-delete" onClick={() => onConfirm?.()}>
          Confirm
        </article>
      </section>
    ) : null,
  DataTable: ({
    data,
    columns,
    onRowActivate,
    isLoading,
    emptyState,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id?: string;
      accessorKey?: string;
      header: string;
      cell?: (info: { row: Record<string, unknown> }) => React.ReactNode;
    }>;
    onRowActivate?: (row: Record<string, unknown>) => void;
    isLoading?: boolean;
    emptyState?: { description?: string };
  }) =>
    isLoading ? (
      <p>Loading Spinner</p>
    ) : data.length === 0 ? (
      <p>{emptyState?.description}</p>
    ) : (
      <section>
        {data.map((row) => (
          <article
            key={String(row.id)}
            role="button"
            aria-label={`row-${String(row.id)}`}
            onClick={() => onRowActivate?.(row)}
          >
            {columns.map((column) => (
              <section key={column.id ?? column.accessorKey ?? column.header}>
                {column.cell != null ? column.cell({ row }) : null}
              </section>
            ))}
          </article>
        ))}
      </section>
    ),
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock('@solvera/pace-core/forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/forms')>();
  return {
    ...actual,
    buildWorkflowPreviewTarget: () => ({ path: '/forms/sample', reason: 'generic_slug_entrypoint' }),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: state.invalidateQueries }),
  };
});

vi.mock('@/features/formsAuthoring/configuration', () => ({
  getFormDeleteBlockers: () => state.getDeleteBlockers(),
  useFormsList: () => ({
    isLoading: state.formsLoading,
    error: state.formsError,
    data: state.formsData,
  }),
  useFormFieldCounts: () => ({
    isLoading: state.fieldCountsLoading,
    error: state.fieldCountsError,
    data: state.fieldCountsData,
  }),
  useFormResponseCounts: () => ({
    isLoading: state.responseCountsLoading,
    error: state.responseCountsError,
    data: state.responseCountsData,
  }),
  useDeleteFormMutation: () => ({
    isPending: false,
    mutateAsync: state.deleteMutateAsync,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <FormsListPage />
    </MemoryRouter>
  );
}

describe('FormsListPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    state.selectedEvent = { name: 'Camp Alpha' };
    state.selectedEventId = 'event-1';
    state.selectedOrganisationId = 'org-1';
    state.appId = 'base-app';
    resolvedScopeState.organisationId = 'org-1';
    resolvedScopeState.eventId = 'event-1';
    resolvedScopeState.appId = 'base-app';
    state.allowRead = true;
    state.allowCreate = true;
    state.allowUpdate = true;
    state.formsLoading = false;
    state.formsError = null;
    state.fieldCountsLoading = false;
    state.fieldCountsError = null;
    state.fieldCountsData = {};
    state.responseCountsLoading = false;
    state.responseCountsError = null;
    state.responseCountsData = {};
    state.formsData = [];
    state.toastMock = vi.fn();
    state.deleteMutateAsync = vi.fn(async () => ({
      deleted: true,
      response_count: 0,
      registration_binding_count: 0,
    }));
    state.getDeleteBlockers.mockClear();
    state.getDeleteBlockers.mockResolvedValue({
      ok: true,
      data: {
        responseCount: 0,
        registrationBindingCount: 0,
      },
    });
    state.invalidateQueries = vi.fn();
    guardPropsState.calls = [];
    vi.stubGlobal('open', vi.fn());
    vi.stubEnv('VITE_PORTAL_BASE_URL', 'https://portal.example.com');
  });

  it('shows no-event message and hides create button when no event selected', () => {
    state.selectedEvent = null;
    state.selectedEventId = null;
    state.formsData = [];
    renderPage();
    expect(screen.getByText('Select an event from the header to manage forms.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New form' })).toBeNull();
  });

  it('shows loading state while forms are loading', () => {
    state.selectedEvent = { name: 'Camp Alpha' };
    state.selectedEventId = 'event-1';
    state.formsLoading = true;
    renderPage();
    expect(screen.getByText('Loading Spinner')).toBeTruthy();
  });

  it('shows empty state when event selected and no forms', () => {
    state.formsLoading = false;
    state.formsError = null;
    state.formsData = [];
    state.allowCreate = true;
    renderPage();
    expect(screen.getByText('No forms yet. Create your first form to get started.')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'New form' }).length).toBeGreaterThan(0);
  });

  it('shows access denied when read permission is denied', () => {
    state.allowRead = false;
    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
    state.allowRead = true;
  });

  it('passes non-null organisation scope into forms read guard when event is selected', () => {
    state.selectedEventId = 'event-1';
    resolvedScopeState.organisationId = 'org-1';
    resolvedScopeState.eventId = 'event-1';
    resolvedScopeState.appId = 'base-app';
    renderPage();

    const readGuardCall = guardPropsState.calls.find((call) => call.operation === 'read');
    expect(readGuardCall).toMatchObject({
      pageName: 'FormsPage',
      scope: {
        organisationId: 'org-1',
        eventId: 'event-1',
        appId: 'base-app',
      },
    });
  });

  it('renders form table rows with actions and hides delete when update denied', () => {
    state.allowUpdate = false;
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();

    expect(screen.getByText('Camp Form')).toBeTruthy();
    expect(screen.getByText('/camp-form')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByText('You do not have permission to view this page.')).toBeNull();
  });

  it('opens preview url when preview clicked', () => {
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(globalThis.open).toHaveBeenCalledWith('https://portal.example.com/forms/sample', '_blank');
  });

  it('shows portal config toast when preview clicked without VITE_PORTAL_BASE_URL', () => {
    vi.stubEnv('VITE_PORTAL_BASE_URL', '');
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(globalThis.open).not.toHaveBeenCalled();
    expect(state.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Portal URL is not configured. Set VITE_PORTAL_BASE_URL.',
        variant: 'destructive',
      })
    );
  });

  it('renders status badges and count columns when populated', () => {
    state.formsData = [
      {
        id: 'form-1',
        name: 'Published Form',
        slug: 'published-form',
        status: 'published',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: '2026-01-10T00:00:00.000Z',
        closes_at: '2026-01-20T00:00:00.000Z',
        created_at: null,
        updated_at: '2026-01-15T00:00:00.000Z',
      },
      {
        id: 'form-2',
        name: 'Closed Form',
        slug: 'closed-form',
        status: 'closed',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];
    state.fieldCountsData = { 'form-1': 3, 'form-2': 1 };
    state.responseCountsData = { 'form-1': 5, 'form-2': 0 };

    renderPage();
    expect(screen.getByText('Published Form')).toBeTruthy();
    expect(screen.getByText('published')).toBeTruthy();
    expect(screen.getByText('Closed Form')).toBeTruthy();
    expect(screen.getByText('closed')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows count fallback labels for loading and error branches', () => {
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];
    state.fieldCountsLoading = true;
    state.fieldCountsData = undefined as unknown as Record<string, number>;
    const { rerender } = renderPage();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    state.fieldCountsLoading = false;
    state.fieldCountsError = new Error('count fail');
    rerender(
      <MemoryRouter>
        <FormsListPage />
      </MemoryRouter>
    );
    expect(screen.getAllByText('?').length).toBeGreaterThan(0);
  });

  it('shows cannot-delete dialog without confirmation when dependencies block delete', async () => {
    const user = setupUser();
    state.getDeleteBlockers.mockResolvedValue({
      ok: true,
      data: {
        responseCount: 1,
        registrationBindingCount: 0,
      },
    });
    state.formsData = [
      {
        id: 'form-1',
        name: 'Second form',
        slug: 'second-form',
        status: 'published',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Cannot delete form')).toBeTruthy();
    expect(screen.getByText(/1 submission/i)).toBeTruthy();
    expect(screen.queryByText(/Are you sure you want to delete/i)).toBeNull();
    expect(state.deleteMutateAsync).not.toHaveBeenCalled();
  });

  it('opens confirmation when delete dependencies are clear and deletes on confirm', async () => {
    const user = setupUser();
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/Are you sure you want to delete 'Camp Form'/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'confirm-delete' }));
    expect(state.invalidateQueries).toHaveBeenCalled();
    expect(state.toastMock).toHaveBeenCalled();
  });

  it('shows blocked dialog after confirm when rpc reports dependencies', async () => {
    const user = setupUser();
    state.deleteMutateAsync.mockResolvedValue({
      deleted: false,
      response_count: 2,
      registration_binding_count: 1,
    });
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'information_collection',
        is_active: true,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'confirm-delete' }));
    expect(screen.getByText('Cannot delete form')).toBeTruthy();
    expect(screen.getByText(/2 submissions and 1 registration type binding/)).toBeTruthy();
  });
});
