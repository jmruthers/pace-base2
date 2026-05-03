// @vitest-environment jsdom

import { MemoryRouter, Navigate, Outlet } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { BASE_ROUTE_REGISTRY, getShellNavigationItems } from './config/baseRouteRegistry';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
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
  SessionRestorationLoader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  CardContent: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/layout/AuthenticatedShell', () => ({
  AuthenticatedShell: () => <Outlet />,
}));

vi.mock('@/components/shell/FeaturePlaceholderPanel', () => ({
  FeaturePlaceholderPanel: ({ title }: { title: string }) => <main>{`Feature: ${title}`}</main>,
}));

vi.mock('./pages/shell/ScanRuntimePlaceholderPage', () => ({
  ScanRuntimePlaceholderPage: () => <main>Scan Runtime</main>,
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
  });

  it('redirects unauthenticated root users to /login', async () => {
    renderAt('/');
    expect(await screen.findByText('Login Page BASE')).toBeTruthy();
  });

  it('redirects authenticated root users to /event-dashboard', async () => {
    authState.isAuthenticated = true;
    renderAt('/');
    expect(await screen.findByText('Feature: Event Dashboard')).toBeTruthy();
  });

  it('redirects authenticated /login visits back through root to event dashboard', async () => {
    authState.isAuthenticated = true;
    renderAt('/login');
    expect(await screen.findByText('Feature: Event Dashboard')).toBeTruthy();
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
});
