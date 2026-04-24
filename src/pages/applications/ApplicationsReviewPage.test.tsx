/* @vitest-environment jsdom */

import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ApplicationReviewListItem } from '@/hooks/useEventApplicationsReviewList';
import { ApplicationsReviewPage } from './ApplicationsReviewPage';

const setStatusMock = vi.fn(async () => ({ ok: true }));
const reissueMock = vi.fn(async () => ({ ok: true }));

const mockApplications: ReadonlyArray<ApplicationReviewListItem> = [
  {
    applicationId: 'app-1',
    registrationType: 'Leader',
    status: 'under_review',
    checks: [
      { checkId: 'check-1', checkType: 'guardian_approval', checkStatus: 'pending' },
      { checkId: 'check-2', checkType: 'home_leader_approval', checkStatus: 'satisfied' },
    ],
  },
  {
    applicationId: 'app-2',
    registrationType: 'Participant',
    status: 'submitted',
    checks: [{ checkId: 'check-3', checkType: 'designated_org_review', checkStatus: 'pending' }],
  },
];

vi.mock('@/hooks/useApplicationReviewActions', () => ({
  useApplicationReviewActions: () => ({
    setApplicationStatus: setStatusMock,
    reissueApprovalToken: reissueMock,
  }),
}));

vi.mock('@/hooks/useEventApplicationsReviewList', () => ({
  eventApplicationsReviewQueryKey: (eventId: string | null) =>
    ['event-applications-review', eventId] as const,
  useEventApplicationsReviewList: () => ({
    data: mockApplications,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => ({
    selectedEvent: { id: 'event-200' },
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <p>Access denied</p>,
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderWithQueryClient(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

describe('BA06 applications admin review surface', () => {
  afterEach(() => {
    cleanup();
    setStatusMock.mockClear();
    reissueMock.mockClear();
  });

  it('renders queue and check-level review detail', async () => {
    renderWithQueryClient(<ApplicationsReviewPage />);

    expect(screen.queryByText('Applications')).not.toBeNull();
    expect(await screen.findByText('Application review detail')).not.toBeNull();
    expect(screen.queryByText('Review steps (read-only in MVP):')).not.toBeNull();
  });

  it('executes approve action through backend-owned status contract', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ApplicationsReviewPage />);

    await screen.findByRole('button', { name: 'Approve' });
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(setStatusMock).toHaveBeenCalledWith({
      applicationId: 'app-1',
      status: 'approved',
    });
    expect(screen.queryByText('Application moved to approved.')).not.toBeNull();
  });

  it('executes token reissue for pending check', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ApplicationsReviewPage />);

    await screen.findByRole('button', { name: 'Reissue request' });
    await user.click(screen.getByRole('button', { name: 'Reissue request' }));

    expect(reissueMock).toHaveBeenCalledWith({ checkId: 'check-1' });
    expect(screen.queryByText('Approval request token reissued.')).not.toBeNull();
  });
});
