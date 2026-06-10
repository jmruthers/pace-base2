import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { UnitPreferencesPageView } from '@/components/unitPreferences/UnitPreferencesPageView';
import { useUnitPreferencesPageController } from '@/hooks/unitPreferences/useUnitPreferencesPageController';

function UnitPreferencesPageInner() {
  const ctl = useUnitPreferencesPageController();
  return <UnitPreferencesPageView ctl={ctl} />;
}

export function UnitPreferencesPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="UnitPreferencesPage"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <UnitPreferencesPageInner />
    </PagePermissionGuard>
  );
}
