import {
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import type { RequirementRuleDraft } from '@/features/registrationSetup/types';

interface RequirementConfigPanelProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  rule: RequirementRuleDraft;
  reviewingOrganisations: Array<{ id: string; name: string; display_name: string | null }>;
  designatedOrgError: string | undefined;
  onRequireAllGuardiansChange: (checked: boolean) => void;
  onReviewingOrgChange: (value: string) => void;
}

export function RequirementConfigPanel(props: RequirementConfigPanelProps) {
  return (
    <PagePermissionGuard pageName="registration-types" operation="update" scope={props.scope} fallback={null}>
      {props.rule.check_type === 'guardian_approval' ? (
        <section className="grid gap-2">
          <p>
            This check requires approval from a parent or guardian. An email will be sent to the Parent/Guardian linked
            to the member&apos;s profile.
          </p>
          <fieldset className="grid gap-1 border-0 p-0 md:grid-cols-[1fr_auto] md:items-center">
            <Label>Require approval from all linked guardians</Label>
            <Checkbox
              checked={Boolean(props.rule.config?.require_all_guardians)}
              onChange={props.onRequireAllGuardiansChange}
            />
          </fieldset>
        </section>
      ) : props.rule.check_type === 'designated_org_review' ? (
        <section className="grid gap-2">
          <p>This check requires review by the designated organisation.</p>
          <Label>Reviewing organisation</Label>
          <Select
            value={typeof props.rule.config?.reviewing_org_id === 'string' ? props.rule.config.reviewing_org_id : ''}
            onValueChange={(value) => props.onReviewingOrgChange(value ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reviewing organisation" />
            </SelectTrigger>
            <SelectContent>
              {props.reviewingOrganisations.map((organisation) => (
                <SelectItem key={organisation.id} value={organisation.id}>
                  {organisation.display_name ?? organisation.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {props.designatedOrgError != null ? <small>{props.designatedOrgError}</small> : null}
        </section>
      ) : props.rule.check_type === 'home_leader_approval' ? (
        <p>This check requires approval from the member&apos;s home leader before the application can proceed.</p>
      ) : props.rule.check_type === 'referee' ? (
        <p>
          This check requires a referee from the next level (or higher) in the organisation tree. The referee will
          receive a link by email to complete their response.
        </p>
      ) : props.rule.check_type === 'event_approval' ? (
        <p>This check requires manual review by an event coordinator.</p>
      ) : (
        <p>This check requires payment for the event to be successfully processed.</p>
      )}
    </PagePermissionGuard>
  );
}
