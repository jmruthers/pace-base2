import type { ApplicationCheckRow, ApplicationQueueRow } from '@/features/applicationsAdmin/types';

export function isTransitionConflict(error: unknown): boolean {
  const message = String(error ?? '');
  return (
    message.includes('validation_error.application_status_transition_invalid') ||
    message.toLowerCase().includes('status transition')
  );
}

export function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'Selected event';
}

export function isReissueEligible(check: ApplicationCheckRow): boolean {
  const checkType = check.requirement?.check_type;
  return (checkType === 'guardian_approval' || checkType === 'referee') && check.status === 'pending';
}

export function isOverrideAllowed(status: ApplicationQueueRow['status']): boolean {
  return status === 'submitted' || status === 'under_review';
}

export function isTokenExpiryRelevant(check: ApplicationCheckRow): boolean {
  const checkType = check.requirement?.check_type;
  return check.status === 'pending' && (checkType === 'guardian_approval' || checkType === 'referee');
}
