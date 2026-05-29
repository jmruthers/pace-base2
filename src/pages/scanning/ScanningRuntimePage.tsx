import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';

import { useScanningRuntimePageController } from '@/pages/scanning/hooks/useScanningRuntimePageController';

import { ScanningRuntimePageView } from '@/pages/scanning/components/ScanningRuntimePageView';

function ScanningRuntimePageInner() {
  const page = useScanningRuntimePageController();
  return <ScanningRuntimePageView page={page} />;
}

export function ScanningRuntimePage() {
  const { organisationId, eventId, appId } = useResolvedScope();
  return (
    <PagePermissionGuard
      pageName="scanning-runtime"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ScanningRuntimePageInner />
    </PagePermissionGuard>
  );
}
