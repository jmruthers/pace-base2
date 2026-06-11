// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormBuilderPage } from './FormBuilderPage';

const state = vi.hoisted(() => ({
  selectedEvent: { name: 'Camp Alpha' } as unknown,
  selectedEventId: 'event-1' as string | null,
  selectedOrganisationId: 'org-1' as string | null,
  appId: 'base-app' as string | null,
  user: { id: 'user-1' } as { id: string } | null,
  allowRead: true,
  allowUpdate: true,
  builderLoading: false,
  builderError: null as Error | null,
  builderData: null as unknown,
  registrationTypes: [] as Array<{
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    cost: number | null;
    eligibilityRuleCount: number;
    approvalCount: number;
  }>,
  registrationTypesLoading: false,
  registrationTypesError: null as Error | null,
}));

const resolvedScopeState = vi.hoisted(() => ({
  organisationId: 'org-1' as string | null,
  eventId: 'event-1' as string | null,
  appId: 'base-app' as string | null,
  isLoading: false,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedEventId: state.selectedEventId,
    selectedOrganisationId: state.selectedOrganisationId,
    user: state.user,
  }),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  useResolvedScope: () => resolvedScopeState,
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation: 'read' | 'update';
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const allowed = operation === 'read' ? state.allowRead : state.allowUpdate;
    if (!allowed) {
      return <>{fallback ?? null}</>;
    }
    return <>{children}</>;
  },
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Checkbox: ({ checked }: { checked?: boolean }) =>
    createElement('section', { 'data-checked': checked === true ? 'true' : 'false' }),
  DatePickerWithTimezone: () => createElement('section'),
  Input: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
  Label: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading Spinner</p>,
  Textarea: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock('@solvera/pace-core/forms', () => ({
  AuthoringIssueAlerts: ({ issues }: { issues: unknown[] }) =>
    issues.length > 0 ? <section data-testid="authoring-issue-alerts" /> : null,
  validateWorkflowAuthoringState: vi.fn(() => ({
    isValid: true,
    errors: [],
    warnings: [],
  })),
  WorkflowFormAuthoringShell: ({
    state,
    onStateChange,
    heading,
    disabled,
    metadataAside,
    middleContent,
  }: {
    state: {
      metadata: {
        workflowType: string;
      };
    };
    onStateChange: (nextState: unknown) => void;
    heading: string;
    disabled?: boolean;
    metadataAside?: React.ReactNode;
    middleContent?: React.ReactNode;
  }) => (
    <section>
      <h1>{heading}</h1>
      <p>{disabled ? 'Shell Disabled' : 'Shell Enabled'}</p>
      <article
        role="button"
        tabIndex={0}
        aria-label="toggle-workflow-type"
        onClick={() => {
          onStateChange({
            ...state,
            metadata: {
              ...state.metadata,
              workflowType: state.metadata.workflowType === 'base_registration' ? 'information_collection' : 'base_registration',
            },
          });
        }}
      >
        Toggle workflow
      </article>
      {metadataAside}
      {middleContent}
    </section>
  ),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock('@/features/formsAuthoring/configuration', () => ({
  useFormBuilderRecord: () => ({
    isLoading: state.builderLoading,
    error: state.builderError,
    data: state.builderData,
  }),
  useRegistrationTypes: () => ({
    isLoading: state.registrationTypesLoading,
    error: state.registrationTypesError,
    data: state.registrationTypes,
  }),
  useSaveWorkflowFormMutation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/form-builder" element={<FormBuilderPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('FormBuilderPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    state.selectedEvent = { name: 'Camp Alpha' };
    state.selectedEventId = 'event-1';
    state.selectedOrganisationId = 'org-1';
    state.appId = 'base-app';
    resolvedScopeState.organisationId = 'org-1';
    resolvedScopeState.eventId = 'event-1';
    resolvedScopeState.appId = 'base-app';
    state.user = { id: 'user-1' };
    state.allowRead = true;
    state.allowUpdate = true;
    state.builderLoading = false;
    state.builderError = null;
    state.builderData = null;
    state.registrationTypes = [];
    state.registrationTypesLoading = false;
    state.registrationTypesError = null;
  });

  it('shows no-event blocking state when no event selected', () => {
    state.selectedEvent = null;
    state.selectedEventId = null;
    renderAt('/form-builder');
    expect(
      screen.getByText('Select an event from the header before creating or editing a form.')
    ).toBeTruthy();
  });

  it('shows loading state in edit mode while builder data loads', () => {
    state.builderLoading = true;
    renderAt('/form-builder?formId=form-1');
    expect(screen.getByText('Loading Spinner')).toBeTruthy();
    expect(screen.getByText('Loading form…')).toBeTruthy();
  });

  it('shows error state in edit mode when form load fails', () => {
    state.builderError = new Error('Load failed');
    renderAt('/form-builder?formId=form-1');
    expect(screen.getByText('Load failed')).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Back to Forms' }) ??
        screen.queryByRole('button', { name: 'Back to Forms' })
    ).toBeTruthy();
  });

  it('renders create mode shell when no formId is provided', () => {
    renderAt('/form-builder');
    expect(screen.getByText('Create Form')).toBeTruthy();
    expect(screen.getByText('Shell Enabled')).toBeTruthy();
  });

  it('renders submission settings and schedule fields in one metadataAside card', () => {
    renderAt('/form-builder');
    expect(screen.getByRole('heading', { name: 'Submission settings' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Schedule' })).toBeNull();
    const submissionCard = screen.getByRole('heading', { name: 'Submission settings' }).closest('header')
      ?.parentElement;
    expect(submissionCard?.textContent?.includes('Max submissions')).toBe(true);
    expect(submissionCard?.textContent?.includes('Opens at')).toBe(true);
    expect(submissionCard?.textContent?.includes('Closes at')).toBe(true);
  });

  it('renders access denied when read permission is denied', () => {
    state.allowRead = false;
    renderAt('/form-builder');
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });

  it('renders disabled shell when update permission is denied', () => {
    state.allowUpdate = false;
    renderAt('/form-builder');
    expect(screen.getAllByText('Create Form').length).toBeGreaterThan(0);
    expect(screen.getByText('Shell Disabled')).toBeTruthy();
  });

  it('keeps shell visible when registration types fail in edit mode', () => {
    state.builderData = {
      form: {
        id: 'form-1',
        event_id: 'event-1',
        organisation_id: 'org-1',
        slug: 'camp-form',
        name: 'Camp Form',
        description: null,
        workflow_type: 'base_registration',
        access_mode: 'authenticated_member',
        status: 'draft',
        workflow_config: {},
        is_active: true,
                opens_at: null,
        closes_at: null,
        max_submissions: null,
        confirmation_message: null,
      },
      fields: [],
      bindings: [],
    };
    state.registrationTypesError = new Error('Types failed');

    renderAt('/form-builder?formId=form-1');
    expect(screen.getByText('Edit Form')).toBeTruthy();
    expect(screen.getByText('Types failed')).toBeTruthy();
  });

  it('shows registration bindings loading state for base registration forms', () => {
    state.builderData = {
      form: {
        id: 'form-1',
        event_id: 'event-1',
        organisation_id: 'org-1',
        slug: 'camp-form',
        name: 'Camp Form',
        description: null,
        workflow_type: 'base_registration',
        access_mode: 'authenticated_member',
        status: 'draft',
        workflow_config: {},
        is_active: true,
                opens_at: null,
        closes_at: null,
        max_submissions: null,
        confirmation_message: null,
      },
      fields: [],
      bindings: [],
    };
    state.registrationTypesLoading = true;

    renderAt('/form-builder?formId=form-1');
    expect(screen.getByText('Edit Form')).toBeTruthy();
    expect(screen.getAllByText('Loading Spinner').length).toBeGreaterThan(0);
    expect(screen.getByText('Registration Type Bindings')).toBeTruthy();
  });

  it('shows registration bindings empty state when no types exist', () => {
    state.builderData = {
      form: {
        id: 'form-1',
        event_id: 'event-1',
        organisation_id: 'org-1',
        slug: 'camp-form',
        name: 'Camp Form',
        description: null,
        workflow_type: 'base_registration',
        access_mode: 'authenticated_member',
        status: 'draft',
        workflow_config: {},
        is_active: true,
                opens_at: null,
        closes_at: null,
        max_submissions: null,
        confirmation_message: null,
      },
      fields: [],
      bindings: [],
    };
    state.registrationTypes = [];

    renderAt('/form-builder?formId=form-1');
    expect(
      screen.getByText(
        'There are no registration types defined yet for this event. You must have registration types defined for members to be able to apply for the event.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Manage registration types' })).toBeNull();
    const createLink = screen.getByRole('link', { name: 'Create registration type' });
    expect(createLink.getAttribute('href')).toBe('/registration-type-builder');
  });

  it('renders registration bindings list for base registration forms', () => {
    state.builderData = {
      form: {
        id: 'form-1',
        event_id: 'event-1',
        organisation_id: 'org-1',
        slug: 'camp-form',
        name: 'Camp Form',
        description: null,
        workflow_type: 'base_registration',
        access_mode: 'authenticated_member',
        status: 'draft',
        workflow_config: {},
        is_active: true,
                opens_at: null,
        closes_at: null,
        max_submissions: null,
        confirmation_message: null,
      },
      fields: [],
      bindings: [{ registration_type_id: 'type-1', is_required: true }],
    };
    state.registrationTypes = [
      {
        id: 'type-1',
        name: 'Youth',
        description: null,
        is_active: true,
        cost: 5000,
        eligibilityRuleCount: 2,
        approvalCount: 1,
      },
      {
        id: 'type-2',
        name: 'Adult',
        description: null,
        is_active: true,
        cost: null,
        eligibilityRuleCount: 0,
        approvalCount: 3,
      },
    ];

    renderAt('/form-builder?formId=form-1');
    expect(screen.getByText('Registration Type Bindings')).toBeTruthy();
    expect(screen.getByText('Youth')).toBeTruthy();
    expect(screen.getByText('Adult')).toBeTruthy();
    expect(screen.getByText('$50.00')).toBeTruthy();
    expect(screen.getByText('No cost set')).toBeTruthy();
    expect(screen.getByText('2 eligibility rules, 1 approval')).toBeTruthy();
    expect(screen.getByText('0 eligibility rules, 3 approvals')).toBeTruthy();
    expect(screen.getAllByText('Required for this registration type').length).toBeGreaterThan(0);
  });

  it('rehydrates persisted bindings when toggling away from and back to base registration', () => {
    state.builderData = {
      form: {
        id: 'form-1',
        event_id: 'event-1',
        organisation_id: 'org-1',
        slug: 'camp-form',
        name: 'Camp Form',
        description: null,
        workflow_type: 'base_registration',
        access_mode: 'authenticated_member',
        status: 'draft',
        workflow_config: {},
        is_active: true,
                opens_at: null,
        closes_at: null,
        max_submissions: null,
        confirmation_message: null,
      },
      fields: [],
      bindings: [{ registration_type_id: 'type-1', sort_order: 0, is_required: true }],
    };
    state.registrationTypes = [
      {
        id: 'type-1',
        name: 'Youth',
        description: null,
        is_active: true,
        cost: null,
        eligibilityRuleCount: 0,
        approvalCount: 0,
      },
      {
        id: 'type-2',
        name: 'Adult',
        description: null,
        is_active: true,
        cost: null,
        eligibilityRuleCount: 0,
        approvalCount: 0,
      },
    ];

    renderAt('/form-builder?formId=form-1');
    expect(document.querySelectorAll('[data-checked="true"]').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'toggle-workflow-type' }));
    expect(screen.queryByText('Registration Type Bindings')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'toggle-workflow-type' }));
    expect(screen.getByText('Registration Type Bindings')).toBeTruthy();
    expect(document.querySelectorAll('[data-checked="true"]').length).toBeGreaterThan(0);
  });
});
