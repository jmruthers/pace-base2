import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { useActivityBookingOversightActions } from '@/hooks/useActivityBookingOversightActions';

interface BookingRecord {
  bookingId: string;
  participantId: string;
  sessionId: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  source: 'participant' | 'organiser';
}

const INITIAL_BOOKINGS: ReadonlyArray<BookingRecord> = [
  {
    bookingId: 'booking-1',
    participantId: 'person-1',
    sessionId: 'session-1',
    status: 'waitlisted',
    source: 'participant',
  },
  {
    bookingId: 'booking-2',
    participantId: 'person-2',
    sessionId: 'session-1',
    status: 'confirmed',
    source: 'organiser',
  },
];

export function ActivitiesBookingsPage() {
  const { createOnBehalf, cancelBooking, promoteWaitlist } = useActivityBookingOversightActions();
  const [bookings, setBookings] = useState<ReadonlyArray<BookingRecord>>(INITIAL_BOOKINGS);
  const [statusMessage, setStatusMessage] = useState('');

  const handleCreateOnBehalf = async () => {
    const result = await createOnBehalf({
      sessionId: 'session-2',
      participantId: 'person-3',
      overrideReason: 'Operational override',
    });
    if (!result.ok) {
      setStatusMessage(`Create on behalf failed: ${result.errorMessage ?? 'unknown error'}`);
      return;
    }
    setBookings((previous) => [
      ...previous,
      {
        bookingId: `booking-${previous.length + 1}`,
        participantId: 'person-3',
        sessionId: 'session-2',
        status: 'confirmed',
        source: 'organiser',
      },
    ]);
    setStatusMessage('Booking created on behalf.');
  };

  const handleCancel = async (bookingId: string) => {
    const result = await cancelBooking({
      bookingId,
      overrideReason: 'Operational cancellation',
    });
    if (!result.ok) {
      setStatusMessage(`Cancel failed: ${result.errorMessage ?? 'unknown error'}`);
      return;
    }
    setBookings((previous) =>
      previous.map((booking) =>
        booking.bookingId === bookingId ? { ...booking, status: 'cancelled' } : booking
      )
    );
    setStatusMessage('Booking cancelled.');
  };

  const handlePromote = async (bookingId: string) => {
    const result = await promoteWaitlist({
      bookingId,
      overrideReason: 'Promote waitlist',
    });
    if (!result.ok) {
      setStatusMessage(`Promotion failed: ${result.errorMessage ?? 'unknown error'}`);
      return;
    }
    setBookings((previous) =>
      previous.map((booking) =>
        booking.bookingId === bookingId ? { ...booking, status: 'confirmed' } : booking
      )
    );
    setStatusMessage('Waitlisted booking promoted.');
  };

  return (
    <PagePermissionGuard
      pageName="activities-bookings"
      operation="read"
      fallback={<AccessDenied />}
    >
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Activity bookings oversight</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void handleCreateOnBehalf()}>Create on behalf</Button>
            <ul>
              {bookings.map((booking) => (
                <li key={booking.bookingId}>
                  <p>{booking.bookingId}</p>
                  <p>Source: {booking.source}</p>
                  <p>Status: {booking.status}</p>
                  <Button onClick={() => void handleCancel(booking.bookingId)}>Cancel booking</Button>
                  {booking.status === 'waitlisted' && (
                    <Button onClick={() => void handlePromote(booking.bookingId)}>
                      Promote waitlist
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {statusMessage.length > 0 && <p>{statusMessage}</p>}
          </CardContent>
        </Card>
      </section>
    </PagePermissionGuard>
  );
}
