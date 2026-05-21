export type ScanContextType = 'site' | 'activity' | 'transport' | 'meal';
export type ScanDirection = 'in' | 'out' | 'both' | 'neutral';
export type ScanValidationResult = 'accepted' | 'rejected' | 'upload_conflict';

export interface ScanPointRow {
  id: string;
  name: string;
  event_id: string;
  organisation_id: string;
  context_type: ScanContextType;
  direction: ScanDirection;
  resource_type: string | null;
  resource_id: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface ScanCardRow {
  id: string;
  card_identifier: string | null;
}

export interface ScanPersonRow {
  id: string;
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface ScanEventRow {
  id: string;
  scan_point_id: string;
  scan_card_id: string | null;
  validation_result: ScanValidationResult;
  validation_reason: string | null;
  scanned_at: string;
  synced_at: string | null;
  notes?: string | null;
  override_by?: string | null;
  application_id?: string | null;
}

export interface ScanPointFormValues {
  name: string;
  context_type: ScanContextType;
  direction: ScanDirection;
  resource_id: string | null;
}

