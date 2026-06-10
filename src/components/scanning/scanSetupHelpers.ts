import type { ManifestContextType } from '@/features/scanningSetup/scanEventTypes';
import type { ScanPointFormValues } from '@/features/scanningSetup/types';

export const SCAN_SETUP_MANIFEST_TYPES: ManifestContextType[] = ['site', 'activity', 'transport', 'meal'];

export function queueFailureReasonLabel(reason: string | null | undefined): string {
  if (reason === 'manual_scan_no_card') {
    return 'Manual scan has no card identifier in MVP';
  }
  if (reason == null || reason.length === 0) {
    return 'Upload failed';
  }
  return reason;
}

export function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

export function eventIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'id' in selectedEvent) {
    const value = (selectedEvent as { id?: unknown }).id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function organisationIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'organisation_id' in selectedEvent) {
    const value = (selectedEvent as { organisation_id?: unknown }).organisation_id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function eventTimezoneFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'timezone' in selectedEvent) {
    const value = (selectedEvent as { timezone?: unknown }).timezone;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function buildScanPointDefaultValues(): ScanPointFormValues {
  return {
    name: '',
    context_type: 'site',
    direction: 'neutral',
    resource_id: null,
  };
}
