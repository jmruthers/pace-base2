import { useMemo } from 'react';
import { Badge, Button } from '@solvera/pace-core/components';
import {
  applicationStatusLabel,
  applicationStatusVariant,
  getChecksSummary,
} from '@/features/applicationsAdmin/stateHelpers';
import type { ApplicationTableRow } from '@/components/applications/applicationQueueTypes';

export function useApplicationsTableColumns(args: {
  registrationTypeFilterOptions: Array<{ value: string; label: string }>;
  statusFilterOptions: Array<{ value: string; label: string }>;
  onViewDetail: (applicationId: string) => void;
  onViewReviewSteps: (applicationId: string) => void;
}) {
  const { registrationTypeFilterOptions, statusFilterOptions, onViewDetail, onViewReviewSteps } = args;

  return useMemo(
    () => [
      {
        id: 'applicantLabel',
        accessorKey: 'applicantLabel',
        header: 'Applicant',
        sortable: true,
      },
      {
        id: 'applicantEmail',
        accessorKey: 'applicantEmail',
        header: 'Email',
        sortable: true,
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
        id: 'submittedLabel',
        accessorKey: 'submittedLabel',
        header: 'Submitted',
        sortable: true,
      },
      {
        id: 'checks',
        accessorKey: 'checks',
        header: 'Checks',
        cell: ({ row }: { row: ApplicationTableRow }) => {
          const summary = getChecksSummary(row.checks);
          if (summary == null) {
            return null;
          }
          return <Badge variant={summary.variant}>{summary.label}</Badge>;
        },
      },
      {
        id: 'queueActions',
        header: 'Actions',
        cell: ({ row }: { row: ApplicationTableRow }) => (
          <section className="grid grid-cols-1 gap-1 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => onViewDetail(row.id)}>
              View
            </Button>
            {row.checks.length > 0 ? (
              <Button type="button" variant="outline" onClick={() => onViewReviewSteps(row.id)}>
                View review steps
              </Button>
            ) : null}
          </section>
        ),
      },
    ],
    [onViewDetail, onViewReviewSteps, registrationTypeFilterOptions, statusFilterOptions]
  );
}
