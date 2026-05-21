import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { UnitsPageView } from '@/pages/units/components/UnitsPageView';
import { useUnitsPageController } from '@/pages/units/hooks/useUnitsPageController';

function UnitsPageInner() {
  const ctl = useUnitsPageController();
  return <UnitsPageView ctl={ctl} />;
}

export function UnitsPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="units"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <UnitsPageInner />
    </PagePermissionGuard>
  );
}
