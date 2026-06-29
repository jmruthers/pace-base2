import { describe, expect, it } from 'vitest';
import { BASE_ROUTE_REGISTRY } from '@/features/navigation/base-route-registry';
import {
  BASE_ROUTE_PERMISSIONS,
  getBaseRouteForPathname,
  getBaseRoutePermissionForPath,
} from '@/features/navigation/base-route-permissions';

const SHELL_ROUTES = BASE_ROUTE_REGISTRY.filter((route) => route.includeInShell);

describe('base-route-permissions', () => {
  it('keeps route registry and permission map in parity', () => {
    for (const route of SHELL_ROUTES) {
      const mapped = BASE_ROUTE_PERMISSIONS[route.pageName];
      expect(mapped).toBeDefined();
      expect(mapped?.pageName).toBe(route.pageName);
      expect(mapped?.operation).toBe('read');
    }
  });

  it('resolves longest-prefix route permissions for nested paths', () => {
    expect(getBaseRouteForPathname('/applications/app-1')?.pageName).toBe('ApplicationsPage');
    expect(getBaseRouteForPathname('/activities/offering-1')?.pageName).toBe('ActivitiesPage');
    expect(getBaseRouteForPathname('/activities/bookings')?.pageName).toBe('BookingsPage');
    expect(getBaseRouteForPathname('/scanning/tracking')?.pageName).toBe('ScanningPage');
  });

  it('resolves route path permissions for shell routes', () => {
    expect(getBaseRoutePermissionForPath('/event-dashboard')).toEqual({
      pageName: 'EventDashboardPage',
      operation: 'read',
    });
    expect(getBaseRoutePermissionForPath('/configuration')).toEqual({
      pageName: 'ConfigurationPage',
      operation: 'read',
    });
    expect(getBaseRoutePermissionForPath('/forms')).toEqual({
      pageName: 'FormsPage',
      operation: 'read',
    });
    expect(getBaseRoutePermissionForPath('/')).toEqual({
      pageName: 'ShellLandingPage',
      operation: 'read',
    });
    expect(getBaseRoutePermissionForPath('/scanning/scan-point-1')).toEqual({
      pageName: 'ScanningPage',
      operation: 'read',
    });
  });
});
