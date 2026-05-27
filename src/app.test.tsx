// @vitest-environment jsdom

import { MemoryRouter, Navigate, Outlet } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  isRestoring: false,
}));

const permissionState = vi.hoisted(() => ({
  allowRead: true,
}));

const resolvedScopeState = vi.hoisted(() => ({
  organisationId: 'org-1' as string | null,
  eventId: 'event-1' as string | null,
  appId: 'base-app' as string | null,
  isLoading: false,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => authState,
}));

vi.mock('@solvera/pace-core/components', () => ({
  PaceLoginPage: ({ appName }: { appName: string }) => <main>Login Page {appName}</main>,
  ProtectedRoute: ({
    loginPath = '/login',
  }: {
    loginPath?: string;
    requireEvent?: boolean;
  }) => (authState.isAuthenticated ? <Outlet /> : <Navigate to={loginPath} replace />),
  SessionRestorationLoader: ({
    message,
    children,
  }: {
    message: string;
    children: React.ReactNode;
  }) => (authState.isRestoring ? <main>{message}</main> : <>{children}</>),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  CardContent: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  useResolvedScope: () => resolvedScopeState,
  useSecureSupabase: () => ({}),
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation?: 'read' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (operation === 'read' && resolvedScopeState.isLoading) {
      return null;
    }
    return operation === 'read' && !permissionState.allowRead ? <>{fallback}</> : <>{children}</>;
  },
}));

vi.mock('@/features/scanningRuntime/sync/scanSyncWorker', () => ({
  startScanSyncWorker: vi.fn(async () => undefined),
  stopScanSyncWorker: vi.fn(() => undefined),
}));

vi.mock('./components/layout/AuthenticatedShell', () => ({
  AuthenticatedShell: () => (
    <main>
      Shell Layout
      <Outlet />
    </main>
  ),
}));

vi.mock('./pages/scanning/ScanningRuntimePage', () => ({
  /** Mirrors in-page PagePermissionGuard when the full page module is mocked. */
  ScanningRuntimePage: () =>
    permissionState.allowRead ? <main>BA13 Scan Runtime</main> : <main>Access Denied</main>,
}));

vi.mock('./pages/eventConfiguration/EventDashboardPage', () => ({
  EventDashboardPage: () => <main>Event Dashboard Page</main>,
}));

vi.mock('./pages/eventConfiguration/EventConfigurationRoute', () => ({
  EventConfigurationRoute: () => <main>Event Configuration Page</main>,
}));

vi.mock('./pages/forms/FormsListPage', () => ({
  FormsListPage: () => <main>Forms List Page</main>,
}));

vi.mock('./pages/forms/FormBuilderPage', () => ({
  FormBuilderPage: () => <main>Form Builder Page</main>,
}));

vi.mock('./pages/registrationTypes/RegistrationTypesPage', () => ({
  RegistrationTypesPage: () => <main>Registration Types Page</main>,
}));

vi.mock('./pages/registrationTypes/RegistrationTypeBuilderPage', () => ({
  RegistrationTypeBuilderPage: () => <main>Registration Type Builder Page</main>,
}));

vi.mock('./pages/applications/ApplicationsPage', () => ({
  ApplicationsPage: () => <main>Applications Page</main>,
}));

vi.mock('./pages/communications/CommunicationsPage', () => ({
  CommunicationsPage: () => <main>Communications Page</main>,
}));

vi.mock('./pages/units/UnitsPage', () => ({
  UnitsPage: () => <main>Units Page</main>,
}));

vi.mock('./pages/unitPreferences/UnitPreferencesPage', () => ({
  UnitPreferencesPage: () => <main>Unit Preferences Page</main>,
}));

vi.mock('./pages/activities/ActivitiesPage', () => ({
  ActivitiesPage: () => <main>Activities Page</main>,
}));

vi.mock('./pages/activities/BookingsPage', () => ({
  BookingsPage: () => <main>Bookings Page</main>,
}));

vi.mock('./pages/activities/ActivityOfferingPage', () => ({
  ActivityOfferingPage: () => <main>Activity Offering Page</main>,
}));

vi.mock('./pages/scanning/ScanningSetupPage', () => ({
  ScanningSetupPage: () => <main>Scanning Setup Page</main>,
}));

vi.mock('./pages/scanning/ScanningTrackingPage', () => ({
  ScanningTrackingPage: () => <main>Scanning Tracking Page</main>,
}));

vi.mock('./pages/reports/ReportsPage', () => ({
  ReportsPage: () => <main>Reports Page</main>,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
});

describe('BA00 navigation contract', () => {
  it('renders communications route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/communications');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Communications Page')).toBeTruthy();
  });
});

describe('BA00 route behavior', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.isRestoring = false;
    permissionState.allowRead = true;
  });

  it('holds all route content behind restoration loader while restoring session', async () => {
    authState.isRestoring = true;
    renderAt('/');
    expect(await screen.findByText('Restoring session…')).toBeTruthy();
    expect(screen.queryByText('Login Page BASE')).toBeNull();
    expect(screen.queryByText('Event Dashboard Page')).toBeNull();
  });

  it('redirects unauthenticated root users to /login', async () => {
    renderAt('/');
    expect(await screen.findByText('Login Page BASE')).toBeTruthy();
    expect(screen.queryByText('Shell Layout')).toBeNull();
  });

  it('redirects authenticated root users to /event-dashboard', async () => {
    authState.isAuthenticated = true;
    renderAt('/');
    expect(await screen.findByText('Event Dashboard Page')).toBeTruthy();
  });

  it('redirects authenticated /login visits back through root to event dashboard', async () => {
    authState.isAuthenticated = true;
    renderAt('/login');
    expect(await screen.findByText('Event Dashboard Page')).toBeTruthy();
  });

  it('renders scanning runtime route outside standard app shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/scanning/scan-point-1');
    expect(await screen.findByText('BA13 Scan Runtime')).toBeTruthy();
    expect(screen.queryByText('Shell Layout')).toBeNull();
  });

  it('redirects unauthenticated scanning runtime route to login', async () => {
    renderAt('/scanning/scan-point-1');
    expect(await screen.findByText('Login Page BASE')).toBeTruthy();
  });

  it('renders in-shell 404 with a return link to event dashboard', async () => {
    authState.isAuthenticated = true;
    renderAt('/does-not-exist');
    expect(await screen.findByText('404 — Page Not Found')).toBeTruthy();
    const returnLink = screen.getByRole('link', {
      name: 'Return to Event Dashboard',
    });
    expect(returnLink.getAttribute('href')).toBe('/event-dashboard');
  });

  it('shows access denied when route read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;

    renderAt('/event-dashboard');

    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('does not show transient access denied while scope is still loading', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = true;
    resolvedScopeState.isLoading = true;

    const view = renderAt('/event-dashboard');
    expect(screen.queryByText('Access Denied')).toBeNull();
    expect(screen.queryByText('Event Dashboard Page')).toBeNull();

    resolvedScopeState.isLoading = false;
    view.rerender(
      <MemoryRouter initialEntries={['/event-dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Event Dashboard Page')).toBeTruthy();
    });
    expect(screen.queryByText('Access Denied')).toBeNull();
  });

  it('shows access denied for scanning runtime when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/scanning/scan-point-1');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('shows access denied for applications when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/applications');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('shows access denied for activities list when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/activities');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('shows access denied for activity detail when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/activities/offering-1');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('renders form builder route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/form-builder');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Form Builder Page')).toBeTruthy();
  });

  it('renders forms route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/forms');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Forms List Page')).toBeTruthy();
  });

  it('renders registration types route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/registration-types');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Registration Types Page')).toBeTruthy();
  });

  it('renders registration type builder route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/registration-type-builder');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Registration Type Builder Page')).toBeTruthy();
  });

  it('renders configuration route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/configuration');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Event Configuration Page')).toBeTruthy();
  });

  it('renders applications route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/applications');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Applications Page')).toBeTruthy();
  });

  it('renders communications route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/communications');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Communications Page')).toBeTruthy();
  });

  it('renders activities route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/activities');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Activities Page')).toBeTruthy();
  });

  it('renders units route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/units');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Units Page')).toBeTruthy();
  });

  it('renders unit preferences route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/unit-preferences');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Unit Preferences Page')).toBeTruthy();
  });

  it('renders scanning setup route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/scanning');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Scanning Setup Page')).toBeTruthy();
  });

  it('renders scanning tracking route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/scanning/tracking');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Scanning Tracking Page')).toBeTruthy();
  });

  it('shows access denied for scanning tracking when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/scanning/tracking');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('renders reports route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/reports');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Reports Page')).toBeTruthy();
  });

  it('shows access denied for reports when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/reports');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('renders activity offering route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/activities/offering-1');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Activity Offering Page')).toBeTruthy();
  });

  it('renders activity bookings route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/activities/bookings');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Bookings Page')).toBeTruthy();
  });

  it('shows access denied for activity bookings when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/activities/bookings');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });

  it('shows access denied for scanning setup when read permission is denied', async () => {
    authState.isAuthenticated = true;
    permissionState.allowRead = false;
    renderAt('/scanning');
    expect(await screen.findByText('Access Denied')).toBeTruthy();
  });
});
