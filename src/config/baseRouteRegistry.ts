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
    sliceId: 'app-shell-and-access',
    includeInShell: false,
    includeInNavigation: false,
  },
  {
    path: '/',
    label: 'Root Entry Redirect',
    pageName: 'root-entry',
    sliceId: 'app-shell-and-access',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '*',
    label: 'Not Found',
    pageName: 'not-found',
    sliceId: 'app-shell-and-access',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/event-dashboard',
    label: 'Event Dashboard',
    pageName: 'event-dashboard',
    sliceId: 'event-workspace-and-configuration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/configuration',
    label: 'Configuration',
    pageName: 'configuration',
    sliceId: 'event-workspace-and-configuration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/forms',
    label: 'Forms',
    pageName: 'forms',
    sliceId: 'forms-authoring-and-base-integration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/form-builder',
    label: 'Form Builder',
    pageName: 'form-builder',
    sliceId: 'forms-authoring-and-base-integration',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/registration-types',
    label: 'Registration Types',
    pageName: 'registration-types',
    sliceId: 'registration-setup-and-policy',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/applications',
    label: 'Applications',
    pageName: 'applications',
    sliceId: 'applications-admin-and-review',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/communications',
    label: 'Communications',
    pageName: 'communications',
    sliceId: 'communications-and-system-notifications',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/units',
    label: 'Units',
    pageName: 'units',
    sliceId: 'units-and-group-coordination',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/unit-preferences',
    label: 'Unit Preferences',
    pageName: 'unit-preferences',
    sliceId: 'units-and-group-coordination',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/activities',
    label: 'Activities',
    pageName: 'activities',
    sliceId: 'activity-offering-and-session-setup',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/activities/bookings',
    label: 'Bookings',
    pageName: 'bookings',
    sliceId: 'activity-booking-operations-oversight',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/activities/:offeringId',
    label: 'Activity Offering',
    pageName: 'activities',
    sliceId: 'activity-offering-and-session-setup',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/scanning',
    label: 'Scanning',
    pageName: 'scanning',
    sliceId: 'scanning-setup',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/scanning/:scanPointId',
    label: 'Scan Runtime',
    pageName: 'scanning',
    sliceId: 'scanning-runtime-and-validation',
    includeInShell: false,
    includeInNavigation: false,
  },
  {
    path: '/reports',
    label: 'Reports',
    pageName: 'reports',
    sliceId: 'reporting',
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
