// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setupRBACMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(
  () =>
    ({
      unifiedAuthProps: null as Record<string, unknown> | null,
    }) as {
      unifiedAuthProps: Record<string, unknown> | null;
    }
);

vi.mock('./App', () => ({
  __esModule: true,
  default: () => <main>Mock App</main>,
  APP_NAME: 'base',
}));

vi.mock('./lib/supabase', () => ({
  supabaseClient: { tag: 'mock-supabase-client' },
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigate: () => navigateMock,
}));

vi.mock('@solvera/pace-core', () => ({
  UnifiedAuthProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    captured.unifiedAuthProps = props;
    return <>{children}</>;
  },
}));

vi.mock('@solvera/pace-core/components', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  InactivityWarningModal: () => <main>Inactivity warning</main>,
}));

vi.mock('@solvera/pace-core/providers', () => ({
  useUnifiedAuthContext: () => ({
    user: { id: 'user-1' },
    session: { id: 'session-1' },
  }),
  OrganisationServiceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EventServiceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  setupRBAC: setupRBACMock,
}));

async function bootstrapMain() {
  vi.resetModules();
  captured.unifiedAuthProps = null;
  setupRBACMock.mockReset();
  navigateMock.mockReset();
  document.body.innerHTML = '<div id="root"></div>';
  await import('./main');
}

describe('main bootstrap wiring', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('calls setupRBAC with appName base and app resolver before app bootstraps', async () => {
    await bootstrapMain();
    expect(setupRBACMock).toHaveBeenCalledTimes(1);
    expect(setupRBACMock).toHaveBeenCalledWith(
      { tag: 'mock-supabase-client' },
      expect.objectContaining({
        appName: 'base',
        getAppId: expect.any(Function),
      })
    );
  });

  it('configures inactivity timing and idle logout navigation', async () => {
    await bootstrapMain();

    expect(captured.unifiedAuthProps?.idleTimeoutMs).toBe(1_800_000);
    expect(captured.unifiedAuthProps?.warnBeforeMs).toBe(300_000);
    expect(typeof captured.unifiedAuthProps?.onIdleLogout).toBe('function');
    expect(typeof captured.unifiedAuthProps?.renderInactivityWarning).toBe('function');

    const modalElement = (
      captured.unifiedAuthProps?.renderInactivityWarning as (args: {
        timeRemaining: number;
        onStaySignedIn: () => void;
        onSignOutNow: () => void;
      }) => unknown
    )({
      timeRemaining: 120,
      onStaySignedIn: vi.fn(),
      onSignOutNow: vi.fn(),
    });

    const props = (modalElement as { props?: Record<string, unknown> }).props ?? {};
    expect(props.timeRemaining).toBe(120);
    expect(typeof props.onStaySignedIn).toBe('function');
    expect(typeof props.onSignOutNow).toBe('function');

    (captured.unifiedAuthProps?.onIdleLogout as () => void)();
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });
});
