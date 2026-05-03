import { Navigate, Route, Routes } from 'react-router-dom';
import {
  PaceLoginPage,
  ProtectedRoute,
  SessionRestorationLoader,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AuthenticatedShell } from './components/layout/AuthenticatedShell';
import { BaseNotFoundPage } from './pages/shell/BaseNotFoundPage';
import { FeaturePlaceholderPanel } from '@/components/shell/FeaturePlaceholderPanel';
import { ScanRuntimePlaceholderPage } from './pages/shell/ScanRuntimePlaceholderPage';
import { EventDashboardPage } from './pages/eventConfiguration/EventDashboardPage';
import { EventConfigurationRoute } from './pages/eventConfiguration/EventConfigurationRoute';
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

  return <PaceLoginPage appName={APP_NAME} onSuccessRedirectPath="/" requireAppAccess={false} />;
}

function App() {
  const { selectedOrganisationId, selectedEventId, appId } = useUnifiedAuth();

  return (
    <SessionRestorationLoader message="Restoring session…">
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route
          element={<ProtectedRoute loginPath="/login" requireEvent={false} />}
        >
          <Route element={<AuthenticatedShell />}>
            <Route index element={<Navigate to="/event-dashboard" replace />} />

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
                        organisationId: selectedOrganisationId,
                        eventId: selectedEventId,
                        appId: appId ?? undefined,
                      }}
                      fallback={<AccessDenied />}
                    >
                      {route.path === '/event-dashboard' ? (
                        <EventDashboardPage />
                      ) : route.path === '/configuration' ? (
                        <EventConfigurationRoute />
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
