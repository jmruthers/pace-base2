// @vitest-environment jsdom

import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationsPage } from './CommunicationsPage';

const authState = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  selectedOrganisationId: 'org-1' as string | null,
}));

const permissionState = vi.hoisted(() => ({
  canRead: true,
  canCreate: true,
  canUpdate: true,
  isLoading: false,
}));

const toastSpy = vi.hoisted(() => vi.fn());
const draftControls = vi.hoisted(() => ({
  setDraft: vi.fn(),
  commitDraft: vi.fn(),
}));
const sendTestSpy = vi.hoisted(() => vi.fn());

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => authState,
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  useResolvedScope: () => ({ organisationId: 'org-1', appId: 'base-app' }),
  useResourcePermissions: () => permissionState,
  AccessDenied: () => <main>Access Denied</main>,
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation?: 'read' | 'create' | 'update' | 'delete';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => (operation === 'read' && !permissionState.canRead ? <>{fallback}</> : <>{children}</>),
}));

vi.mock('@solvera/pace-core/components', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <article role="button" tabIndex={0} onClick={onClick}>
      {children}
    </article>
  ),
  LoadingSpinner: () => <p>Loading</p>,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  MultiSelect: ({
    placeholder,
    value,
    onValueChange,
  }: {
    placeholder?: string;
    value?: string[];
    onValueChange?: (values: string[]) => void;
  }) => (
    <section>
      <p>{placeholder ?? 'Select'}</p>
      <p>{JSON.stringify(value ?? [])}</p>
      <article
        role="button"
        tabIndex={0}
        onClick={() => {
          if (placeholder === 'Status') {
            onValueChange?.(['approved']);
            return;
          }
          if (placeholder === 'Search or select participants...') {
            onValueChange?.(['member-1']);
            return;
          }
          onValueChange?.(['value-1']);
        }}
      >
        Select value
      </article>
    </section>
  ),
}));

vi.mock('@solvera/pace-core/comms', () => ({
  useCommDraft: () => ({
    draft: { channel: 'email' },
    setDraft: draftControls.setDraft,
    commitDraft: draftControls.commitDraft,
  }),
  useCommSendAdapter: () => ({
    resolvePool: vi.fn(),
    loadTemplates: vi.fn(),
    loadMergeFields: vi.fn(),
    send: vi.fn(),
    sendTest: sendTestSpy,
    schedule: vi.fn(),
    saveDraft: vi.fn(),
  }),
  CommComposer: ({
    adapter,
    recipientPool,
    onSendComplete,
    onScheduleComplete,
  }: {
    adapter: { sendTest: (request: unknown) => Promise<{ ok: boolean; data: unknown }> };
    recipientPool: { type: string; filters?: { status?: string[] }; member_ids?: string[] };
    onSendComplete?: (result: {
      message_id: string;
      total_recipients: number;
      suppression_skipped: number;
      warnings: Array<{ message: string }>;
    }) => void;
    onScheduleComplete?: (scheduledAt: string) => void;
  }) => (
    <section>
      <p>Comm Composer</p>
      <p>{JSON.stringify(recipientPool)}</p>
      <article
        role="button"
        tabIndex={0}
        onClick={() =>
          onSendComplete?.({
            message_id: 'msg-1',
            total_recipients: 3,
            suppression_skipped: 1,
            warnings: [{ message: 'Gateway partially failed.' }],
          })
        }
      >
        Trigger Send Success
      </article>
      <article
        role="button"
        tabIndex={0}
        onClick={() => onScheduleComplete?.('2026-06-01T10:30:00Z')}
      >
        Trigger Schedule Success
      </article>
      <article
        role="button"
        tabIndex={0}
        onClick={() => {
          void adapter.sendTest({ test: true });
        }}
      >
        Trigger Send Test
      </article>
    </section>
  ),
}));

vi.mock('@/features/communications/configuration', () => ({
  useRegistrationTypeFilterOptions: () => ({
    data: [{ value: 'reg-1', label: 'Type A' }],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useUnitFilterOptions: () => ({
    data: [{ value: 'unit-1', label: 'Unit 1' }],
    isLoading: false,
    isError: false,
    error: null,
  }),
  useSpecificParticipantOptions: () => ({
    data: [{ value: 'member-1', label: 'Participant 1' }],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

describe('CommunicationsPage', () => {
  beforeEach(() => {
    authState.selectedEventId = 'event-1';
    permissionState.canRead = true;
    permissionState.canCreate = true;
    permissionState.canUpdate = true;
    permissionState.isLoading = false;
    sendTestSpy.mockReset();
    sendTestSpy.mockResolvedValue({
      ok: true,
      data: {
        message_id: 'test-1',
        total_recipients: 1,
        suppression_skipped: 0,
        warnings: [{ message: 'Test warning' }],
      },
    });
    toastSpy.mockReset();
    draftControls.setDraft.mockReset();
    draftControls.commitDraft.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows access denied when read permission is missing', () => {
    permissionState.canRead = false;
    render(<CommunicationsPage />);
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });

  it('shows no-event guidance when no event is selected', () => {
    authState.selectedEventId = null;
    render(<CommunicationsPage />);
    expect(screen.getByText('Communications')).toBeTruthy();
    expect(screen.getByText('Select an event to compose a communication.')).toBeTruthy();
  });

  it('updates status filter and renders composer', async () => {
    render(<CommunicationsPage />);
    expect(screen.getByText('Comm Composer')).toBeTruthy();
    expect(screen.getByText('{"type":"event_participants","event_id":"event-1","filters":{}}')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Select value')[1]);
    expect(await screen.findByText('["approved"]')).toBeTruthy();
  });

  it('switches to specific participants mode and uses manual pool descriptor', async () => {
    render(<CommunicationsPage />);
    fireEvent.click(screen.getByText('Specific participants'));
    fireEvent.click(screen.getAllByText('Select value')[0]);
    expect(await screen.findByText('["member-1"]')).toBeTruthy();
    expect(await screen.findByText('{"type":"manual","member_ids":["member-1"]}')).toBeTruthy();
    expect(screen.queryByText('Clear filters')).toBeNull();
  });

  it('shows success, suppression, and warning toasts after send success callback', () => {
    render(<CommunicationsPage />);
    fireEvent.click(screen.getByText('Trigger Send Success'));
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Message sent to 3 participants.',
        variant: 'success',
      })
    );
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        description: '1 recipients were suppressed and skipped.',
      })
    );
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Gateway partially failed.',
      })
    );
  });

  it('shows send test success and warning toasts', async () => {
    render(<CommunicationsPage />);
    fireEvent.click(screen.getByText('Trigger Send Test'));
    await vi.waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test email sent to your email address.',
          variant: 'success',
        })
      );
    });
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Test warning',
      })
    );
  });

  it('shows schedule toast with datetime copy', () => {
    render(<CommunicationsPage />);
    fireEvent.click(screen.getByText('Trigger Schedule Success'));
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Message scheduled for 2026-06-01T10:30:00Z.',
        variant: 'success',
      })
    );
  });
});
