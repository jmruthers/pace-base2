/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScanningSetupPage } from './ScanningSetupPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA12 scanning setup and manifest workflow', () => {
  afterEach(() => {
    cleanup();
  });

  it('creates and deactivates scan points', async () => {
    const user = userEvent.setup();
    render(<ScanningSetupPage />);

    await user.clear(screen.getByLabelText('Context type'));
    await user.type(screen.getByLabelText('Context type'), 'activity');
    await user.click(screen.getByRole('button', { name: 'Create scan point' }));
    expect(screen.queryByText('Scan point created.')).not.toBeNull();

    await user.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]!);
    expect(screen.queryByText('Scan point deactivated.')).not.toBeNull();
  });

  it('runs manifest generation entrypoint per scan point', async () => {
    const user = userEvent.setup();
    render(<ScanningSetupPage />);

    await user.click(screen.getAllByRole('button', { name: 'Download manifest' })[0]!);
    expect(screen.queryByText('Manifest generated for scan-point-1.')).not.toBeNull();
  });
});
