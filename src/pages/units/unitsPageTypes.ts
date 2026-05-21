import type { UnitRow } from '@/features/unitsCoordination/types';

export interface UnitsTableRow extends UnitRow {
  parent_unit_label: string;
}
