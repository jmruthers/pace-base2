import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { useApplicationsPageController } from '@/pages/applications/hooks/useApplicationsPageController';
import { ApplicationsPageView } from '@/pages/applications/components/ApplicationsPageView';

function ApplicationsPageInner() {
  const ctl = useApplicationsPageController();
  return <ApplicationsPageView ctl={ctl} />;
}

export function ApplicationsPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="applications"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ApplicationsPageInner />
    </PagePermissionGuard>
  );
}
