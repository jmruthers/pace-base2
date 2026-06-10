import { LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { ScanningTrackingPageView } from '@/components/scanning/ScanningTrackingPageView';
import { useScanningTrackingPageController } from '@/hooks/scanning/useScanningTrackingPageController';

function ScanningTrackingPageInner() {
  const ctl = useScanningTrackingPageController();

  if (ctl.secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return <ScanningTrackingPageView ctl={ctl} />;
}

export function ScanningTrackingPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="ScanningPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ScanningTrackingPageInner />
    </PagePermissionGuard>
  );
}
