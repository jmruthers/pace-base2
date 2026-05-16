type AppListRow = {
  id?: unknown;
  name?: unknown;
  is_active?: unknown;
};

type RbacAppsRpc = (
  name: string,
  params?: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>;

type ResolveUserId = () => Promise<string | null>;

type DiagnosticReporter = (message: string, context: Record<string, unknown>) => void;

interface CreateRbacAppIdResolverOptions {
  rpc: RbacAppsRpc;
  resolveUserId: ResolveUserId;
  reportDiagnostic?: DiagnosticReporter;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
}

export function createRbacAppIdResolver({
  rpc,
  resolveUserId,
  reportDiagnostic,
}: CreateRbacAppIdResolverOptions) {
  return async (normalizedAppName: string): Promise<string | null> => {
    if (normalizedAppName.length === 0) {
      const details = {
        code: 'rbac-app-id-empty-app-name',
        appName: normalizedAppName,
      };
      reportDiagnostic?.('Cannot resolve RBAC app id because appName is empty.', details);
      return null;
    }

    const userId = await resolveUserId();
    if (!userId) {
      // Normal on app bootstrap before auth restores; caller can retry later.
      return null;
    }

    const { data, error } = await rpc('data_rbac_apps_list', { p_user_id: userId });
    if (error != null || !Array.isArray(data)) {
      const details = {
        code: 'rbac-app-id-list-fetch-failed',
        appName: normalizedAppName,
        userId,
        error: normalizeErrorMessage(error),
      };
      reportDiagnostic?.('Failed to fetch RBAC apps list for app id resolution.', details);
      return null;
    }

    const match = data.find((row) => {
      if (row == null || typeof row !== 'object') {
        return false;
      }
      const appRow = row as AppListRow;
      return (
        appRow.is_active === true &&
        typeof appRow.name === 'string' &&
        appRow.name === normalizedAppName &&
        typeof appRow.id === 'string' &&
        appRow.id.length > 0
      );
    }) as { id: string } | undefined;

    if (!match) {
      const details = {
        code: 'rbac-app-id-not-found',
        appName: normalizedAppName,
        userId,
      };
      reportDiagnostic?.('RBAC app id was not found for requested appName.', details);
      return null;
    }

    return match.id;
  };
}
