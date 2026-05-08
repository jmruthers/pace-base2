import { formatDateTime } from '@solvera/pace-core/utils';
import type {
  ApplicationCheckRow,
  ApplicationQueueRow,
  ApplicationStatus,
  CheckStatus,
  CheckType,
  FormResponseValueRow,
} from './types';

export function resolveApplicantName(row: ApplicationQueueRow): string {
  const preferred = row.person?.preferred_name?.trim() ?? '';
  const first = row.person?.first_name?.trim() ?? '';
  const last = row.person?.last_name?.trim() ?? '';
  const lead = preferred.length > 0 ? preferred : first;
  const combined = `${lead} ${last}`.trim();
  if (combined.length > 0) {
    return combined;
  }
  const emailFallback = row.person?.email?.trim() ?? '';
  if (emailFallback.length > 0) {
    return emailFallback;
  }
  return 'Unknown applicant';
}

export function resolveSubmittedLabel(row: ApplicationQueueRow): string {
  if (row.submitted_at != null) {
    return formatDateTime(row.submitted_at);
  }
  if (row.created_at != null) {
    return formatDateTime(row.created_at);
  }
  return 'Not submitted';
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  if (status === 'under_review') {
    return 'Under review';
  }
  return `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}

export function applicationStatusVariant(status: ApplicationStatus):
  | 'soft-sec-normal'
  | 'soft-main-normal'
  | 'solid-main-normal'
  | 'solid-acc-strong' {
  if (status === 'submitted') {
    return 'soft-sec-normal';
  }
  if (status === 'under_review') {
    return 'soft-main-normal';
  }
  if (status === 'approved') {
    return 'solid-main-normal';
  }
  return 'solid-acc-strong';
}

export function checkTypeLabel(type: CheckType): string {
  if (type === 'guardian_approval') {
    return 'Guardian approval';
  }
  if (type === 'home_leader_approval') {
    return 'Home leader approval';
  }
  if (type === 'designated_org_review') {
    return 'Designated organisation review';
  }
  if (type === 'event_approval') {
    return 'Event approval';
  }
  return `${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;
}

export function checkStatusVariant(status: CheckStatus):
  | 'soft-sec-normal'
  | 'solid-main-normal'
  | 'solid-acc-strong'
  | 'outline-sec-muted' {
  if (status === 'pending') {
    return 'soft-sec-normal';
  }
  if (status === 'satisfied') {
    return 'solid-main-normal';
  }
  if (status === 'failed') {
    return 'solid-acc-strong';
  }
  return 'outline-sec-muted';
}

export function getChecksSummary(checks: ApplicationCheckRow[]): {
  label: string;
  variant: 'solid-acc-strong' | 'soft-sec-normal' | 'solid-main-normal';
} | null {
  if (checks.length === 0) {
    return null;
  }
  const failed = checks.filter((item) => item.status === 'failed').length;
  if (failed > 0) {
    return { label: `${failed} failed`, variant: 'solid-acc-strong' };
  }
  const pending = checks.filter((item) => item.status === 'pending').length;
  if (pending > 0) {
    return { label: `${pending} pending`, variant: 'soft-sec-normal' };
  }
  return { label: 'All satisfied', variant: 'solid-main-normal' };
}

export function sortChecksByOrder(checks: ApplicationCheckRow[]): ApplicationCheckRow[] {
  return [...checks].sort((left, right) => {
    const leftOrder = left.requirement?.sort_order;
    const rightOrder = right.requirement?.sort_order;
    if (leftOrder == null && rightOrder == null) {
      return 0;
    }
    if (leftOrder == null) {
      return 1;
    }
    if (rightOrder == null) {
      return -1;
    }
    return leftOrder - rightOrder;
  });
}

function toSpacedTitleCase(input: string): string {
  const withSpaces = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (withSpaces.length === 0) {
    return '';
  }
  return withSpaces
    .split(/\s+/)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function renderJsonInline(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => renderJsonInline(entry)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${toSpacedTitleCase(key)}: ${renderJsonInline(item)}`)
      .join(', ');
  }
  return String(value);
}

export function renderJsonValue(value: unknown): string | Record<string, string> | null {
  if (value == null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => renderJsonInline(entry)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, item]) => {
      acc[toSpacedTitleCase(key)] = renderJsonInline(item);
      return acc;
    }, {});
  }
  return String(value);
}

export function evidenceFieldLabel(value: FormResponseValueRow): string {
  const label = value.field?.label?.trim();
  if (label != null && label.length > 0) {
    return label;
  }
  const fieldKey = value.field_key?.trim();
  if (fieldKey != null && fieldKey.length > 0) {
    return fieldKey;
  }
  return 'Field';
}
