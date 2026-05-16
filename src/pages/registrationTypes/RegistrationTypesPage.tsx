import { AccessDenied, PagePermissionGuard } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { RegistrationTypeDialog } from './components/RegistrationTypeDialog';
import { RegistrationTypesContent } from './components/RegistrationTypesContent';
import { RegistrationTypesHeader } from './components/RegistrationTypesHeader';
import { RequirementsDialog } from './components/RequirementsDialog';
import { useRegistrationTypesPageController } from './hooks/useRegistrationTypesPageController';

export function RegistrationTypesPage() {
  const controller = useRegistrationTypesPageController();

  return (
    <PagePermissionGuard
      pageName="registration-types"
      operation="read"
      scope={controller.scope}
      fallback={<AccessDenied />}
    >
      <main className="grid gap-4">
        <RegistrationTypesHeader
          selectedEventId={controller.selectedEventId}
          scope={controller.scope}
          onCreate={controller.openCreateDialog}
        />
        <RegistrationTypesContent
          selectedEventId={controller.selectedEventId}
          scope={controller.scope}
          listQuery={controller.listQuery}
          rows={controller.listRows}
          eligibilityCounts={controller.eligibilityCounts}
          activeOverrides={controller.activeOverrides}
          onEdit={controller.openEditDialog}
          onOpenRequirements={controller.openRequirementsDialog}
          onToggleActive={(row, checked) => void controller.handleToggleActive(row, checked)}
        />
      </main>

      <RegistrationTypeDialog
        scope={controller.scope}
        open={controller.typeDialogOpen}
        onOpenChange={controller.setTypeDialogOpen}
        step={controller.typeDialogStep}
        onStepChange={controller.setTypeDialogStep}
        draft={controller.typeDraft}
        onDraftChange={controller.setTypeDraft}
        eligibilityDrafts={controller.eligibilityDrafts}
        validationErrors={controller.typeValidationErrors}
        membershipTypes={controller.membershipTypesQuery.data ?? []}
        isPending={controller.upsertMutation.isPending}
        onAddEligibilityRule={controller.addEligibilityRule}
        onRemoveEligibilityRule={controller.removeEligibilityRule}
        onEligibilityRuleTypeChange={controller.updateEligibilityRuleType}
        onEligibilityRuleValueChange={controller.updateEligibilityRuleValue}
        onSave={() => void controller.saveType()}
      />

      <RequirementsDialog
        scope={controller.scope}
        open={controller.requirementsDialogOpen}
        onOpenChange={controller.setRequirementsDialogOpen}
        step={controller.requirementsDialogStep}
        onStepChange={controller.setRequirementsDialogStep}
        targetTypeName={controller.requirementsTargetType?.name ?? ''}
        state={{
          isLoading: controller.requirementsQuery.isLoading,
          errorMessage:
            controller.requirementsQuery.error != null
              ? NormalizeSupabaseError(controller.requirementsQuery.error).message
              : null,
          isPending: controller.upsertMutation.isPending,
        }}
        data={{
          rows: controller.requirementDraftRows,
          reviewingOrganisations: controller.reviewingOrgsQuery.data ?? [],
          designatedOrgErrors: controller.designatedOrgErrors,
          selectedTypeToAdd: controller.selectedRequirementTypeToAdd,
        }}
        actions={{
          onSelectedTypeToAddChange: controller.setSelectedRequirementTypeToAdd,
          onAdd: controller.addRequirement,
          onRemove: controller.removeRequirement,
          onMoveRequirement: controller.moveRequirement,
          onRequireAllGuardiansChange: controller.updateRequireAllGuardians,
          onReviewingOrgChange: controller.updateReviewingOrganisation,
          onSave: () => void controller.saveRequirements(),
        }}
      />
    </PagePermissionGuard>
  );
}
