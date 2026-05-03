import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { defaultEligibilityRuleType } from '@/features/registrationSetup/shared';
import type { EligibilityRuleDraft, RegistrationTypeDraft } from '@/features/registrationSetup/types';
import type { DialogStep } from '../hooks/useRegistrationTypesPageController';

type RegistrationTypeScope = {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
};

type RegistrationTypeDialogState = {
  open: boolean;
  step: DialogStep;
  draft: RegistrationTypeDraft;
  isPending: boolean;
};

type RegistrationTypeValidationErrors = {
  name?: string;
  costDollars?: string;
  capacity?: string;
  eligibilityRules?: Record<string, string>;
};

type RegistrationTypeDialogData = {
  eligibilityDrafts: EligibilityRuleDraft[];
  validationErrors: RegistrationTypeValidationErrors;
  membershipTypes: Array<{ id: number; name: string }>;
};

type RegistrationTypeDialogActions = {
  onOpenChange: (open: boolean) => void;
  onStepChange: (step: DialogStep) => void;
  onDraftChange: (nextDraft: RegistrationTypeDraft) => void;
  onAddEligibilityRule: () => void;
  onRemoveEligibilityRule: (localId: string) => void;
  onEligibilityRuleTypeChange: (localId: string, ruleType: EligibilityRuleDraft['rule_type']) => void;
  onEligibilityRuleValueChange: (localId: string, value: string) => void;
  onSave: () => void;
};

type RegistrationTypeDialogProps =
  RegistrationTypeScope &
  RegistrationTypeDialogState &
  RegistrationTypeDialogData &
  RegistrationTypeDialogActions;

export function RegistrationTypeDialog(props: RegistrationTypeDialogProps) {
  return (
    <PagePermissionGuard pageName="registration-types" operation="update" scope={props.scope} fallback={null}>
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          props.onOpenChange(open);
          if (!open) {
            props.onStepChange('edit');
          }
        }}
      >
        <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{props.draft.id == null ? 'Create registration type' : 'Edit registration type'}</DialogTitle>
        </DialogHeader>

        {props.step === 'confirm' ? (
          <article className="grid gap-2">
            <h2>Save registration type?</h2>
            <p>Saving will replace all eligibility rules for this type. This cannot be undone.</p>
          </article>
        ) : (
          <article className="grid gap-3">
            <section className="grid gap-1">
              <Label htmlFor="registration-type-name">Name</Label>
              <Input
                id="registration-type-name"
                value={props.draft.name}
                onChange={(value) => props.onDraftChange({ ...props.draft, name: value })}
              />
              {props.validationErrors.name != null ? <small>{props.validationErrors.name}</small> : null}
            </section>

            <section className="grid gap-1">
              <Label htmlFor="registration-type-description">Description</Label>
              <Textarea
                id="registration-type-description"
                value={props.draft.description}
                onChange={(value) => props.onDraftChange({ ...props.draft, description: value })}
                rows={3}
              />
            </section>

            <section className="grid gap-1">
              <Label htmlFor="registration-type-eligibility-message">Eligibility message</Label>
              <Textarea
                id="registration-type-eligibility-message"
                value={props.draft.eligibility_message}
                onChange={(value) => props.onDraftChange({ ...props.draft, eligibility_message: value })}
                rows={2}
              />
            </section>

            <fieldset className="grid gap-3 border-0 p-0 md:grid-cols-2">
              <article className="grid gap-1">
                <Label htmlFor="registration-type-cost">Cost (AUD)</Label>
                <Input
                  id="registration-type-cost"
                  value={props.draft.costDollars}
                  onChange={(value) => props.onDraftChange({ ...props.draft, costDollars: value })}
                />
                {props.validationErrors.costDollars != null ? <small>{props.validationErrors.costDollars}</small> : null}
              </article>
              <article className="grid gap-1">
                <Label htmlFor="registration-type-capacity">Capacity</Label>
                <Input
                  id="registration-type-capacity"
                  value={props.draft.capacity}
                  onChange={(value) => props.onDraftChange({ ...props.draft, capacity: value })}
                />
                {props.validationErrors.capacity != null ? <small>{props.validationErrors.capacity}</small> : null}
              </article>
            </fieldset>

            <Alert>
              <AlertTitle>Eligibility rules</AlertTitle>
              <AlertDescription>
                Rules of different types are combined with AND — a member must satisfy all types. Multiple rules of the
                same type are combined with OR — a member need only satisfy one.
              </AlertDescription>
            </Alert>

            <section className="grid gap-2">
              {props.eligibilityDrafts.map((rule) => (
                <fieldset key={rule.localId} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
                  <Select
                    value={rule.rule_type}
                    onValueChange={(value) =>
                      props.onEligibilityRuleTypeChange(
                        rule.localId,
                        (value ?? defaultEligibilityRuleType()) as EligibilityRuleDraft['rule_type']
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership_type">Membership type</SelectItem>
                      <SelectItem value="dob_before">DOB before</SelectItem>
                      <SelectItem value="dob_after">DOB after</SelectItem>
                    </SelectContent>
                  </Select>

                  {rule.rule_type === 'membership_type' ? (
                    <Select
                      value={rule.value}
                      onValueChange={(value) => props.onEligibilityRuleValueChange(rule.localId, value ?? '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select membership type" />
                      </SelectTrigger>
                      <SelectContent>
                        {props.membershipTypes.map((membershipType) => (
                          <SelectItem key={membershipType.id} value={String(membershipType.id)}>
                            {membershipType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="date"
                      value={rule.value}
                      onChange={(value) => props.onEligibilityRuleValueChange(rule.localId, value)}
                    />
                  )}

                  <Button type="button" onClick={() => props.onRemoveEligibilityRule(rule.localId)}>
                    Remove
                  </Button>

                  {props.validationErrors.eligibilityRules?.[rule.localId] != null ? (
                    <small>{props.validationErrors.eligibilityRules[rule.localId]}</small>
                  ) : null}
                </fieldset>
              ))}
            </section>

            <section>
              <Button type="button" onClick={props.onAddEligibilityRule}>
                Add eligibility rule
              </Button>
            </section>
          </article>
        )}

        <DialogFooter className="text-right">
          {props.step === 'confirm' ? (
            <article className="grid gap-2 md:grid-cols-[auto_auto] md:justify-end">
              <Button type="button" onClick={() => props.onStepChange('edit')}>
                Cancel
              </Button>
              <Button type="button" onClick={props.onSave} disabled={props.isPending}>
                Save
              </Button>
            </article>
          ) : (
            <article className="grid gap-2 md:grid-cols-[auto_auto] md:justify-end">
              <Button type="button" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={props.onSave} disabled={props.isPending}>
                Save
              </Button>
            </article>
          )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </PagePermissionGuard>
  );
}
