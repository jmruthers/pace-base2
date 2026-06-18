import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  LoadingSpinner,
  Progress,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { Trash2 } from '@solvera/pace-core/icons';
import { formatCurrencyFromCents } from '@/features/registrationSetup/presentation';
import type { RegistrationTypeRow } from '@/features/registrationSetup/types';

function statusVariant(isActive: boolean) {
  return isActive ? 'solid-main-normal' : 'outline-sec-muted';
}

function statusLabel(isActive: boolean) {
  return isActive ? 'Enabled' : 'Disabled';
}

function capacityPercent(applications: number, capacity: number | null): number | null {
  if (capacity == null || capacity <= 0) {
    return null;
  }
  return Math.min(100, Math.round((applications / capacity) * 100));
}

function typeInitial(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return '?';
  }
  return trimmed.slice(0, 1).toUpperCase();
}

interface RegistrationTypesContentProps {
  selectedEventId: string | null;
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  listQuery: { isLoading: boolean; error: unknown };
  rows: RegistrationTypeRow[];
  eligibilityCounts: Record<string, number>;
  applicationCounts: Record<string, number>;
  onEdit: (row: RegistrationTypeRow) => void;
  deleteCheckingTypeId: string | null;
  onRequestDelete: (row: RegistrationTypeRow) => void;
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
    <section className="grid gap-3">
      {props.rows.map((row) => {
        const isActive = row.is_active;
        const applications = props.applicationCounts[row.id] ?? 0;
        const fillPercent = capacityPercent(applications, row.capacity);
        return (
          <Card key={row.id}>
            <CardContent className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
              <p className="grid size-10 place-items-center rounded-md border border-sec-200 bg-main-50" aria-hidden>
                {typeInitial(row.name)}
              </p>
              <section className="grid gap-2">
                <header className="grid gap-1 md:grid-cols-[1fr_auto] md:items-start">
                  <h3>{row.name}</h3>
                  <Badge variant={statusVariant(isActive)}>{statusLabel(isActive)}</Badge>
                </header>
                {row.description != null && row.description.trim().length > 0 ? (
                  <p className="line-clamp-2">{row.description}</p>
                ) : null}
                <p>{`${props.eligibilityCounts[row.id] ?? 0} eligibility rules`}</p>
                <p>
                  <strong>{applications}</strong>
                  {row.capacity != null ? ` of ${row.capacity} applications` : ' applications'}
                </p>
                {fillPercent != null ? <Progress value={fillPercent} max={100} aria-label="Capacity used" /> : null}
                {row.capacity != null || row.cost != null ? (
                  <p className="grid grid-flow-col auto-cols-max gap-x-6 gap-y-1">
                    {row.capacity != null ? <span>{`Capacity ${row.capacity}`}</span> : null}
                    {row.cost != null ? <span>{`Cost ${formatCurrencyFromCents(row.cost)}`}</span> : null}
                  </p>
                ) : null}
              </section>
              <fieldset className="grid grid-flow-col auto-cols-max justify-items-start gap-2 md:justify-items-end">
                <PagePermissionGuard pageName="RegistrationTypesPage" operation="update" scope={props.scope} fallback={null}>
                  <Button type="button" onClick={() => props.onEdit(row)}>
                    Configure
                  </Button>
                </PagePermissionGuard>
                <PagePermissionGuard pageName="RegistrationTypesPage" operation="update" scope={props.scope} fallback={null}>
                  <Button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    disabled={props.deleteCheckingTypeId === row.id}
                    onClick={() => props.onRequestDelete(row)}
                  >
                    {props.deleteCheckingTypeId === row.id ? (
                      <LoadingSpinner decorative className="size-4" />
                    ) : (
                      <Trash2 aria-hidden className="size-4" />
                    )}
                  </Button>
                </PagePermissionGuard>
              </fieldset>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
