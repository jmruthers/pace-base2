// @vitest-environment jsdom

import { createElement } from 'react';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RequirementRuleDraft } from '@/features/registrationSetup/types';
import { RequirementConfigPanel } from './RequirementConfigPanel';

vi.mock('@solvera/pace-core/rbac', () => ({
  PagePermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@solvera/pace-core/components', () => ({
  Checkbox: ({ checked, onChange }: { checked?: boolean; onChange?: (checked: boolean) => void }) =>
    createElement('input', {
      type: 'checkbox',
      'aria-label': 'Require approval from all linked guardians',
      checked: checked === true,
      onChange: (event: Event) => onChange?.((event.target as HTMLInputElement).checked),
    }),
  Label: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) =>
    createElement(
      'select',
      {
        'aria-label': 'Reviewing organisation',
        value: value ?? '',
        onChange: (event: Event) => onValueChange?.((event.target as HTMLSelectElement).value),
      },
      children
    ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder ?? 'Select reviewing organisation'}</option>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

function createRule(checkType: RequirementRuleDraft['check_type']): RequirementRuleDraft {
  return {
    localId: 'req-1',
    id: 'req-1',
    check_type: checkType,
    sort_order: 0,
    is_automated: false,
    config: null,
  };
}

describe('RequirementConfigPanel', () => {
  it('renders guardian approval config and toggles require-all callback', async () => {
    const user = userEvent.setup();
    const onRequireAllGuardiansChange = vi.fn();
    render(
      <RequirementConfigPanel
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        rule={{ ...createRule('guardian_approval'), config: { require_all_guardians: false } }}
        reviewingOrganisations={[]}
        designatedOrgError={undefined}
        onRequireAllGuardiansChange={onRequireAllGuardiansChange}
        onReviewingOrgChange={vi.fn()}
      />
    );

    expect(screen.getByText(/requires approval from a parent or guardian/i)).toBeTruthy();
    await user.click(screen.getByLabelText('Require approval from all linked guardians'));
    expect(onRequireAllGuardiansChange).toHaveBeenCalledWith(true);
  });

  it('renders designated organisation select and error message', async () => {
    const user = userEvent.setup();
    const onReviewingOrgChange = vi.fn();
    render(
      <RequirementConfigPanel
        scope={{ organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' }}
        rule={createRule('designated_org_review')}
        reviewingOrganisations={[{ id: 'org-child-1', name: 'Child', display_name: 'Child Team' }]}
        designatedOrgError="Select a reviewing organisation"
        onRequireAllGuardiansChange={vi.fn()}
        onReviewingOrgChange={onReviewingOrgChange}
      />
    );

    await user.selectOptions(screen.getByLabelText('Reviewing organisation'), 'org-child-1');
    expect(onReviewingOrgChange).toHaveBeenCalledWith('org-child-1');
    expect(screen.getByText('Select a reviewing organisation')).toBeTruthy();
  });

  it('renders informational copy for other check types', () => {
    const baseProps = {
      scope: { organisationId: 'org-1', eventId: 'event-1', appId: 'base-app' },
      reviewingOrganisations: [],
      designatedOrgError: undefined,
      onRequireAllGuardiansChange: vi.fn(),
      onReviewingOrgChange: vi.fn(),
    };

    const { rerender } = render(<RequirementConfigPanel {...baseProps} rule={createRule('home_leader_approval')} />);
    expect(screen.getByText(/home leader/i)).toBeTruthy();

    rerender(<RequirementConfigPanel {...baseProps} rule={createRule('referee')} />);
    expect(screen.getByText(/requires a referee/i)).toBeTruthy();

    rerender(<RequirementConfigPanel {...baseProps} rule={createRule('event_approval')} />);
    expect(screen.getByText(/manual review by an event coordinator/i)).toBeTruthy();

    rerender(<RequirementConfigPanel {...baseProps} rule={createRule('payment')} />);
    expect(screen.getByText(/requires payment/i)).toBeTruthy();
  });
});
