import {
  getOfferingSessionCount,
  isBookingOpenNow,
} from '@/features/activityOfferingSetup/shared';
import {
  getOfferingUtilization,
  offeringUtilizationPercent,
} from '@/features/activityOfferingSetup/offeringCardGridHelpers';
import type { ActivityOfferingRow } from '@/features/activityOfferingSetup/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  LoadingSpinner,
  Progress,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { formatDateTime } from '@solvera/pace-core/utils';

function formatCost(value: number | null): string {
  if (value == null) {
    return '—';
  }
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
}

export function ActivitiesOfferingCardGrid({
  offerings,
  isLoading,
  eventName,
  scope,
  onOpenOffering,
  onDeleteOffering,
}: {
  offerings: ActivityOfferingRow[];
  isLoading: boolean;
  eventName: string;
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  onOpenOffering: (offeringId: string) => void;
  onDeleteOffering: (offering: ActivityOfferingRow) => void;
}) {
  if (isLoading) {
    return (
      <article className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </article>
    );
  }

  if (offerings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Offerings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No activity offerings have been created for this event.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <header className="grid gap-1">
        <h2>Activity Offerings</h2>
        <p>{`${offerings.length} offerings for ${eventName}`}</p>
      </header>
      <article className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {offerings.map((offering) => {
          const sessionCount = getOfferingSessionCount(offering);
          const fillPercent = offeringUtilizationPercent(offering);
          const { totalCapacity, totalBooked } = getOfferingUtilization(offering);
          const bookingOpen = isBookingOpenNow(offering);

          return (
            <Card key={offering.id} className="grid h-full grid-rows-[1fr_auto]">
              <CardHeader className="grid content-start gap-2">
                <CardTitle>{offering.name}</CardTitle>
                <Badge variant="solid-sec-muted">{`${sessionCount} sessions`}</Badge>
                {offering.trac_activity?.name != null ? <p>{offering.trac_activity.name}</p> : null}
                <p className="grid grid-flow-col auto-cols-max gap-2">
                  <Badge variant={bookingOpen ? 'solid-main-normal' : 'outline-acc-muted'}>
                    {bookingOpen ? 'Booking open' : 'Booking closed'}
                  </Badge>
                  {offering.cost != null ? <Badge variant="outline-sec-muted">{formatCost(offering.cost)}</Badge> : null}
                </p>
                <p>
                  {offering.booking_open_at != null
                    ? `Opens ${formatDateTime(offering.booking_open_at)}`
                    : 'Booking opens —'}
                </p>
                <p>
                  {offering.booking_close_at != null
                    ? `Closes ${formatDateTime(offering.booking_close_at)}`
                    : 'Booking closes —'}
                </p>
                {totalCapacity > 0 ? (
                  <>
                    <p>
                      <strong>{totalBooked}</strong>
                      {` of ${totalCapacity} places booked`}
                    </p>
                    {fillPercent != null ? (
                      <Progress value={fillPercent} max={100} aria-label="Offering utilization" />
                    ) : null}
                  </>
                ) : null}
              </CardHeader>
              <CardFooter className="grid grid-flow-col auto-cols-max gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenOffering(offering.id)}>
                  View
                </Button>
                <PagePermissionGuard pageName="ActivitiesPage" operation="delete" scope={scope} fallback={null}>
                  <Button type="button" variant="destructive" onClick={() => onDeleteOffering(offering)}>
                    Delete
                  </Button>
                </PagePermissionGuard>
              </CardFooter>
            </Card>
          );
        })}
      </article>
    </>
  );
}
