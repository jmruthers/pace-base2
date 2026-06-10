import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { useApplicationsPageController } from '@/hooks/applications/useApplicationsPageController';
import { ApplicationsPageView } from '@/components/applications/ApplicationsPageView';

function ApplicationsPageInner() {
  const ctl = useApplicationsPageController();
  return <ApplicationsPageView ctl={ctl} />;
}

export function ApplicationsPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="ApplicationsPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ApplicationsPageInner />
    </PagePermissionGuard>
  );
}
