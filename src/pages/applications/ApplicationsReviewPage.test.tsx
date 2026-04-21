/* @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationsReviewPage } from './ApplicationsReviewPage';

const setStatusMock = vi.fn(async () => ({ ok: true }));
const reissueMock = vi.fn(async () => ({ ok: true }));

vi.mock('@/hooks/useApplicationReviewActions', () => ({
  useApplicationReviewActions: () => ({
    setApplicationStatus: setStatusMock,
    reissueApprovalToken: reissueMock,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('BA06 applications admin review surface', () => {
  afterEach(() => {
    cleanup();
    setStatusMock.mockClear();
    reissueMock.mockClear();
  });

  it('renders queue and check-level review detail', () => {
    render(<ApplicationsReviewPage />);

    expect(screen.queryByText('Applications')).not.toBeNull();
    expect(screen.queryByText('Application review detail')).not.toBeNull();
    expect(screen.queryByText('Review steps (read-only in MVP):')).not.toBeNull();
  });

  it('executes approve action through backend-owned status contract', async () => {
    const user = userEvent.setup();
    render(<ApplicationsReviewPage />);

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(setStatusMock).toHaveBeenCalledWith({
      applicationId: 'app-1',
      status: 'approved',
    });
    expect(screen.queryByText('Application moved to approved.')).not.toBeNull();
  });

  it('executes token reissue for pending check', async () => {
    const user = userEvent.setup();
    render(<ApplicationsReviewPage />);

    await user.click(screen.getByRole('button', { name: 'Reissue request' }));

    expect(reissueMock).toHaveBeenCalledWith({ checkId: 'check-1' });
    expect(screen.queryByText('Approval request token reissued.')).not.toBeNull();
  });
});
