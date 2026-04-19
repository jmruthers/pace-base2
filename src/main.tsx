import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedAuthProvider } from '@solvera/pace-core';
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

setupRBAC(supabaseClient, { appName: APP_NAME });

function AppProviders() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UnifiedAuthProvider
          supabaseClient={supabaseClient}
          appName={APP_NAME}
          dangerouslyDisableInactivity={true}
        >
          <AppProviders />
        </UnifiedAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
