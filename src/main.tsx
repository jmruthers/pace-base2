import { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedAuthProvider } from '@solvera/pace-core';
import { InactivityWarningModal } from '@solvera/pace-core/components';
import {
  EventServiceProvider,
  OrganisationServiceProvider,
  useUnifiedAuthContext,
} from '@solvera/pace-core/providers';
import { setupRBAC } from '@solvera/pace-core/rbac';
import App, { APP_NAME } from './App';
import { supabaseClient } from './lib/supabase';
import './app.css';

const queryClient = new QueryClient();
const IDLE_TIMEOUT_MS = 1_800_000;
const WARN_BEFORE_MS = 300_000;

setupRBAC(supabaseClient, { appName: APP_NAME });

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppAuthShell />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
