import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import {
  PaceLoginPage,
  ProtectedRoute,
  SessionRestorationLoader,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AuthenticatedShell } from './components/layout/AuthenticatedShell';
import { APP_NAME } from '@/config/appName';
import { BaseNotFoundPage } from './pages/shell/BaseNotFoundPage';
import { ScanningRuntimePage } from './pages/scanning/ScanningRuntimePage';
import { EventDashboardPage } from './pages/eventConfiguration/EventDashboardPage';
import { EventConfigurationRoute } from './pages/eventConfiguration/EventConfigurationRoute';
import { FormsListPage } from './pages/forms/FormsListPage';
import { FormBuilderPage } from './pages/forms/FormBuilderPage';
import { RegistrationTypesPage } from './pages/registrationTypes/RegistrationTypesPage';
import { RegistrationTypeBuilderPage } from './pages/registrationTypes/RegistrationTypeBuilderPage';
import { ApplicationsPage } from './pages/applications/ApplicationsPage';
import { UnitsPage } from './pages/units/UnitsPage';
import { UnitPreferencesPage } from './pages/unitPreferences/UnitPreferencesPage';
import { CommunicationsPage } from './pages/communications/CommunicationsPage';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import { BookingsPage } from './pages/activities/BookingsPage';
import { ActivityOfferingPage } from './pages/activities/ActivityOfferingPage';
import { ScanningSetupPage } from './pages/scanning/ScanningSetupPage';
import { ScanningTrackingPage } from './pages/scanning/ScanningTrackingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { startScanSyncWorker, stopScanSyncWorker } from '@/features/scanningRuntime/sync/scanSyncWorker';

function useScanSyncWorkerBootstrap() {
  const secureSupabase = useSecureSupabase();
  useEffect(() => {
    if (secureSupabase == null) {
      return undefined;
    }
    void startScanSyncWorker(secureSupabase);
    return () => {
      stopScanSyncWorker();
    };
  }, [secureSupabase]);
  return null;
}

function ProtectedAppLayout() {
  useScanSyncWorkerBootstrap();
  return (
    <>
      <Outlet />
    </>
  );
}

function LoginRoute() {
  const { isAuthenticated, isLoading } = useUnifiedAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <PaceLoginPage
      appName={APP_NAME}
      onSuccessRedirectPath="/"
      requireAppAccess={false}
    />
  );
}

function App() {
  const { organisationId, eventId, appId } = useResolvedScope();
  const permissionScope = {
    organisationId,
    eventId,
    appId: appId ?? undefined,
  };

  return (
    <SessionRestorationLoader message="Restoring session…">
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route
          element={<ProtectedRoute loginPath="/login" requireEvent={false} />}
        >
          <Route element={<ProtectedAppLayout />}>
            <Route path="/" element={<Navigate to="/event-dashboard" replace />} />

            <Route element={<AuthenticatedShell />}>
              <Route
                path="event-dashboard"
                element={(
                  <PagePermissionGuard
                    pageName="event-dashboard"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <EventDashboardPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="configuration"
                element={(
                  <PagePermissionGuard
                    pageName="configuration"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <EventConfigurationRoute />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="forms"
                element={(
                  <PagePermissionGuard
                    pageName="forms"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <FormsListPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="form-builder"
                element={(
                  <PagePermissionGuard
                    pageName="form-builder"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <FormBuilderPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="registration-types"
                element={(
                  <PagePermissionGuard
                    pageName="registration-types"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <RegistrationTypesPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="registration-type-builder"
                element={(
                  <PagePermissionGuard
                    pageName="registration-types"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <RegistrationTypeBuilderPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="applications"
                element={(
                  <PagePermissionGuard
                    pageName="applications"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <ApplicationsPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="communications"
                element={(
                  <PagePermissionGuard
                    pageName="communications"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <CommunicationsPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="units"
                element={(
                  <PagePermissionGuard
                    pageName="units"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <UnitsPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="unit-preferences"
                element={(
                  <PagePermissionGuard
                    pageName="unit-preferences"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <UnitPreferencesPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="activities"
                element={(
                  <PagePermissionGuard
                    pageName="activities"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <ActivitiesPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="activities/bookings"
                element={(
                  <PagePermissionGuard
                    pageName="bookings"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <BookingsPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="activities/:offeringId"
                element={(
                  <PagePermissionGuard
                    pageName="activities"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <ActivityOfferingPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="scanning"
                element={(
                  <PagePermissionGuard
                    pageName="scanning"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <ScanningSetupPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="scanning/tracking"
                element={(
                  <PagePermissionGuard
                    pageName="scanning"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <ScanningTrackingPage />
                  </PagePermissionGuard>
                )}
              />
              <Route
                path="reports"
                element={(
                  <PagePermissionGuard
                    pageName="reports"
                    operation="read"
                    scope={permissionScope}
                    fallback={<AccessDenied />}
                  >
                    <ReportsPage />
                  </PagePermissionGuard>
                )}
              />
              <Route path="*" element={<BaseNotFoundPage />} />
            </Route>
            <Route path="scanning/:scanPointId" element={<ScanningRuntimePage />} />
          </Route>
        </Route>
      </Routes>
    </SessionRestorationLoader>
  );
}

export default App;
