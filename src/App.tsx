import { Navigate, Route, Routes } from 'react-router-dom';
import {
  PaceLoginPage,
  ProtectedRoute,
  SessionRestorationLoader,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard, useResolvedScope } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AuthenticatedShell } from './components/layout/AuthenticatedShell';
import { BaseNotFoundPage } from './pages/shell/BaseNotFoundPage';
import { FeaturePlaceholderPanel } from '@/components/shell/FeaturePlaceholderPanel';
import { ScanRuntimePlaceholderPage } from './pages/shell/ScanRuntimePlaceholderPage';
import { EventDashboardPage } from './pages/eventConfiguration/EventDashboardPage';
import { EventConfigurationRoute } from './pages/eventConfiguration/EventConfigurationRoute';
import { FormsListPage } from './pages/forms/FormsListPage';
import { FormBuilderPage } from './pages/forms/FormBuilderPage';
import { RegistrationTypesPage } from './pages/registrationTypes/RegistrationTypesPage';
import { ApplicationsPage } from './pages/applications/ApplicationsPage';
import { UnitsPage } from './pages/units/UnitsPage';
import { UnitPreferencesPage } from './pages/unitPreferences/UnitPreferencesPage';
import { CommunicationsPage } from './pages/communications/CommunicationsPage';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import { ActivityOfferingPage } from './pages/activities/ActivityOfferingPage';
import { ScanningSetupPage } from './pages/scanning/ScanningSetupPage';
import {
  getShellProtectedRoutes,
} from './config/baseRouteRegistry';

export const APP_NAME = 'BASE';

const shellProtectedRoutes = getShellProtectedRoutes();

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

  return (
    <SessionRestorationLoader message="Restoring session…">
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route
          element={<ProtectedRoute loginPath="/login" requireEvent={false} />}
        >
          <Route path="/" element={<Navigate to="/event-dashboard" replace />} />

          <Route element={<AuthenticatedShell />}>
            {shellProtectedRoutes
              .filter((route) => route.path !== '/' && route.path !== '*')
              .map((route) => (
                <Route
                  key={route.path}
                  path={route.relativePath}
                  element={
                    <PagePermissionGuard
                      pageName={route.pageName}
                      operation="read"
                      scope={{
                        organisationId,
                        eventId,
                        appId: appId ?? undefined,
                      }}
                      fallback={<AccessDenied />}
                    >
                      {route.path === '/event-dashboard' ? (
                        <EventDashboardPage />
                      ) : route.path === '/configuration' ? (
                        <EventConfigurationRoute />
                      ) : route.path === '/forms' ? (
                        <FormsListPage />
                      ) : route.path === '/form-builder' ? (
                        <FormBuilderPage />
                      ) : route.path === '/registration-types' ? (
                        <RegistrationTypesPage />
                      ) : route.path === '/applications' ? (
                        <ApplicationsPage />
                      ) : route.path === '/communications' ? (
                        <CommunicationsPage />
                      ) : route.path === '/units' ? (
                        <UnitsPage />
                      ) : route.path === '/unit-preferences' ? (
                        <UnitPreferencesPage />
                      ) : route.path === '/activities' ? (
                        <ActivitiesPage />
                      ) : route.path === '/activities/:offeringId' ? (
                        <ActivityOfferingPage />
                      ) : route.path === '/scanning' ? (
                        <ScanningSetupPage />
                      ) : route.path === '/scanning/:scanPointId' ? (
                        <ScanRuntimePlaceholderPage />
                      ) : (
                        <FeaturePlaceholderPanel
                          title={route.label}
                          description={`This route is owned by ${route.sliceId} and is scaffolded under the BASE shell boundary.`}
                        />
                      )}
                    </PagePermissionGuard>
                  }
                />
              ))}

            <Route path="*" element={<BaseNotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </SessionRestorationLoader>
  );
}

export default App;
