import type { BadgeVariant } from '@solvera/pace-core/components';

import type { ScanContextType, ScanDirection, ScanValidationResult } from './types';

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

export function getHistorySyncBadge(params: {
  synced_at: string | null;
  validation_result: ScanValidationResult;
}): BadgeDescriptor {
  if (params.validation_result === 'upload_conflict') {
    return { label: 'Upload conflict', variant: 'outline-acc-muted' };
  }
  if (params.synced_at != null) {
    return getQueueSyncBadge('synced');
  }
  return getQueueSyncBadge('pending');
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
