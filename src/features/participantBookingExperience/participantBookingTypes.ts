import type { ActivityBookingStatus } from './types';

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
