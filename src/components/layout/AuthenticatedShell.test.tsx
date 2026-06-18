// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedShell } from './AuthenticatedShell';

const shellState = vi.hoisted(() => ({
  isLoading: false,
  selectedEventId: null as string | null,
  user: {
    email: 'user@example.com',
    user_metadata: { full_name: 'Test User' },
  } as Record<string, unknown> | null,
  signOut: vi.fn(async () => undefined),
  updatePassword: vi.fn(async () => ({} as { error?: unknown })),
}));

const navigateMock = vi.hoisted(() => vi.fn());
const paceLayoutState = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock('react-router-dom', () => ({
  Outlet: () => <main>Shell outlet</main>,
  useNavigate: () => navigateMock,
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access denied</main>,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => shellState,
}));

vi.mock('@solvera/pace-core/components', () => ({
  LoadingSpinner: () => <main>Loading shell</main>,
  PaceAppLayout: ({
    children,
    onUserMenuSignOut,
    onUserMenuChangePassword,
    ...props
  }: {
    children: React.ReactNode;
    onUserMenuSignOut: () => Promise<void>;
    onUserMenuChangePassword: () => void;
  }) => {
    paceLayoutState.lastProps = props;
    return (
      <main>
        <section role="button" tabIndex={0} onClick={() => void onUserMenuSignOut()}>
          Sign out
        </section>
        <section role="button" tabIndex={0} onClick={onUserMenuChangePassword}>
          Change password
        </section>
        {children}
      </main>
    );
  },
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <section>{children}</section> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  PasswordChangeForm: ({
    onSubmit,
  }: {
    onSubmit: (values: { newPassword: string; confirmPassword: string }) => Promise<{ error?: unknown }>;
    onCancel: () => void;
    onSuccess: () => void;
  }) => (
    <section>
      <article
        role="button"
        tabIndex={0}
        onClick={async () => {
          await onSubmit({ newPassword: 'valid-password', confirmPassword: 'valid-password' });
        }}
      >
        Submit password
      </article>
    </section>
  ),
}));

describe('AuthenticatedShell', () => {
  beforeEach(() => {
    shellState.isLoading = false;
    shellState.selectedEventId = null;
    shellState.user = {
      email: 'user@example.com',
      user_metadata: { full_name: 'Test User' },
    };
    shellState.signOut.mockReset();
    shellState.signOut.mockImplementation(async () => undefined);
    shellState.updatePassword.mockReset();
    shellState.updatePassword.mockImplementation(async () => ({}));
    navigateMock.mockReset();
    paceLayoutState.lastProps = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('awaits signOut before navigating to login', async () => {
    let releaseSignOut!: () => void;
    shellState.signOut.mockImplementation(
      () =>
        new Promise<undefined>((resolve) => {
          releaseSignOut = () => resolve(undefined);
        })
    );

    render(<AuthenticatedShell />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(shellState.signOut).toHaveBeenCalledTimes(1);
    });
    expect(navigateMock).not.toHaveBeenCalled();

    releaseSignOut();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('opens password dialog and closes it after successful submit', async () => {
    render(<AuthenticatedShell />);

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('button', { name: 'Submit password' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Submit password' }));

    await waitFor(() => {
      expect(shellState.updatePassword).toHaveBeenCalledWith('valid-password');
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Submit password' })).toBeNull();
    });
  });

  it('keeps password dialog open when password update fails', async () => {
    shellState.updatePassword.mockImplementation(async () => ({
      error: new Error('update failed'),
    }));

    render(<AuthenticatedShell />);

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit password' }));

    await waitFor(() => {
      expect(shellState.updatePassword).toHaveBeenCalledWith('valid-password');
    });
    expect(screen.getByRole('button', { name: 'Submit password' })).toBeTruthy();
  });

  it('uses landing nav when no event is selected', () => {
    shellState.selectedEventId = null;
    render(<AuthenticatedShell />);

    expect(paceLayoutState.lastProps).toMatchObject({
      navItems: [{ id: 'nav-events', label: 'Events', href: '/', pageId: 'EventDashboardPage' }],
    });
  });

  it('uses in-event nav when an event is selected', () => {
    shellState.selectedEventId = 'event-1';
    render(<AuthenticatedShell />);

    expect(paceLayoutState.lastProps).toMatchObject({
      navItems: [
        { id: 'nav-overview', label: 'Overview', href: '/event-dashboard', pageId: 'EventDashboardPage' },
        { id: 'nav-applications', label: 'Applications', href: '/applications', pageId: 'ApplicationsPage' },
        { id: 'nav-comms', label: 'Communications', href: '/communications', pageId: 'CommunicationsPage' },
        { id: 'nav-reports', label: 'Reports', href: '/reports', pageId: 'ReportsPage' },
      ],
    });
  });

  it('enables context selector with organisations and events', () => {
    render(<AuthenticatedShell />);

    expect(paceLayoutState.lastProps).toMatchObject({
      showContextSelector: true,
      showOrganisations: true,
      showEvents: true,
      enforcePermissions: true,
    });
  });
});
