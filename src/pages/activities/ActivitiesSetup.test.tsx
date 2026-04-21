/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ActivitiesPage } from './ActivitiesPage';
import { ActivityOfferingDetailPage } from './ActivityOfferingDetailPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA09 activity offering and session setup', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists offerings and creates a new offering', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ActivitiesPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Offering name'), 'Archery');
    await user.click(screen.getByRole('button', { name: 'Create offering' }));
    expect(screen.queryByText('Archery')).not.toBeNull();
  });

  it('rejects invalid session setup and accepts valid values', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/activities/offering-9']}>
        <Routes>
          <Route path="/activities/:offeringId" element={<ActivityOfferingDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText('Session end time'));
    await user.type(screen.getByLabelText('Session end time'), '08:00');
    await user.click(screen.getByRole('button', { name: 'Save session setup' }));
    expect(screen.queryByText('Session validation failed. Check time and capacity values.')).not.toBeNull();

    await user.clear(screen.getByLabelText('Session end time'));
    await user.type(screen.getByLabelText('Session end time'), '10:30');
    await user.click(screen.getByRole('button', { name: 'Save session setup' }));
    expect(screen.queryByText('Session setup saved.')).not.toBeNull();
  });
});
