// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
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
  registrationTypes: [] as Array<{ id: string; name: string; description: string | null; is_active: boolean }>,
  registrationTypesLoading: false,
  registrationTypesError: null as Error | null,
}));

vi.mock('@solvera/pace-core/hooks', () => ({
  useEvents: () => ({ selectedEvent: state.selectedEvent }),
  useUnifiedAuth: () => ({
    selectedEventId: state.selectedEventId,
    selectedOrganisationId: state.selectedOrganisationId,
    appId: state.appId,
    user: state.user,
  }),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
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
  WorkflowFormAuthoringShell: ({
    heading,
    disabled,
    middleContent,
  }: {
    heading: string;
    disabled?: boolean;
    middleContent?: React.ReactNode;
  }) => (
    <section>
      <h1>{heading}</h1>
      <p>{disabled ? 'Shell Disabled' : 'Shell Enabled'}</p>
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
  isPublishedForm: () => false,
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
    expect(screen.getByText('Back to Forms')).toBeTruthy();
  });

  it('renders create mode shell when no formId is provided', () => {
    renderAt('/form-builder');
    expect(screen.getByText('Create Form')).toBeTruthy();
    expect(screen.getByText('Shell Enabled')).toBeTruthy();
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
        is_primary_entrypoint: false,
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
});
