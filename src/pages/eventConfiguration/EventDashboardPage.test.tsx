// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventDashboardPage } from './EventDashboardPage';

const dashboardState = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  selectedEvent: {
    event_name: 'Summer Event',
    event_date: '2026-08-20T00:00:00.000Z',
    event_days: 2,
    event_venue: 'Main Hall',
  } as Record<string, unknown> | null,
  counts: {
    forms: 5 as number | null,
    applications: 12 as number | null,
    registrationTypes: 3 as number | null,
    units: 2 as number | null,
    activities: 4 as number | null,
    isLoading: false,
  },
  metrics: {
    awaitingApplications: 2 as number | null,
    approvedApplications: 8 as number | null,
    publishedForms: 3 as number | null,
    isLoading: false,
  },
  logoRef: null as Record<string, unknown> | null,
  fileDisplayProps: null as Record<string, unknown> | null,
}));

const resolvedScopeState = vi.hoisted(() => ({
  organisationId: 'org-1' as string | null,
  eventId: 'event-1' as string | null,
  appId: 'base-app' as string | null,
  isLoading: false,
}));

const guardPropsState = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a
      href={to}
      {...rest}
    >
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@solvera/pace-core/components', () => ({
  AttentionSection: ({ items }: { items: Array<{ title: string }> }) => (
    <section>{items.map((item) => item.title).join(', ')}</section>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <section role="button" tabIndex={0} onClick={onClick}>
      {children}
    </section>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardGrid: ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
    <section>
      {heading != null ? <h2>{heading}</h2> : null}
      {children}
    </section>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  EntityHero: ({
    title,
    actions,
    media,
  }: {
    title: React.ReactNode;
    actions?: React.ReactNode;
    media?: React.ReactNode;
  }) => (
    <section>
      {media}
      {title}
      {actions}
    </section>
  ),
  FileDisplay: (props: Record<string, unknown>) => {
    dashboardState.fileDisplayProps = props;
    return <p>Logo</p>;
  },
  HeroLogo: ({ code }: { code?: string }) => <span>{code}</span>,
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: dashboardState.selectedEvent }),
  useUnifiedAuth: () => ({ selectedEventId: dashboardState.selectedEventId }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  useStorageCapableClient: () => ({}),
  useResolvedScope: () => resolvedScopeState,
  PagePermissionGuard: (props: Record<string, unknown>) => {
    guardPropsState.lastProps = props;
    return <>{props.children as React.ReactNode}</>;
  },
}));

vi.mock('@solvera/pace-core/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solvera/pace-core/utils')>();
  return {
    ...actual,
    formatDate: (value: string) => value.slice(0, 10),
  };
});

vi.mock('@/features/eventConfiguration/dashboard', () => ({
  useDashboardCounts: () => dashboardState.counts,
}));

vi.mock('@/features/eventConfiguration/dashboardMetrics', () => ({
  useEventDashboardMetrics: () => dashboardState.metrics,
}));

vi.mock('@/features/eventConfiguration/useEventLogoReference', () => ({
  useEventLogoReference: () => ({ data: dashboardState.logoRef }),
}));

describe('EventDashboardPage', () => {
  afterEach(() => {
    cleanup();
    dashboardState.selectedEventId = 'event-1';
    resolvedScopeState.eventId = 'event-1';
    dashboardState.selectedEvent = {
      event_name: 'Summer Event',
      event_date: '2026-08-20T00:00:00.000Z',
      event_days: 2,
      event_venue: 'Main Hall',
    };
    dashboardState.counts = {
      forms: 5,
      applications: 12,
      registrationTypes: 3,
      units: 2,
      activities: 4,
      isLoading: false,
    };
    dashboardState.metrics = {
      awaitingApplications: 2,
      approvedApplications: 8,
      publishedForms: 3,
      isLoading: false,
    };
    dashboardState.logoRef = null;
    dashboardState.fileDisplayProps = null;
    guardPropsState.lastProps = null;
  });

  it('shows no-event guidance when no event is selected', () => {
    dashboardState.selectedEventId = null;
    dashboardState.selectedEvent = null;

    render(<EventDashboardPage />);

    expect(screen.getByText('Select an event from the header to begin.')).toBeTruthy();
  });

  it('shows loading counts with ellipsis while dashboard counts are unresolved', () => {
    dashboardState.counts = {
      forms: null,
      applications: null,
      registrationTypes: null,
      units: null,
      activities: null,
      isLoading: true,
    };

    render(<EventDashboardPage />);

    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(4);
  });

  it('shows em-dash counts when count fetches fail', () => {
    dashboardState.counts = {
      forms: null,
      applications: null,
      registrationTypes: null,
      units: null,
      activities: null,
      isLoading: false,
    };

    render(<EventDashboardPage />);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('renders prototype-aligned dashboard regions when an event is selected', () => {
    render(<EventDashboardPage />);

    expect(screen.getAllByRole('heading', { name: 'Summer Event' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Review applications')).toBeTruthy();
    expect(screen.getByText('Edit forms')).toBeTruthy();
    expect(screen.getByText('Event setup')).toBeTruthy();
    expect(screen.getByText('Event details')).toBeTruthy();
    expect(screen.getByText('Applications awaiting approval')).toBeTruthy();
  });

  it('passes FileDisplay bucket and label when a logo reference exists', () => {
    dashboardState.logoRef = {
      id: 'ref-1',
      file_metadata: { bucket: 'public-files', fileName: 'logo.png' },
      is_public: true,
      file_path: 'configuration/event_logos/logo.png',
    };

    render(<EventDashboardPage />);

    expect(screen.getByText('Logo')).toBeTruthy();
    expect(dashboardState.fileDisplayProps).toMatchObject({
      bucket: 'public-files',
      label: 'Event logo',
      variant: 'inline',
    });
    expect(dashboardState.fileDisplayProps?.supabase).toBeTruthy();
  });

  it('passes event dashboard guard scope with resolved app id', () => {
    render(<EventDashboardPage />);

    expect(guardPropsState.lastProps).toMatchObject({
      pageName: 'EventDashboardPage',
      operation: 'read',
      scope: {
        organisationId: 'org-1',
        eventId: 'event-1',
        appId: 'base-app',
      },
    });
  });
});
