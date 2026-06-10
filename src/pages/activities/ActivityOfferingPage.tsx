import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { ActivityOfferingPageView } from '@/components/activities/ActivityOfferingPageView';
import { useActivityOfferingPageController } from '@/hooks/activities/useActivityOfferingPageController';

function ActivityOfferingPageInner() {
  const ctl = useActivityOfferingPageController();
  return <ActivityOfferingPageView ctl={ctl} />;
}

export function ActivityOfferingPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="ActivitiesPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <ActivityOfferingPageInner />
    </PagePermissionGuard>
  );
}
