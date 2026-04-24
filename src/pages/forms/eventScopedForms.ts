export interface FormListItem {
  id: string;
  slug: string;
  title: string;
  workflowType: string;
  accessMode: string;
  fieldKey: string;
}

export function getEventScopedFormBySlug(
  forms: ReadonlyArray<FormListItem>,
  slug: string
): FormListItem | undefined {
  return forms.find((form) => form.slug === slug);
}
