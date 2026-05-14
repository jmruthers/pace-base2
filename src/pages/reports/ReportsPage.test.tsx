// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsPage } from './ReportsPage';

const state = vi.hoisted(() => ({
  selectedEvent: { event_id: 'event-1' } as unknown,
  userId: 'user-1',
  organisationId: 'org-1',
  canCreate: true,
}));

const reportBuilderSpy = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({ user: state.userId == null ? null : { id: state.userId } }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useSecureSupabase: () => ({}),
  useResolvedScope: () => ({ organisationId: state.organisationId, eventId: 'event-1', appId: 'base-app' }),
  useResourcePermissions: () => ({ canCreate: state.canCreate, isLoading: false }),
  AccessDenied: () => <main>Access Denied</main>,
  PagePermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core/components', () => ({
  LoadingSpinner: () => <p>Loading</p>,
}));

vi.mock('@solvera/pace-core/reporting', () => ({
  ReportBuilder: (props: Record<string, unknown>) => {
    reportBuilderSpy(props);
    return <section>Report Builder</section>;
  },
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    state.selectedEvent = { event_id: 'event-1' };
    state.userId = 'user-1';
    state.organisationId = 'org-1';
    state.canCreate = true;
    reportBuilderSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders no-event empty state when event is not selected', () => {
    state.selectedEvent = null;
    render(<ReportsPage />);
    expect(screen.getByText('Select an event to run reports')).toBeTruthy();
    expect(screen.queryByText('Report Builder')).toBeNull();
  });

  it('renders ReportBuilder with BA15 explore and scope props', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Report Builder')).toBeTruthy();
    expect(reportBuilderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserId: 'user-1',
        initialExploreKey: 'base.participant',
        availableExploreKeys: ['base.participant', 'base.unit', 'base.activity', 'base.scan'],
        scopeValue: 'event-1',
        reportResultsRbac: { pageName: 'reports' },
      })
    );
  });

  it('passes template create permission into ReportBuilder when create is denied', () => {
    state.canCreate = false;
    render(<ReportsPage />);
    const lastCall = reportBuilderSpy.mock.calls.at(-1)?.[0] as {
      canCreateTemplates?: boolean;
    };
    expect(lastCall.canCreateTemplates).toBe(false);
  });
});
