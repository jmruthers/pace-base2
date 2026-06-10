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

function reviewingOrganisationLabel(
  organisations: Array<{ id: string; name: string; display_name: string | null }>,
  reviewingOrgId: unknown
): string | null {
  if (typeof reviewingOrgId !== 'string' || reviewingOrgId.length === 0) {
    return null;
  }
  const organisation = organisations.find((entry) => entry.id === reviewingOrgId);
  return organisation?.display_name ?? organisation?.name ?? null;
}

interface RequirementConfigPanelProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  rule: RequirementRuleDraft;
  reviewingOrganisations: Array<{ id: string; name: string; display_name: string | null }>;
  reviewingOrganisationsLoading?: boolean;
  reviewingOrganisationsError?: string | null;
  designatedOrgError: string | undefined;
  onRequireAllGuardiansChange: (checked: boolean) => void;
  onReviewingOrgChange: (value: string) => void;
  layout?: 'default' | 'table';
}

export function RequirementConfigPanel(props: RequirementConfigPanelProps) {
  const layout = props.layout ?? 'default';

  return (
    <PagePermissionGuard pageName="RegistrationTypesPage" operation="update" scope={props.scope} fallback={null}>
      {props.rule.check_type === 'guardian_approval' ? (
        layout === 'table' ? (
          <section className="grid min-w-0 gap-2">
            <p>
              An email will be sent to the Parent/Guardian linked to the member&apos;s profile.
            </p>
            <Label
              htmlFor={`require-all-guardians-${props.rule.localId}`}
              className="grid min-w-0 justify-items-start gap-1"
            >
              <span>Require approval from all linked guardians</span>
              <Checkbox
                id={`require-all-guardians-${props.rule.localId}`}
                className="w-fit"
                checked={Boolean(props.rule.config?.require_all_guardians)}
                onChange={props.onRequireAllGuardiansChange}
              />
            </Label>
          </section>
        ) : (
          <section className="grid gap-2">
            <p>
              This check requires approval from a parent or guardian. An email will be sent to the Parent/Guardian
              linked to the member&apos;s profile.
            </p>
            <fieldset className="grid gap-1 border-0 p-0 md:grid-cols-[1fr_auto] md:items-center">
              <Label>Require approval from all linked guardians</Label>
              <Checkbox
                checked={Boolean(props.rule.config?.require_all_guardians)}
                onChange={props.onRequireAllGuardiansChange}
              />
            </fieldset>
          </section>
        )
      ) : props.rule.check_type === 'designated_org_review' ? (
        layout === 'table' ? (
          <section className="grid min-w-0 gap-2">
            <p>Review is completed by the selected organisation.</p>
            <article className="grid min-w-0 gap-1">
              <Label>Reviewing organisation</Label>
              {props.reviewingOrganisationsLoading ? (
                <p>Loading reviewing organisations…</p>
              ) : props.reviewingOrganisationsError != null ? (
                <p>{props.reviewingOrganisationsError}</p>
              ) : props.reviewingOrganisations.length === 0 ? (
                <p>
                  No reviewing organisations are available for this event. The list only includes
                  active organisations below the event&apos;s host in your organisation tree — not
                  the host itself. Add or activate those sub-organisations in TEAM, then refresh this
                  page.
                </p>
              ) : (
                <Select
                  positionMode="fixed"
                  value={
                    typeof props.rule.config?.reviewing_org_id === 'string'
                      ? props.rule.config.reviewing_org_id
                      : ''
                  }
                  onValueChange={(value) => props.onReviewingOrgChange(value ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reviewing organisation">
                      {reviewingOrganisationLabel(
                        props.reviewingOrganisations,
                        props.rule.config?.reviewing_org_id
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {props.reviewingOrganisations.map((organisation) => (
                      <SelectItem key={organisation.id} value={organisation.id}>
                        {organisation.display_name ?? organisation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {props.designatedOrgError != null ? <small>{props.designatedOrgError}</small> : null}
            </article>
          </section>
        ) : (
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
        )
      ) : props.rule.check_type === 'home_leader_approval' ? (
        <p>Requires approval from the member&apos;s home leader before the application can proceed.</p>
      ) : props.rule.check_type === 'referee' ? (
        <p>
          {layout === 'table'
            ? 'The referee receives a link by email to complete their response.'
            : 'Requires a referee from the next level (or higher) in the organisation tree.'}
        </p>
      ) : props.rule.check_type === 'event_approval' ? (
        <p>Requires manual review by an event coordinator.</p>
      ) : (
        <p>Requires payment for the event to be successfully processed.</p>
      )}
    </PagePermissionGuard>
  );
}
