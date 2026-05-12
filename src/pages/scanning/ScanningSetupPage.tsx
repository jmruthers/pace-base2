/* eslint-disable max-lines-per-function, complexity, react-hooks/exhaustive-deps, max-lines */

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  Form,
  FormField,
  Input,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@solvera/pace-core/components';
import { ChevronRight, Plus, SquarePen, X } from '@solvera/pace-core/icons';
import { useEvents, useUnifiedAuth } from '@solvera/pace-core/hooks';
import { AccessDenied, PagePermissionGuard, useCan, useResolvedScope, useSecureSupabase } from '@solvera/pace-core/rbac';
import { NormalizeSupabaseError, formatDateTime } from '@solvera/pace-core/utils';
import { useRetryRefetchHandler } from '@/features/applicationsAdmin/queryHelpers';
import {
  loadManifestByContext,
  useActivityResourceOptions,
  useCreateScanPointMutation,
  useScanConflicts,
  useScanHistory,
  useScanPoints,
  useSetScanPointActiveMutation,
  useTransportResourceOptions,
  useUpdateScanPointMutation,
} from '@/features/scanningSetup/configuration';
import {
  clearResourceOnContextChange,
  getContextBadge,
  getDirectionBadge,
  getOfflineBadge,
  getResultBadge,
  getStatusBadge,
  validateScanPoint,
} from '@/features/scanningSetup/shared';
import type { ManifestContextType, ScanPointFormValues, ScanPointRow } from '@/features/scanningSetup/types';

const MANIFEST_TYPES: ManifestContextType[] = ['site', 'activity', 'transport', 'meal'];

function eventNameFromSelection(selectedEvent: unknown): string {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'name' in selectedEvent) {
    const value = (selectedEvent as { name?: unknown }).name;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return 'selected event';
}

function eventIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'id' in selectedEvent) {
    const value = (selectedEvent as { id?: unknown }).id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function organisationIdFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'organisation_id' in selectedEvent) {
    const value = (selectedEvent as { organisation_id?: unknown }).organisation_id;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function eventTimezoneFromSelection(selectedEvent: unknown): string | null {
  if (selectedEvent != null && typeof selectedEvent === 'object' && 'timezone' in selectedEvent) {
    const value = (selectedEvent as { timezone?: unknown }).timezone;
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function buildDefaultValues(): ScanPointFormValues {
  return {
    name: '',
    context_type: 'site',
    direction: 'neutral',
    resource_id: null,
  };
}

interface ScanPointDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  values: ScanPointFormValues;
  errors: Partial<Record<keyof ScanPointFormValues, string>>;
  activityOptions: Array<{ id: string; label: string }>;
  transportOptions: Array<{ id: string; label: string }>;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange: (next: ScanPointFormValues) => void;
  onSubmit: (next: ScanPointFormValues) => void;
}

function ScanPointDialog({
  open,
  title,
  submitLabel,
  values,
  errors,
  activityOptions,
  transportOptions,
  pending,
  onOpenChange,
  onValuesChange,
  onSubmit,
}: ScanPointDialogProps) {
  const resourceOptions = values.context_type === 'activity' ? activityOptions : transportOptions;
  const shouldShowResource = values.context_type === 'activity' || values.context_type === 'transport';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Form<ScanPointFormValues>
              defaultValues={values}
              onSubmit={(submittedValues) => {
                onValuesChange(submittedValues);
                onSubmit(submittedValues);
              }}
              className="grid gap-3"
            >
              {(methods) => (
                <>
                  <FormField<ScanPointFormValues>
                    name="name"
                    label="Name"
                    required
                    render={({ field }) => (
                      <Input
                        value={(field.value as string | undefined) ?? ''}
                        maxLength={100}
                        onChange={(nextValue) => {
                          field.onChange(nextValue);
                          onValuesChange({
                            ...(methods.getValues() as ScanPointFormValues),
                            name: nextValue,
                          });
                        }}
                        placeholder="e.g. Main gate, Activity hub entrance"
                      />
                    )}
                  />
                  <small>A short label to identify this scan point.</small>
                  {errors.name != null ? <p role="alert">{errors.name}</p> : null}

                  <FormField<ScanPointFormValues>
                    name="context_type"
                    label="Context type"
                    required
                    render={({ field }) => (
                      <Select
                        value={(field.value as string | undefined) ?? 'site'}
                        onValueChange={(nextValue) => {
                          const nextValues = clearResourceOnContextChange(
                            methods.getValues() as ScanPointFormValues,
                            nextValue as ScanPointFormValues['context_type']
                          );
                          field.onChange(nextValue);
                          onValuesChange(nextValues);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select context type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="site">Site</SelectItem>
                          <SelectItem value="activity">Activity</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="meal">Meal</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.context_type != null ? <p role="alert">{errors.context_type}</p> : null}

                  <FormField<ScanPointFormValues>
                    name="direction"
                    label="Direction"
                    required
                    render={({ field }) => (
                      <Select
                        value={(field.value as string | undefined) ?? 'neutral'}
                        onValueChange={(nextValue) => {
                          field.onChange(nextValue);
                          onValuesChange({
                            ...(methods.getValues() as ScanPointFormValues),
                            direction: nextValue as ScanPointFormValues['direction'],
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">In</SelectItem>
                          <SelectItem value="out">Out</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.direction != null ? <p role="alert">{errors.direction}</p> : null}

                  {shouldShowResource ? (
                    <>
                      <FormField<ScanPointFormValues>
                        name="resource_id"
                        label="Resource"
                        required
                        render={({ field }) => (
                          <Select
                            value={(field.value as string | undefined) ?? ''}
                            onValueChange={(nextValue) => {
                              const safeValue = nextValue ?? '';
                              field.onChange(nextValue);
                              onValuesChange({
                                ...(methods.getValues() as ScanPointFormValues),
                                resource_id: safeValue.length > 0 ? safeValue : null,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select resource" />
                            </SelectTrigger>
                            <SelectContent>
                              {resourceOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.resource_id != null ? <p role="alert">{errors.resource_id}</p> : null}
                    </>
                  ) : null}
                </>
              )}
            </Form>
          </DialogBody>
          <DialogFooter>
            <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={() => onSubmit(values)}>
                {submitLabel}
              </Button>
            </section>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export function ScanningSetupPage() {
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

  const [manifestLoading, setManifestLoading] = useState<Record<ManifestContextType, boolean>>({
    site: false,
    activity: false,
    transport: false,
    meal: false,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [conflictDetailOpen, setConflictDetailOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ScanPointRow | null>(null);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

  const [createValues, setCreateValues] = useState<ScanPointFormValues>(buildDefaultValues());
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof ScanPointFormValues, string>>>({});
  const [editValues, setEditValues] = useState<ScanPointFormValues>(buildDefaultValues());
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof ScanPointFormValues, string>>>({});

  const scanPoints = scanPointsQuery.data ?? [];
  const activityOptions = activityOptionsQuery.data ?? [];
  const transportOptions = transportOptionsQuery.data ?? [];
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

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ba12'] });
  };

  const onCreateSubmit = async (values: ScanPointFormValues) => {
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
      setCreateValues(buildDefaultValues());
      setCreateErrors({});
      await invalidateAll();
    } catch (error) {
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    }
  };

  const onEditSubmit = async (values: ScanPointFormValues) => {
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
  };

  const onDeactivateConfirm = async () => {
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
  };

  const onActivate = async (scanPointId: string) => {
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
  };

  const onManifestDownload = async (contextType: ManifestContextType) => {
    if (secureSupabase == null || eventId == null || organisationId == null) {
      return;
    }
    setManifestLoading((state) => ({ ...state, [contextType]: true }));
    try {
      const rows = await loadManifestByContext(
        secureSupabase as unknown as Parameters<typeof loadManifestByContext>[0],
        contextType,
        eventId,
        organisationId
      );
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const date = new Date();
      const yyyy = `${date.getFullYear()}`;
      const mm = `${date.getMonth() + 1}`.padStart(2, '0');
      const dd = `${date.getDate()}`.padStart(2, '0');
      anchor.href = url;
      anchor.download = `${contextType}-manifest-${eventId}-${yyyy}-${mm}-${dd}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Error',
        description: NormalizeSupabaseError(error).message,
        variant: 'destructive',
      });
    } finally {
      setManifestLoading((state) => ({ ...state, [contextType]: false }));
    }
  };

  const scanPointColumns = useMemo<unknown[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => row.name,
      },
      {
        id: 'context',
        accessorKey: 'context_type',
        header: 'Context',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => {
          const context = getContextBadge(row.context_type);
          return <Badge variant={context.variant}>{context.label}</Badge>;
        },
      },
      {
        id: 'direction',
        accessorKey: 'direction',
        header: 'Direction',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => {
          const direction = getDirectionBadge(row.direction);
          return <Badge variant={direction.variant}>{direction.label}</Badge>;
        },
      },
      {
        id: 'resource',
        accessorKey: 'resource_id',
        header: 'Resource',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) =>
          row.resource_id != null ? resourceLabelById[row.resource_id] ?? row.resource_id : '—',
      },
      {
        id: 'status',
        accessorKey: 'is_active',
        header: 'Status',
        sortable: true,
        cell: ({ row }: { row: ScanPointRow }) => {
          const status = getStatusBadge(row.is_active);
          const offline = getOfflineBadge(row.context_type);
          return (
            <section className="grid grid-flow-col auto-cols-max gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant={offline.variant}>{offline.label}</Badge>
            </section>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: ScanPointRow }) => (
          <section className="grid grid-flow-col auto-cols-max gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Launch scan point"
              onClick={() => navigate(`/scanning/${row.id}`)}
            >
              <ChevronRight />
            </Button>
            {canUpdate && !updateLoading && row.is_active ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Edit scan point"
                  onClick={() => {
                    setSelectedPoint(row);
                    setEditValues({
                      name: row.name,
                      context_type: row.context_type,
                      direction: row.direction,
                      resource_id: row.resource_id,
                    });
                    setEditErrors({});
                    setEditOpen(true);
                  }}
                >
                  <SquarePen />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Deactivate scan point"
                  onClick={() => {
                    setSelectedPoint(row);
                    setDeactivateOpen(true);
                  }}
                >
                  <X />
                </Button>
              </>
            ) : null}
            {canUpdate && !updateLoading && !row.is_active ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Activate scan point"
                onClick={() => void onActivate(row.id)}
              >
                <Plus />
              </Button>
            ) : null}
          </section>
        ),
      },
    ],
    [canUpdate, navigate, onActivate, resourceLabelById, updateLoading]
  );

  const conflictColumns = useMemo<unknown[]>(
    () => [
      { id: 'scan_point_name', accessorKey: 'scan_point_name', header: 'Scan point', sortable: true },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: { scanned_at: string } }) =>
          row != null ? formatDateTime(row.scanned_at) : '—',
      },
      {
        id: 'card_identifier',
        accessorKey: 'card_identifier',
        header: 'Card identifier',
        sortable: true,
        cell: ({ row }: { row: { card_identifier: string | null } }) =>
          row != null ? row.card_identifier ?? '—' : '—',
      },
      {
        id: 'validation_reason',
        accessorKey: 'validation_reason',
        header: 'Original reason',
        sortable: true,
        cell: ({ row }: { row: { validation_reason: string | null } }) =>
          row != null ? row.validation_reason ?? '—' : '—',
      },
      {
        id: 'synced_at',
        accessorKey: 'synced_at',
        header: 'Synced at',
        sortable: true,
        cell: ({ row }: { row: { synced_at: string | null } }) =>
          row?.synced_at != null ? formatDateTime(row.synced_at) : '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: { id: string } }) => (
          <Button
            type="button"
            variant="ghost"
            size="small"
            onClick={() => {
              setSelectedConflictId(row?.id ?? null);
              setConflictDetailOpen(true);
            }}
          >
            View detail
          </Button>
        ),
      },
    ],
    []
  );

  const historyColumns = useMemo<unknown[]>(
    () => [
      { id: 'scan_point_name', accessorKey: 'scan_point_name', header: 'Scan point', sortable: true },
      {
        id: 'participant_name',
        accessorKey: 'participant_name',
        header: 'Participant',
        sortable: true,
        cell: ({ row }: { row: { participant_name: string | null } }) => row?.participant_name ?? '—',
      },
      {
        id: 'card_identifier',
        accessorKey: 'card_identifier',
        header: 'Card identifier',
        sortable: true,
        cell: ({ row }: { row: { card_identifier: string | null } }) => row?.card_identifier ?? '—',
      },
      {
        id: 'validation_result',
        accessorKey: 'validation_result',
        header: 'Result',
        sortable: true,
        cell: ({ row }: { row: { validation_result: 'accepted' | 'rejected' | 'upload_conflict' } }) => {
          const result = getResultBadge(row.validation_result);
          return <Badge variant={result.variant}>{result.label}</Badge>;
        },
      },
      {
        id: 'validation_reason',
        accessorKey: 'validation_reason',
        header: 'Reason',
        sortable: true,
        cell: ({ row }: { row: { validation_reason: string | null } }) => row?.validation_reason ?? '—',
      },
      {
        id: 'scanned_at',
        accessorKey: 'scanned_at',
        header: 'Scanned at',
        sortable: true,
        cell: ({ row }: { row: { scanned_at: string } }) => formatDateTime(row.scanned_at),
      },
      {
        id: 'synced_at',
        accessorKey: 'synced_at',
        header: 'Synced at',
        sortable: true,
        cell: ({ row }: { row: { synced_at: string | null } }) =>
          row.synced_at != null ? formatDateTime(row.synced_at) : '—',
      },
    ],
    []
  );

  if (!canReadPage) {
    return <AccessDenied />;
  }

  if (secureSupabase == null) {
    return (
      <main className="grid min-h-[24vh] place-items-center">
        <LoadingSpinner />
      </main>
    );
  }

  return (
    <PagePermissionGuard pageName="scanning" operation="read" fallback={<AccessDenied />}>
      <main className="grid gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <section className="grid gap-2">
            <h1>Scanning Setup</h1>
            <p>Configure scan points and review scanning activity for {eventName}.</p>
          </section>
          {canReadPage ? (
            <section className="grid justify-items-stretch sm:justify-items-end">
              <Button type="button" variant="outline" onClick={() => navigate('/scanning/tracking')}>
                View Tracking Dashboard
              </Button>
            </section>
          ) : null}
        </header>

        {eventId == null || organisationId == null ? (
          <Card>
            <CardHeader>
              <CardTitle>No event selected</CardTitle>
              <CardDescription>Select an event from the header to configure scanning.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <section className="grid gap-2">
              {canCreate && !createLoading ? (
                <section className="grid justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setCreateValues(buildDefaultValues());
                      setCreateErrors({});
                      setCreateOpen(true);
                    }}
                  >
                    Create scan point
                  </Button>
                </section>
              ) : null}

              {scanPointsQuery.error != null ? (
                <Alert variant="destructive">
                  <AlertDescription>{NormalizeSupabaseError(scanPointsQuery.error).message}</AlertDescription>
                  <section>
                    <Button type="button" variant="outline" size="small" onClick={retryScanPointsQuery}>
                      Retry
                    </Button>
                  </section>
                </Alert>
              ) : (
                <>
                  <DataTable
                    data={scanPoints as unknown as Array<Record<string, unknown>>}
                    columns={scanPointColumns as never}
                    rbac={{ pageName: 'scanning' }}
                    title="Scan Points"
                    isLoading={scanPointsQuery.isLoading}
                    emptyState={{
                      title: 'No scan points configured',
                      description: 'No scan points have been configured for this event.',
                    }}
                    features={{
                      search: true,
                      pagination: true,
                      sorting: true,
                      filtering: false,
                      export: false,
                      import: false,
                      grouping: false,
                      columnVisibility: false,
                      editing: false,
                      creation: false,
                      selection: false,
                      deletion: false,
                      deleteSelected: false,
                      columnReordering: false,
                      hierarchical: false,
                    }}
                  />
                  {scanPoints.length === 0 && canCreate && !createLoading ? (
                    <section className="grid justify-start">
                      <Button type="button" onClick={() => setCreateOpen(true)}>
                        Create scan point
                      </Button>
                    </section>
                  ) : null}
                </>
              )}
            </section>

            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Manifests</CardTitle>
                  <CardDescription>Download on-demand participant manifests for offline scanning.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {MANIFEST_TYPES.map((contextType) => (
                      <Button
                        key={contextType}
                        type="button"
                        variant="outline"
                        disabled={manifestLoading[contextType]}
                        onClick={() => void onManifestDownload(contextType)}
                      >
                        {manifestLoading[contextType] ? <LoadingSpinner /> : `Download ${contextType[0].toUpperCase()}${contextType.slice(1)} Manifest`}
                      </Button>
                    ))}
                </CardContent>
              </Card>
            </section>

            <section>
              {conflictsQuery.error != null ? (
                <Alert variant="destructive">
                  <AlertDescription>{NormalizeSupabaseError(conflictsQuery.error).message}</AlertDescription>
                  <section>
                    <Button type="button" variant="outline" size="small" onClick={retryConflictsQuery}>
                      Retry
                    </Button>
                  </section>
                </Alert>
              ) : (
                <DataTable
                  data={(conflictsQuery.data ?? []) as unknown as Array<Record<string, unknown>>}
                  columns={conflictColumns as never}
                  rbac={{ pageName: 'scanning' }}
                  title="Sync Conflicts"
                  isLoading={conflictsQuery.isLoading}
                  emptyState={{ description: 'No unresolved sync conflicts.' }}
                  features={{
                    search: true,
                    pagination: true,
                    sorting: true,
                    filtering: false,
                    export: false,
                    import: false,
                    grouping: false,
                    columnVisibility: false,
                    editing: false,
                    creation: false,
                    selection: false,
                    deletion: false,
                    deleteSelected: false,
                    columnReordering: false,
                    hierarchical: false,
                  }}
                />
              )}
            </section>

            <section>
              {historyQuery.error != null ? (
                <Alert variant="destructive">
                  <AlertDescription>{NormalizeSupabaseError(historyQuery.error).message}</AlertDescription>
                  <section>
                    <Button type="button" variant="outline" size="small" onClick={retryHistoryQuery}>
                      Retry
                    </Button>
                  </section>
                </Alert>
              ) : (
                <DataTable
                  data={(historyQuery.data ?? []) as unknown as Array<Record<string, unknown>>}
                  columns={historyColumns as never}
                  rbac={{ pageName: 'scanning' }}
                  title="Scan History"
                  isLoading={historyQuery.isLoading}
                  emptyState={{ description: 'No scan events recorded yet.' }}
                  features={{
                    search: true,
                    pagination: true,
                    sorting: true,
                    filtering: false,
                    export: false,
                    import: false,
                    grouping: false,
                    columnVisibility: false,
                    editing: false,
                    creation: false,
                    selection: false,
                    deletion: false,
                    deleteSelected: false,
                    columnReordering: false,
                    hierarchical: false,
                  }}
                />
              )}
            </section>
          </>
        )}
      </main>

      <ScanPointDialog
        open={createOpen}
        title="Create scan point"
        submitLabel="Create scan point"
        values={createValues}
        errors={createErrors}
        activityOptions={activityOptions}
        transportOptions={transportOptions}
        pending={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onValuesChange={setCreateValues}
        onSubmit={(values) => void onCreateSubmit(values)}
      />

      <ScanPointDialog
        open={editOpen}
        title="Edit scan point"
        submitLabel="Save changes"
        values={editValues}
        errors={editErrors}
        activityOptions={activityOptions}
        transportOptions={transportOptions}
        pending={updateMutation.isPending}
        onOpenChange={setEditOpen}
        onValuesChange={setEditValues}
        onSubmit={(values) => void onEditSubmit(values)}
      />

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogPortal>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate scan point</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>
                <strong>{selectedPoint?.name ?? '—'}</strong>
              </p>
              <p>Deactivating this scan point will remove it from the live scanning list. Existing scan history will not be affected.</p>
            </DialogBody>
            <DialogFooter>
              <section className="grid grid-flow-col auto-cols-max justify-end gap-2">
                <Button type="button" variant="destructive" onClick={() => void onDeactivateConfirm()}>
                  Deactivate
                </Button>
                <Button type="button" variant="outline" onClick={() => setDeactivateOpen(false)}>
                  Cancel
                </Button>
              </section>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={conflictDetailOpen} onOpenChange={setConflictDetailOpen}>
        <DialogPortal>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conflict detail</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <dl className="grid grid-cols-[200px_1fr] gap-2">
                <dt>Scan point</dt>
                <dd>{selectedConflict?.scan_point_name ?? '—'}</dd>
                <dt>Card identifier</dt>
                <dd>{selectedConflict?.card_identifier ?? '—'}</dd>
                <dt>Result</dt>
                <dd>{selectedConflict?.validation_result ?? '—'}</dd>
                <dt>Original reason</dt>
                <dd>{selectedConflict?.validation_reason ?? '—'}</dd>
                <dt>Scanned at</dt>
                <dd>
                  {selectedConflict?.scanned_at != null
                    ? formatDateTime(selectedConflict.scanned_at)
                    : '—'}
                </dd>
                <dt>Synced at</dt>
                <dd>
                  {selectedConflict?.synced_at != null
                    ? formatDateTime(selectedConflict.synced_at)
                    : '—'}
                </dd>
                <dt>Notes</dt>
                <dd>{selectedConflict?.notes ?? '—'}</dd>
                <dt>Override by</dt>
                <dd>{selectedConflict?.override_by ?? '—'}</dd>
              </dl>
            </DialogBody>
            <DialogFooter>
              <section className="grid justify-end">
                <Button type="button" variant="outline" onClick={() => setConflictDetailOpen(false)}>
                  Close
                </Button>
              </section>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </PagePermissionGuard>
  );
}
