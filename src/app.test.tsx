// @vitest-environment jsdom

import { MemoryRouter, Navigate, Outlet } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { BASE_ROUTE_REGISTRY, getShellNavigationItems } from './config/baseRouteRegistry';

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
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation?: 'read' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => (operation === 'read' && !permissionState.allowRead ? <>{fallback}</> : <>{children}</>),
}));

vi.mock('./components/layout/AuthenticatedShell', () => ({
  AuthenticatedShell: () => (
    <main>
      Shell Layout
      <Outlet />
    </main>
  ),
}));

vi.mock('@/components/shell/FeaturePlaceholderPanel', () => ({
  FeaturePlaceholderPanel: ({ title }: { title: string }) => <main>{`Feature: ${title}`}</main>,
}));

vi.mock('./pages/shell/ScanRuntimePlaceholderPage', () => ({
  ScanRuntimePlaceholderPage: () => <main>Scan Runtime</main>,
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

vi.mock('./pages/applications/ApplicationsPage', () => ({
  ApplicationsPage: () => <main>Applications Page</main>,
}));

vi.mock('./pages/communications/CommunicationsPage', () => ({
  CommunicationsPage: () => <main>Communications Page</main>,
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
  it('defines the required fixed 10-item nav order', () => {
    const navItems = getShellNavigationItems();
    expect(navItems.map((item) => item.label)).toEqual([
      'Event Dashboard',
      'Configuration',
      'Forms',
      'Registration Types',
      'Applications',
      'Communications',
      'Units',
      'Activities',
      'Scanning',
      'Reports',
    ]);
  });

  it('keeps root entry and 404 out of shell nav', () => {
    const navPaths = new Set(getShellNavigationItems().map((item) => item.href));
    expect(navPaths.has('/')).toBe(false);
    expect(navPaths.has('*')).toBe(false);
  });

  it('registers communications as a shell route', () => {
    const communicationsRoute = BASE_ROUTE_REGISTRY.find(
      (route) => route.path === '/communications'
    );
    expect(communicationsRoute?.includeInShell).toBe(true);
    expect(communicationsRoute?.includeInNavigation).toBe(true);
    expect(communicationsRoute?.pageName).toBe('communications');
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

  it('renders scanning runtime route inside shell when authenticated', async () => {
    authState.isAuthenticated = true;
    renderAt('/scanning/scan-point-1');
    expect(await screen.findByText('Shell Layout')).toBeTruthy();
    expect(await screen.findByText('Scan Runtime')).toBeTruthy();
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
});
