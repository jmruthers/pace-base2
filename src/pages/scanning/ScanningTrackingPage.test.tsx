/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScanningTrackingPage } from './ScanningTrackingPage';

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA16 scanning tracking dashboard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders on-site, off-site, and never-scanned derivations', () => {
    render(<ScanningTrackingPage />);
    expect(screen.queryByText('On-site: 1')).not.toBeNull();
    expect(screen.queryByText('Off-site: 1')).not.toBeNull();
    expect(screen.queryByText('Never scanned: 1')).not.toBeNull();
  });

  it('supports refresh and shows activity/transport compare views', async () => {
    const user = userEvent.setup();
    render(<ScanningTrackingPage />);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(screen.queryByText('Refresh count: 2')).not.toBeNull();
    expect(screen.queryByText('Activity attendance compare')).not.toBeNull();
    expect(screen.queryByText('Transport boarding compare')).not.toBeNull();
    expect(screen.queryByText('missing_scan')).not.toBeNull();
    expect(screen.queryByText('not_boarded')).not.toBeNull();
  });
});
