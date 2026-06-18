export interface TracActivityRow {
  id: string;
  name: string;
  event_id: string;
}

export interface ActivityOfferingRow {
  id: string;
  name: string;
  trac_activity_id: string | null;
  booking_open_at: string | null;
  booking_close_at: string | null;
  cost: number | null;
  payment_due_at: string | null;
  allow_waitlist: boolean;
  event_id: string;
  organisation_id: string;
  trac_activity: TracActivityRow | null;
  sessions: Array<{
    count?: number;
    capacity?: number;
    bookings?: Array<{ count: number }>;
  }> | null;
}

export interface ActivitySessionRow {
  id: string;
  offering_id: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
  location_display_name: string | null;
  capacity: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface OfferingFormValues {
  name: string;
  trac_activity_id: string | null;
  booking_open_at: string | null;
  booking_close_at: string | null;
  cost: string;
  payment_due_at: string | null;
  allow_waitlist: boolean;
}

export interface SessionFormValues {
  session_name: string;
  start_time: string | null;
  end_time: string | null;
  location_display_name: string;
  capacity: string;
}
