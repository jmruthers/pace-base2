// @vitest-environment jsdom

import { createElement } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequirementsDialog } from './RequirementsDialog';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./RequirementConfigPanel', () => ({
  RequirementConfigPanel: ({ rule }: { rule: { check_type: string } }) => (
    <p>{`config for ${rule.check_type}`}</p>
  ),
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
  Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <section role="dialog">{children}</section> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
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
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder ?? 'Select requirement type'}</option>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

function createProps(overrides: Partial<ComponentProps<typeof RequirementsDialog>> = {}) {
  return {
    scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
    open: true,
    onOpenChange: vi.fn(),
    step: 'edit' as const,
    onStepChange: vi.fn(),
    targetTypeName: 'Youth',
    state: {
      isLoading: false,
      errorMessage: null,
      isPending: false,
    },
    data: {
      rows: [
        {
          localId: 'req-1',
          id: 'req-1',
          check_type: 'payment' as const,
          sort_order: 0,
          is_automated: true,
          config: null,
        },
        {
          localId: 'req-2',
          id: 'req-2',
          check_type: 'referee' as const,
          sort_order: 1,
          is_automated: false,
          config: null,
        },
      ],
      reviewingOrganisations: [],
      designatedOrgErrors: {},
      selectedTypeToAdd: '',
    },
    actions: {
      onSelectedTypeToAddChange: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onMoveRequirement: vi.fn(),
      onRequireAllGuardiansChange: vi.fn(),
      onReviewingOrgChange: vi.fn(),
      onSave: vi.fn(),
    },
    ...overrides,
  };
}

describe('RequirementsDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders loading and error states', () => {
    const { rerender } = render(
      <RequirementsDialog
        {...createProps({
          state: { isLoading: true, errorMessage: null, isPending: false },
        })}
      />
    );
    expect(screen.getByText('Loading Spinner')).toBeTruthy();

    rerender(
      <RequirementsDialog
        {...createProps({
          state: { isLoading: false, errorMessage: 'Failed to load requirements', isPending: false },
        })}
      />
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Failed to load requirements')).toBeTruthy();
  });

  it('renders edit list state with reorder and remove controls', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onMoveRequirement = vi.fn();
    const onAdd = vi.fn();
    const onSelectedTypeToAddChange = vi.fn();
    render(
      <RequirementsDialog
        {...createProps({
          actions: { ...createProps().actions, onRemove, onMoveRequirement, onAdd, onSelectedTypeToAddChange },
        })}
      />
    );

    expect(screen.getByText('Requirements — Youth')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Move requirement 2 up' }));
    expect(onMoveRequirement).toHaveBeenCalledWith('req-2', 'up');
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(onRemove).toHaveBeenCalledWith('req-1');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select requirement type' }), 'payment');
    expect(onSelectedTypeToAddChange).toHaveBeenCalledWith('payment');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('renders confirm step and blocks save when pending', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    const onSave = vi.fn();
    render(
      <RequirementsDialog
        {...createProps({
          step: 'confirm',
          onStepChange,
          actions: { ...createProps().actions, onSave },
          state: { isLoading: false, errorMessage: null, isPending: true },
        })}
      />
    );

    expect(screen.getByText('Save requirements?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onStepChange).toHaveBeenCalledWith('edit');
    expect(screen.getByRole('button', { name: 'Save requirements' }).hasAttribute('disabled')).toBe(true);
  });

  it('disables save button while loading or when error is present', () => {
    const { rerender } = render(
      <RequirementsDialog
        {...createProps({
          state: { isLoading: true, errorMessage: null, isPending: false },
        })}
      />
    );
    expect(screen.getByRole('button', { name: 'Save requirements' }).hasAttribute('disabled')).toBe(true);

    rerender(
      <RequirementsDialog
        {...createProps({
          state: { isLoading: false, errorMessage: 'Failed', isPending: false },
        })}
      />
    );
    expect(screen.getByRole('button', { name: 'Save requirements' }).hasAttribute('disabled')).toBe(true);
  });

  it('uses onOpenChange(false) from edit footer cancel action', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <RequirementsDialog
        {...createProps({
          onOpenChange,
          step: 'edit',
          state: { isLoading: false, errorMessage: null, isPending: false },
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onSave from confirm step when enabled', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <RequirementsDialog
        {...createProps({
          step: 'confirm',
          actions: { ...createProps().actions, onSave },
          state: { isLoading: false, errorMessage: null, isPending: false },
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save requirements' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
