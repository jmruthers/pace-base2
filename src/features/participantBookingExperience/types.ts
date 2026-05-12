export type ActivityBookingStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface SessionBrowseItem {
  id: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
  location_display: string | null;
  capacity: number;
  allow_waitlist: boolean;
  capacityFull: boolean;
  waitlistOpen: boolean;
  confirmedCount: number;
}

export interface OfferingBrowseItem {
  id: string;
  name: string;
  description: string | null;
  location_display: string | null;
  booking_open_at: string | null;
  booking_close_at: string | null;
  bookingWindowOpen: boolean;
  sessions: SessionBrowseItem[];
}

export interface BookingValidationRequest {
  participant_id: string;
  session_id: string;
}

export interface ConflictingSessionSummary {
  session_id: string;
  session_name: string | null;
  start_time: string;
}

export interface BookingValidationResult {
  bookingWindowOpen: boolean;
  capacityFull: boolean;
  waitlistOpen: boolean;
  duplicateBooking: boolean;
  sessionConflict: boolean;
  conflictingSession: ConflictingSessionSummary | null;
  eligibilityDenied: boolean;
  consentRequired: boolean;
  consentText: string | null;
  canBook: boolean;
}

export interface ParticipantBookingItem {
  id: string;
  session_id: string;
  session_name: string | null;
  start_time: string;
  end_time: string;
  offering_name: string;
  status: ActivityBookingStatus;
  booked_at: string;
  cancelled_at: string | null;
  cancellable: boolean;
  onWaitlist: boolean;
}
