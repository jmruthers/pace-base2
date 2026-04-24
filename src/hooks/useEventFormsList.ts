import { useQuery } from '@tanstack/react-query';
import { useSecureSupabase } from '@solvera/pace-core/rbac';
import type { FormListItem } from '@/pages/forms/eventScopedForms';

export const eventFormsQueryKey = (eventId: string | null) => ['event-forms', eventId] as const;

type FormsReadClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      in: (column: string, values: ReadonlyArray<string>) => {
        order: (
          column: string,
          options?: { ascending?: boolean }
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

interface FormRow {
  id: string;
  slug: string;
  title: string | null;
  name: string | null;
  workflow_type: string | null;
  access_mode: string | null;
}

interface FormFieldRow {
  form_id: string;
  field_key: string | null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function useEventFormsList(eventId: string | null) {
  const secureSupabase = useSecureSupabase();

  return useQuery<ReadonlyArray<FormListItem>, Error>({
    queryKey: eventFormsQueryKey(eventId),
    enabled: eventId != null && secureSupabase != null,
    queryFn: async () => {
      if (eventId == null || secureSupabase == null) {
        return [];
      }

      const client = secureSupabase as unknown as FormsReadClient;
      const { data: formsData, error: formsError } = await client
        .from('core_forms')
        .select('id, slug, title, name, workflow_type, access_mode')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false });

      if (formsError != null) {
        throw new Error(formsError.message);
      }

      const formRows = (Array.isArray(formsData) ? formsData : []) as ReadonlyArray<FormRow>;
      const formIds = formRows.map((row) => row.id).filter((value) => value.length > 0);

      const fieldKeyByFormId = new Map<string, string>();
      if (formIds.length > 0) {
        const { data: fieldsData, error: fieldsError } = await client
          .from('core_form_fields')
          .select('form_id, field_key')
          .in('form_id', formIds)
          .order('sort_order', { ascending: true });

        if (fieldsError != null) {
          throw new Error(fieldsError.message);
        }

        const fieldRows = (Array.isArray(fieldsData) ? fieldsData : []) as ReadonlyArray<FormFieldRow>;
        for (const row of fieldRows) {
          const formId = asString(row.form_id);
          if (formId.length === 0 || fieldKeyByFormId.has(formId)) {
            continue;
          }
          fieldKeyByFormId.set(formId, asString(row.field_key));
        }
      }

      return formRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: asString(row.title) || asString(row.name),
        workflowType: asString(row.workflow_type),
        accessMode: asString(row.access_mode),
        fieldKey: fieldKeyByFormId.get(row.id) ?? '',
      }));
    },
  });
}
