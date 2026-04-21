/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Navigate, Outlet } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';
import {
  BASE_ROUTE_REGISTRY,
  getShellNavigationItems,
  SHELL_IMPLEMENTATION_PATHS,
} from './config/baseRouteRegistry';

let isAuthenticated = true;

vi.mock('@solvera/pace-core/components', () => ({
  LoadingSpinner: () => <p>Loading spinner</p>,
  PaceLoginPage: () => <h1>Login page</h1>,
  ProtectedRoute: ({ loginPath }: { loginPath: string }) =>
    isAuthenticated ? <Outlet /> : <Navigate to={loginPath} replace />,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <h1>Access denied</h1>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./components/layout/AuthenticatedShell', () => ({
  AuthenticatedShell: () => (
    <main>
      <h1>Authenticated shell</h1>
      <Outlet />
    </main>
  ),
}));

vi.mock('./pages/shell/ShellLandingPage', () => ({
  ShellLandingPage: () => <h2>Shell landing</h2>,
}));

vi.mock('./pages/shell/BaseNotFoundPage', () => ({
  BaseNotFoundPage: () => <h2>Base not found</h2>,
}));

vi.mock('./pages/shell/ScanRuntimePlaceholderPage', () => ({
  ScanRuntimePlaceholderPage: () => <h2>Scan runtime</h2>,
}));

vi.mock('@/components/shell/FeaturePlaceholderPanel', () => ({
  FeaturePlaceholderPanel: ({ title }: { title: string }) => <p>{title}</p>,
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('BA00 shell routing boundary', () => {
  beforeEach(() => {
    isAuthenticated = true;
  });
  afterEach(() => {
    cleanup();
  });

  it('renders /login outside the authenticated shell', () => {
    isAuthenticated = false;

    renderAt('/login');

    expect(screen.queryByRole('heading', { name: 'Login page' })).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Authenticated shell' })
    ).toBeNull();
  });

  it('redirects unauthenticated / access to login', () => {
    isAuthenticated = false;

    renderAt('/');

    expect(screen.queryByRole('heading', { name: 'Login page' })).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Authenticated shell' })
    ).toBeNull();
  });

  it('renders / inside the authenticated shell', () => {
    renderAt('/');

    expect(screen.queryByRole('heading', { name: 'Authenticated shell' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Shell landing' })).not.toBeNull();
  });

  it('renders unknown routes in BASE not-found state inside shell', () => {
    renderAt('/unknown-path');

    expect(screen.queryByRole('heading', { name: 'Authenticated shell' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Base not found' })).not.toBeNull();
  });

  it('keeps /scanning/:scanPointId outside the authenticated shell boundary', () => {
    renderAt('/scanning/abc123');

    expect(screen.queryByRole('heading', { name: 'Scan runtime' })).not.toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Authenticated shell' })
    ).toBeNull();
  });
});

describe('BA00 navigation and route ownership derivation', () => {
  it('uses BA-prefixed slice ownership ids in route registry', () => {
    const invalidSliceIds = BASE_ROUTE_REGISTRY.filter(
      (route) => !/^BA\d{2}[a-z]?-.+/.test(route.sliceId)
    );

    expect(invalidSliceIds).toHaveLength(0);
  });

  it('derives shell implementation paths only from shell-owned routes', () => {
    const expectedShellPaths = BASE_ROUTE_REGISTRY.filter((route) => route.includeInShell).map(
      (route) => route.path
    );

    expect(SHELL_IMPLEMENTATION_PATHS).toEqual(expectedShellPaths);
  });

  it('derives navigation from shell routes marked for navigation', () => {
    const expectedNavPaths = BASE_ROUTE_REGISTRY.filter(
      (route) => route.includeInShell && route.includeInNavigation
    ).map((route) => route.path);

    const navItems = getShellNavigationItems();

    expect(navItems.map((item) => item.href)).toEqual(expectedNavPaths);
    expect(navItems.map((item) => item.href)).not.toContain('/login');
    expect(navItems.map((item) => item.href)).not.toContain('*');
  });
});
