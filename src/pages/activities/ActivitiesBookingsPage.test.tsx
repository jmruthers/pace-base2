/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivitiesBookingsPage } from './ActivitiesBookingsPage';

const createOnBehalfMock = vi.fn(async () => ({ ok: true }));
const cancelBookingMock = vi.fn(async () => ({ ok: true }));
const promoteWaitlistMock = vi.fn(async () => ({ ok: true }));

vi.mock('@/hooks/useActivityBookingOversightActions', () => ({
  useActivityBookingOversightActions: () => ({
    createOnBehalf: createOnBehalfMock,
    cancelBooking: cancelBookingMock,
    promoteWaitlist: promoteWaitlistMock,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA11 activity booking oversight route', () => {
  afterEach(() => {
    cleanup();
    createOnBehalfMock.mockClear();
    cancelBookingMock.mockClear();
    promoteWaitlistMock.mockClear();
  });

  it('renders oversight list with status and source context', () => {
    render(<ActivitiesBookingsPage />);
    expect(screen.queryByText('Activity bookings oversight')).not.toBeNull();
    expect(screen.queryByText('Source: participant')).not.toBeNull();
    expect(screen.queryByText('Status: waitlisted')).not.toBeNull();
  });

  it('runs approved organiser operations through contract hooks', async () => {
    const user = userEvent.setup();
    render(<ActivitiesBookingsPage />);

    await user.click(screen.getByRole('button', { name: 'Create on behalf' }));
    await user.click(screen.getByRole('button', { name: 'Promote waitlist' }));
    await user.click(screen.getAllByRole('button', { name: 'Cancel booking' })[0]!);

    expect(createOnBehalfMock).toHaveBeenCalled();
    expect(cancelBookingMock).toHaveBeenCalled();
    expect(promoteWaitlistMock).toHaveBeenCalled();
    expect(screen.queryByText('Booking cancelled.')).not.toBeNull();
  });
});
