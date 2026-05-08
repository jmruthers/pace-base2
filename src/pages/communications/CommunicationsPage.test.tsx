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
    onValueChange,
  }: {
    placeholder?: string;
    onValueChange?: (values: string[]) => void;
  }) => (
    <article role="button" tabIndex={0} onClick={() => onValueChange?.(['approved'])}>
      {placeholder ?? 'Select'}
    </article>
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
    sendTest: vi.fn().mockResolvedValue({ ok: true, data: { total_recipients: 0 } }),
    schedule: vi.fn(),
    saveDraft: vi.fn(),
  }),
  CommComposer: ({
    recipientPool,
    onSendComplete,
  }: {
    recipientPool: { filters?: { status?: string[] } };
    onSendComplete?: (result: {
      message_id: string;
      total_recipients: number;
      suppression_skipped: number;
      warnings: [];
    }) => void;
  }) => (
    <section>
      <p>Comm Composer</p>
      <p>{JSON.stringify(recipientPool.filters?.status ?? [])}</p>
      <article
        role="button"
        tabIndex={0}
        onClick={() =>
          onSendComplete?.({
            message_id: 'msg-1',
            total_recipients: 3,
            suppression_skipped: 1,
            warnings: [],
          })
        }
      >
        Trigger Send Success
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
}));

describe('CommunicationsPage', () => {
  beforeEach(() => {
    authState.selectedEventId = 'event-1';
    permissionState.canRead = true;
    permissionState.canCreate = true;
    permissionState.canUpdate = true;
    permissionState.isLoading = false;
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
    expect(screen.getByText('[]')).toBeTruthy();
    fireEvent.click(screen.getByText('Status'));
    expect(await screen.findByText('["approved"]')).toBeTruthy();
  });

  it('shows success and suppression toasts after send success callback', () => {
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
  });
});
