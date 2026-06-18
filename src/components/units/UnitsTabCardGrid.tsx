import { useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Input,
  Label,
  LoadingSpinner,
  Progress,
  SaveActions,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { formatUnitDisplayLabel } from '@/features/unitsCoordination/unitsDisplayAndPreferenceHelpers';
import { unitCapacityPercent } from '@/features/unitsCoordination/unitsCardGridHelpers';
import type { UnitsPageController } from '@/hooks/units/useUnitsPageController';
import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';
import { exportUnitsRowsToCsv, parseUnitsImportRows, type UnitFormValues } from '@/hooks/units/unitsTabCardGridHelpers';

function buildEmptyFormValues(): UnitFormValues {
  return {
    unit_number: '',
    unit_name: '',
    subcamp: '',
    contingent: '',
    parent_unit_id: null,
  };
}

function rowToFormValues(row: UnitsTableRow): UnitFormValues {
  return {
    unit_number: String(row.unit_number),
    unit_name: row.unit_name ?? '',
    subcamp: row.subcamp ?? '',
    contingent: row.contingent ?? '',
    parent_unit_id: row.parent_unit_id,
  };
}

function formValuesToRowData(values: UnitFormValues): Partial<UnitsTableRow> {
  return {
    unit_number: values.unit_number as unknown as number,
    unit_name: values.unit_name,
    subcamp: values.subcamp,
    contingent: values.contingent,
    parent_unit_id: values.parent_unit_id,
  };
}

function ignoreHandledMutationRejection(): void {
  // Controller already surfaced the error via toast before rethrowing.
}

function UnitFormDialog({
  open,
  title,
  values,
  parentOptions,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  values: UnitFormValues;
  parentOptions: Array<{ value: string; label: string }>;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UnitFormValues) => void;
}) {
  const [draft, setDraft] = useState(values);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(values);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form<UnitFormValues>
            defaultValues={draft}
            onSubmit={(submitted) => {
              setDraft(submitted);
              onSubmit(submitted);
            }}
            className="grid gap-3"
          >
            <FormField<UnitFormValues>
              name="unit_number"
              label="Unit #"
              required
              render={({ field }) => (
                <Input
                  id="unit-number"
                  type="number"
                  value={(field.value as string | undefined) ?? ''}
                  onChange={(nextValue) => {
                    field.onChange(nextValue);
                    setDraft((current) => ({ ...current, unit_number: nextValue }));
                  }}
                  placeholder="1"
                  min={1}
                />
              )}
            />
            <FormField<UnitFormValues>
              name="unit_name"
              label="Unit Name"
              render={({ field }) => (
                <Input
                  id="unit-name"
                  value={(field.value as string | undefined) ?? ''}
                  onChange={(nextValue) => {
                    field.onChange(nextValue);
                    setDraft((current) => ({ ...current, unit_name: nextValue }));
                  }}
                  placeholder="Enter unit name"
                />
              )}
            />
            <FormField<UnitFormValues>
              name="subcamp"
              label="Subcamp"
              render={({ field }) => (
                <Input
                  id="unit-subcamp"
                  value={(field.value as string | undefined) ?? ''}
                  onChange={(nextValue) => {
                    field.onChange(nextValue);
                    setDraft((current) => ({ ...current, subcamp: nextValue }));
                  }}
                  placeholder="Enter subcamp"
                />
              )}
            />
            <FormField<UnitFormValues>
              name="contingent"
              label="Contingent"
              render={({ field }) => (
                <Input
                  id="unit-contingent"
                  value={(field.value as string | undefined) ?? ''}
                  onChange={(nextValue) => {
                    field.onChange(nextValue);
                    setDraft((current) => ({ ...current, contingent: nextValue }));
                  }}
                  placeholder="Enter contingent"
                />
              )}
            />
            <Label>
              <span>Parent Unit</span>
              <Select
                value={draft.parent_unit_id ?? '__none__'}
                onValueChange={(nextValue) => {
                  const nextParent = nextValue === '__none__' ? null : nextValue;
                  setDraft((current) => ({ ...current, parent_unit_id: nextParent }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          </Form>
        </DialogBody>
        <DialogFooter>
          <SaveActions
            onCancel={() => onOpenChange(false)}
            saveType="button"
            onSaveClick={() => onSubmit(draft)}
            saveDisabled={isPending}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnitsTabCardGrid({ ctl }: { ctl: UnitsPageController }) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<UnitsTableRow | null>(null);
  const [createValues, setCreateValues] = useState<UnitFormValues>(buildEmptyFormValues());

  const editParentOptions = useMemo(() => {
    if (editRow == null) {
      return ctl.unitOptions;
    }
    return ctl.unitOptions.filter((option) => option.value !== editRow.id);
  }, [ctl.unitOptions, editRow]);

  async function onImportFile(file: File) {
    const text = await file.text();
    const rows = parseUnitsImportRows(text);
    await ctl.handleImportUnits(rows);
  }

  if (ctl.unitsQuery.isLoading || ctl.memberCountsQuery.isLoading) {
    return (
      <article className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </article>
    );
  }

  if (ctl.unitsRows.length === 0) {
    return (
      <>
        <PagePermissionGuard pageName="UnitsPage" operation="create" scope={ctl.scope} fallback={null}>
          <section className="grid grid-flow-col auto-cols-max gap-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create unit
            </Button>
          </section>
        </PagePermissionGuard>
        <Card>
          <CardContent>
            <p>No units have been created for this event.</p>
          </CardContent>
        </Card>
        <UnitFormDialog
          open={createOpen}
          title="Create unit"
          values={createValues}
          parentOptions={ctl.unitOptions}
          isPending={ctl.createUnitMutation.isPending}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setCreateValues(buildEmptyFormValues());
            }
          }}
          onSubmit={(values) => {
            void ctl.handleCreateUnit(formValuesToRowData(values)).then(() => {
              setCreateOpen(false);
              setCreateValues(buildEmptyFormValues());
            }, ignoreHandledMutationRejection);
          }}
        />
      </>
    );
  }

  return (
    <>
      <section className="grid grid-flow-col auto-cols-max gap-2">
        <PagePermissionGuard pageName="UnitsPage" operation="create" scope={ctl.scope} fallback={null}>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create unit
          </Button>
          <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
            Import
          </Button>
        </PagePermissionGuard>
        <Button type="button" variant="outline" onClick={() => exportUnitsRowsToCsv(ctl.unitsRows)}>
          Export
        </Button>
      </section>
      <section className="sr-only">
        <Input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="Import units CSV"
          onChange={() => {
            const file = importInputRef.current?.files?.[0];
            if (file != null) {
              void onImportFile(file);
            }
            if (importInputRef.current != null) {
              importInputRef.current.value = '';
            }
          }}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ctl.unitsRows.map((unit) => {
          const memberCount = ctl.memberCountsByUnitId[unit.id] ?? 0;
          const capacity =
            typeof unit.capacity === 'number' && unit.capacity > 0 ? unit.capacity : null;
          const fillPercent = unitCapacityPercent(memberCount, capacity);

          return (
            <Card key={unit.id} className="grid h-full grid-rows-[1fr_auto]">
              <CardHeader className="grid content-start gap-2">
                <CardTitle>{formatUnitDisplayLabel(unit)}</CardTitle>
                <Badge variant="solid-sec-muted">{`${memberCount} members`}</Badge>
                {unit.subcamp != null && unit.subcamp.trim().length > 0 ? <p>{unit.subcamp}</p> : null}
                {unit.contingent != null && unit.contingent.trim().length > 0 ? <p>{unit.contingent}</p> : null}
                {unit.parent_unit_label !== '—' ? <p>{`Parent: ${unit.parent_unit_label}`}</p> : null}
                {capacity != null ? (
                  <>
                    <p>
                      <strong>{memberCount}</strong>
                      {` of ${capacity} members`}
                    </p>
                    {fillPercent != null ? (
                      <Progress value={fillPercent} max={100} aria-label="Unit capacity used" />
                    ) : null}
                  </>
                ) : null}
              </CardHeader>
              <CardFooter className="grid grid-flow-col auto-cols-max gap-2">
                <PagePermissionGuard pageName="UnitsPage" operation="update" scope={ctl.scope} fallback={null}>
                  <Button type="button" variant="outline" onClick={() => setEditRow(unit)}>
                    Edit
                  </Button>
                </PagePermissionGuard>
                <PagePermissionGuard pageName="UnitsPage" operation="delete" scope={ctl.scope} fallback={null}>
                  <Button type="button" variant="destructive" onClick={() => ctl.queueDeleteUnit(unit)}>
                    Delete
                  </Button>
                </PagePermissionGuard>
              </CardFooter>
            </Card>
          );
        })}
      </section>

      <UnitFormDialog
        open={createOpen}
        title="Create unit"
        values={createValues}
        parentOptions={ctl.unitOptions}
        isPending={ctl.createUnitMutation.isPending}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateValues(buildEmptyFormValues());
          }
        }}
        onSubmit={(values) => {
          void ctl.handleCreateUnit(formValuesToRowData(values)).then(() => {
            setCreateOpen(false);
            setCreateValues(buildEmptyFormValues());
          }, ignoreHandledMutationRejection);
        }}
      />

      <UnitFormDialog
        open={editRow != null}
        title="Edit unit"
        values={editRow != null ? rowToFormValues(editRow) : buildEmptyFormValues()}
        parentOptions={editParentOptions}
        isPending={ctl.updateUnitMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditRow(null);
          }
        }}
        onSubmit={(values) => {
          if (editRow == null) {
            return;
          }
          void ctl.handleUpdateUnit(editRow, formValuesToRowData(values)).then(() => {
            setEditRow(null);
          }, ignoreHandledMutationRejection);
        }}
      />
    </>
  );
}
