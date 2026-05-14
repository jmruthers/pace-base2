import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loadApprovedParticipants,
  loadMembersByPersonIds,
  loadTrackingEvents,
  loadTrackingScanPoints,
  searchTrackingParticipants,
  unwrapApiResult,
  type SupabaseLike,
} from './configuration';

export function useTrackingDashboardData(params: {
  supabase: SupabaseLike;
  canQuery: boolean;
  eventId: string | null;
  organisationId: string | null;
  debouncedSearchTerm: string;
  selectedMemberId: string | null;
}) {
  const { supabase, canQuery, eventId, organisationId, debouncedSearchTerm, selectedMemberId } =
    params;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCompletedAt, setRefreshCompletedAt] = useState<string | null>(null);

  const scanPointsQuery = useQuery({
    queryKey: ['ba16', eventId, 'scan-points'],
    enabled: canQuery,
    staleTime: 0,
    queryFn: async () =>
      unwrapApiResult(
        await loadTrackingScanPoints(supabase, eventId as string, organisationId as string)
      ),
  });

  const scanPointIds = useMemo(
    () => (scanPointsQuery.data ?? []).map((row) => row.id),
    [scanPointsQuery.data]
  );

  const approvedParticipantsQuery = useQuery({
    queryKey: ['ba16', eventId, 'approved-participants'],
    enabled: canQuery,
    staleTime: 0,
    queryFn: async () =>
      unwrapApiResult(
        await loadApprovedParticipants(supabase, eventId as string, organisationId as string)
      ),
  });

  const memberQuery = useQuery({
    queryKey: [
      'ba16',
      eventId,
      'member-lookup',
      (approvedParticipantsQuery.data ?? []).map((row) => row.person_id).join(','),
    ],
    enabled: canQuery && (approvedParticipantsQuery.data ?? []).length > 0,
    staleTime: 0,
    queryFn: async () =>
      unwrapApiResult(
        await loadMembersByPersonIds(
          supabase,
          (approvedParticipantsQuery.data ?? []).map((row) => row.person_id),
          organisationId as string
        )
      ),
  });

  const allEventsQuery = useQuery({
    queryKey: ['ba16', eventId, 'events', 'all', scanPointIds.join(',')],
    enabled: canQuery && scanPointIds.length > 0,
    staleTime: 0,
    queryFn: async () => unwrapApiResult(await loadTrackingEvents(supabase, scanPointIds)),
  });

  const acceptedEventsQuery = useQuery({
    queryKey: ['ba16', eventId, 'events', 'accepted', scanPointIds.join(',')],
    enabled: canQuery && scanPointIds.length > 0,
    staleTime: 0,
    queryFn: async () =>
      unwrapApiResult(
        await loadTrackingEvents(supabase, scanPointIds, { acceptedOnly: true })
      ),
  });

  const searchResultsQuery = useQuery({
    queryKey: ['ba16', eventId, 'search', debouncedSearchTerm],
    enabled: canQuery && debouncedSearchTerm.length >= 2,
    staleTime: 0,
    queryFn: async () =>
      unwrapApiResult(
        await searchTrackingParticipants(
          supabase,
          debouncedSearchTerm,
          eventId as string,
          organisationId as string
        )
      ),
  });

  const participantHistoryQuery = useQuery({
    queryKey: ['ba16', eventId, 'history', selectedMemberId, scanPointIds.join(',')],
    enabled: canQuery && selectedMemberId != null && scanPointIds.length > 0,
    staleTime: 0,
    queryFn: async () =>
      unwrapApiResult(
        await loadTrackingEvents(supabase, scanPointIds, {
          memberId: selectedMemberId as string,
        })
      ),
  });

  const queryDataUpdatedAts = [
    scanPointsQuery.dataUpdatedAt,
    approvedParticipantsQuery.dataUpdatedAt,
    memberQuery.dataUpdatedAt,
    allEventsQuery.dataUpdatedAt,
    acceptedEventsQuery.dataUpdatedAt,
  ].filter((value) => value > 0);

  const lastUpdatedAt =
    refreshCompletedAt ??
    (queryDataUpdatedAts.length > 0
      ? new Date(Math.max(...queryDataUpdatedAts)).toISOString()
      : null);

  const refreshTrackingData = async (): Promise<boolean> => {
    if (!canQuery || eventId == null) {
      return false;
    }
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['ba16', eventId] });
      const results = await Promise.all([
        scanPointsQuery.refetch(),
        approvedParticipantsQuery.refetch(),
        memberQuery.refetch(),
        allEventsQuery.refetch(),
        acceptedEventsQuery.refetch(),
        participantHistoryQuery.refetch(),
      ]);
      if (results.some((result) => result.isError)) {
        return false;
      }
      setRefreshCompletedAt(new Date().toISOString());
      return true;
    } finally {
      setRefreshing(false);
    }
  };

  return {
    scanPointsQuery,
    approvedParticipantsQuery,
    memberQuery,
    allEventsQuery,
    acceptedEventsQuery,
    searchResultsQuery,
    participantHistoryQuery,
    scanPointIds,
    refreshing,
    lastUpdatedAt,
    refreshTrackingData,
    retryScanPoints: () => {
      void scanPointsQuery.refetch();
    },
    retryApprovedParticipants: () => {
      void approvedParticipantsQuery.refetch();
    },
    retryAcceptedEvents: () => {
      void acceptedEventsQuery.refetch();
    },
    retryAllEvents: () => {
      void allEventsQuery.refetch();
    },
    retrySearchResults: () => {
      void searchResultsQuery.refetch();
    },
    retryParticipantHistory: () => {
      void participantHistoryQuery.refetch();
    },
  };
}
