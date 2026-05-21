import type { ImportSummary } from '@solvera/pace-core/components';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import type { UnitRow } from '@/features/unitsCoordination/types';
import {
  normalizeOptionalText,
  validateUnitNumber,
} from '@/features/unitsCoordination/unitsValidationHelpers';
import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';

export function unitsEventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

export function parseUnitNumberFromInput(value: unknown): number {
  const validated = validateUnitNumber(String(value ?? ''));
  if (!validated.valid) {
    throw new Error(validated.message ?? 'Unit number is invalid.');
  }
  return Number.parseInt(String(value), 10);
}

export function parseParentUnitId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

/** Bulk import CSV rows → create units. Mutates `unitsByNumber` with successful creates for parent resolution. */
export async function importUnitsRowsFromCsv(
  rows: UnitsTableRow[],
  selectedEventId: string | null,
  existingUnits: UnitRow[],
  createUnit: (vars: {
    eventId: string;
    unitNumber: number;
    unitName: string | null;
    subcamp: string | null;
    contingent: string | null;
    parentUnitId: string | null;
  }) => Promise<{ id: string; unit_number: number; parent_unit_id: string | null } | null>
): Promise<ImportSummary> {
  if (selectedEventId == null) {
    return {
      successCount: 0,
      totalCount: rows.length,
      failedCount: rows.length,
      failedRows: rows.map((_, index) => ({
        row: index + 1,
        reason: 'Select an event before importing units.',
      })),
    };
  }
  let successCount = 0;
  const failedRows: Array<{ row: number; reason: string }> = [];
  const unitsByNumber = new Map<number, UnitRow>();
  for (const unit of existingUnits) {
    unitsByNumber.set(unit.unit_number, unit);
  }

  for (const [index, rawRow] of rows.entries()) {
    try {
      const unitNumber = parseUnitNumberFromInput(rawRow.unit_number);
      const parentUnitNumberRaw = String(
        (rawRow as unknown as { parent_unit_number?: unknown }).parent_unit_number ?? ''
      ).trim();
      const parentUnitNumber =
        parentUnitNumberRaw.length > 0 ? Number.parseInt(parentUnitNumberRaw, 10) : null;
      const parentUnitId =
        parentUnitNumber == null || Number.isNaN(parentUnitNumber)
          ? null
          : unitsByNumber.get(parentUnitNumber)?.id ?? null;

      const createdUnit = await createUnit({
        eventId: selectedEventId,
        unitNumber,
        unitName: normalizeOptionalText(String(rawRow.unit_name ?? '')),
        subcamp: normalizeOptionalText(String(rawRow.subcamp ?? '')),
        contingent: normalizeOptionalText(String(rawRow.contingent ?? '')),
        parentUnitId,
      });
      if (createdUnit != null) {
        unitsByNumber.set(unitNumber, {
          id: createdUnit.id,
          unit_number: createdUnit.unit_number,
          unit_name: normalizeOptionalText(String(rawRow.unit_name ?? '')),
          subcamp: normalizeOptionalText(String(rawRow.subcamp ?? '')),
          contingent: normalizeOptionalText(String(rawRow.contingent ?? '')),
          parent_unit_id: createdUnit.parent_unit_id,
          event_id: selectedEventId,
          created_at: null,
          updated_at: null,
        });
      }
      successCount += 1;
    } catch (error) {
      failedRows.push({
        row: index + 1,
        reason: NormalizeSupabaseError(error).message,
      });
    }
  }

  return {
    successCount,
    totalCount: rows.length,
    failedCount: failedRows.length,
    failedRows,
  };
}
