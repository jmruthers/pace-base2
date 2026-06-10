import { useEffect, useMemo, useState } from 'react';
import { toast } from '@solvera/pace-core/components';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '@solvera/pace-core/hooks';
import { useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { deriveTrackingSnapshot } from '@/features/scanningTracking/configuration';
import type { SupabaseLike, TrackingSearchResult } from '@/features/scanningTracking/trackingTypes';
import { useTrackingDashboardData } from '@/features/scanningTracking/useTrackingDashboardData';
import {
  type ScopeSelection,
  trackingSelectedId,
  trackingSelectedName,
} from '@/pages/scanning/scanningTrackingHelpers';

export function useScanningTrackingPageController() {
  const navigate = useNavigate();
  const secureSupabase = useSecureSupabase();
  const eventsContext = useEvents() as unknown as {
    selectedEvent: ScopeSelection | null;
    selectedOrganisation?: ScopeSelection | null;
  };
  const selectedEvent = eventsContext.selectedEvent;
  const selectedOrganisation = eventsContext.selectedOrganisation ?? null;
  const { organisationId: scopeOrganisationId, eventId: scopeEventId, appId } = useResolvedScope();

  const eventId = trackingSelectedId(selectedEvent);
  const eventName = trackingSelectedName(selectedEvent);
  const organisationId = trackingSelectedId(selectedOrganisation);
  const canQuery = secureSupabase != null && eventId != null && organisationId != null;
  const supabase = secureSupabase as unknown as SupabaseLike;

  const [offSiteExpanded, setOffSiteExpanded] = useState<Record<string, boolean>>({});
  const [onSiteExpanded, setOnSiteExpanded] = useState<Record<string, boolean>>({});
  const [activityExpanded, setActivityExpanded] = useState<Record<string, boolean>>({});
  const [transportExpanded, setTransportExpanded] = useState<Record<string, boolean>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<TrackingSearchResult | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const selectedMemberId = selectedParticipant?.memberId ?? null;

  const {
    scanPointsQuery,
    approvedParticipantsQuery,
    memberQuery,
    allEventsQuery,
    acceptedEventsQuery,
    searchResultsQuery,
    participantHistoryQuery,
    refreshing,
    lastUpdatedAt,
    refreshTrackingData,
    retryScanPoints,
    retryApprovedParticipants,
    retryAcceptedEvents,
    retryAllEvents,
    retrySearchResults,
    retryParticipantHistory,
  } = useTrackingDashboardData({
    supabase,
    canQuery,
    eventId,
    organisationId,
    debouncedSearchTerm,
    selectedMemberId,
  });

  const snapshot = useMemo(() => {
    return deriveTrackingSnapshot({
      scanPoints: scanPointsQuery.data ?? [],
      approvedApplications: approvedParticipantsQuery.data ?? [],
      memberRows: memberQuery.data ?? [],
      allEvents: allEventsQuery.data ?? [],
      acceptedEvents: acceptedEventsQuery.data ?? [],
    });
  }, [
    acceptedEventsQuery.data,
    allEventsQuery.data,
    approvedParticipantsQuery.data,
    memberQuery.data,
    scanPointsQuery.data,
  ]);

  const onRefresh = async () => {
    if (!canQuery) {
      return;
    }
    try {
      const success = await refreshTrackingData();
      if (!success) {
        throw new Error('Failed to refresh tracking data.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        description: NormalizeSupabaseError(error).message,
      });
    }
  };

  const historyRows = useMemo(() => {
    const events = participantHistoryQuery.data ?? [];
    return events.map((eventRow) => ({
      ...eventRow,
      scan_point_name: snapshot.pointById[eventRow.scan_point_id]?.name ?? '—',
      direction: snapshot.pointById[eventRow.scan_point_id]?.direction ?? 'neutral',
    }));
  }, [participantHistoryQuery.data, snapshot.pointById]);

  const showStepOneError = scanPointsQuery.error != null;
  const showStepOneLoading = scanPointsQuery.isLoading || scanPointsQuery.isFetching;

  return {
    navigate,
    secureSupabase,
    scopeOrganisationId,
    scopeEventId,
    appId,
    eventId,
    eventName,
    organisationId,
    canQuery,
    offSiteExpanded,
    setOffSiteExpanded,
    onSiteExpanded,
    setOnSiteExpanded,
    activityExpanded,
    setActivityExpanded,
    transportExpanded,
    setTransportExpanded,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    setDebouncedSearchTerm,
    selectedParticipant,
    setSelectedParticipant,
    scanPointsQuery,
    approvedParticipantsQuery,
    memberQuery,
    allEventsQuery,
    acceptedEventsQuery,
    searchResultsQuery,
    participantHistoryQuery,
    refreshing,
    lastUpdatedAt,
    onRefresh,
    retryScanPoints,
    retryApprovedParticipants,
    retryAcceptedEvents,
    retryAllEvents,
    retrySearchResults,
    retryParticipantHistory,
    snapshot,
    historyRows,
    showStepOneError,
    showStepOneLoading,
  };
}

export type ScanningTrackingPageController = ReturnType<typeof useScanningTrackingPageController>;
