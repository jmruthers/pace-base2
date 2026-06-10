import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  LoadingSpinner,
} from '@solvera/pace-core/components';
import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { ApprovalWorkflowSection } from '@/components/registrationTypes/ApprovalWorkflowSection';
import { RegistrationTypeEditorFields } from '@/components/registrationTypes/RegistrationTypeEditorFields';
import type { RegistrationTypeBuilderShell } from '@/hooks/registrationTypes/useRegistrationTypeBuilderShell';
import { useCombinedRegistrationBuilder } from '@/hooks/registrationTypes/useRegistrationTypeBuilderController';
import { useRegistrationTypeBuilderShell } from '@/hooks/registrationTypes/useRegistrationTypeBuilderShell';

export function RegistrationTypeBuilderPage() {
  return <RegistrationTypeBuilderPageContent />;
}

function RegistrationTypeBuilderFormBody({ shell }: { shell: RegistrationTypeBuilderShell }) {
  const navigate = useNavigate();
  const controller = useCombinedRegistrationBuilder(shell);

  const requirementsError =
    controller.requirementsQuery.error != null
      ? NormalizeSupabaseError(controller.requirementsQuery.error).message
      : null;

  return (
    <>
      <Card>
        <CardContent className="grid gap-4">
          <RegistrationTypeEditorFields
            scope={controller.scope}
            draft={controller.typeDraft}
            onDraftChange={controller.setTypeDraft}
            eligibilityDrafts={controller.eligibilityDrafts}
            validationErrors={controller.typeValidationErrors}
            membershipTypes={controller.membershipTypesQuery.data ?? []}
            onAddEligibilityRule={controller.addEligibilityRule}
            onRemoveEligibilityRule={controller.removeEligibilityRule}
            onEligibilityRuleTypeChange={controller.updateEligibilityRuleType}
            onEligibilityRuleValueChange={controller.updateEligibilityRuleValue}
          />
          <fieldset className="border-0 p-0 text-right">
            <Button type="button" onClick={() => navigate('/registration-types')}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void controller.saveType()}
              disabled={controller.upsertMutation.isPending}
            >
              Save
            </Button>
          </fieldset>
        </CardContent>
      </Card>

      <ApprovalWorkflowSection
        scope={controller.scope}
        disabled={!controller.workflowEnabled}
        isLoading={controller.workflowEnabled && controller.requirementsQuery.isLoading}
        errorMessage={controller.workflowEnabled ? requirementsError : null}
        isPending={controller.upsertMutation.isPending}
        rows={controller.requirementDraftRows}
        reviewingOrganisations={controller.reviewingOrgsQuery.data ?? []}
        reviewingOrganisationsLoading={controller.reviewingOrgsQuery.isLoading}
        reviewingOrganisationsError={
          controller.reviewingOrgsQuery.error != null
            ? NormalizeSupabaseError(controller.reviewingOrgsQuery.error).message
            : null
        }
        designatedOrgErrors={controller.designatedOrgErrors}
        selectedTypeToAdd={controller.selectedRequirementTypeToAdd}
        onSelectedTypeToAddChange={controller.setSelectedRequirementTypeToAdd}
        onAdd={controller.addRequirement}
        onRemove={controller.removeRequirement}
        onReorderRequirement={controller.reorderRequirement}
        onRequireAllGuardiansChange={controller.updateRequireAllGuardians}
        onReviewingOrgChange={controller.updateReviewingOrganisation}
        onSave={() => void controller.saveWorkflow()}
      />
    </>
  );
}

function RegistrationTypeBuilderPageContent() {
  const shell = useRegistrationTypeBuilderShell();

  const pageTitle = !shell.isEditMode ? 'Create registration type' : 'Edit registration type';

  const readyForDraftForm =
    shell.selectedEventId != null &&
    !(shell.isEditMode && shell.listQuery.isLoading) &&
    !shell.unknownTypeId;

  return (
    <PagePermissionGuard
      pageName="RegistrationTypesPage"
      operation="update"
      scope={shell.scope}
      fallback={<AccessDenied />}
    >
      <main className="grid gap-4">
        <header className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <section className="grid gap-1">
            <h1>{pageTitle}</h1>
          </section>
        </header>

        {shell.selectedEventId == null ? (
          <Card>
            <CardContent>
              <p>Select an event from the header before creating or editing a registration type.</p>
            </CardContent>
          </Card>
        ) : shell.isEditMode && shell.listQuery.isLoading ? (
          <article className="grid min-h-[30vh] place-items-center">
            <LoadingSpinner />
          </article>
        ) : shell.unknownTypeId ? (
          <section className="grid gap-3">
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Registration type not found for this event.</AlertDescription>
            </Alert>
            <Link to="/registration-types">Back to registration types</Link>
          </section>
        ) : readyForDraftForm ? (
          <RegistrationTypeBuilderFormBody
            key={shell.registrationTypeIdFromUrl ?? 'create'}
            shell={shell}
          />
        ) : null}
      </main>
    </PagePermissionGuard>
  );
}
