// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationTypesPage } from './RegistrationTypesPage';

const state = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  selectedOrganisationId: 'org-1' as string | null,
  appId: 'base-app' as string | null,
  allowRead: true,
  allowCreate: true,
  allowUpdate: true,
  listLoading: false,
  listError: null as Error | null,
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

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { type: 'button', onClick, ...props }, children),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  Checkbox: ({ checked }: { checked?: boolean }) =>
    createElement('input', { type: 'checkbox', checked: checked === true, readOnly: true }),
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Input: ({ value, onChange, ...props }: { value?: string; onChange?: (value: string) => void }) =>
    createElement('input', { value: value ?? '', onChange: (event: Event) => onChange?.((event.target as HTMLInputElement).value), ...props }),
  Label: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading Spinner</p>,
  Select: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Switch: ({
    checked,
    onChange,
    ...props
  }: {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
  }) => createElement('input', { type: 'checkbox', checked: checked === true, onChange: (event: Event) => onChange?.((event.target as HTMLInputElement).checked), ...props }),
  Textarea: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) =>
    createElement('textarea', { value: value ?? '', onChange: (event: Event) => onChange?.((event.target as HTMLTextAreaElement).value) }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      getQueryData: vi.fn(),
    }),
  };
});

vi.mock('@/features/registrationSetup/configuration', () => ({
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
      eligibilityByTypeId: {},
    };
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

  it('hides edit and requirement actions when update permission is denied', () => {
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
      eligibilityByTypeId: { 'type-1': [] },
    };

    renderPage();
    expect(screen.getByText('Youth')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manage requirements' })).toBeNull();
    expect(screen.queryByLabelText('Registration type active')).toBeNull();
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
      eligibilityByTypeId: { 'type-1': [] },
    };

    renderPage();
    expect(screen.getByText('Youth')).toBeTruthy();
    expect(screen.getByText('A sample cohort')).toBeTruthy();
    expect(screen.getByText('2 eligibility rules')).toBeTruthy();
    expect(screen.getByText('Capacity 30')).toBeTruthy();
    expect(screen.getByText('Cost $12.50')).toBeTruthy();
  });
});
