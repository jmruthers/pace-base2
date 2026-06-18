// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationTypesPage } from './RegistrationTypesPage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const state = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  selectedOrganisationId: 'org-1' as string | null,
  appId: 'base-app' as string | null,
  allowRead: true,
  allowCreate: true,
  allowUpdate: true,
  listLoading: false,
  listError: null as Error | null,
  invalidateQueries: vi.fn(),
  deleteMutateAsync: vi.fn(async () => ({
    deleted: true,
    application_count: 0,
    form_binding_count: 0,
  })),
  getDeleteBlockers: vi.fn(async () => ({
    ok: true as const,
    data: {
      applicationCount: 0,
      formBindingCount: 0,
    },
  })),
  listData: {
    types: [] as Array<{
      id: string;
      name: string;
      description: string | null;
      eligibility_message: string | null;
      cost: number | null;
      capacity: number | null;
      is_active: boolean;
      sort_order: number | null;
      organisation_id: string | null;
      event_id: string | null;
      created_at: string | null;
    }>,
    eligibilityCountsByTypeId: {} as Record<string, number>,
    applicationCountsByTypeId: {} as Record<string, number>,
    eligibilityByTypeId: {} as Record<string, Array<{ registration_type_id: string; rule_type: 'membership_type' | 'dob_before' | 'dob_after'; value: string }>>,
  },
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useUnifiedAuth: () => ({
    selectedEventId: state.selectedEventId,
    selectedOrganisationId: state.selectedOrganisationId,
  }),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  useSecureSupabase: () => ({}),
  useResolvedScope: () => ({
    organisationId: state.selectedOrganisationId,
    eventId: state.selectedEventId,
    appId: state.appId,
    isLoading: false,
  }),
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation: 'read' | 'create' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const allowed =
      operation === 'read' ? state.allowRead : operation === 'create' ? state.allowCreate : state.allowUpdate;
    return allowed ? <>{children}</> : <>{fallback ?? null}</>;
  },
}));

vi.mock('@solvera/pace-core/components', async () => {
  const {
    MockButton,
    MockCheckboxField,
    MockFieldLabel,
    MockSwitch,
    MockTextField,
    MockTextarea,
  } = await import('@/test/paceCoreElementMocks');

  return {
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: MockButton,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  Checkbox: MockCheckboxField,
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  DialogBody: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Input: MockTextField,
  Label: MockFieldLabel,
  LoadingSpinner: () => <p>Loading Spinner</p>,
  Progress: ({ value, max }: { value?: number; max?: number }) => (
    <meter value={value} max={max} aria-hidden />
  ),
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Switch: MockSwitch,
  Textarea: MockTextarea,
  ConfirmationDialog: ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    isPending,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
    onConfirm?: () => void;
    isPending?: boolean;
  }) =>
    open ? (
      <section>
        <h2>{title}</h2>
        <p>{description}</p>
        <MockButton aria-label="confirm-delete" disabled={isPending === true} onClick={() => onConfirm?.()}>
          Confirm delete
        </MockButton>
        <MockButton onClick={() => onOpenChange?.(false)}>Cancel delete</MockButton>
      </section>
    ) : null,
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: state.invalidateQueries,
      getQueryData: vi.fn(),
    }),
  };
});

vi.mock('@/features/registrationSetup/configuration', () => ({
  getRegistrationTypeDeleteBlockers: () => state.getDeleteBlockers(),
  useRegistrationTypesList: () => ({
    isLoading: state.listLoading,
    error: state.listError,
    data: state.listData,
  }),
  useRegistrationTypeUpsertMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useSetRegistrationTypeActiveMutation: () => ({
    mutateAsync: vi.fn(),
  }),
  useDeleteRegistrationTypeMutation: () => ({
    isPending: false,
    mutateAsync: state.deleteMutateAsync,
  }),
  useRequirementsForType: () => ({
    isLoading: false,
    error: null,
    data: [],
  }),
  useMembershipTypesForEvent: () => ({
    data: [],
  }),
  useReviewingOrganisationsForEvent: () => ({
    data: [],
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RegistrationTypesPage />
    </MemoryRouter>
  );
}

describe('RegistrationTypesPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    state.selectedEventId = 'event-1';
    state.selectedOrganisationId = 'org-1';
    state.appId = 'base-app';
    state.allowRead = true;
    state.allowCreate = true;
    state.allowUpdate = true;
    state.listLoading = false;
    state.listError = null;
    state.listData = {
      types: [],
      eligibilityCountsByTypeId: {},
      applicationCountsByTypeId: {},
      eligibilityByTypeId: {},
    };
    state.invalidateQueries.mockClear();
    state.deleteMutateAsync.mockClear();
    state.deleteMutateAsync.mockResolvedValue({
      deleted: true,
      application_count: 0,
      form_binding_count: 0,
    });
    state.getDeleteBlockers.mockClear();
    state.getDeleteBlockers.mockResolvedValue({
      ok: true,
      data: {
        applicationCount: 0,
        formBindingCount: 0,
      },
    });
    navigateMock.mockClear();
  });

  it('shows no-event card and hides create button when event is not selected', () => {
    state.selectedEventId = null;
    renderPage();
    expect(screen.getByText('Select an event from the header to manage registration types.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create registration type' })).toBeNull();
  });

  it('shows loading spinner while list query loads', () => {
    state.listLoading = true;
    renderPage();
    expect(screen.getByText('Loading Spinner')).toBeTruthy();
  });

  it('shows empty-state card when event has no registration types', () => {
    renderPage();
    expect(screen.getByText('No registration types yet. Create a registration type to begin.')).toBeTruthy();
  });

  it('hides create action when create permission is denied', () => {
    state.allowCreate = false;
    renderPage();
    expect(screen.queryByRole('button', { name: 'Create registration type' })).toBeNull();
  });

  it('shows list error state when list query fails', () => {
    state.listError = new Error('List failed');
    renderPage();
    expect(screen.getByRole('heading', { name: 'Error' })).toBeTruthy();
  });

  it('shows access denied when read permission is denied', () => {
    state.allowRead = false;
    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });

  it('navigates to builder when create is clicked', async () => {
    const user = setupUser();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Create registration type' }));
    expect(navigateMock).toHaveBeenCalledWith('/registration-type-builder');
  });

  it('navigates to builder with id when edit is clicked', async () => {
    const user = setupUser();
    state.listData = {
      types: [
        {
          id: 'type-1',
          name: 'Youth',
          description: null,
          eligibility_message: null,
          cost: null,
          capacity: null,
          is_active: true,
          sort_order: 1,
          organisation_id: 'org-1',
          event_id: 'event-1',
          created_at: null,
        },
      ],
      eligibilityCountsByTypeId: { 'type-1': 0 },
      applicationCountsByTypeId: {},
      eligibilityByTypeId: { 'type-1': [] },
    };
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(navigateMock).toHaveBeenCalledWith('/registration-type-builder?registrationTypeId=type-1');
  });

  it('hides edit action when update permission is denied', () => {
    state.allowUpdate = false;
    state.listData = {
      types: [
        {
          id: 'type-1',
          name: 'Youth',
          description: 'A sample cohort',
          eligibility_message: null,
          cost: 1000,
          capacity: null,
          is_active: true,
          sort_order: 1,
          organisation_id: 'org-1',
          event_id: 'event-1',
          created_at: null,
        },
      ],
      eligibilityCountsByTypeId: { 'type-1': 0 },
      applicationCountsByTypeId: {},
      eligibilityByTypeId: { 'type-1': [] },
    };

    renderPage();
    expect(screen.getByText('Youth')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByLabelText('Registration type active')).toBeNull();
    expect(screen.queryByLabelText('Delete Youth')).toBeNull();
  });

  it('shows card details for populated registration type rows', () => {
    state.listData = {
      types: [
        {
          id: 'type-1',
          name: 'Youth',
          description: 'A sample cohort',
          eligibility_message: null,
          cost: 1250,
          capacity: 30,
          is_active: true,
          sort_order: 1,
          organisation_id: 'org-1',
          event_id: 'event-1',
          created_at: null,
        },
      ],
      eligibilityCountsByTypeId: { 'type-1': 2 },
      applicationCountsByTypeId: {},
      eligibilityByTypeId: { 'type-1': [] },
    };

    renderPage();
    expect(screen.getByText('Youth')).toBeTruthy();
    expect(screen.getByText('A sample cohort')).toBeTruthy();
    expect(screen.getByText('2 eligibility rules')).toBeTruthy();
    expect(screen.getByText('Capacity 30')).toBeTruthy();
    expect(screen.getByText('Cost $12.50')).toBeTruthy();
    expect(screen.getByLabelText('Delete Youth')).toBeTruthy();
  });

  it('shows cannot-delete dialog without confirmation when dependencies block delete', async () => {
    const user = setupUser();
    state.getDeleteBlockers.mockResolvedValue({
      ok: true,
      data: {
        applicationCount: 1,
        formBindingCount: 0,
      },
    });
    state.listData = {
      types: [
        {
          id: 'type-1',
          name: 'Legacy standard',
          description: null,
          eligibility_message: null,
          cost: null,
          capacity: null,
          is_active: true,
          sort_order: 1,
          organisation_id: 'org-1',
          event_id: 'event-1',
          created_at: null,
        },
      ],
      eligibilityCountsByTypeId: { 'type-1': 0 },
      applicationCountsByTypeId: {},
      eligibilityByTypeId: { 'type-1': [] },
    };

    renderPage();
    await user.click(screen.getByLabelText('Delete Legacy standard'));

    expect(await screen.findByRole('heading', { name: 'Cannot delete registration type' })).toBeTruthy();
    expect(screen.getByText(/1 application/i)).toBeTruthy();
    expect(screen.queryByText(/Are you sure you want to delete/i)).toBeNull();
    expect(state.deleteMutateAsync).not.toHaveBeenCalled();
  });

  it('opens confirmation when delete dependencies are clear', async () => {
    const user = setupUser();
    state.listData = {
      types: [
        {
          id: 'type-1',
          name: 'Youth',
          description: null,
          eligibility_message: null,
          cost: null,
          capacity: null,
          is_active: true,
          sort_order: 1,
          organisation_id: 'org-1',
          event_id: 'event-1',
          created_at: null,
        },
      ],
      eligibilityCountsByTypeId: { 'type-1': 0 },
      applicationCountsByTypeId: {},
      eligibilityByTypeId: { 'type-1': [] },
    };

    renderPage();
    await user.click(screen.getByLabelText('Delete Youth'));

    expect(await screen.findByText(/Are you sure you want to delete 'Youth'/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Cannot delete registration type' })).toBeNull();
  });
});
