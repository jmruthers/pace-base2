import type { AddressValue } from '@solvera/pace-core/forms';
import type { FileReference } from '@solvera/pace-core/types';

export interface EventConfigurationRecord {
  event_id: string;
  event_name: string;
  event_code: string | null;
  event_email: string | null;
  event_date: string | null;
  event_days: number | null;
  event_venue: string | null;
  expected_participants: number | null;
  typical_unit_size: number | null;
  event_colours: unknown;
  is_visible: boolean | null;
  organisation_id: string | null;
  description: string | null;
  registration_scope: 'org_only' | 'hierarchy' | 'open' | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface EventConfigurationFormValues {
  event_name: string;
  event_code: string | null;
  event_email: string | null;
  event_date: Date | null;
  event_days: number;
  event_venue: AddressValue | undefined;
  expected_participants: number;
  typical_unit_size: number;
  description: string | null;
  registration_scope: 'org_only' | 'hierarchy' | 'open' | null;
  is_visible: boolean;
  event_colours: string | null;
}

export interface DashboardCounts {
  forms: number | null;
  applications: number | null;
  registrationTypes: number | null;
}

export interface DashboardCountState extends DashboardCounts {
  isLoading: boolean;
}

export type EventLike = {
  id?: string;
  event_id?: string;
  event_name?: string;
  event_date?: string | null;
  event_days?: number | null;
  event_venue?: string | null;
  [key: string]: unknown;
};

export type EventLogoReference = FileReference | null;
