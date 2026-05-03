import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  LoadingSpinner,
  Switch,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { formatCurrencyFromCents } from '@/features/registrationSetup/shared';
import type { RegistrationTypeRow } from '@/features/registrationSetup/types';

function statusVariant(isActive: boolean) {
  return isActive ? 'solid-main-normal' : 'outline-sec-muted';
}

function statusLabel(isActive: boolean) {
  return isActive ? 'Enabled' : 'Disabled';
}

interface RegistrationTypesContentProps {
  selectedEventId: string | null;
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  listQuery: { isLoading: boolean; error: unknown };
  rows: RegistrationTypeRow[];
  eligibilityCounts: Record<string, number>;
  activeOverrides: Record<string, boolean>;
  onEdit: (row: RegistrationTypeRow) => void;
  onOpenRequirements: (row: RegistrationTypeRow) => void;
  onToggleActive: (row: RegistrationTypeRow, checked: boolean) => void;
}

export function RegistrationTypesContent(props: RegistrationTypesContentProps) {
  if (props.selectedEventId == null) {
    return (
      <Card>
        <CardContent>
          <p>Select an event from the header to manage registration types.</p>
        </CardContent>
      </Card>
    );
  }

  if (props.listQuery.isLoading) {
    return (
      <article className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </article>
    );
  }

  if (props.listQuery.error != null) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{NormalizeSupabaseError(props.listQuery.error).message}</AlertDescription>
      </Alert>
    );
  }

  if (props.rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <p>No registration types yet. Create a registration type to begin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <article className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {props.rows.map((row) => {
        const isActive = props.activeOverrides[row.id] ?? row.is_active;
        return (
          <Card key={row.id}>
            <CardHeader className="grid gap-2">
              <article className="grid gap-1 md:grid-cols-[1fr_auto] md:items-start">
                <CardTitle>{row.name}</CardTitle>
                <Badge variant={statusVariant(isActive)}>{statusLabel(isActive)}</Badge>
              </article>
              {row.description != null && row.description.trim().length > 0 ? (
                <p className="line-clamp-2">{row.description}</p>
              ) : null}
              <p>{`${props.eligibilityCounts[row.id] ?? 0} eligibility rules`}</p>
              {row.capacity != null ? <p>{`Capacity ${row.capacity}`}</p> : null}
              {row.cost != null ? <p>{`Cost ${formatCurrencyFromCents(row.cost)}`}</p> : null}
            </CardHeader>
            <CardFooter className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <PagePermissionGuard pageName="registration-types" operation="update" scope={props.scope} fallback={null}>
                <Button type="button" onClick={() => props.onEdit(row)}>
                  Edit
                </Button>
              </PagePermissionGuard>
              <PagePermissionGuard pageName="registration-types" operation="update" scope={props.scope} fallback={null}>
                <Button
                  type="button"
                  onClick={() => props.onOpenRequirements(row)}
                  disabled={row.id.trim().length === 0}
                >
                  Manage requirements
                </Button>
              </PagePermissionGuard>
              <PagePermissionGuard pageName="registration-types" operation="update" scope={props.scope} fallback={null}>
                <Label className="grid gap-1">
                  Registration type active
                  <Switch
                    aria-label="Registration type active"
                    checked={isActive}
                    disabled={props.selectedEventId == null}
                    onChange={(checked) => props.onToggleActive(row, checked)}
                  />
                </Label>
              </PagePermissionGuard>
            </CardFooter>
          </Card>
        );
      })}
    </article>
  );
}
