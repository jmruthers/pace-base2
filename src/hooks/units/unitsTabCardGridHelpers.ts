import type { UnitsTableRow } from '@/pages/units/unitsPageTypes';

export interface UnitFormValues {
  unit_number: string;
  unit_name: string;
  subcamp: string;
  contingent: string;
  parent_unit_id: string | null;
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function exportUnitsRowsToCsv(rows: UnitsTableRow[]): void {
  const header = ['unit_number', 'unit_name', 'subcamp', 'contingent', 'parent_unit_number'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const parentNumber =
      row.parent_unit_id != null
        ? rows.find((candidate) => candidate.id === row.parent_unit_id)?.unit_number ?? ''
        : '';
    lines.push(
      [
        String(row.unit_number),
        row.unit_name ?? '',
        row.subcamp ?? '',
        row.contingent ?? '',
        parentNumber === '' ? '' : String(parentNumber),
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'units.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export function parseUnitsImportRows(text: string): UnitsTableRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map(normalizeHeader);
  const unitNumberIndex = headers.indexOf('unit_number');
  if (unitNumberIndex < 0) {
    return [];
  }

  const unitNameIndex = headers.indexOf('unit_name');
  const subcampIndex = headers.indexOf('subcamp');
  const contingentIndex = headers.indexOf('contingent');
  const parentUnitNumberIndex = headers.indexOf('parent_unit_number');

  return lines.slice(1).map((line, index) => {
    const cells = line.split(',');
    const row: UnitsTableRow = {
      id: `import-${index}`,
      unit_number: Number.parseInt(cells[unitNumberIndex] ?? '', 10),
      unit_name: unitNameIndex >= 0 ? cells[unitNameIndex] ?? null : null,
      subcamp: subcampIndex >= 0 ? cells[subcampIndex] ?? null : null,
      contingent: contingentIndex >= 0 ? cells[contingentIndex] ?? null : null,
      parent_unit_id: null,
      parent_unit_label: '—',
      event_id: '',
      created_at: null,
      updated_at: null,
    };
    if (parentUnitNumberIndex >= 0) {
      (row as UnitsTableRow & { parent_unit_number?: string }).parent_unit_number =
        cells[parentUnitNumberIndex] ?? '';
    }
    return row;
  });
}
