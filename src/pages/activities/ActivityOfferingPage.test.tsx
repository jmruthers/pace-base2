// @vitest-environment jsdom
/* eslint-disable pace-core-compliance/prefer-pace-core-components */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityOfferingPage } from './ActivityOfferingPage';

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
  offering: {
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
  } as Record<string, unknown> | null,
  offeringLoading: false,
  offeringError: null as Error | null,
  sessions: [] as Array<Record<string, unknown>>,
  sessionsLoading: false,
  sessionsError: null as Error | null,
  bookingCount: 0,
  bookingCountLoading: false,
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
  useOffering: () => ({
    data: queryState.offering,
    isLoading: queryState.offeringLoading,
    error: queryState.offeringError,
    refetch: vi.fn(async () => undefined),
  }),
  useOfferingSessions: () => ({
    data: queryState.sessions,
    isLoading: queryState.sessionsLoading,
    error: queryState.sessionsError,
    refetch: vi.fn(async () => undefined),
  }),
  useTracActivities: () => ({ data: [], isLoading: false, error: null }),
  useSessionBookingCount: () => ({
    data: queryState.bookingCount,
    isLoading: queryState.bookingCountLoading,
  }),
  useUpdateOfferingMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSessionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSessionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSessionMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Checkbox: ({
    checked,
    onChange,
  }: {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
  }) => <input type="checkbox" checked={checked} onChange={(event) => onChange?.(event.target.checked)} />,
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

function renderRoute() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/activities/offering-1']}>
        <Routes>
          <Route path="/activities/:offeringId" element={<ActivityOfferingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ActivityOfferingPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    authState.selectedEvent = { id: 'event-1', name: 'Camp One' };
    queryState.offering = {
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
    };
    queryState.offeringLoading = false;
    queryState.offeringError = null;
    queryState.sessions = [];
    queryState.sessionsLoading = false;
    queryState.sessionsError = null;
    queryState.bookingCount = 0;
    queryState.bookingCountLoading = false;
  });

  it('shows no-event card when selected event is missing', () => {
    authState.selectedEvent = null;
    renderRoute();
    expect(screen.getByText('No event selected')).toBeTruthy();
    expect(screen.getByText('Select an event from the header to view this offering.')).toBeTruthy();
  });

  it('shows offering-not-found alert when offering query returns null', () => {
    queryState.offering = null;
    renderRoute();
    expect(screen.getByText('This offering could not be found. It may have been deleted.')).toBeTruthy();
  });

  it('requires acknowledgement before deleting session with bookings', () => {
    queryState.sessions = [
      {
        id: 'session-1',
        offering_id: 'offering-1',
        session_name: 'Morning',
        start_time: '2026-05-12T08:00:00.000Z',
        end_time: '2026-05-12T09:00:00.000Z',
        location_display_name: null,
        capacity: 10,
        created_at: null,
        updated_at: null,
      },
    ];
    queryState.bookingCount = 2;
    renderRoute();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(
      screen.getByText('This session has 2 booking(s). Deleting it will remove those bookings permanently.')
    ).toBeTruthy();
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[1];
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders sessions table metadata', () => {
    renderRoute();
    expect(screen.getByText('Sessions')).toBeTruthy();
    expect(screen.getByText('Sessions for this offering.')).toBeTruthy();
  });
});
