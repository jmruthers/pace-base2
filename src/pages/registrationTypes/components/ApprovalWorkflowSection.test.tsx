// @vitest-environment jsdom

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setupUser } from '@test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApprovalWorkflowSection } from './ApprovalWorkflowSection';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./RequirementConfigPanel', () => ({
  RequirementConfigPanel: ({ rule }: { rule: { check_type: string } }) => (
    <p>{`config for ${rule.check_type}`}</p>
  ),
}));

vi.mock('@solvera/pace-core/forms', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  KeyboardSensor: class {},
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: () => [],
  SortableContext: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  CSS: { Transform: { toString: () => undefined } },
}));

vi.mock('@solvera/pace-core/icons', () => ({
  GripVertical: () => <span data-icon="grip" />,
  Trash2: () => <span data-icon="trash" />,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: ReactNode }) => <section role="alert">{children}</section>,
  AlertTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  AlertDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => createElement('button', { type: 'button', onClick, ...props }, children),
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
  Label: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  LoadingSpinner: () => <p>Loading Spinner</p>,
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) =>
    createElement(
      'select',
      {
        'aria-label': 'Select requirement type',
        value: value ?? '',
        onChange: (event: Event) => onValueChange?.((event.target as HTMLSelectElement).value),
      },
      children
    ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: ({
    placeholder,
    children,
  }: {
    placeholder?: string;
    children?: ReactNode;
  }) => <span>{children ?? placeholder ?? 'Select requirement type'}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const baseProps = {
  scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
  disabled: false,
  isLoading: false,
  errorMessage: null,
  isPending: false,
  rows: [
    {
      localId: 'req-1',
      id: 'req-1',
      check_type: 'payment' as const,
      sort_order: 0,
      is_automated: true,
      config: null,
    },
  ],
  reviewingOrganisations: [],
  reviewingOrganisationsLoading: false,
  reviewingOrganisationsError: null,
  designatedOrgErrors: {},
  selectedTypeToAdd: '',
  onSelectedTypeToAddChange: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onReorderRequirement: vi.fn(),
  onRequireAllGuardiansChange: vi.fn(),
  onReviewingOrgChange: vi.fn(),
  onSave: vi.fn(),
};

describe('ApprovalWorkflowSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows disabled message when workflow is not yet available', () => {
    render(<ApprovalWorkflowSection {...baseProps} disabled rows={[]} />);
    expect(screen.getByText('Save the registration type first to configure the approval workflow.')).toBeTruthy();
  });

  it('renders approval workflow title and save action when enabled', () => {
    render(<ApprovalWorkflowSection {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Approval workflow' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('calls onSave when save is clicked', async () => {
    const onSave = vi.fn();
    const user = setupUser();
    render(<ApprovalWorkflowSection {...baseProps} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
