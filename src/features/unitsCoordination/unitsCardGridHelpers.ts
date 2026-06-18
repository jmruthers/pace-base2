export function unitCapacityPercent(memberCount: number, capacity: number | null | undefined): number | null {
  if (capacity == null || capacity <= 0) {
    return null;
  }
  return Math.min(100, Math.round((memberCount / capacity) * 100));
}

export function buildUnitMemberCountMap(rows: Array<{ unit_id: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.unit_id] = (counts[row.unit_id] ?? 0) + 1;
  }
  return counts;
}
