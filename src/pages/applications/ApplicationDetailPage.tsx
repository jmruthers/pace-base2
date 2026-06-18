import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { ApplicationDetailPageView } from '@/components/applications/ApplicationDetailPageView';
import { useApplicationDetailPageController } from '@/hooks/applications/useApplicationDetailPageController';

function ApplicationDetailPageInner() {
  const ctl = useApplicationDetailPageController();
  return <ApplicationDetailPageView ctl={ctl} />;
}

export function ApplicationDetailPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="ApplicationsPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ApplicationDetailPageInner />
    </PagePermissionGuard>
  );
}
