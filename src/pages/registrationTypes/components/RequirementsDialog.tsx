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
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { allRequirementTypes, requirementTypeLabel } from '@/features/registrationSetup/shared';
import type { RequirementRuleDraft } from '@/features/registrationSetup/types';
import type { DialogStep } from '../hooks/useRegistrationTypesPageController';
import { RequirementConfigPanel } from './RequirementConfigPanel';

interface RequirementDialogData {
  rows: RequirementRuleDraft[];
  reviewingOrganisations: Array<{ id: string; name: string; display_name: string | null }>;
  designatedOrgErrors: Record<string, string>;
  selectedTypeToAdd: string;
}

interface RequirementDialogActions {
  onSelectedTypeToAddChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onMoveRequirement: (localId: string, direction: 'up' | 'down') => void;
  onRequireAllGuardiansChange: (localId: string, checked: boolean) => void;
  onReviewingOrgChange: (localId: string, value: string) => void;
  onSave: () => void;
}

interface RequirementDialogState {
  isLoading: boolean;
  errorMessage: string | null;
  isPending: boolean;
}

interface RequirementsDialogProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: DialogStep;
  onStepChange: (step: DialogStep) => void;
  targetTypeName: string;
  state: RequirementDialogState;
  data: RequirementDialogData;
  actions: RequirementDialogActions;
}

interface RequirementRowProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  rule: RequirementRuleDraft;
  index: number;
  rowCount: number;
  reviewingOrganisations: Array<{ id: string; name: string; display_name: string | null }>;
  designatedOrgError: string | undefined;
  onRemove: (localId: string) => void;
  onMoveRequirement: (localId: string, direction: 'up' | 'down') => void;
  onRequireAllGuardiansChange: (localId: string, checked: boolean) => void;
  onReviewingOrgChange: (localId: string, value: string) => void;
}

function RequirementRow(props: RequirementRowProps) {
  return (
    <article className="grid gap-2 rounded-md border p-3">
      <header className="grid gap-2 md:grid-cols-[auto_auto_auto_1fr_auto] md:items-center">
        <p>{props.index + 1}</p>
        <Button
          type="button"
          aria-label={`Move requirement ${props.index + 1} up`}
          disabled={props.index === 0}
          onClick={() => props.onMoveRequirement(props.rule.localId, 'up')}
        >
          Up
        </Button>
        <Button
          type="button"
          aria-label={`Move requirement ${props.index + 1} down`}
          disabled={props.index >= props.rowCount - 1}
          onClick={() => props.onMoveRequirement(props.rule.localId, 'down')}
        >
          Down
        </Button>
        <p>{requirementTypeLabel(props.rule.check_type)}</p>
        <Button type="button" onClick={() => props.onRemove(props.rule.localId)}>
          Remove
        </Button>
      </header>
      <RequirementConfigPanel
        scope={props.scope}
        rule={props.rule}
        reviewingOrganisations={props.reviewingOrganisations}
        designatedOrgError={props.designatedOrgError}
        onRequireAllGuardiansChange={(checked) =>
          props.onRequireAllGuardiansChange(props.rule.localId, checked)
        }
        onReviewingOrgChange={(value) => props.onReviewingOrgChange(props.rule.localId, value)}
      />
    </article>
  );
}

export function RequirementsDialog(props: RequirementsDialogProps) {
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
          <DialogTitle>{`Requirements — ${props.targetTypeName}`}</DialogTitle>
        </DialogHeader>

        {props.step === 'confirm' ? (
          <article className="grid gap-2">
            <h2>Save requirements?</h2>
            <p>Saving will replace all requirements for this type. This cannot be undone.</p>
          </article>
        ) : props.state.isLoading ? (
          <article className="grid min-h-[24vh] place-items-center">
            <LoadingSpinner />
          </article>
        ) : props.state.errorMessage != null ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{props.state.errorMessage}</AlertDescription>
          </Alert>
        ) : (
          <article className="grid gap-3">
            <section className="grid gap-2">
              {props.data.rows.map((rule, index) => (
                <RequirementRow
                  key={rule.localId}
                  scope={props.scope}
                  rule={rule}
                  index={index}
                  rowCount={props.data.rows.length}
                  reviewingOrganisations={props.data.reviewingOrganisations}
                  designatedOrgError={props.data.designatedOrgErrors[rule.localId]}
                  onRemove={props.actions.onRemove}
                  onMoveRequirement={props.actions.onMoveRequirement}
                  onRequireAllGuardiansChange={props.actions.onRequireAllGuardiansChange}
                  onReviewingOrgChange={props.actions.onReviewingOrgChange}
                />
              ))}
            </section>

            <section className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Select
                value={props.data.selectedTypeToAdd}
                onValueChange={(value) => props.actions.onSelectedTypeToAddChange(value ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requirement type" />
                </SelectTrigger>
                <SelectContent>
                  {allRequirementTypes().map((checkType) => (
                    <SelectItem key={checkType} value={checkType}>
                      {requirementTypeLabel(checkType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={props.actions.onAdd}>
                Add
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
              <Button
                type="button"
                onClick={props.actions.onSave}
                disabled={props.state.isPending || props.state.isLoading || props.state.errorMessage != null}
              >
                Save requirements
              </Button>
            </article>
          ) : (
            <article className="grid gap-2 md:grid-cols-[auto_auto] md:justify-end">
              <Button type="button" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={props.actions.onSave}
                disabled={props.state.isPending || props.state.isLoading || props.state.errorMessage != null}
              >
                Save requirements
              </Button>
            </article>
          )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </PagePermissionGuard>
  );
}
