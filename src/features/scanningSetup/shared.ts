/* eslint-disable pace-core-compliance/max-named-exports */

import type {
  ManifestContextType,
  ScanContextType,
  ScanDirection,
  ScanPointFormValues,
  ScanValidationResult,
} from './types';
import type { BadgeVariant } from '@solvera/pace-core/components';

export interface BadgeDescriptor {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

export function getDirectionBadge(direction: ScanDirection): BadgeDescriptor {
  if (direction === 'in') {
    return { label: 'In', variant: 'solid-sec-muted' };
  }
  if (direction === 'out') {
    return { label: 'Out', variant: 'solid-sec-muted' };
  }
  if (direction === 'both') {
    return { label: 'Both', variant: 'solid-sec-muted' };
  }
  return { label: 'Neutral', variant: 'solid-sec-muted' };
}

export function getContextBadge(contextType: ScanContextType): BadgeDescriptor {
  if (contextType === 'site') {
    return { label: 'Site', variant: 'solid-main-normal' };
  }
  if (contextType === 'activity') {
    return { label: 'Activity', variant: 'solid-main-normal' };
  }
  if (contextType === 'transport') {
    return { label: 'Transport', variant: 'solid-main-normal' };
  }
  return { label: 'Meal', variant: 'solid-main-normal' };
}

export function getStatusBadge(isActive: boolean): BadgeDescriptor {
  if (isActive) {
    return { label: 'Active', variant: 'solid-main-normal' };
  }
  return { label: 'Inactive', variant: 'solid-sec-muted' };
}

export function getOfflineBadge(contextType: ScanContextType): BadgeDescriptor {
  void contextType;
  return { label: 'Offline', variant: 'solid-acc-normal' };
}

export function getResultBadge(result: ScanValidationResult): BadgeDescriptor {
  if (result === 'accepted') {
    return { label: 'Accepted', variant: 'solid-main-normal' };
  }
  if (result === 'rejected') {
    return { label: 'Rejected', variant: 'solid-sec-muted' };
  }
  return { label: 'Upload conflict', variant: 'outline-acc-muted' };
}

export function getQueueSyncBadge(status: 'pending' | 'syncing' | 'synced' | 'failed'): BadgeDescriptor {
  if (status === 'pending') {
    return { label: 'Pending upload', variant: 'solid-acc-normal' };
  }
  if (status === 'syncing') {
    return { label: 'Uploading...', variant: 'solid-sec-muted', className: 'animate-pulse' };
  }
  if (status === 'synced') {
    return { label: 'Uploaded', variant: 'solid-main-normal' };
  }
  return { label: 'Upload failed', variant: 'outline-acc-muted' };
}

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
