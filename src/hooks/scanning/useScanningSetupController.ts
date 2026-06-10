import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@solvera/pace-core/components';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { useCan, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError } from '@solvera/pace-core/utils';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import {
  useCreateScanPointMutation,
  useScanConflicts,
  useScanHistory,
  useScanPoints,
  useSetScanPointActiveMutation,
  useUpdateScanPointMutation,
} from '@/features/scanningSetup/configuration';
import {
  useActivityResourceOptions,
  useTransportResourceOptions,
} from '@/features/scanningSetup/resourceOptionHooks';
import { validateScanPoint } from '@/features/scanningSetup/shared';
import type { ScanPointFormValues, ScanPointRow } from '@/features/scanningSetup/types';
import {
  getQueueEntriesByStatus,
  retryFailedQueueEntries,
  useScanSyncSnapshot,
} from '@/features/scanningRuntime/sync/scanSyncWorker';
import type { ScanQueueEntry } from '@/features/scanningRuntime/types';
import {
  buildScanPointDefaultValues,
  eventIdFromSelection,
  eventNameFromSelection,
  eventTimezoneFromSelection,
  organisationIdFromSelection,
} from '../components/scanSetupHelpers';
import { useScanningSetupConflictColumns } from './useScanningSetupConflictColumns';
import { useScanningSetupHistoryColumns } from './useScanningSetupHistoryColumns';
import { useScanningSetupManifestDownload } from './useScanningSetupManifestDownload';
import { useScanningSetupQueueSummary } from './useScanningSetupQueueSummary';
import { useScanningSetupScanPointColumns } from './useScanningSetupScanPointColumns';

export function useScanningSetupController() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const secureSupabase = useSecureSupabase();
  const { selectedEvent } = useEvents();
  const { selectedOrganisationId, user } = useUnifiedAuth();
  const { scope } = useResolvedScope();

  const eventId = eventIdFromSelection(selectedEvent);
  const eventName = eventNameFromSelection(selectedEvent);
  const eventTimezone = eventTimezoneFromSelection(selectedEvent);
  const organisationId =
    organisationIdFromSelection(selectedEvent) ?? selectedOrganisationId ?? scope.organisationId ?? null;

  const { can: canReadPage } = useCan('read:page.scanning', scope);
  const { can: canCreate, isLoading: createLoading } = useCan('create:page.scanning', scope);
  const { can: canUpdate, isLoading: updateLoading } = useCan('update:page.scanning', scope);

  const scanPointsQuery = useScanPoints(eventId, organisationId);
  const conflictsQuery = useScanConflicts(eventId, organisationId);
  const historyQuery = useScanHistory(eventId, organisationId);
  const retryScanPointsQuery = useRetryRefetchHandler(scanPointsQuery);
  const retryConflictsQuery = useRetryRefetchHandler(conflictsQuery);
  const retryHistoryQuery = useRetryRefetchHandler(historyQuery);
  const activityOptionsQuery = useActivityResourceOptions(eventId, eventTimezone);
  const transportOptionsQuery = useTransportResourceOptions(eventId);

  const createMutation = useCreateScanPointMutation();
  const updateMutation = useUpdateScanPointMutation();
  const setActiveMutation = useSetScanPointActiveMutation();

  const { manifestLoading, onManifestDownload } = useScanningSetupManifestDownload(
    secureSupabase,
    eventId,
    organisationId
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [conflictDetailOpen, setConflictDetailOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ScanPointRow | null>(null);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

  const [createValues, setCreateValues] = useState<ScanPointFormValues>(buildScanPointDefaultValues());
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof ScanPointFormValues, string>>>({});
  const [editValues, setEditValues] = useState<ScanPointFormValues>(buildScanPointDefaultValues());
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof ScanPointFormValues, string>>>({});

  const scanPoints = useMemo(() => scanPointsQuery.data ?? [], [scanPointsQuery.data]);
  const activityOptions = useMemo(() => activityOptionsQuery.data ?? [], [activityOptionsQuery.data]);
  const transportOptions = useMemo(() => transportOptionsQuery.data ?? [], [transportOptionsQuery.data]);
  const selectedConflict = (conflictsQuery.data ?? []).find((row) => row.id === selectedConflictId) ?? null;

  const resourceLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    activityOptions.forEach((item) => {
      map[item.id] = item.label;
    });
    transportOptions.forEach((item) => {
      map[item.id] = item.label;
    });
    return map;
  }, [activityOptions, transportOptions]);

  const { lastFlushAt } = useScanSyncSnapshot();
  const scanPointIds = useMemo(() => scanPoints.map((row) => row.id), [scanPoints]);
  const { queueSummaryQuery, queueCounts, queueFailedEntries } = useScanningSetupQueueSummary(
    scanPointIds,
    lastFlushAt
  );

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['ba12'] });
  }, [queryClient]);

  const onCreateSubmit = useCallback(
    async (values: ScanPointFormValues) => {
      if (eventId == null || organisationId == null) {
        return;
      }
      const validationErrors = validateScanPoint(values);
      setCreateErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
      try {
        await createMutation.mutateAsync({
          ...values,
          eventId,
          organisationId,
          userId: user?.id ?? null,
        });
        toast({ title: 'Success', description: 'Scan point created', variant: 'success' });
        setCreateOpen(false);
        setCreateValues(buildScanPointDefaultValues());
        setCreateErrors({});
        await invalidateAll();
      } catch (error) {
        toast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
      }
    },
    [createMutation, eventId, invalidateAll, organisationId, user]
  );

  const onEditSubmit = useCallback(
    async (values: ScanPointFormValues) => {
      if (eventId == null || organisationId == null || selectedPoint == null) {
        return;
      }
      const validationErrors = validateScanPoint(values);
      setEditErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
      try {
        await updateMutation.mutateAsync({
          ...values,
          scanPointId: selectedPoint.id,
          eventId,
          organisationId,
          userId: user?.id ?? null,
        });
        toast({ title: 'Success', description: 'Scan point updated', variant: 'success' });
        setEditOpen(false);
        setSelectedPoint(null);
        await invalidateAll();
      } catch (error) {
        toast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
      }
    },
    [eventId, invalidateAll, organisationId, selectedPoint, updateMutation, user]
  );

  const onDeactivateConfirm = useCallback(async () => {
    if (selectedPoint == null || eventId == null) {
      return;
    }
    try {
      await setActiveMutation.mutateAsync({
        scanPointId: selectedPoint.id,
        eventId,
        userId: user?.id ?? null,
        isActive: false,
      });
      toast({ title: 'Success', description: 'Scan point deactivated', variant: 'success' });
      setDeactivateOpen(false);
      setSelectedPoint(null);
      await invalidateAll();
    } catch (error) {
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  }, [eventId, invalidateAll, selectedPoint, setActiveMutation, user]);

  const onActivate = useCallback(
    async (scanPointId: string) => {
      if (eventId == null) {
        return;
      }
      try {
        await setActiveMutation.mutateAsync({
          scanPointId,
          eventId,
          userId: user?.id ?? null,
          isActive: true,
        });
        toast({ title: 'Success', description: 'Scan point activated', variant: 'success' });
        await invalidateAll();
      } catch (error) {
        toast({
          title: 'Error',
          description: NormalizeSupabaseError(error).message,
          variant: 'destructive',
        });
      }
    },
    [eventId, invalidateAll, setActiveMutation, user]
  );

  const onRetryFailedEntry = useCallback(
    async (entry: ScanQueueEntry) => {
      if (entry.sync_status !== 'failed') {
        return;
      }
      const summary = await retryFailedQueueEntries([entry.local_id]);
      if (summary.skippedManualNoCard > 0) {
        toast({
          variant: 'destructive',
          description: 'Manual scan entries cannot be uploaded in MVP without a card identifier.',
        });
        return;
      }
      const remaining = await getQueueEntriesByStatus(['failed'], scanPointIds);
      const failedAfterRetry = remaining.length;
      if (failedAfterRetry === 0) {
        toast({ variant: 'success', description: 'Scan event re-uploaded successfully.' });
        return;
      }
      toast({
        variant: 'destructive',
        description: 'Retry failed. Check your connection and try again.',
      });
    },
    [scanPointIds]
  );

  const onRowsEditRequested = useCallback((row: ScanPointRow) => {
    setSelectedPoint(row);
    setEditValues({
      name: row.name,
      context_type: row.context_type,
      direction: row.direction,
      resource_id: row.resource_id,
    });
    setEditErrors({});
    setEditOpen(true);
  }, []);

  const onDeactivateRequested = useCallback((row: ScanPointRow) => {
    setSelectedPoint(row);
    setDeactivateOpen(true);
  }, []);

  const onConflictViewDetail = useCallback((conflictId: string) => {
    setSelectedConflictId(conflictId);
    setConflictDetailOpen(true);
  }, []);

  const scanPointColumns = useScanningSetupScanPointColumns({
    resourceLabelById,
    canUpdate,
    updateLoading,
    navigate,
    onActivate,
    onRowsEditRequested,
    onDeactivateRequested,
  });

  const conflictColumns = useScanningSetupConflictColumns(onConflictViewDetail);

  const historyColumns = useScanningSetupHistoryColumns();

  const openCreateDialog = useCallback(() => {
    setCreateValues(buildScanPointDefaultValues());
    setCreateErrors({});
    setCreateOpen(true);
  }, []);

  return {
    secureSupabase,
    canReadPage,
    navigate,
    eventId,
    eventName,
    organisationId,
    canCreate,
    createLoading,
    canUpdate,
    updateLoading,
    scanPointsQuery,
    conflictsQuery,
    historyQuery,
    retryScanPointsQuery,
    retryConflictsQuery,
    retryHistoryQuery,
    scanPoints,
    activityOptions,
    transportOptions,
    createMutation,
    updateMutation,
    manifestLoading,
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    deactivateOpen,
    setDeactivateOpen,
    conflictDetailOpen,
    setConflictDetailOpen,
    selectedPoint,
    selectedConflict,
    createValues,
    setCreateValues,
    createErrors,
    editValues,
    setEditValues,
    editErrors,
    queueSummaryQuery,
    queueCounts,
    queueFailedEntries,
    scanPointColumns,
    conflictColumns,
    historyColumns,
    onCreateSubmit,
    onEditSubmit,
    onDeactivateConfirm,
    onManifestDownload,
    onRetryFailedEntry,
    openCreateDialog,
  };
}

export type ScanningSetupController = ReturnType<typeof useScanningSetupController>;
