import type { ManifestContextType } from './scanEventTypes';
import type { ScanContextType, ScanPointFormValues } from './types';

export function deriveParticipantName(values: {
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string | null {
  const preferred = values.preferred_name?.trim() ?? '';
  if (preferred.length > 0) {
    return preferred;
  }
  const fullName = `${values.first_name ?? ''} ${values.last_name ?? ''}`.trim();
  if (fullName.length === 0) {
    return null;
  }
  return fullName;
}

export function requiresResource(contextType: ScanContextType): boolean {
  return contextType === 'activity' || contextType === 'transport';
}

export function toResourceType(contextType: ScanContextType): string | null {
  if (contextType === 'activity') {
    return 'activity_session';
  }
  if (contextType === 'transport') {
    return 'trac_activity';
  }
  return null;
}

export function clearResourceOnContextChange(
  currentValues: ScanPointFormValues,
  nextContextType: ScanContextType
): ScanPointFormValues {
  if (currentValues.context_type === nextContextType) {
    return currentValues;
  }
  return {
    ...currentValues,
    context_type: nextContextType,
    resource_id: null,
  };
}

export function validateScanPoint(values: ScanPointFormValues): Partial<Record<keyof ScanPointFormValues, string>> {
  const errors: Partial<Record<keyof ScanPointFormValues, string>> = {};
  const trimmedName = values.name.trim();
  if (trimmedName.length === 0) {
    errors.name = 'Name is required.';
  } else if (trimmedName.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }
  if (!['site', 'activity', 'transport', 'meal'].includes(values.context_type)) {
    errors.context_type = 'Select a valid context type.';
  }
  if (!['in', 'out', 'both', 'neutral'].includes(values.direction)) {
    errors.direction = 'Select a valid direction.';
  }
  if (requiresResource(values.context_type) && (values.resource_id == null || values.resource_id.length === 0)) {
    errors.resource_id = 'A resource is required for this context type.';
  }
  return errors;
}

export function buildManifestFilename(contextType: ManifestContextType, eventId: string, date: Date): string {
  const yyyy = `${date.getFullYear()}`;
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${contextType}-manifest-${eventId}-${yyyy}-${mm}-${dd}.json`;
}
