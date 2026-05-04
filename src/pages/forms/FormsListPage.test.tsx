// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  formsData: [] as Array<{
    id: string;
    name: string;
    slug: string;
    status: 'draft' | 'published' | 'closed';
    workflow_type: 'generic';
    is_active: boolean | null;
    is_primary_entrypoint: boolean | null;
    opens_at: string | null;
    closes_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>,
  toastMock: vi.fn(),
  deleteMutateAsync: vi.fn(async () => ({ deleted: true, response_count: 0, registration_binding_count: 0 })),
  invalidateQueries: vi.fn(),
  clipboardWriteText: vi.fn(async () => undefined),
}));

const resolvedScopeState = vi.hoisted(() => ({
  organisationId: 'org-1' as string | null,
  eventId: 'event-1' as string | null,
  appId: 'base-app' as string | null,
  isLoading: false,
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
  useResolvedScope: () => resolvedScopeState,
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation: 'read' | 'create' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => {
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
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <footer className={className}>{children}</footer>
  ),
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
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading Spinner</p>,
}));

vi.mock('@solvera/pace-core/forms', () => ({
  buildWorkflowPreviewTarget: () => ({ path: '/forms/sample', reason: 'generic_slug_entrypoint' }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: state.invalidateQueries }),
  };
});

vi.mock('@/features/formsAuthoring/configuration', () => ({
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
    state.formsData = [];
    state.toastMock = vi.fn();
    state.deleteMutateAsync = vi.fn(async () => ({
      deleted: true,
      response_count: 0,
      registration_binding_count: 0,
    }));
    state.invalidateQueries = vi.fn();
    state.clipboardWriteText = vi.fn(async () => undefined);
    vi.stubGlobal('open', vi.fn());
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: state.clipboardWriteText,
      },
    });
  });

  it('shows no-event message and hides create button when no event selected', () => {
    state.selectedEvent = null;
    state.selectedEventId = null;
    state.formsData = [];
    renderPage();
    expect(screen.getByText('Select an event from the header to manage forms.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create Form' })).toBeNull();
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
    expect(screen.getAllByRole('button', { name: 'Create Form' }).length).toBeGreaterThan(0);
  });

  it('shows access denied when read permission is denied', () => {
    state.allowRead = false;
    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
    state.allowRead = true;
  });

  it('renders form cards with action row and hides delete when update denied', () => {
    state.allowUpdate = false;
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'generic',
        is_active: true,
        is_primary_entrypoint: false,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();

    expect(screen.getByText('Camp Form')).toBeTruthy();
    expect(screen.getByText('generic')).toBeTruthy();
    const footer = screen.getByRole('contentinfo');
    expect(footer.className.includes('grid-cols-4')).toBe(true);
    expect(screen.queryByLabelText('Delete Camp Form')).toBeNull();
  });

  it('opens preview url when preview clicked', () => {
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'generic',
        is_active: true,
        is_primary_entrypoint: false,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];

    renderPage();
    fireEvent.click(screen.getByLabelText('Preview Camp Form'));
    expect(globalThis.open).toHaveBeenCalledTimes(1);
  });

  it('renders status variants and date lines when populated', () => {
    state.formsData = [
      {
        id: 'form-1',
        name: 'Published Form',
        slug: 'published-form',
        status: 'published',
        workflow_type: 'generic',
        is_active: true,
        is_primary_entrypoint: true,
        opens_at: '2026-01-10T00:00:00.000Z',
        closes_at: '2026-01-20T00:00:00.000Z',
        created_at: null,
        updated_at: null,
      },
      {
        id: 'form-2',
        name: 'Closed Form',
        slug: 'closed-form',
        status: 'closed',
        workflow_type: 'generic',
        is_active: true,
        is_primary_entrypoint: false,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];
    state.fieldCountsData = { 'form-1': 3, 'form-2': 1 };

    renderPage();
    expect(screen.getByText('Published Form')).toBeTruthy();
    expect(screen.getByText('published')).toBeTruthy();
    expect(screen.getByText('Closed Form')).toBeTruthy();
    expect(screen.getByText('closed')).toBeTruthy();
    expect(screen.getByText('Opens: 10/01/2026')).toBeTruthy();
    expect(screen.getByText('Closes: 20/01/2026')).toBeTruthy();
    expect(screen.getByText('3 fields')).toBeTruthy();
  });

  it('shows field-count fallback labels for loading and error branches', () => {
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'generic',
        is_active: true,
        is_primary_entrypoint: false,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];
    state.fieldCountsLoading = true;
    state.fieldCountsData = undefined as unknown as Record<string, number>;
    const { rerender } = renderPage();
    expect(screen.getByText('— fields')).toBeTruthy();

    state.fieldCountsLoading = false;
    state.fieldCountsError = new Error('count fail');
    rerender(
      <MemoryRouter>
        <FormsListPage />
      </MemoryRouter>
    );
    expect(screen.getByText('? fields')).toBeTruthy();
  });

  it('handles delete success and blocked delete flows', async () => {
    const user = userEvent.setup();
    state.formsData = [
      {
        id: 'form-1',
        name: 'Camp Form',
        slug: 'camp-form',
        status: 'draft',
        workflow_type: 'generic',
        is_active: true,
        is_primary_entrypoint: false,
        opens_at: null,
        closes_at: null,
        created_at: null,
        updated_at: null,
      },
    ];
    state.deleteMutateAsync = vi
      .fn()
      .mockResolvedValueOnce({ deleted: true, response_count: 0, registration_binding_count: 0 })
      .mockResolvedValueOnce({ deleted: false, response_count: 2, registration_binding_count: 1 });

    renderPage();

    await user.click(screen.getByLabelText('Delete Camp Form'));
    await user.click(screen.getByRole('button', { name: 'confirm-delete' }));
    expect(state.invalidateQueries).toHaveBeenCalled();
    expect(state.toastMock).toHaveBeenCalled();

    await user.click(screen.getByLabelText('Delete Camp Form'));
    await user.click(screen.getByRole('button', { name: 'confirm-delete' }));
    expect(screen.getByText('Cannot delete form')).toBeTruthy();
    expect(screen.getByText(/2 submissions and 1 registration type binding/)).toBeTruthy();
  });
});
