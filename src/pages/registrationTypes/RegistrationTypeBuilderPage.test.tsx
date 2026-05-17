// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationTypeBuilderPage } from './RegistrationTypeBuilderPage';

const controllerState = vi.hoisted(() => ({
  selectedEventId: 'event-1' as string | null,
  allowUpdate: true,
  isEditMode: false,
  listLoading: false,
  unknownTypeId: false,
  workflowEnabled: false,
  typeDraft: { id: null as string | null, name: '' },
  saveType: vi.fn(),
  saveWorkflow: vi.fn(),
}));

vi.mock('./hooks/useRegistrationTypeBuilderController', () => ({
  useRegistrationTypeBuilderController: () => ({
    scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
    selectedEventId: controllerState.selectedEventId,
    isEditMode: controllerState.isEditMode,
    listQuery: { isLoading: controllerState.listLoading, error: null },
    unknownTypeId: controllerState.unknownTypeId,
    upsertMutation: { isPending: false },
    requirementsQuery: { isLoading: false, error: null },
    membershipTypesQuery: { data: [] },
    reviewingOrgsQuery: { data: [] },
    typeDraft: controllerState.typeDraft,
    setTypeDraft: vi.fn(),
    eligibilityDrafts: [],
    typeValidationErrors: {},
    workflowEnabled: controllerState.workflowEnabled,
    requirementDraftRows: [],
    selectedRequirementTypeToAdd: '',
    setSelectedRequirementTypeToAdd: vi.fn(),
    designatedOrgErrors: {},
    addEligibilityRule: vi.fn(),
    removeEligibilityRule: vi.fn(),
    updateEligibilityRuleType: vi.fn(),
    updateEligibilityRuleValue: vi.fn(),
    saveType: controllerState.saveType,
    reorderRequirement: vi.fn(),
    addRequirement: vi.fn(),
    removeRequirement: vi.fn(),
    updateRequireAllGuardians: vi.fn(),
    updateReviewingOrganisation: vi.fn(),
    saveWorkflow: controllerState.saveWorkflow,
  }),
}));

vi.mock('@solvera/pace-core/rbac', () => ({
  AccessDenied: () => <main>Access Denied</main>,
  PagePermissionGuard: ({
    operation,
    fallback,
    children,
  }: {
    operation: string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }) => (operation === 'update' && !controllerState.allowUpdate ? <>{fallback}</> : <>{children}</>),
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { type: 'button', onClick }, children),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading Spinner</p>,
}));

vi.mock('./components/RegistrationTypeEditorFields', () => ({
  RegistrationTypeEditorFields: () => <section>Type fields</section>,
}));

vi.mock('./components/ApprovalWorkflowSection', () => ({
  ApprovalWorkflowSection: ({ disabled }: { disabled?: boolean }) => (
    <section>{disabled ? 'Workflow disabled' : 'Workflow enabled'}</section>
  ),
}));

function renderPage(initialEntry = '/registration-type-builder') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/registration-type-builder" element={<RegistrationTypeBuilderPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RegistrationTypeBuilderPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    controllerState.selectedEventId = 'event-1';
    controllerState.allowUpdate = true;
    controllerState.isEditMode = false;
    controllerState.listLoading = false;
    controllerState.unknownTypeId = false;
    controllerState.workflowEnabled = false;
    controllerState.typeDraft = { id: null, name: '' };
    controllerState.saveType.mockClear();
    controllerState.saveWorkflow.mockClear();
  });

  it('shows create title in create mode', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Create registration type' })).toBeTruthy();
    expect(screen.getByText('Workflow disabled')).toBeTruthy();
  });

  it('shows edit title when editing existing type', () => {
    controllerState.isEditMode = true;
    controllerState.typeDraft = { id: 'type-1', name: 'Youth' };
    renderPage('/registration-type-builder?registrationTypeId=type-1');
    expect(screen.getByRole('heading', { name: 'Edit registration type' })).toBeTruthy();
  });

  it('shows access denied when update permission is denied', () => {
    controllerState.allowUpdate = false;
    renderPage();
    expect(screen.getByText('Access Denied')).toBeTruthy();
  });
});
