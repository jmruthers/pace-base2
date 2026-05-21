import type { TrackingValidationResult } from '@/features/scanningTracking/trackingTypes';

export type ScopeSelection = {
  id?: unknown;
  name?: unknown;
};

export function trackingSelectedId(value: unknown): string | null {
  if (value != null && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return null;
}

export function trackingSelectedName(value: unknown): string {
  if (value != null && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim().length > 0) {
      return name;
    }
  }
  return 'selected event';
}

export function trackingDirectionBadgeLabel(direction: 'in' | 'out' | 'both' | 'neutral'): string {
  if (direction === 'in') {
    return 'In';
  }
  if (direction === 'out') {
    return 'Out';
  }
  if (direction === 'both') {
    return 'Both';
  }
  return 'Neutral';
}

export function trackingHistoryResultBadge(result: TrackingValidationResult): {
  label: string;
  variant: string;
  ariaLabel?: string;
} {
  if (result === 'accepted') {
    return { label: 'Accepted', variant: 'solid-main-normal' };
  }
  if (result === 'accepted_override') {
    return { label: 'Accepted (override)', variant: 'solid-acc-normal' };
  }
  if (result === 'rejected') {
    return { label: 'Rejected', variant: 'solid-sec-muted' };
  }
  return {
    label: 'Upload conflict',
    variant: 'outline-acc-muted',
    ariaLabel: 'Upload conflict — see participant history for details',
  };
}
