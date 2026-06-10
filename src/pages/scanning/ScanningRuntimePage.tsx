import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';

import { useScanningRuntimePageController } from '@/hooks/scanning/useScanningRuntimePageController';

import { ScanningRuntimePageView } from '@/components/scanning/ScanningRuntimePageView';

function ScanningRuntimePageInner() {
  const page = useScanningRuntimePageController();
  return <ScanningRuntimePageView page={page} />;
}

export function ScanningRuntimePage() {
  const { organisationId, eventId, appId } = useResolvedScope();
  return (
    <PagePermissionGuard
      pageName="ScanningRuntimePage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ScanningRuntimePageInner />
    </PagePermissionGuard>
  );
}
