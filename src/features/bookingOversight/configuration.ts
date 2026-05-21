import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { ApiResult } from '@solvera/pace-core/types';
import type { CancelBookingRpcParams, CreateBookingRpcParams } from './bookingRpcTypes';
import {
  createActivityBookingRpc,
  loadActivitySessionsForBookings,
  loadApprovedApplicationsForBookings,
  loadBookingsForEvent,
  postAppBaseActivityBookingCancel,
  type SupabaseLike,
} from './bookingQueries';
import { mapBookingToTableRow } from './display';
import type { BookingQueryRow, BookingTableRow } from './types';

function asSupabaseClient(client: ReturnType<typeof useSecureSupabase>): SupabaseLike {
  return client as unknown as SupabaseLike;
}

function unwrapOrThrow<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  throw new Error(result.error.message);
}

export function useBookingsList(eventId: string | null, eventTimezone: string | null | undefined) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba11', 'bookings', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async (): Promise<{ raw: BookingQueryRow[]; tableRows: BookingTableRow[] }> => {
      const supabase = asSupabaseClient(secureSupabase);
      const raw = unwrapOrThrow(await loadBookingsForEvent(supabase, eventId as string));
      const tableRows = raw.map((row) => mapBookingToTableRow(row, eventTimezone));
      return { raw, tableRows };
    },
  });
}

export function useApprovedApplicationsForBookingsQuery(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba11', 'approved-applications', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      return unwrapOrThrow(await loadApprovedApplicationsForBookings(supabase, eventId as string));
    },
  });
}

export function useActivitySessionsForBookingsQuery(eventId: string | null) {
  const secureSupabase = useSecureSupabase();
  return useQuery({
    queryKey: ['ba11', 'sessions', eventId],
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      const supabase = asSupabaseClient(secureSupabase);
      return unwrapOrThrow(await loadActivitySessionsForBookings(supabase, eventId as string));
    },
  });
}

export function useInvalidateBookingsQueries() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['ba11'] });
  };
}

export function useCreateBookingMutation() {
  const secureSupabase = useSecureSupabase();
  const invalidate = useInvalidateBookingsQueries();
  return useMutation({
    mutationFn: async (params: CreateBookingRpcParams) => {
      if (secureSupabase == null) {
        throw new Error('Not authenticated.');
      }
      unwrapOrThrow(await createActivityBookingRpc(asSupabaseClient(secureSupabase), params));
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useCancelBookingMutation() {
  const secureSupabase = useSecureSupabase();
  const invalidate = useInvalidateBookingsQueries();
  return useMutation({
    mutationFn: async (params: CancelBookingRpcParams) => {
      if (secureSupabase == null) {
        throw new Error('Not authenticated.');
      }
      unwrapOrThrow(await postAppBaseActivityBookingCancel(asSupabaseClient(secureSupabase), params));
    },
    onSuccess: () => {
      invalidate();
    },
  });
}
