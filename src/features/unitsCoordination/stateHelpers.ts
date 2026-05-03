/* eslint-disable pace-core-compliance/max-named-exports */
import type {
  ActivityPreferenceRow,
  ActivitySessionRow,
  PersonReference,
  UnitAssignmentTableRow,
  UnitRoleAssignmentRow,
  UnitRow,
} from './types';

export interface UnitValidationResult {
  valid: boolean;
  message: string | null;
}

export function validateUnitNumber(value: string): UnitValidationResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Unit number is required.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'Unit number must be a positive integer.' };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { valid: false, message: 'Unit number must be a positive integer.' };
  }
  return { valid: true, message: null };
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRoleTitle(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveApplicantName(person: PersonReference | null): string {
  if (person == null) {
    return 'Unknown applicant';
  }
  const firstToken = normalizeOptionalText(person.preferred_name) ?? normalizeOptionalText(person.first_name);
  const lastToken = normalizeOptionalText(person.last_name);
  const fullName = [firstToken, lastToken].filter((part): part is string => part != null).join(' ').trim();
  if (fullName.length > 0) {
    return fullName;
  }
  const email = normalizeOptionalText(person.email);
  return email ?? 'Unknown applicant';
}

export function resolveApplicantEmail(person: PersonReference | null): string {
  return normalizeOptionalText(person?.email) ?? 'No email provided';
}

export function composeAssignmentsTableRows(
  approvedApplications: Array<{ id: string; status: string; person: PersonReference | null }>,
  assignments: UnitRoleAssignmentRow[]
): UnitAssignmentTableRow[] {
  const assignmentByApplicationId = new Map<string, UnitRoleAssignmentRow>();
  for (const assignment of assignments) {
    assignmentByApplicationId.set(assignment.application_id, assignment);
  }

  return approvedApplications.map((application) => {
    const assignment = assignmentByApplicationId.get(application.id) ?? null;
    return {
      id: application.id,
      application_id: application.id,
      applicant_name: resolveApplicantName(application.person),
      applicant_email: resolveApplicantEmail(application.person),
      application_status: application.status,
      assigned_role: assignment?.role_type?.role_title ?? null,
      role_assignment_id: assignment?.id ?? null,
      role_type_id: assignment?.role_type_id ?? null,
    };
  });
}

export function computeDescendantIds(units: UnitRow[], rootUnitId: string): Set<string> {
  const childrenByParentId = new Map<string, string[]>();
  for (const unit of units) {
    if (unit.parent_unit_id == null) {
      continue;
    }
    const children = childrenByParentId.get(unit.parent_unit_id) ?? [];
    children.push(unit.id);
    childrenByParentId.set(unit.parent_unit_id, children);
  }

  const excluded = new Set<string>([rootUnitId]);
  const stack = [rootUnitId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId == null) {
      continue;
    }
    const children = childrenByParentId.get(currentId) ?? [];
    for (const childId of children) {
      if (excluded.has(childId)) {
        continue;
      }
      excluded.add(childId);
      stack.push(childId);
    }
  }

  return excluded;
}

export function formatParentUnitLabel(parent: UnitRow | null | undefined): string {
  if (parent == null) {
    return '—';
  }
  const parentName = normalizeOptionalText(parent.unit_name);
  if (parentName == null) {
    return `${parent.unit_number}`;
  }
  return `${parent.unit_number} - ${parentName}`;
}

export function formatUnitDisplayLabel(unit: UnitRow): string {
  const name = normalizeOptionalText(unit.unit_name);
  if (name == null) {
    return `Unit ${unit.unit_number}`;
  }
  return `${unit.unit_number} - ${name}`;
}

export function formatSessionDisplayLabel(session: ActivitySessionRow): string {
  const name = normalizeOptionalText(session.session_name);
  if (name != null) {
    return name;
  }
  const shortId = session.id.slice(0, 8);
  return `Session ${shortId}`;
}

export function normalizePreferenceRanks(
  preferences: ActivityPreferenceRow[],
  editedPreferenceId?: string,
  preferredRank?: number
): ActivityPreferenceRow[] {
  const sorted = [...preferences].sort((left, right) => left.rank - right.rank);
  if (editedPreferenceId != null && preferredRank != null) {
    const targetIndex = sorted.findIndex((row) => row.id === editedPreferenceId);
    if (targetIndex >= 0) {
      const [moved] = sorted.splice(targetIndex, 1);
      const boundedRank = Math.max(1, Math.min(preferredRank, sorted.length + 1));
      sorted.splice(boundedRank - 1, 0, moved);
    }
  }
  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export function arePreferenceRanksContiguous(preferences: ActivityPreferenceRow[]): boolean {
  if (preferences.length === 0) {
    return false;
  }
  const sortedRanks = [...preferences].map((row) => row.rank).sort((left, right) => left - right);
  return sortedRanks.every((rank, index) => rank === index + 1);
}

export function hasDuplicateSessionPreference(preferences: ActivityPreferenceRow[]): boolean {
  const seen = new Set<string>();
  for (const preference of preferences) {
    if (seen.has(preference.session_id)) {
      return true;
    }
    seen.add(preference.session_id);
  }
  return false;
}
