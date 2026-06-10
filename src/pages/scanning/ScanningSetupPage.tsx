import { LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { useScanningSetupController } from '@/hooks/scanning/useScanningSetupController';
import { ScanningSetupPageView } from '@/components/scanning/ScanningSetupPageView';

function ScanningSetupPageInner() {
  const ctl = useScanningSetupController();

  if (ctl.secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return <ScanningSetupPageView ctl={ctl} />;
}

export function ScanningSetupPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="ScanningPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ScanningSetupPageInner />
    </PagePermissionGuard>
  );
}
