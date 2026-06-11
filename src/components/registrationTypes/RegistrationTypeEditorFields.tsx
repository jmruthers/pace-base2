import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { Trash2 } from '@solvera/pace-core/icons';
import { defaultEligibilityRuleType } from '@/features/registrationSetup/draftMappers';
import { eligibilityRuleTypeLabel } from '@/features/registrationSetup/presentation';
import {
  REGISTRATION_PRE_SUBMISSION_CHECK_OPTIONS,
  togglePreSubmissionCheck,
  type RegistrationPreSubmissionCheckKey,
} from '@/features/registrationSetup/preSubmissionChecks';
import type { EligibilityRuleDraft, RegistrationTypeDraft } from '@/features/registrationSetup/types';

export type RegistrationTypeValidationErrors = {
  name?: string;
  costDollars?: string;
  capacity?: string;
  eligibilityRules?: Record<string, string>;
};

interface RegistrationTypeEditorFieldsProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  draft: RegistrationTypeDraft;
  onDraftChange: (nextDraft: RegistrationTypeDraft) => void;
  eligibilityDrafts: EligibilityRuleDraft[];
  validationErrors: RegistrationTypeValidationErrors;
  membershipTypes: Array<{ id: number; name: string }>;
  onAddEligibilityRule: () => void;
  onRemoveEligibilityRule: (localId: string) => void;
  onEligibilityRuleTypeChange: (localId: string, ruleType: EligibilityRuleDraft['rule_type']) => void;
  onEligibilityRuleValueChange: (localId: string, value: string) => void;
}

export function RegistrationTypeEditorFields(props: RegistrationTypeEditorFieldsProps) {
  return (
    <PagePermissionGuard
      pageName="RegistrationTypesPage"
      operation="update"
      scope={props.scope}
      fallback={null}
    >
    <section className="grid gap-3">
      <article className="grid gap-1">
        <Label htmlFor="registration-type-name">Name</Label>
        <Input
          id="registration-type-name"
          value={props.draft.name}
          onChange={(value) => props.onDraftChange({ ...props.draft, name: value })}
        />
        {props.validationErrors.name != null ? <small>{props.validationErrors.name}</small> : null}
      </article>

      <article className="grid gap-1">
        <Label htmlFor="registration-type-description">Description</Label>
        <Textarea
          id="registration-type-description"
          value={props.draft.description}
          onChange={(value) => props.onDraftChange({ ...props.draft, description: value })}
          rows={3}
        />
      </article>

      <article className="grid gap-1">
        <Label htmlFor="registration-type-eligibility-message">Eligibility message</Label>
        <Textarea
          id="registration-type-eligibility-message"
          value={props.draft.eligibility_message}
          onChange={(value) => props.onDraftChange({ ...props.draft, eligibility_message: value })}
          rows={2}
        />
      </article>

      <fieldset className="grid gap-3 border-0 p-0 md:grid-cols-2">
        <article className="grid gap-1">
          <Label htmlFor="registration-type-cost">Cost (AUD)</Label>
          <Input
            id="registration-type-cost"
            value={props.draft.costDollars}
            onChange={(value) => props.onDraftChange({ ...props.draft, costDollars: value })}
          />
          {props.validationErrors.costDollars != null ? (
            <small>{props.validationErrors.costDollars}</small>
          ) : null}
        </article>
        <article className="grid gap-1">
          <Label htmlFor="registration-type-capacity">Capacity</Label>
          <Input
            id="registration-type-capacity"
            value={props.draft.capacity}
            onChange={(value) => props.onDraftChange({ ...props.draft, capacity: value })}
          />
          {props.validationErrors.capacity != null ? (
            <small>{props.validationErrors.capacity}</small>
          ) : null}
        </article>
      </fieldset>

      <Label className="grid gap-1">
        Registration type active
        <Switch
          aria-label="Registration type active"
          checked={props.draft.is_active}
          onChange={(checked) => props.onDraftChange({ ...props.draft, is_active: checked })}
        />
      </Label>

      <article className="grid gap-2">
        <h3>Pre-submission checks</h3>
        <p>Participants must confirm these profile areas are current before the registration form opens.</p>
        {REGISTRATION_PRE_SUBMISSION_CHECK_OPTIONS.map((option) => (
          <Label
            key={option.key}
            htmlFor={`pre-submission-${option.key}`}
            className="grid grid-flow-col auto-cols-max items-center gap-2"
          >
            <Checkbox
              id={`pre-submission-${option.key}`}
              checked={props.draft.preSubmissionChecks.includes(option.key)}
              onChange={(checked) =>
                props.onDraftChange({
                  ...props.draft,
                  preSubmissionChecks: togglePreSubmissionCheck(
                    props.draft.preSubmissionChecks as RegistrationPreSubmissionCheckKey[],
                    option.key,
                    checked
                  ),
                })
              }
            />
            {option.label}
          </Label>
        ))}
      </article>

      <Alert className="grid gap-3">
        <AlertTitle>Eligibility rules</AlertTitle>
        <AlertDescription>
          Rules of different types are combined with AND — a member must satisfy all types. <br />
          Multiple rules of the same type are combined with OR — a member need only satisfy one.
        </AlertDescription>
        {props.eligibilityDrafts.length > 0 ? (
          <section className="grid gap-1">
            {props.eligibilityDrafts.map((rule, index) => (
              <fieldset
                key={rule.localId}
                className="grid gap-2 border-0 p-0 py-1 md:grid-cols-[1fr_1fr_auto] md:items-center"
              >
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
                    <SelectValue placeholder="Select rule type">
                      {eligibilityRuleTypeLabel(rule.rule_type)}
                    </SelectValue>
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
                      <SelectValue placeholder="Select membership type">
                        {props.membershipTypes.find((m) => String(m.id) === rule.value)?.name ?? null}
                      </SelectValue>
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

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Remove eligibility rule ${index + 1}`}
                  onClick={() => props.onRemoveEligibilityRule(rule.localId)}
                >
                  <Trash2 aria-hidden />
                </Button>

                {props.validationErrors.eligibilityRules?.[rule.localId] != null ? (
                  <small className="md:col-span-3">
                    {props.validationErrors.eligibilityRules[rule.localId]}
                  </small>
                ) : null}
              </fieldset>
            ))}
          </section>
        ) : null}
        <section>
          <Button type="button" onClick={props.onAddEligibilityRule}>
            Add eligibility rule
          </Button>
        </section>
      </Alert>
    </section>
    </PagePermissionGuard>
  );
}
