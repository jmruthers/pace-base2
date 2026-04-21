import { Route, Routes } from 'react-router-dom';
import { LoadingSpinner, PaceLoginPage, ProtectedRoute } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { AuthenticatedShell } from './components/layout/AuthenticatedShell';
import { BaseNotFoundPage } from './pages/shell/BaseNotFoundPage';
import { FeaturePlaceholderPanel } from '@/components/shell/FeaturePlaceholderPanel';
import { ScanRuntimePlaceholderPage } from './pages/shell/ScanRuntimePlaceholderPage';
import { ShellLandingPage } from './pages/shell/ShellLandingPage';
import { EventDashboardPage } from './pages/event/EventDashboardPage';
import { EventConfigurationPage } from './pages/event/EventConfigurationPage';
import { FormsListPage } from './pages/forms/FormsListPage';
import { FormBuilderPage } from './pages/forms/FormBuilderPage';
import { RegistrationTypesPage } from './pages/registration/RegistrationTypesPage';
import { ApplicationsReviewPage } from './pages/applications/ApplicationsReviewPage';
import { UnitsPage } from './pages/units/UnitsPage';
import { UnitPreferencesPage } from './pages/units/UnitPreferencesPage';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import { ActivityOfferingDetailPage } from './pages/activities/ActivityOfferingDetailPage';
import { ActivitiesBookingsPage } from './pages/activities/ActivitiesBookingsPage';
import { ScanningSetupPage } from './pages/scanning/ScanningSetupPage';
import { ScanningTrackingPage } from './pages/scanning/ScanningTrackingPage';
import {
  SHELL_IMPLEMENTATION_PATHS,
  getShellProtectedRoutes,
} from './config/baseRouteRegistry';

export const APP_NAME = 'base';

const shellProtectedRoutes = getShellProtectedRoutes();

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PaceLoginPage
            appName={APP_NAME}
            onSuccessRedirectPath="/"
            requireAppAccess={false}
          />
        }
      />

      <Route
        element={
          <ProtectedRoute
            loginPath="/login"
            requireEvent={false}
            loadingFallback={<LoadingSpinner />}
          />
        }
      >
        <Route path="/scanning/:scanPointId" element={<ScanRuntimePlaceholderPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute
            loginPath="/login"
            requireEvent={false}
            loadingFallback={<LoadingSpinner />}
          />
        }
      >
        <Route element={<AuthenticatedShell />}>
          <Route index element={<ShellLandingPage />} />

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
                    fallback={<AccessDenied />}
                  >
                    {route.path === '/event-dashboard' ? (
                      <EventDashboardPage />
                    ) : route.path === '/configuration' ? (
                      <EventConfigurationPage />
                    ) : route.path === '/forms' ? (
                      <FormsListPage />
                    ) : route.path === '/form-builder' ? (
                      <FormBuilderPage />
                    ) : route.path === '/registration-types' ? (
                      <RegistrationTypesPage />
                    ) : route.path === '/applications' ? (
                      <ApplicationsReviewPage />
                    ) : route.path === '/units' ? (
                      <UnitsPage />
                    ) : route.path === '/unit-preferences' ? (
                      <UnitPreferencesPage />
                    ) : route.path === '/activities' ? (
                      <ActivitiesPage />
                    ) : route.path === '/activities/:offeringId' ? (
                      <ActivityOfferingDetailPage />
                    ) : route.path === '/activities/bookings' ? (
                      <ActivitiesBookingsPage />
                    ) : route.path === '/scanning' ? (
                      <ScanningSetupPage />
                    ) : route.path === '/scanning/tracking' ? (
                      <ScanningTrackingPage />
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

          <Route path="*" element={<BaseNotFoundPage knownPaths={SHELL_IMPLEMENTATION_PATHS} />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
