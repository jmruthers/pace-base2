import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
} from '@solvera/pace-core/components';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { BookingTableRow } from '@/features/bookingOversight/types';
import type { BookingsPageController } from '@/pages/activities/hooks/useBookingsPageController';
import { BookingCancelConfirmDialog } from '@/pages/activities/components/BookingCancelConfirmDialog';
import { BookingOnBehalfDialog } from '@/pages/activities/components/BookingOnBehalfDialog';
import { BookingOverrideReasonDialog } from '@/pages/activities/components/BookingOverrideReasonDialog';
import { BookingPromoteConfirmDialog } from '@/pages/activities/components/BookingPromoteConfirmDialog';
import { useBookingsTableColumns } from '@/pages/activities/hooks/useBookingsTableColumns';

export function BookingsPageView({ ctl }: { ctl: BookingsPageController }) {
  const columns = useBookingsTableColumns({
    offeringFilterOptions: ctl.offeringFilterOptions,
    sessionFilterOptions: ctl.sessionFilterOptions,
    statusFilterOptions: ctl.statusFilterOptions,
    canUpdateBookings: ctl.canUpdateBookings,
    canDeleteBookings: ctl.canDeleteBookings,
    onPromote: ctl.onPromoteClick,
    onCancel: ctl.onCancelClick,
  });

  return (
      <main className="grid gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid gap-2">
          <h1>Bookings</h1>
          <p>{ctl.eventName} — Manage activity bookings for this event.</p>
        </header>

        {ctl.eventId == null ? (
          <Card>
            <CardHeader>
              <CardTitle>No event selected</CardTitle>
              <CardDescription>Select an event from the header to manage its bookings.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {ctl.canCreateBookings ? (
              <section className="grid justify-items-start">
                <Button type="button" variant="default" onClick={ctl.openBookingOnBehalf}>
                  Book on behalf
                </Button>
              </section>
            ) : null}

            {ctl.bookingsQuery.error != null ? (
              <Alert variant="destructive">
                <AlertDescription>{NormalizeSupabaseError(ctl.bookingsQuery.error).message}</AlertDescription>
                <section className="grid justify-items-start">
                  <Button type="button" variant="outline" size="small" onClick={ctl.retryBookings}>
                    Retry
                  </Button>
                </section>
              </Alert>
            ) : (
              <DataTable<BookingTableRow>
                data={ctl.tableRows}
                columns={columns}
                rbac={{ pageName: 'bookings' }}
                title="Activity Bookings"
                description={`${ctl.tableRows.length} bookings for ${ctl.eventName}`}
                isLoading={ctl.bookingsQuery.isLoading}
                initialPageSize={50}
                initialSorting={[{ id: 'booked_at', desc: true }]}
                emptyState={{ description: 'No bookings have been created for this event.' }}
                features={{
                  search: true,
                  pagination: true,
                  sorting: true,
                  filtering: true,
                  export: false,
                  import: false,
                  grouping: false,
                  columnVisibility: false,
                  editing: false,
                  creation: false,
                  selection: false,
                  deletion: false,
                  deleteSelected: false,
                  columnReordering: false,
                  hierarchical: false,
                }}
              />
            )}

            <BookingOnBehalfDialog
              open={ctl.bookOnBehalfOpen}
              onOpenChange={ctl.setBookOnBehalfOpen}
              bookFormKey={ctl.bookFormKey}
              sessionsByOffering={ctl.sessionsByOffering}
              applications={ctl.applicationsQuery.data}
              eventTimezone={ctl.eventTimezone}
              onSubmitBooking={ctl.onCreateValidSubmit}
            />

            <BookingOverrideReasonDialog
              open={ctl.overrideOpen && ctl.overrideIntent != null}
              onOpenChange={ctl.onOverrideDialogOpenChange}
              overrideIntent={ctl.overrideIntent}
              overrideReason={ctl.overrideReason}
              setOverrideReason={ctl.setOverrideReason}
              onConfirm={ctl.onOverrideConfirm}
            />

            <BookingCancelConfirmDialog
              cancelTarget={ctl.cancelTarget}
              onOpenChange={(open) => {
                if (!open) ctl.setCancelTarget(null);
              }}
              onConfirmCancel={ctl.onConfirmCancelBooking}
            />

            <BookingPromoteConfirmDialog
              promoteTarget={ctl.promoteTarget}
              onOpenChange={(open) => {
                if (!open) ctl.setPromoteTarget(null);
              }}
              onConfirmPromote={ctl.onConfirmPromote}
            />
          </>
        )}
      </main>
  );
}
