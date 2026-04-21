/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnitsPage } from './UnitsPage';
import { UnitPreferencesPage } from './UnitPreferencesPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA08 units and preference workflows', () => {
  afterEach(() => {
    cleanup();
  });

  it('creates and deletes units in event-scoped unit workflow', async () => {
    const user = userEvent.setup();
    render(<UnitsPage />);

    await user.type(screen.getByLabelText('Unit name'), 'Blue Unit');
    await user.click(screen.getByRole('button', { name: 'Create unit' }));
    expect(screen.queryByText('Blue Unit')).not.toBeNull();

    await user.click(screen.getAllByRole('button', { name: 'Delete unit' })[0]!);
    expect(screen.queryByText('Unit removed.')).not.toBeNull();
  });

  it('rejects invalid ranking and locks preferences after submit', async () => {
    const user = userEvent.setup();
    render(<UnitPreferencesPage />);

    const rankInputs = screen.getAllByLabelText('Rank');
    await user.clear(rankInputs[0]!);
    await user.type(rankInputs[0]!, '2');
    await user.clear(rankInputs[1]!);
    await user.type(rankInputs[1]!, '2');
    await user.click(screen.getByRole('button', { name: 'Submit preferences' }));
    expect(screen.queryByText('Rankings must be unique and contiguous from 1..N.')).not.toBeNull();

    await user.clear(rankInputs[0]!);
    await user.type(rankInputs[0]!, '1');
    await user.click(screen.getByRole('button', { name: 'Submit preferences' }));
    expect(screen.queryByText('Preference set submitted and locked.')).not.toBeNull();
    const submitButton = screen.getByRole('button', { name: 'Submit preferences' });
    expect(submitButton.getAttribute('disabled')).not.toBeNull();
  });
});
