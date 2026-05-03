import { Button } from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';

interface RegistrationTypesHeaderProps {
  selectedEventId: string | null;
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  onCreate: () => void;
}

export function RegistrationTypesHeader(props: RegistrationTypesHeaderProps) {
  return (
    <article className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
      <header className="grid gap-1">
        <h1>Registration types</h1>
        <p>These types drive registration grouping and prerequisites for the selected event.</p>
      </header>

      {props.selectedEventId != null ? (
        <PagePermissionGuard pageName="registration-types" operation="create" scope={props.scope} fallback={null}>
          <Button type="button" onClick={props.onCreate}>
            Create registration type
          </Button>
        </PagePermissionGuard>
      ) : null}
    </article>
  );
}
