import type { NavigationItem } from '@solvera/pace-core/components';

export interface BaseRouteDefinition {
  path: string;
  label: string;
  pageName: string;
  sliceId: string;
  includeInShell: boolean;
  includeInNavigation: boolean;
}

export const BASE_ROUTE_REGISTRY: ReadonlyArray<BaseRouteDefinition> = [
  {
    path: '/login',
    label: 'Login',
    pageName: 'login',
    sliceId: 'BA00-app-shell-and-access',
    includeInShell: false,
    includeInNavigation: false,
  },
  {
    path: '/',
    label: 'Home',
    pageName: 'dashboard',
    sliceId: 'BA00-app-shell-and-access',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '*',
    label: 'Not Found',
    pageName: 'not-found',
    sliceId: 'BA00-app-shell-and-access',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/event-dashboard',
    label: 'Event Dashboard',
    pageName: 'event-dashboard',
    sliceId: 'BA01-event-workspace-and-configuration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/configuration',
    label: 'Configuration',
    pageName: 'configuration',
    sliceId: 'BA01-event-workspace-and-configuration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/forms',
    label: 'Forms',
    pageName: 'forms',
    sliceId: 'BA03-forms-authoring-and-base-integration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/form-builder',
    label: 'Form Builder',
    pageName: 'form-builder',
    sliceId: 'BA03-forms-authoring-and-base-integration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/registration-types',
    label: 'Registration Types',
    pageName: 'registration-types',
    sliceId: 'BA04-registration-setup-and-policy',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/applications',
    label: 'Applications',
    pageName: 'applications',
    sliceId: 'BA06-applications-admin-and-review',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/units',
    label: 'Units',
    pageName: 'units',
    sliceId: 'BA08-units-and-group-coordination',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/unit-preferences',
    label: 'Unit Preferences',
    pageName: 'unit-preferences',
    sliceId: 'BA08-units-and-group-coordination',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/activities',
    label: 'Activities',
    pageName: 'activities',
    sliceId: 'BA09-activity-offering-and-session-setup',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/activities/:offeringId',
    label: 'Activity Detail',
    pageName: 'activities',
    sliceId: 'BA09-activity-offering-and-session-setup',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/activities/bookings',
    label: 'Activity Bookings',
    pageName: 'activities-bookings',
    sliceId: 'BA11-activity-booking-operations-and-oversight',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/scanning',
    label: 'Scanning',
    pageName: 'scanning',
    sliceId: 'BA12-scanning-setup',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/scanning/:scanPointId',
    label: 'Scan Runtime',
    pageName: 'scanning-runtime',
    sliceId: 'BA13-scanning-runtime-and-validation',
    includeInShell: false,
    includeInNavigation: false,
  },
  {
    path: '/scanning/tracking',
    label: 'Scan Tracking',
    pageName: 'scanning-tracking',
    sliceId: 'BA16-scanning-tracking-dashboard',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/reports',
    label: 'Reports',
    pageName: 'reports',
    sliceId: 'BA15-reporting',
    includeInShell: true,
    includeInNavigation: true,
  },
] as const;

function toRelativePath(path: string): string {
  if (path.startsWith('/')) {
    return path.slice(1);
  }
  return path;
}

export function getShellProtectedRoutes(): ReadonlyArray<
  BaseRouteDefinition & { relativePath: string }
> {
  return BASE_ROUTE_REGISTRY.filter((route) => route.includeInShell).map((route) => ({
    ...route,
    relativePath: toRelativePath(route.path),
  }));
}

export function getShellNavigationItems(): ReadonlyArray<NavigationItem> {
  return BASE_ROUTE_REGISTRY.filter(
    (route) => route.includeInShell && route.includeInNavigation
  ).map((route) => ({
    id: route.path,
    label: route.label,
    href: route.path,
    pageId: route.pageName,
  }));
}

export const SHELL_IMPLEMENTATION_PATHS: ReadonlyArray<string> =
  BASE_ROUTE_REGISTRY.filter((route) => route.includeInShell).map((route) => route.path);
