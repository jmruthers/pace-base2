import type { NavigationItem } from '@solvera/pace-core/components';

const LANDING_NAV_ITEMS: ReadonlyArray<NavigationItem> = [
  {
    id: 'nav-events',
    label: 'Events',
    href: '/',
    pageId: 'EventDashboardPage',
  },
];

const IN_EVENT_NAV_ITEMS: ReadonlyArray<NavigationItem> = [
  {
    id: 'nav-overview',
    label: 'Overview',
    href: '/event-dashboard',
    pageId: 'EventDashboardPage',
  },
  {
    id: 'nav-applications',
    label: 'Applications',
    href: '/applications',
    pageId: 'ApplicationsPage',
  },
  {
    id: 'nav-comms',
    label: 'Communications',
    href: '/communications',
    pageId: 'CommunicationsPage',
  },
  {
    id: 'nav-reports',
    label: 'Reports',
    href: '/reports',
    pageId: 'ReportsPage',
  },
];

export function getContextAwareShellNavigationItems(
  selectedEventId: string | null
): ReadonlyArray<NavigationItem> {
  if (selectedEventId == null) {
    return LANDING_NAV_ITEMS;
  }
  return IN_EVENT_NAV_ITEMS;
}

export function getInEventShellNavigationItemLabels(): ReadonlyArray<string> {
  return IN_EVENT_NAV_ITEMS.map((item) => item.label);
}
