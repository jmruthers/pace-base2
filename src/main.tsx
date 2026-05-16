import { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupRBAC } from '@solvera/pace-core/rbac';
import { UnifiedAuthProvider } from '@solvera/pace-core';
import { InactivityWarningModal, ToastProvider } from '@solvera/pace-core/components';
import {
  EventServiceProvider,
  OrganisationServiceProvider,
  useUnifiedAuthContext,
} from '@solvera/pace-core/providers';
import App from './App';
import { APP_NAME } from '@/config/appName';
import { ensureGoogleMapsPlacesLoaded } from './lib/googleMapsPlaces';
import { createRbacAppIdResolver } from './lib/rbacAppResolver';
import { buildStrictRbacSetupOptions } from './lib/rbacSetup';
import { supabaseClient } from '@/lib/supabase';
import './app.css';

const resolveAppId = createRbacAppIdResolver({
  rpc: async (name, params) => {
    return await supabaseClient.rpc(name, params);
  },
  resolveUserId: async () => {
    if (!('auth' in supabaseClient) || supabaseClient.auth == null) {
      return null;
    }
    const authClient = supabaseClient.auth as {
      getUser?: () => Promise<{ data: { user: { id?: string } | null }; error: unknown }>;
    };
    if (typeof authClient.getUser !== 'function') {
      return null;
    }
    const { data, error } = await authClient.getUser();
    if (error != null) {
      return null;
    }
    return typeof data.user?.id === 'string' && data.user.id.length > 0 ? data.user.id : null;
  },
  reportDiagnostic: (message, context) => {
    console.error(message, context);
  },
});

const strictRbacConfig = buildStrictRbacSetupOptions({
  appName: APP_NAME,
  getAppId: resolveAppId,
});

setupRBAC(supabaseClient, {
  appName: strictRbacConfig.appName,
  getAppId: strictRbacConfig.getAppId,
});
void ensureGoogleMapsPlacesLoaded().catch(() => undefined);

const queryClient = new QueryClient();
const IDLE_TIMEOUT_MS = 1_800_000;
const WARN_BEFORE_MS = 300_000;

function AuthBridge() {
  const { user, session } = useUnifiedAuthContext();

  return (
    <OrganisationServiceProvider
      supabaseClient={supabaseClient}
      user={user}
      session={session}
    >
      <EventServiceProvider supabaseClient={supabaseClient}>
        <App />
      </EventServiceProvider>
    </OrganisationServiceProvider>
  );
}

function AppAuthShell() {
  const navigate = useNavigate();

  const handleIdleLogout = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <UnifiedAuthProvider
      supabaseClient={supabaseClient}
      appName={APP_NAME}
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      warnBeforeMs={WARN_BEFORE_MS}
      onIdleLogout={handleIdleLogout}
      renderInactivityWarning={({ timeRemaining, onStaySignedIn, onSignOutNow }) => (
        <InactivityWarningModal
          isOpen
          timeRemaining={timeRemaining}
          onStaySignedIn={onStaySignedIn}
          onSignOutNow={onSignOutNow}
        />
      )}
    >
      <AuthBridge />
    </UnifiedAuthProvider>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AppAuthShell />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
