import type { NavigationItem } from '@solvera/pace-core/components';
import { BASE_ROUTE_REGISTRY } from '@/features/navigation/base-route-registry';

export type BaseRoutePermissionOperation = 'read';

export interface BaseRoutePermissionConfig {
  pageName: string;
  operation: BaseRoutePermissionOperation;
}

const SHELL_ROUTE_REGISTRY = BASE_ROUTE_REGISTRY.filter((route) => route.includeInShell);

export const BASE_ROUTE_PERMISSIONS: Record<string, BaseRoutePermissionConfig> = Object.fromEntries(
  SHELL_ROUTE_REGISTRY.map((route) => [
    route.pageName,
    {
      pageName: route.pageName,
      operation: 'read' as const,
    },
  ])
);

function assertBaseRoutePermissionParity(): void {
  for (const route of SHELL_ROUTE_REGISTRY) {
    const mapped = BASE_ROUTE_PERMISSIONS[route.pageName];
    if (mapped == null) {
      throw new Error(`Missing route permission mapping for "${route.pageName}".`);
    }
    if (mapped.pageName !== route.pageName) {
      throw new Error(
        `Route permission mismatch for "${route.path}": registry "${route.pageName}" does not match mapping "${mapped.pageName}".`
      );
    }
  }
}

assertBaseRoutePermissionParity();

export function getBaseRouteForPathname(pathname: string): { path: string; pageName: string } | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';

  for (const route of SHELL_ROUTE_REGISTRY) {
    const routePath = route.path;
    if (routePath === '*' || routePath === '/login') {
      continue;
    }
    if (routePath === normalized) {
      return { path: route.path, pageName: route.pageName };
    }
  }

  for (const route of SHELL_ROUTE_REGISTRY) {
    const routePath = route.path;
    if (routePath === '*' || routePath === '/login' || !routePath.includes(':')) {
      continue;
    }
    if (matchParamRoute(routePath, normalized)) {
      return { path: route.path, pageName: route.pageName };
    }
  }

  let best: { path: string; pageName: string } | undefined;
  let bestLength = -1;

  for (const route of SHELL_ROUTE_REGISTRY) {
    const routePath = route.path;
    if (routePath === '*' || routePath === '/login' || routePath.includes(':')) {
      continue;
    }
    if (normalized.startsWith(`${routePath}/`) && routePath.length > bestLength) {
      best = { path: route.path, pageName: route.pageName };
      bestLength = routePath.length;
    }
  }

  return best;
}

function matchParamRoute(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) => {
    if (part.startsWith(':')) return true;
    return part === pathParts[index];
  });
}

export function baseNavPermissionForPage(pageId: string): string {
  return `read:page.${pageId}`;
}

export function getBaseRoutePermissionForPath(pathname: string): BaseRoutePermissionConfig | undefined {
  const route = getBaseRouteForPathname(pathname);
  if (route == null) {
    return undefined;
  }
  return { pageName: route.pageName, operation: 'read' };
}

export function attachBaseNavPermissions(items: readonly NavigationItem[]): NavigationItem[] {
  return items.map((item) => {
    if (item.pageId == null) {
      return { ...item };
    }
    return {
      ...item,
      permissions: [baseNavPermissionForPage(item.pageId)],
    };
  });
}
