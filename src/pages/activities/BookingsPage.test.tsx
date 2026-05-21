// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingsPage } from './BookingsPage';
import type { BookingQueryRow, BookingTableRow } from '@/features/bookingOversight/types';
import { mapBookingToTableRow } from '@/features/bookingOversight/display';

const state = vi.hoisted(() => ({
  selectedEvent: { id: 'event-1', name: 'Camp One', timezone: 'Australia/Sydney', organisation_id: 'org-1' } as unknown,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  bookingsLoading: false,
  bookingsError: null as unknown,
}));

const baseRow: BookingQueryRow = {
  id: 'book-1',
  event_id: 'event-1',
  organisation_id: 'org-1',
  session_id: 'sess-1',
  application_id: 'app-1',
  status: 'waitlisted',
  source: 'self',
  booked_at: '2026-05-01T10:00:00.000Z',
  cancelled_at: null,
  session: {
    id: 'sess-1',
    session_name: 'Morning',
    start_time: '2026-05-01T09:00:00.000Z',
    end_time: '2026-05-01T10:00:00.000Z',
    capacity: 10,
    offering: { id: 'off-1', name: 'Climb' },
  },
  application: {
    id: 'app-1',
    person: { preferred_name: 'Sam', first_name: 'Sam', last_name: 'Lee' },
  },
};

function buildTableRow(row: BookingQueryRow): BookingTableRow {
  return mapBookingToTableRow(row, 'Australia/Sydney');
}

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({
    scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
  }),
  useSecureSupabase: () => ({}),
  useCan: (permission: string) => {
    if (permission === 'read:page.bookings') return { can: state.canRead, isLoading: false };
    if (permission === 'create:page.bookings') return { can: state.canCreate, isLoading: false };
    if (permission === 'update:page.bookings') return { can: state.canUpdate, isLoading: false };
    if (permission === 'delete:page.bookings') return { can: state.canDelete, isLoading: false };
    return { can: false, isLoading: false };
  },
  PagePermissionGuard: ({
    children,
    fallback,
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) => (state.canRead ? <>{children}</> : <>{fallback ?? null}</>),
  AccessDenied: () => <main>Access Denied</main>,
}));

vi.mock('@/features/bookingOversight/configuration', () => ({
  useBookingsList: () => ({
    data: {
      raw: [baseRow],
      tableRows: [buildTableRow(baseRow)],
    },
    isLoading: state.bookingsLoading,
    error: state.bookingsError,
    refetch: vi.fn(async () => undefined),
  }),
  useApprovedApplicationsForBookingsQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useActivitySessionsForBookingsQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useCreateBookingMutation: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  useCancelBookingMutation: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
  useInvalidateBookingsQueries: () => vi.fn(),
}));

vi.mock('@/features/applicationsAdmin/queryHelpers', () => ({
  useRetryRefetchHandler: () => vi.fn(),
}));

vi.mock('@solvera/pace-core/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/utils')>();
  return {
    ...actual,
    NormalizeSupabaseError: (error: unknown) => ({ message: String(error) }),
    formatDateTime: (value: string) => value,
  };
});

vi.mock('@solvera/pace-core/components', async () => {
  const { MockButton, MockCheckboxField, MockFieldLabel, MockTextField } = await import(
    '@/test/paceCoreElementMocks'
  );
  return {
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: MockButton,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Checkbox: MockCheckboxField,
  DataTable: ({
    title,
    description,
    data,
    columns,
    emptyState,
  }: {
    title?: string;
    description?: string;
    data: Array<Record<string, unknown>>;
    columns: Array<{
      id?: string;
      header: string;
      cell?: (ctx: { row: Record<string, unknown> }) => React.ReactNode;
    }>;
    emptyState?: { description?: string };
  }) => (
    <section>
      {title != null ? <h2>{title}</h2> : null}
      {description != null ? <p>{description}</p> : null}
      {data.length === 0 ? <p>{emptyState?.description}</p> : null}
      {data.map((row, index) => (
        <article key={String(row.id ?? index)} data-testid={`row-${String(row.id ?? index)}`}>
          {columns.map((column) => (
            <section key={column.id ?? column.header}>
              {column.cell != null ? column.cell({ row }) : null}
            </section>
          ))}
        </article>
      ))}
    </section>
  ),
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <section>{children}</section> : null,
  DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  Form: ({ children, onSubmit }: { children: React.ReactNode; onSubmit?: (data: unknown) => void }) => (
    <section
      role="form"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit?.({});
        }
      }}
    >
      {children}
    </section>
  ),
  FormField: () => null,
  Label: MockFieldLabel,
  LoadingSpinner: () => <main>Loading</main>,
  Select: () => null,
  SelectContent: () => null,
  SelectGroup: () => null,
  SelectItem: () => null,
  SelectLabel: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
  Textarea: MockTextField,
  toast: vi.fn(),
  };
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('BookingsPage', () => {
  beforeEach(() => {
    state.selectedEvent = { id: 'event-1', name: 'Camp One', timezone: 'Australia/Sydney', organisation_id: 'org-1' };
    state.canRead = true;
    state.canCreate = true;
    state.canUpdate = true;
    state.canDelete = true;
    state.bookingsLoading = false;
    state.bookingsError = null;
  });

  it('shows no-event card when selected event is missing', () => {
    state.selectedEvent = null;
    renderPage();
    expect(screen.getByText('No event selected')).toBeTruthy();
    expect(screen.queryByText('Activity Bookings')).toBeNull();
  });

  it('shows access denied when read permission is denied', () => {
    state.canRead = false;
    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });

  it('shows activity bookings table description and book-on-behalf when permitted', () => {
    renderPage();
    expect(screen.getByText('Activity Bookings')).toBeTruthy();
    expect(screen.getByText(/1 bookings for Camp One/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Book on behalf' })).toBeTruthy();
  });

  it('hides book-on-behalf without create permission', () => {
    state.canCreate = false;
    renderPage();
    expect(screen.queryByRole('button', { name: 'Book on behalf' })).toBeNull();
  });

  it('shows Promote and Cancel on waitlisted row when update and delete are granted', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Promote' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('hides Promote without update permission', () => {
    state.canUpdate = false;
    renderPage();
    expect(screen.queryByRole('button', { name: 'Promote' })).toBeNull();
  });

  it('hides Cancel without delete permission', () => {
    state.canDelete = false;
    renderPage();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });
});
