/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScanRuntimePlaceholderPage } from '@/pages/shell/ScanRuntimePlaceholderPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA13 scanning runtime and validation mapping', () => {
  afterEach(() => {
    cleanup();
  });

  it('maps scan values into approved runtime validation vocabulary', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/scanning/scan-point-1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanRuntimePlaceholderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Scan input'), 'unknown-card');
    await user.click(screen.getByRole('button', { name: 'Submit scan' }));
    expect(screen.queryByText('Runtime code: rejected_card_not_recognised')).not.toBeNull();
  });

  it('allows override only for overridable rejection classes', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/scanning/scan-point-1']}>
        <Routes>
          <Route path="/scanning/:scanPointId" element={<ScanRuntimePlaceholderPage />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Scan input'), 'inactive-card');
    await user.click(screen.getByRole('button', { name: 'Submit scan' }));
    await user.click(screen.getByRole('button', { name: 'Override' }));
    expect(screen.queryByText('Override accepted.')).not.toBeNull();

    await user.clear(screen.getByLabelText('Scan input'));
    await user.type(screen.getByLabelText('Scan input'), 'dup-card');
    await user.click(screen.getByRole('button', { name: 'Submit scan' }));
    await user.click(screen.getByRole('button', { name: 'Override' }));
    expect(screen.queryByText('Override unavailable for this scan outcome.')).not.toBeNull();
  });
});
