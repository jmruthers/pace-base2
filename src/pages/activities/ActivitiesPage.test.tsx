// @vitest-environment jsdom
/* eslint-disable pace-core-compliance/prefer-pace-core-components */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivitiesPage } from './ActivitiesPage';

const authState = vi.hoisted(() => ({
  selectedOrganisationId: 'org-1' as string | null,
  selectedEvent: { id: 'event-1', name: 'Camp One' } as unknown,
}));

const permissionState = vi.hoisted(() => ({
  create: true,
  update: true,
  delete: true,
}));

const queryState = vi.hoisted(() => ({
  offerings: [] as Array<Record<string, unknown>>,
  offeringsLoading: false,
  offeringsError: null as Error | null,
  offeringsRefetch: vi.fn(async () => undefined),
  tracActivities: [] as Array<{ id: string; name: string; event_id: string }>,
  tracActivitiesEventId: null as string | null,
  deleteSessionCount: 0,
  deleteSessionCountLoading: false,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: authState.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedOrganisationId: authState.selectedOrganisationId,
  }),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
  useResolvedScope: () => ({
    organisationId: authState.selectedOrganisationId,
    eventId:
      authState.selectedEvent != null && typeof authState.selectedEvent === 'object'
        ? ((authState.selectedEvent as { id?: string }).id ?? null)
        : null,
    appId: 'base-app',
    isLoading: false,
  }),
  PagePermissionGuard: ({
    operation,
    children,
    fallback,
  }: {
    operation?: 'read' | 'create' | 'update' | 'delete';
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) => {
    const allowed =
      operation == null ||
      (operation === 'create' && permissionState.create) ||
      (operation === 'update' && permissionState.update) ||
      (operation === 'delete' && permissionState.delete) ||
      operation === 'read';
    return allowed ? <>{children}</> : <>{fallback ?? null}</>;
  },
}));

vi.mock('@/features/activityOfferingSetup/configuration', () => ({
  useOfferingsList: () => ({
    data: queryState.offerings,
    isLoading: queryState.offeringsLoading,
    error: queryState.offeringsError,
    refetch: queryState.offeringsRefetch,
  }),
  useTracActivities: (eventId: string | null) => {
    queryState.tracActivitiesEventId = eventId;
    return { data: queryState.tracActivities, isLoading: false, error: null };
  },
  useOfferingSessionCount: () => ({
    data: queryState.deleteSessionCount,
    isLoading: queryState.deleteSessionCountLoading,
  }),
  useCreateOfferingMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateOfferingMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteOfferingMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@solvera/pace-core/utils', () => ({
  NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
  HandleMutationError: vi.fn(),
  ShowSuccessMessage: vi.fn(),
  formatDateTime: (value: string) => value,
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
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DataTable: ({
    data,
    columns,
    title,
    description,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{ id?: string; header: string; cell?: (ctx: { row: Record<string, unknown> }) => React.ReactNode }>;
    title?: string;
    description?: string;
  }) => (
    <section>
      {title != null ? <h2>{title}</h2> : null}
      {description != null ? <p>{description}</p> : null}
      {data.map((row, index) => (
        <article key={String(row.id ?? index)}>
          {columns.map((column) => (
            <section key={column.id ?? column.header}>
              {column.cell != null ? column.cell({ row }) : null}
            </section>
          ))}
        </article>
      ))}
    </section>
  ),
  DateTimeField: () => <section>DateTimeField</section>,
  Dialog: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  Form: ({
    children,
    defaultValues,
  }: {
    children: React.ReactNode | ((methods: { getValues: () => Record<string, unknown> }) => React.ReactNode);
    defaultValues?: Record<string, unknown>;
    onSubmit: (values: Record<string, unknown>) => void;
  }) => (
    <section>
      {typeof children === 'function' ? children({ getValues: () => defaultValues ?? {} }) : children}
    </section>
  ),
  FormField: ({
    render,
  }: {
    render: (props: { field: { value?: unknown; onChange: (nextValue: unknown) => void } }) => React.ReactNode;
  }) => <>{render({ field: { value: '', onChange: () => undefined } })}</>,
  Input: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => (
    <input value={value} onChange={(event) => onChange?.(event.target.value)} />
  ),
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  LoadingSpinner: () => <p>Loading</p>,
  SaveActions: ({ onCancel, onSaveClick }: { onCancel?: () => void; onSaveClick?: () => void }) => (
    <section>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" onClick={onSaveClick}>
        Save
      </button>
    </section>
  ),
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Switch: () => <section>Switch</section>,
}));

describe('ActivitiesPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    authState.selectedEvent = { id: 'event-1', name: 'Camp One' };
    permissionState.create = true;
    permissionState.update = true;
    permissionState.delete = true;
    queryState.offerings = [];
    queryState.offeringsLoading = false;
    queryState.offeringsError = null;
    queryState.deleteSessionCount = 0;
    queryState.deleteSessionCountLoading = false;
    queryState.tracActivitiesEventId = null;
  });

  it('shows no-event selected card when event context is missing', () => {
    authState.selectedEvent = null;
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('No event selected')).toBeTruthy();
    expect(screen.getByText('Select an event from the header to manage its activities.')).toBeTruthy();
  });

  it('hides create button without create permission', () => {
    permissionState.create = false;
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByRole('button', { name: 'Create offering' })).toBeNull();
  });

  it('disables delete offering when session count exists', () => {
    queryState.offerings = [
      {
        id: 'offering-1',
        name: 'Canoe',
        trac_activity_id: null,
        booking_open_at: null,
        booking_close_at: null,
        cost: null,
        payment_due_at: null,
        allow_waitlist: false,
        event_id: 'event-1',
        organisation_id: 'org-1',
        trac_activity: null,
        sessions: [{ count: 2 }],
      },
    ];
    queryState.deleteSessionCount = 2;
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('All sessions must be removed before this offering can be deleted.')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Cannot delete — sessions exist' }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('renders table metadata and scopes TRAC lookup by selected event id', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Activity Offerings')).toBeTruthy();
    expect(queryState.tracActivitiesEventId).toBe('event-1');
  });

  it('renders offering name as navigation action', () => {
    queryState.offerings = [
      {
        id: 'offering-1',
        name: 'Canoe',
        trac_activity_id: null,
        booking_open_at: null,
        booking_close_at: null,
        cost: null,
        payment_due_at: null,
        allow_waitlist: false,
        event_id: 'event-1',
        organisation_id: 'org-1',
        trac_activity: null,
        sessions: [{ count: 0 }],
      },
    ];
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ActivitiesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByRole('button', { name: 'Canoe' })).toBeTruthy();
  });
});
