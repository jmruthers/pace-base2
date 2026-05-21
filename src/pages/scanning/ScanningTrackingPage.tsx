import { LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { ScanningTrackingPageView } from '@/pages/scanning/components/ScanningTrackingPageView';
import { useScanningTrackingPageController } from '@/pages/scanning/hooks/useScanningTrackingPageController';

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
      pageName="scanning"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ScanningTrackingPageInner />
    </PagePermissionGuard>
  );
}
