import {
  CSS,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  SortableContext,
  closestCenter,
  sortableKeyboardCoordinates,
  useSensor,
  useSensors,
  useSortable,
  verticalListSortingStrategy,
  type DragEndEvent,
} from '@solvera/pace-core/forms';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { GripVertical, Trash2 } from '@solvera/pace-core/icons';
import { allRequirementTypes, requirementTypeLabel } from '@/features/registrationSetup/presentation';
import type { RequirementCheckType, RequirementRuleDraft } from '@/features/registrationSetup/types';
import { RequirementConfigPanel } from './RequirementConfigPanel';

const WORKFLOW_TABLE_GRID = 'grid-cols-[2.5rem_minmax(0,1.25fr)_minmax(0,2fr)_2.5rem]';
const WORKFLOW_TABLE_GAP = 'gap-x-3';
const WORKFLOW_TABLE_ROW = `grid ${WORKFLOW_TABLE_GRID} ${WORKFLOW_TABLE_GAP} items-start px-3`;

interface ApprovalWorkflowSectionProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  disabled: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  isPending: boolean;
  rows: RequirementRuleDraft[];
  reviewingOrganisations: Array<{ id: string; name: string; display_name: string | null }>;
  reviewingOrganisationsLoading: boolean;
  reviewingOrganisationsError: string | null;
  designatedOrgErrors: Record<string, string>;
  selectedTypeToAdd: string;
  onSelectedTypeToAddChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onReorderRequirement: (activeLocalId: string, overLocalId: string | null) => void;
  onRequireAllGuardiansChange: (localId: string, checked: boolean) => void;
  onReviewingOrgChange: (localId: string, value: string) => void;
  onSave: () => void;
}

interface SortableWorkflowRowProps {
  scope: { organisationId: string | null; eventId: string | null; appId?: string };
  rule: RequirementRuleDraft;
  index: number;
  isPending: boolean;
  reviewingOrganisations: Array<{ id: string; name: string; display_name: string | null }>;
  reviewingOrganisationsLoading: boolean;
  reviewingOrganisationsError: string | null;
  designatedOrgError: string | undefined;
  onRemove: (localId: string) => void;
  onRequireAllGuardiansChange: (localId: string, checked: boolean) => void;
  onReviewingOrgChange: (localId: string, value: string) => void;
}

function SortableWorkflowRow(props: SortableWorkflowRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.rule.localId,
    disabled: props.isPending,
  });

  const style =
    isDragging && transform != null
      ? {
          transform: CSS.Transform.toString(transform),
          transition,
        }
      : transition != null
        ? { transition }
        : undefined;

  const rowLabel = `Approval step ${props.index + 1}`;

  return (
    <article
      ref={setNodeRef}
      // @dnd-kit sortable applies transform on the registered node (see pace-core WorkflowFormFieldEditor).
      // eslint-disable-next-line pace-core-compliance/no-inline-styles -- required for drag reorder positioning
      style={style}
      className={isDragging ? 'border-b border-border opacity-80 last:border-b-0' : 'border-b border-border last:border-b-0'}
    >
      <section className={`${WORKFLOW_TABLE_ROW} py-2`} aria-label={rowLabel}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={props.isPending}
          aria-label={`Reorder ${rowLabel}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden />
        </Button>

        <p>{requirementTypeLabel(props.rule.check_type)}</p>

        <RequirementConfigPanel
          scope={props.scope}
          rule={props.rule}
          reviewingOrganisations={props.reviewingOrganisations}
          reviewingOrganisationsLoading={props.reviewingOrganisationsLoading}
          reviewingOrganisationsError={props.reviewingOrganisationsError}
          designatedOrgError={props.designatedOrgError}
          layout="table"
          onRequireAllGuardiansChange={(checked) =>
            props.onRequireAllGuardiansChange(props.rule.localId, checked)
          }
          onReviewingOrgChange={(value) => props.onReviewingOrgChange(props.rule.localId, value)}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={props.isPending}
          className="justify-self-center"
          aria-label={`Remove ${rowLabel}`}
          onClick={() => props.onRemove(props.rule.localId)}
        >
          <Trash2 aria-hidden />
        </Button>
      </section>
    </article>
  );
}

function WorkflowTableHeader() {
  return (
    <header className={`${WORKFLOW_TABLE_ROW} border-b border-border py-2 items-center`}>
      <span aria-hidden />
      <span>Step</span>
      <span>Configuration</span>
      <span className="sr-only">Remove</span>
    </header>
  );
}

export function ApprovalWorkflowSection(props: ApprovalWorkflowSectionProps) {
  const sortableIds = props.rows.map((row) => row.localId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) {
      return;
    }
    props.onReorderRequirement(String(active.id), String(over.id));
  };

  return (
    <PagePermissionGuard
      pageName="registration-types"
      operation="update"
      scope={props.scope}
      fallback={null}
    >
    <Card>
      <CardHeader>
        <CardTitle>Approval workflow</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {props.disabled ? (
          <p>Save the registration type first to configure the approval workflow.</p>
        ) : props.isLoading ? (
          <article className="grid min-h-[24vh] place-items-center">
            <LoadingSpinner />
          </article>
        ) : props.errorMessage != null ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{props.errorMessage}</AlertDescription>
          </Alert>
        ) : (
          <>
            <section className="min-w-0">
              {props.rows.length > 0 ? <WorkflowTableHeader /> : null}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {props.rows.map((rule, index) => (
                    <SortableWorkflowRow
                      key={rule.localId}
                      scope={props.scope}
                      rule={rule}
                      index={index}
                      isPending={props.isPending}
                      reviewingOrganisations={props.reviewingOrganisations}
                      reviewingOrganisationsLoading={props.reviewingOrganisationsLoading}
                      reviewingOrganisationsError={props.reviewingOrganisationsError}
                      designatedOrgError={props.designatedOrgErrors[rule.localId]}
                      onRemove={props.onRemove}
                      onRequireAllGuardiansChange={props.onRequireAllGuardiansChange}
                      onReviewingOrgChange={props.onReviewingOrgChange}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </section>

            <fieldset className="grid w-full gap-3 border-0 p-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Label className="grid min-w-0 gap-1">
                <span>Add approval step</span>
                <Select
                  positionMode="fixed"
                  value={props.selectedTypeToAdd}
                  onValueChange={(value) => props.onSelectedTypeToAddChange(value ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select step type">
                      {props.selectedTypeToAdd.length > 0
                        ? requirementTypeLabel(props.selectedTypeToAdd as RequirementCheckType)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allRequirementTypes().map((checkType) => (
                      <SelectItem key={checkType} value={checkType}>
                        {requirementTypeLabel(checkType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
              <Button type="button" onClick={props.onAdd} disabled={props.isPending}>
                Add step
              </Button>
            </fieldset>
          </>
        )}
      </CardContent>
      {!props.disabled && !props.isLoading && props.errorMessage == null ? (
        <CardFooter className="text-right">
          <Button
            type="button"
            onClick={props.onSave}
            disabled={props.isPending || props.isLoading || props.errorMessage != null}
          >
            Save
          </Button>
        </CardFooter>
      ) : null}
    </Card>
    </PagePermissionGuard>
  );
}
