import { Route, Routes } from 'react-router-dom';
import { LoadingSpinner, PaceLoginPage, ProtectedRoute } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { AuthenticatedShell } from './components/layout/AuthenticatedShell';
import { BaseNotFoundPage } from './pages/shell/BaseNotFoundPage';
import { FeaturePlaceholderPanel } from '@/components/shell/FeaturePlaceholderPanel';
import { ScanRuntimePlaceholderPage } from './pages/shell/ScanRuntimePlaceholderPage';
import { ShellLandingPage } from './pages/shell/ShellLandingPage';
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
                    <FeaturePlaceholderPanel
                      title={route.label}
                      description={`This route is owned by ${route.sliceId} and is scaffolded under the BASE shell boundary.`}
                    />
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
