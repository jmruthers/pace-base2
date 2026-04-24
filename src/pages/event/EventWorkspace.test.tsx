/* @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { createElement } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventDashboardPage } from './EventDashboardPage';
import { EventConfigurationPage } from './EventConfigurationPage';

interface MockAuthState {
  selectedEvent: Record<string, unknown> | null;
}

const mockAuthState: MockAuthState = {
  selectedEvent: null,
};

const updateEqMock = vi.fn(async () => ({ error: null }));
const updateMock = vi.fn((payload: Record<string, unknown>) => {
  void payload;
  return { eq: updateEqMock };
});
const fromMock = vi.fn((table: string) => {
  void table;
  return { update: updateMock };
});
const mockSecureSupabase = {
  from: fromMock,
};

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => mockAuthState,
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => mockSecureSupabase,
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core/components', async () => {
  const actual = await vi.importActual<typeof import('@solvera/pace-core/components')>(
    '@solvera/pace-core/components'
  );

  return {
    ...actual,
    Form: ({
      children,
      onSubmit,
      className,
    }: {
      children: ReactNode;
      onSubmit: (data: Record<string, unknown>) => void;
      className?: string;
    }) =>
      createElement(
        'form',
        {
          className,
          onSubmit: (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSubmit({});
          },
        },
        children
      ),
  };
});

const selectedEventFixture: Record<string, unknown> = {
  id: 'legacy-event-id',
  event_id: 'event-001',
  event_name: 'Autumn Camp',
  event_date: '2026-05-01',
  event_days: 4,
  event_venue: 'Main Site',
  typical_unit_size: 6,
  event_code: 'AC26',
  expected_participants: 240,
  event_email: 'event@example.com',
  is_visible: true,
  description: 'Event description',
  public_readable: true,
  registration_scope: 'member',
  organisation_id: 'org-should-not-be-editable',
};

describe('BA01 event workspace surfaces', () => {
  beforeEach(() => {
    mockAuthState.selectedEvent = { ...selectedEventFixture };
    updateEqMock.mockClear();
    updateMock.mockClear();
    fromMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders selected event details and operational entrypoints on event dashboard', () => {
    render(
      <MemoryRouter>
        <EventDashboardPage />
      </MemoryRouter>
    );

    expect(screen.queryByText('Event name: Autumn Camp')).not.toBeNull();
    expect(screen.queryByText('Registration scope: member')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Event configuration' })).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Forms' })).not.toBeNull();
  });

  it('renders configuration allowlist fields including registration scope', () => {
    render(<EventConfigurationPage />);

    expect(screen.queryByLabelText('Event name')).not.toBeNull();
    expect(screen.queryByText('Event date')).not.toBeNull();
    expect(screen.queryByLabelText('Registration scope')).not.toBeNull();
    expect(screen.queryByLabelText('Public readable')).not.toBeNull();
    expect(screen.queryByLabelText('Event colours')).toBeNull();
    expect(screen.queryByLabelText('Organisation id')).toBeNull();
  });

  it('saves only approved editable payload fields to core_events', async () => {
    const user = userEvent.setup();
    render(<EventConfigurationPage />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(fromMock).toHaveBeenCalledWith('core_events');
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateEqMock).toHaveBeenCalledWith('event_id', 'event-001');

    const payloadCall = updateMock.mock.calls[0];
    if (payloadCall == null) {
      throw new Error('Expected update payload call.');
    }
    const payload = payloadCall[0] as Record<string, unknown>;
    expect(payload.registration_scope).toBe('member');
    expect(payload.event_name).toBe('Autumn Camp');
    expect(payload.event_colours).toBeUndefined();
    expect(payload.organisation_id).toBeUndefined();
  });
});
