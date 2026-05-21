import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { UnitPreferencesPageView } from '@/pages/unitPreferences/components/UnitPreferencesPageView';
import { useUnitPreferencesPageController } from '@/pages/unitPreferences/hooks/useUnitPreferencesPageController';

function UnitPreferencesPageInner() {
  const ctl = useUnitPreferencesPageController();
  return <UnitPreferencesPageView ctl={ctl} />;
}

export function UnitPreferencesPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="unit-preferences"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <UnitPreferencesPageInner />
    </PagePermissionGuard>
  );
}
