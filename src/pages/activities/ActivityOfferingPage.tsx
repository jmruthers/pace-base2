import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { ActivityOfferingPageView } from '@/pages/activities/components/ActivityOfferingPageView';
import { useActivityOfferingPageController } from '@/pages/activities/hooks/useActivityOfferingPageController';

function ActivityOfferingPageInner() {
  const ctl = useActivityOfferingPageController();
  return <ActivityOfferingPageView ctl={ctl} />;
}

export function ActivityOfferingPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="activities"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ActivityOfferingPageInner />
    </PagePermissionGuard>
  );
}
