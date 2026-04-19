import { useCallback, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  LoadingSpinner,
  PaceAppLayout,
  PasswordChangeForm,
} from '@solvera/pace-core/components';
import { AccessDenied } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { APP_NAME } from '@/App';
import { getShellNavigationItems } from '@/config/baseRouteRegistry';

const NAV_ITEMS = [...getShellNavigationItems()];

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
  return user?.email ?? 'Authenticated user';
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
  const userEmail = user?.email ?? 'No email available';

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
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
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
