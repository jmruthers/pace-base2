import { useMemo } from 'react';
import { Badge, Button } from '@solvera/pace-core/components';
import { PagePermissionGuard } from '@solvera/pace-core/rbac';
import { formatDate } from '@solvera/pace-core/utils';
import type { CoreFormListRow } from '@/features/formsAuthoring/types';

export type FormsListTableRow = CoreFormListRow &
  Record<string, unknown> & {
    lastEditedLabel: string;
  };

function statusVariant(status: CoreFormListRow['status']) {
  if (status === 'published') {
    return 'solid-main-normal';
  }
  if (status === 'closed') {
    return 'outline-sec-muted';
  }
  return 'soft-sec-muted';
}

function countCellLabel(params: {
  formId: string;
  counts: Record<string, number> | undefined;
  isCountsLoading: boolean;
  countError: Error | null;
}) {
  if (params.countError != null) {
    return '?';
  }
  if (params.isCountsLoading && params.counts == null) {
    return '—';
  }
  return String(params.counts?.[params.formId] ?? 0);
}

export function useFormsListTableColumns(args: {
  scope: {
    organisationId?: string | null;
    eventId?: string | null;
    appId?: string | null;
  };
  fieldCounts: Record<string, number> | undefined;
  fieldCountsLoading: boolean;
  fieldCountsError: Error | null;
  responseCounts: Record<string, number> | undefined;
  responseCountsLoading: boolean;
  responseCountsError: Error | null;
  deleteCheckFormId: string | null;
  onEdit: (form: CoreFormListRow) => void;
  onPreview: (form: CoreFormListRow) => void;
  onRequestDelete: (form: CoreFormListRow) => void;
}) {
  const {
    scope,
    fieldCounts,
    fieldCountsLoading,
    fieldCountsError,
    responseCounts,
    responseCountsLoading,
    responseCountsError,
    deleteCheckFormId,
    onEdit,
    onPreview,
    onRequestDelete,
  } = args;

  return useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        sortable: true,
        cell: ({ row }: { row: FormsListTableRow }) => (
          <>
            <strong>{row.name}</strong>
            <small>/{row.slug}</small>
          </>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        sortable: true,
        cell: ({ row }: { row: FormsListTableRow }) => (
          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
        ),
      },
      {
        id: 'fieldsCount',
        header: 'Fields',
        sortable: true,
        align: 'right' as const,
        accessorFn: (row: FormsListTableRow) =>
          countCellLabel({
            formId: row.id,
            counts: fieldCounts,
            isCountsLoading: fieldCountsLoading,
            countError: fieldCountsError,
          }),
        cell: ({ row }: { row: FormsListTableRow }) =>
          countCellLabel({
            formId: row.id,
            counts: fieldCounts,
            isCountsLoading: fieldCountsLoading,
            countError: fieldCountsError,
          }),
      },
      {
        id: 'responsesCount',
        header: 'Responses',
        sortable: true,
        align: 'right' as const,
        accessorFn: (row: FormsListTableRow) =>
          countCellLabel({
            formId: row.id,
            counts: responseCounts,
            isCountsLoading: responseCountsLoading,
            countError: responseCountsError,
          }),
        cell: ({ row }: { row: FormsListTableRow }) =>
          countCellLabel({
            formId: row.id,
            counts: responseCounts,
            isCountsLoading: responseCountsLoading,
            countError: responseCountsError,
          }),
      },
      {
        id: 'lastEditedLabel',
        accessorKey: 'lastEditedLabel',
        header: 'Last edited',
        sortable: true,
        align: 'right' as const,
      },
      {
        id: 'rowActions',
        header: 'Actions',
        cell: ({ row }: { row: FormsListTableRow }) => (
          <section className="grid grid-cols-1 gap-1 md:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onPreview(row);
              }}
            >
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onEdit(row);
              }}
            >
              Edit
            </Button>
            <PagePermissionGuard pageName="FormsPage" operation="update" scope={scope} fallback={null}>
              <Button
                type="button"
                variant="outline"
                disabled={deleteCheckFormId === row.id}
                onClick={() => {
                  void onRequestDelete(row);
                }}
              >
                Delete
              </Button>
            </PagePermissionGuard>
          </section>
        ),
      },
    ],
    [
      deleteCheckFormId,
      fieldCounts,
      fieldCountsError,
      fieldCountsLoading,
      onEdit,
      onPreview,
      onRequestDelete,
      responseCounts,
      responseCountsError,
      responseCountsLoading,
      scope,
    ]
  );
}

export function mapFormsListTableRows(forms: CoreFormListRow[]): FormsListTableRow[] {
  return forms.map((form) => ({
    ...form,
    lastEditedLabel:
      form.updated_at != null && form.updated_at.length > 0 ? formatDate(form.updated_at) : '—',
  }));
}
