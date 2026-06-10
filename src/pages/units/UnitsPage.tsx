import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { UnitsPageView } from '@/components/units/UnitsPageView';
import { useUnitsPageController } from '@/hooks/units/useUnitsPageController';

function UnitsPageInner() {
  const ctl = useUnitsPageController();
  return <UnitsPageView ctl={ctl} />;
}

export function UnitsPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="UnitsPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <UnitsPageInner />
    </PagePermissionGuard>
  );
}
