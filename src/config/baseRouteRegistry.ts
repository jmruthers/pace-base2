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
    pageName: 'LoginPage',
    sliceId: 'app-shell-and-access',
    includeInShell: false,
    includeInNavigation: false,
  },
  {
    path: '/',
    label: 'Root Entry Redirect',
    pageName: 'RootEntryRedirectPage',
    sliceId: 'app-shell-and-access',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '*',
    label: 'Not Found',
    pageName: 'BaseNotFoundPage',
    sliceId: 'app-shell-and-access',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/event-dashboard',
    label: 'Event Dashboard',
    pageName: 'EventDashboardPage',
    sliceId: 'event-workspace-and-configuration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/configuration',
    label: 'Configuration',
    pageName: 'ConfigurationPage',
    sliceId: 'event-workspace-and-configuration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/forms',
    label: 'Forms',
    pageName: 'FormsPage',
    sliceId: 'forms-authoring-and-base-integration',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/form-builder',
    label: 'Form Builder',
    pageName: 'FormBuilderPage',
    sliceId: 'forms-authoring-and-base-integration',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/registration-types',
    label: 'Registration Types',
    pageName: 'RegistrationTypesPage',
    sliceId: 'registration-setup-and-policy',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/registration-type-builder',
    label: 'Registration Type Builder',
    pageName: 'RegistrationTypesPage',
    sliceId: 'registration-setup-and-policy',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/applications',
    label: 'Applications',
    pageName: 'ApplicationsPage',
    sliceId: 'applications-admin-and-review',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/communications',
    label: 'Communications',
    pageName: 'CommunicationsPage',
    sliceId: 'communications-and-system-notifications',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/units',
    label: 'Units',
    pageName: 'UnitsPage',
    sliceId: 'units-and-group-coordination',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/unit-preferences',
    label: 'Unit Preferences',
    pageName: 'UnitPreferencesPage',
    sliceId: 'units-and-group-coordination',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/activities',
    label: 'Activities',
    pageName: 'ActivitiesPage',
    sliceId: 'activity-offering-and-session-setup',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/activities/bookings',
    label: 'Bookings',
    pageName: 'BookingsPage',
    sliceId: 'activity-booking-operations-oversight',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/activities/:offeringId',
    label: 'Activity Offering',
    pageName: 'ActivitiesPage',
    sliceId: 'activity-offering-and-session-setup',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/scanning',
    label: 'Scanning',
    pageName: 'ScanningPage',
    sliceId: 'scanning-setup',
    includeInShell: true,
    includeInNavigation: true,
  },
  {
    path: '/scanning/tracking',
    label: 'Tracking Dashboard',
    pageName: 'ScanningPage',
    sliceId: 'scanning-tracking-dashboard',
    includeInShell: true,
    includeInNavigation: false,
  },
  {
    path: '/scanning/:scanPointId',
    label: 'Scan Runtime',
    pageName: 'ScanningRuntimePage',
    sliceId: 'scanning-runtime-and-validation',
    includeInShell: false,
    includeInNavigation: false,
  },
  {
    path: '/reports',
    label: 'Reports',
    pageName: 'ReportsPage',
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
