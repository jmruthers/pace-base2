// @vitest-environment jsdom

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationTypeDraft } from '@/features/registrationSetup/types';
import { RegistrationTypeDialog } from './RegistrationTypeDialog';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Alert: ({ children }: { children: ReactNode }) => <section>{children}</section>,
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
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
  }) =>
    open ? (
      <section role="dialog">
        <article role="button" aria-label="close-dialog" onClick={() => onOpenChange?.(false)} />
        {children}
      </section>
    ) : null,
  DialogContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  Input: ({
    id,
    type,
    value,
    onChange,
  }: {
    id?: string;
    type?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) =>
    createElement('input', {
      id,
      type: type ?? 'text',
      'aria-label':
        id === 'registration-type-name'
          ? 'Name'
          : id === 'registration-type-cost'
            ? 'Cost (AUD)'
            : id === 'registration-type-capacity'
              ? 'Capacity'
              : id === 'registration-type-description'
                ? 'Description'
                : id === 'registration-type-eligibility-message'
                  ? 'Eligibility message'
                  : undefined,
      value: value ?? '',
      onChange: (event: Event) => onChange?.((event.target as HTMLInputElement).value),
    }),
  Label: ({ children }: { htmlFor?: string; children: ReactNode }) => <section>{children}</section>,
  Select: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SelectItem: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Textarea: ({
    id,
    value,
    onChange,
  }: {
    id?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) =>
    createElement('textarea', {
      id,
      value: value ?? '',
      onChange: (event: Event) => onChange?.((event.target as HTMLTextAreaElement).value),
    }),
}));

function createDraft(overrides: Partial<RegistrationTypeDraft> = {}): RegistrationTypeDraft {
  return {
    id: null,
    name: '',
    description: '',
    eligibility_message: '',
    costDollars: '0.00',
    capacity: '',
    is_active: false,
    sort_order: null,
    ...overrides,
  };
}

describe('RegistrationTypeDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders create and edit titles based on draft id', () => {
    const baseProps = {
      scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
      open: true,
      onOpenChange: vi.fn(),
      step: 'edit' as const,
      onStepChange: vi.fn(),
      onDraftChange: vi.fn(),
      eligibilityDrafts: [],
      validationErrors: {},
      membershipTypes: [],
      isPending: false,
      onAddEligibilityRule: vi.fn(),
      onRemoveEligibilityRule: vi.fn(),
      onEligibilityRuleTypeChange: vi.fn(),
      onEligibilityRuleValueChange: vi.fn(),
      onSave: vi.fn(),
    };
    const { rerender } = render(<RegistrationTypeDialog {...baseProps} draft={createDraft()} />);
    expect(screen.getByRole('heading', { name: 'Create registration type' })).toBeTruthy();

    rerender(<RegistrationTypeDialog {...baseProps} draft={createDraft({ id: 'type-1' })} />);
    expect(screen.getByRole('heading', { name: 'Edit registration type' })).toBeTruthy();
  });

  it('calls draft change handler from name input and shows validation message', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    render(
      <RegistrationTypeDialog
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        open
        onOpenChange={vi.fn()}
        step="edit"
        onStepChange={vi.fn()}
        draft={createDraft()}
        onDraftChange={onDraftChange}
        eligibilityDrafts={[]}
        validationErrors={{ name: 'Name is required.' }}
        membershipTypes={[]}
        isPending={false}
        onAddEligibilityRule={vi.fn()}
        onRemoveEligibilityRule={vi.fn()}
        onEligibilityRuleTypeChange={vi.fn()}
        onEligibilityRuleValueChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText('Name'), 'Youth');
    expect(onDraftChange).toHaveBeenCalled();
    expect(screen.getByText('Name is required.')).toBeTruthy();
  });

  it('renders confirmation step and save/cancel actions', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    const onSave = vi.fn();
    render(
      <RegistrationTypeDialog
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        open
        onOpenChange={vi.fn()}
        step="confirm"
        onStepChange={onStepChange}
        draft={createDraft({ id: 'type-1', name: 'Youth' })}
        onDraftChange={vi.fn()}
        eligibilityDrafts={[]}
        validationErrors={{}}
        membershipTypes={[]}
        isPending={false}
        onAddEligibilityRule={vi.fn()}
        onRemoveEligibilityRule={vi.fn()}
        onEligibilityRuleTypeChange={vi.fn()}
        onEligibilityRuleValueChange={vi.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByText('Save registration type?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onStepChange).toHaveBeenCalledWith('edit');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('resets to edit step when dialog is closed', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onStepChange = vi.fn();
    render(
      <RegistrationTypeDialog
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        open
        onOpenChange={onOpenChange}
        step="confirm"
        onStepChange={onStepChange}
        draft={createDraft({ id: 'type-1' })}
        onDraftChange={vi.fn()}
        eligibilityDrafts={[]}
        validationErrors={{}}
        membershipTypes={[]}
        isPending={false}
        onAddEligibilityRule={vi.fn()}
        onRemoveEligibilityRule={vi.fn()}
        onEligibilityRuleTypeChange={vi.fn()}
        onEligibilityRuleValueChange={vi.fn()}
        onSave={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'close-dialog' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onStepChange).toHaveBeenCalledWith('edit');
  });

  it('renders eligibility rows and routes row-level callbacks', async () => {
    const user = userEvent.setup();
    const onAddEligibilityRule = vi.fn();
    const onRemoveEligibilityRule = vi.fn();
    const onEligibilityRuleValueChange = vi.fn();
    render(
      <RegistrationTypeDialog
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        open
        onOpenChange={vi.fn()}
        step="edit"
        onStepChange={vi.fn()}
        draft={createDraft()}
        onDraftChange={vi.fn()}
        eligibilityDrafts={[
          { localId: 'rule-1', rule_type: 'membership_type', value: '7' },
          { localId: 'rule-2', rule_type: 'dob_after', value: '2020-01-01' },
        ]}
        validationErrors={{ eligibilityRules: { 'rule-2': 'Date must be in YYYY-MM-DD format.' } }}
        membershipTypes={[{ id: 7, name: 'Member' }]}
        isPending={false}
        onAddEligibilityRule={onAddEligibilityRule}
        onRemoveEligibilityRule={onRemoveEligibilityRule}
        onEligibilityRuleTypeChange={vi.fn()}
        onEligibilityRuleValueChange={onEligibilityRuleValueChange}
        onSave={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add eligibility rule' }));
    expect(onAddEligibilityRule).toHaveBeenCalledTimes(1);

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[0] as HTMLButtonElement);
    expect(onRemoveEligibilityRule).toHaveBeenCalledWith('rule-1');

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null;
    expect(dateInput).toBeTruthy();
    if (dateInput != null) {
      fireEvent.change(dateInput, { target: { value: '2021-01-01' } });
    }
    expect(onEligibilityRuleValueChange).toHaveBeenCalledWith('rule-2', '2021-01-01');
    expect(screen.getByText('Date must be in YYYY-MM-DD format.')).toBeTruthy();
  });

  it('disables save action while pending', () => {
    render(
      <RegistrationTypeDialog
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        open
        onOpenChange={vi.fn()}
        step="edit"
        onStepChange={vi.fn()}
        draft={createDraft()}
        onDraftChange={vi.fn()}
        eligibilityDrafts={[]}
        validationErrors={{}}
        membershipTypes={[]}
        isPending
        onAddEligibilityRule={vi.fn()}
        onRemoveEligibilityRule={vi.fn()}
        onEligibilityRuleTypeChange={vi.fn()}
        onEligibilityRuleValueChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
  });
});
