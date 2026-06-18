import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogBody,
  DialogContent,
  LoadingSpinner,
  PaceAppLayout,
  PasswordChangeForm,
} from '@solvera/pace-core/components';
import { AccessDenied } from '@solvera/pace-core/rbac';
import { useUnifiedAuth } from '@solvera/pace-core/hooks';
import { APP_NAME } from '@/config/appName';
import { getContextAwareShellNavigationItems } from '@/config/shellNavigation';

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
  const location = useLocation();
  const { isLoading, user, signOut, updatePassword, selectedEventId } = useUnifiedAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const navItems = useMemo(
    () => [...getContextAwareShellNavigationItems(selectedEventId)],
    [selectedEventId]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
        navItems={navItems}
        showContextSelector
        showOrganisations
        showEvents
        userFullName={userFullName}
        userEmail={userEmail}
        onUserMenuSignOut={handleUserMenuSignOut}
        onUserMenuChangePassword={() => setPasswordDialogOpen(true)}
        extraMenuActions={[
          {
            id: 'all-events',
            label: 'All events',
            onSelect: () => navigate('/'),
          },
          {
            id: 'operator-profile',
            label: 'Operator profile',
            onSelect: () => navigate('/configuration'),
          },
        ]}
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
