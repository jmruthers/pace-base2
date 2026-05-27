import { useCallback, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogBody,
  DialogContent,
  LoadingSpinner,
  type NavigationItem,
  PaceAppLayout,
  PasswordChangeForm,
} from '@solvera/pace-core/components';
import { AccessDenied } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { APP_NAME } from '@/config/appName';

const NAV_ITEMS: NavigationItem[] = [
  {
    id: '/event-dashboard',
    label: 'Event Dashboard',
    href: '/event-dashboard',
    pageId: 'event-dashboard',
  },
  {
    id: '/configuration',
    label: 'Configuration',
    href: '/configuration',
    pageId: 'configuration',
  },
  {
    id: '/forms',
    label: 'Forms',
    href: '/forms',
    pageId: 'forms',
  },
  {
    id: '/registration-types',
    label: 'Registration Types',
    href: '/registration-types',
    pageId: 'registration-types',
  },
  {
    id: '/applications',
    label: 'Applications',
    href: '/applications',
    pageId: 'applications',
  },
  {
    id: '/communications',
    label: 'Communications',
    href: '/communications',
    pageId: 'communications',
  },
  {
    id: '/units',
    label: 'Units',
    href: '/units',
    pageId: 'units',
  },
  {
    id: '/activities',
    label: 'Activities',
    href: '/activities',
    pageId: 'activities',
  },
  {
    id: '/scanning',
    label: 'Scanning',
    href: '/scanning',
    pageId: 'scanning',
  },
  {
    id: '/reports',
    label: 'Reports',
    href: '/reports',
    pageId: 'reports',
  },
];

function deriveUserFullName(
  user: ReturnType<typeof useUnifiedAuth>['user']
): string {
  const metadataName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : null;
  if (metadataName && metadataName.trim().length > 0) {
    return metadataName;
  }
  return user?.email ?? 'User';
}

export function AuthenticatedShell() {
  const navigate = useNavigate();
  const { isLoading, user, signOut, updatePassword } = useUnifiedAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleUserMenuSignOut = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [navigate, signOut]);

  const handlePasswordSubmit = useCallback(
    async (values: { newPassword: string; confirmPassword: string }) => {
      const result = await updatePassword(values.newPassword);
      if (result.error != null) {
        return result;
      }
      setPasswordDialogOpen(false);
      return {};
    },
    [updatePassword]
  );

  const userFullName = useMemo(() => deriveUserFullName(user), [user]);
  const userEmail = user?.email ?? '';

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PaceAppLayout
        appName={APP_NAME}
        logoHref="/"
        navItems={NAV_ITEMS}
        showContextSelector
        showOrganisations
        showEvents
        userFullName={userFullName}
        userEmail={userEmail}
        onUserMenuSignOut={handleUserMenuSignOut}
        onUserMenuChangePassword={() => setPasswordDialogOpen(true)}
        enforcePermissions
        permissionFallback={<AccessDenied />}
      >
        <Outlet />
      </PaceAppLayout>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogBody>
            <PasswordChangeForm
              onSubmit={handlePasswordSubmit}
              onCancel={() => setPasswordDialogOpen(false)}
              onSuccess={() => setPasswordDialogOpen(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
