import { LoadingSpinner } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { BookingsPageView } from '@/pages/activities/components/BookingsPageView';
import { useBookingsPageController } from '@/pages/activities/hooks/useBookingsPageController';

function BookingsPageInner() {
  const ctl = useBookingsPageController();

  if (ctl.permLoading) {
    return null;
  }

  if (ctl.secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return <BookingsPageView ctl={ctl} />;
}

export function BookingsPage() {
  const { organisationId, eventId, appId } = useResolvedScope();

  return (
    <PagePermissionGuard
      pageName="bookings"
      operation="read"
      scope={{ organisationId, eventId, appId: appId ?? undefined }}
      fallback={<AccessDenied />}
    >
      <BookingsPageInner />
    </PagePermissionGuard>
  );
}
