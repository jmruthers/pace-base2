// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedEventId: state.selectedEventId,
    selectedOrganisationId: state.selectedOrganisationId,
    appId: state.appId,
  }),
  useToast: () => ({ toast: state.toastMock }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
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
  ConfirmationDialog: () => null,
  Dialog: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
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
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock('@/features/formsAuthoring/configuration', () => ({
  useFormsList: () => ({
    isLoading: state.formsLoading,
    error: state.formsError,
    data: state.formsData,
  }),
  useFormFieldCounts: () => ({
    isLoading: false,
    error: null,
    data: {},
  }),
  useDeleteFormMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
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
    state.allowRead = true;
    state.allowCreate = true;
    state.allowUpdate = true;
    state.formsLoading = false;
    state.formsError = null;
    state.formsData = [];
    state.toastMock = vi.fn();
    vi.stubGlobal('open', vi.fn());
  });

  it('shows no-event message and hides create button when no event selected', () => {
    state.selectedEvent = null;
    state.selectedEventId = null;
    state.formsData = [];
    renderPage();
    expect(screen.getByText('Select an event from the header to manage forms.')).toBeTruthy();
    expect(screen.queryByText('Create Form')).toBeNull();
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
    expect(screen.getAllByText('Create Form').length).toBeGreaterThan(0);
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
});
