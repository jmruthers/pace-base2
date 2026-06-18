import { useMemo } from 'react';
import { Badge, Button } from '@solvera/pace-core/components';
import { ApplicationChecksMini } from '@/components/applications/ApplicationChecksMini';
import {
  applicationStatusLabel,
  applicationStatusVariant,
} from '@/features/applicationsAdmin/stateHelpers';
import type { ApplicationTableRow } from '@/components/applications/applicationQueueTypes';

export function useApplicationsTableColumns(args: {
  registrationTypeFilterOptions: Array<{ value: string; label: string }>;
  statusFilterOptions: Array<{ value: string; label: string }>;
  onViewDetail: (applicationId: string) => void;
}) {
  const { registrationTypeFilterOptions, statusFilterOptions, onViewDetail } = args;

  return useMemo(
    () => [
      {
        id: 'applicantLabel',
        accessorKey: 'applicantLabel',
        header: 'Applicant',
        sortable: true,
        cell: ({ row }: { row: ApplicationTableRow }) => (
          <>
            <p>{row.applicantLabel}</p>
            <small>{row.applicantEmail}</small>
          </>
        ),
      },
      {
        id: 'registrationTypeLabel',
        accessorKey: 'registrationTypeLabel',
        header: 'Registration type',
        sortable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: registrationTypeFilterOptions,
      },
      {
        id: 'unitLabel',
        accessorKey: 'unitLabel',
        header: 'Unit',
        sortable: true,
      },
      {
        id: 'submittedLabel',
        accessorKey: 'submittedLabel',
        header: 'Submitted',
        sortable: true,
      },
      {
        id: 'checksMini',
        accessorKey: 'checks',
        header: 'Checks',
        cell: ({ row }: { row: ApplicationTableRow }) => <ApplicationChecksMini checks={row.checks} />,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        sortable: true,
        enableColumnFilter: true,
        filterType: 'select' as const,
        filterSelectOptions: statusFilterOptions,
        cell: ({ row }: { row: ApplicationTableRow }) => (
          <Badge variant={applicationStatusVariant(row.status)}>{applicationStatusLabel(row.status)}</Badge>
        ),
      },
      {
        id: 'reviewAction',
        header: 'Review',
        cell: ({ row }: { row: ApplicationTableRow }) => (
          <Button type="button" variant="outline" onClick={() => onViewDetail(row.id)}>
            Review
          </Button>
        ),
      },
    ],
    [onViewDetail, registrationTypeFilterOptions, statusFilterOptions]
  );
}
