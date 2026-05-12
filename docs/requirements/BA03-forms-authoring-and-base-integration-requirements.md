# BA03 — Forms Authoring and BASE Integration

## Slice metadata

- Status: Draft
- Depends on: BA00 (App Shell and Access), BA01 (Event Workspace and Configuration — `/forms` is event-scoped and receives navigation from the BA01 dashboard), BA02 (Shared Forms Platform Contracts)
- Backend impact: Read + write contracts; no schema changes in this slice (schema changes owned by BA02 and the Q12 DB fix)
- Frontend impact: UI

## 2. Overview

This slice owns the two surfaces through which BASE operators author and manage workflow forms for an event: a forms list page and a form builder page. The forms list gives operators a card-grid view of all forms for the selected event, with actions to create, edit, preview, copy the portal URL, and delete forms. The form builder provides a full authoring surface for form metadata, fields, submission scheduling, and registration type bindings, built around the `WorkflowFormAuthoringShell` from pace-core2. All mutations go through RPC boundaries (`app_base_form_upsert`, `app_base_form_fields_replace`, `app_base_form_delete`, and registration-binding RPCs). The slice is scoped to BASE admin authoring only; participant-facing form submission surfaces are not in scope.

---

## 3. What this slice delivers

### 3.1 Forms List (`/forms`)

**Purpose.** Give event operators a complete view of all workflow forms authored for the selected event, and provide the affordances to create new forms, edit or preview existing ones, copy their portal URLs, and delete them.

**Surfaces.**
- The `/forms` route rendered inside the BA00 authenticated shell.
- A page header (h1 + subtitle).
- A responsive card grid of one card per form.
- A "Create Form" button (permission-gated).
- A `ConfirmationDialog` for delete confirmation.
- A blocking information dialog shown when deletion is prevented by existing submissions or registration bindings.

**Boundaries.**
- This slice does not own the event picker — that lives in the BA00 shell consumed via `useEvents()`.
- This slice does not own the form portal itself — it constructs portal URLs using `buildWorkflowPreviewTarget` and `VITE_PORTAL_BASE_URL` but does not own the portal routes.
- This slice does not own registration type creation or management — it only reads `base_registration_type` rows.
- This slice does not own form submission review — BA06 owns that surface.

**Architectural posture.**
- All reads use `useSecureSupabase()` from `@solvera/pace-core/rbac`. No unscoped direct Supabase client queries.
- All mutations use the `app_base_form_upsert`, `app_base_form_fields_replace`, and `app_base_form_delete` RPCs via `useSecureSupabase().rpc(...)`.
- Permission gating uses `PagePermissionGuard` from `@solvera/pace-core/rbac`. The retired `useCan` hook must not be used.
- Page is wrapped by `PagePermissionGuard` for the page-level read check.
- Portal URL construction uses `buildWorkflowPreviewTarget` from `@solvera/pace-core/forms` combined with the `VITE_PORTAL_BASE_URL` environment variable.
- Import policy is root-first for consuming apps: use `@solvera/pace-core` by default. Scoped entrypoints (`/forms`, `/rbac`, `/components`) are exception paths used when root does not expose the required symbol or a documented advanced/performance/migration case applies.

**Page-level guards and evaluation ordering.**
- **Evaluation order on `/forms`:** `PagePermissionGuard` fires first. If denied, `<AccessDenied />` renders and the no-event state is never reached.
- **Scope object when no event is selected:** `{ organisationId, eventId: null, appId }` from resolved RBAC scope. `eventId` is `null` when no event is selected.
- **Guard behaviour with `eventId: null`:** the guard evaluates the scope with the null event ID. If the guard passes (e.g. the user has org-level read permission), the no-event empty state renders. If the guard fails with a null event ID, `<AccessDenied />` renders. The build agent must not assume a specific pass/fail outcome — it must render whatever the guard returns.
- **Practical guard-before-empty-state rule:** `PagePermissionGuard` always wraps the entire page. The no-event empty state only appears inside the authenticated, permitted shell.

### 3.2 Form Builder (`/form-builder`)

**Purpose.** Allow operators with create or update permission to author the full definition of a workflow form: its metadata (name, slug, workflow type, access mode, status, scheduling, submission settings), its fields (using `WorkflowFormFieldEditor`), and — for `base_registration` forms — its registration type bindings.

**Surfaces.**
- The `/form-builder` route rendered inside the BA00 authenticated shell.
- Create mode: navigated to from `/forms` "Create Form" button; URL is `/form-builder` (no query params).
- Edit mode: navigated to from a form card's "Edit" action; URL is `/form-builder?formId={uuid}`.
- `WorkflowFormAuthoringShell` with BASE-specific props (`heading`, `allowedWorkflowTypes`, `slugReadOnly`, `middleContent`).
- A BASE-specific "Schedule" panel (inside `middleContent`) for `opens_at`/`closes_at`.
- A BASE-specific "Submission Settings" panel (inside `middleContent`) for `max_submissions` and `confirmation_message`.
- A BASE-specific `RegistrationTypeBindingPanel` (inside `middleContent`, shown only when `workflowType === 'base_registration'`) for managing `base_form_registration_type` rows.
- A no-event blocking state that prevents the builder from rendering when no event is selected.

**Boundaries.**
- This slice does not own the `WorkflowRegistrationTypeSelector` component — that is a participant-facing runtime component owned by pace-core2 and consumed in the portal.
- This slice does not own registration type definition or lifecycle — it only reads `base_registration_type` for binding purposes.
- This slice does not own form submission viewing — BA06 owns that.
- The shell's validation (`validateWorkflowAuthoringState`) is built into the shell — this slice does not replicate it.

**Architectural posture.**
- The builder uses `WorkflowFormAuthoringShell` from `@solvera/pace-core/forms`. It does not compose `WorkflowFormMetadataEditor` and `WorkflowFormFieldEditor` directly; it uses the shell and customises it via the props listed in §9.2.
- Save flow makes three sequential async calls: `app_base_form_upsert` → `app_base_form_fields_replace` → (if `base_registration`) registration-binding RPC write. Each failure aborts the sequence and shows a destructive toast.
- Registration bindings are read/written via canonical backend RPCs (`app_base_form_registration_bindings_get`, `app_base_form_registration_bindings_replace`) scoped to form/event/organisation context.
- `onStateChange` from the shell is intercepted in the builder page for slug auto-generation (new forms) and to pass updated state to local React state.

**Page-level guards and evaluation ordering.**
- **Evaluation order on `/form-builder`:** `PagePermissionGuard` fires first. If denied, `<AccessDenied />` renders. If permitted, check for event context: if no event is selected, show the no-event blocking card. If event is present and `formId` query param is provided, show loading state while the form loads. If `formId` is absent, render the shell in create mode immediately.
- **Guard scope when no event is selected:** `{ organisationId, eventId: null, appId }` from resolved RBAC scope. Same behaviour as `/forms`: guard evaluates with null event ID; if it passes, the no-event card renders.
- **Guard behaviour during form load (edit mode):** the `PagePermissionGuard` renders its children immediately (not loading-gated); the loading state for form data renders inside the children, not as a guard state.

---

## 4. Functional specification

Items prefixed `FL-` belong to the Forms List surface; items prefixed `FB-` belong to the Form Builder surface. Each item is independently testable.

### 4.1 Forms List — `/forms`

**Page entry**

1. FL-PE-01 — On entry, the page renders inside the BA00 authenticated shell. The URL is `/forms`. The page reads the selected event from `useEvents()` and, when an event is present, fetches all `core_forms` rows for that event in descending `created_at` order (no `is_active` filter — all forms for the event are shown). After the list payload is available, a field-count batch query runs against `core_form_fields` (see §6.7).
2. FL-PE-02 — Page header renders an h1 reading "Forms" and a subtitle reading "Manage workflow forms for this event."

**Loading states**

3. FL-LS-01 — While the forms list is loading, the content area below the page header renders a centred `LoadingSpinner` with no additional copy. The page header and "Create Form" button render immediately; only the card grid area shows the spinner.

**Empty states**

4. FL-ES-01 — When no event is selected (`selectedEvent` is null from `useEvents()`), the card grid does not render and the "Create Form" button does not render. A `Card` is rendered in the content area with the message: "Select an event from the header to manage forms." The page header still renders.
5. FL-ES-02 — When an event is selected and the query returns zero forms, the card grid does not render. A `Card` is rendered in the content area with the message: "No forms yet. Create your first form to get started." If the user has create permission, the "Create Form" button is visible above this card.

**Error states**

6. FL-ER-01 — If the forms list query fails (network error or RLS denial), the card grid does not render. A destructive `Alert` renders in its place with the normalised error message (obtained via `NormalizeSupabaseError(error).message`) and no retry affordance. The "Create Form" button and page header remain visible.

**Primary content — form card**

Each form in the list renders as a `Card`. Every field listed below appears on every card unless noted otherwise.

7. FL-PC-01 — Card title: the form's `name`.
8. FL-PC-02 — Field count: displayed as "N fields" where N is the count of `core_form_fields` rows with `is_active = true` for that form (from the batch query, §6.7). While the count is loading, renders "— fields". If the count query fails, renders "? fields".
9. FL-PC-03 — Status badge: rendered using `Badge` with variant per BR-01 (§6.1). Values: `draft`, `published`, `closed`.
10. FL-PC-04 — Workflow type: displayed as a plain text label beneath the title (e.g. "base_registration", "generic"). No badge.
11. FL-PC-05 — Opens at: when `opens_at` is non-null, displays a "Opens: {date}" line using `formatDate` from `@solvera/pace-core`. When `opens_at` is null, this line is not rendered.
12. FL-PC-06 — Closes at: when `closes_at` is non-null, displays a "Closes: {date}" line using `formatDate`. When null, omitted.
13. FL-PC-07 — Card action row: four icon buttons rendered in the card footer in the order: Edit, Preview, Copy URL, Delete. Each is a `Button` with an icon and a tooltip-style `aria-label`. Spacing: evenly distributed in a single row container (grid or flex).
14. FL-PC-08 — Edit button: navigates to `/form-builder?formId={form.id}` using React Router `useNavigate`.
15. FL-PC-09 — Preview button: opens the form's full portal URL in a new browser tab (`window.open(url, '_blank')`). Full URL constructed per §6.3.
16. FL-PC-10 — Copy URL button: copies the form's full portal URL to the clipboard via `navigator.clipboard.writeText(url)`. On success, the button icon switches to a checkmark for 2 seconds then reverts. On clipboard API failure, shows a destructive toast: "Could not copy URL to clipboard." Visible on all forms regardless of status.
17. FL-PC-11 — Delete button: opens a confirmation dialog (see FL-PA-03). Visible only when the user has `update` permission on `forms` (§10).

**Primary actions**

18. FL-PA-01 — "Create Form" button: rendered in the page header area, right-aligned. Label: "Create Form". Navigates to `/form-builder` (no query params). Visible only when the user has `create` permission on `forms` (§10). Hidden when no event is selected.
19. FL-PA-02 — Delete confirmation dialog: a `ConfirmationDialog` with `title="Delete form"`, `description="Are you sure you want to delete '{form.name}'? This action cannot be undone."`, `confirmLabel="Delete"`, `cancelLabel="Cancel"`, `variant="destructive"`. On cancel: dialog closes, no action taken.
20. FL-PA-03 — Delete confirmation — on confirm: the `app_base_form_delete` RPC is called with the selected event's ID and the form's ID. While the RPC is in flight, the dialog's `isPending` prop is `true` (button disabled + loading indicator). On completion, the dialog closes.
21. FL-PA-04 — Delete outcome — blocked: if the RPC returns `{ deleted: false, response_count, registration_binding_count }`, the confirmation dialog closes and a second information dialog opens with `title="Cannot delete form"` and a description per §6.5. The form list is not refreshed. The information dialog has only an "OK" button (uses `confirmLabel="OK"`, `cancelLabel` hidden by passing `cancelLabel={null}`).

    > **Verified (2026-05-01):** `ConfirmationDialog` does not support a single-button mode — `cancelLabel` is always rendered unconditionally. Implement the blocking dialog using `Dialog`, `DialogPortal`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, and `Button` from pace-core2 directly (all are exports of the `ConfirmationDialog` module's internal `Dialog.js` — verify the public export path in §9 at build time).

22. FL-PA-05 — Delete outcome — success: if the RPC returns `{ deleted: true }`, the confirmation dialog closes, the form card is removed from the list (optimistically or via list refetch), and a success toast fires: "Form deleted successfully."
23. FL-PA-06 — Delete outcome — RPC error: the confirmation dialog closes, a destructive toast fires with the normalised error message via `HandleMutationError`.

**Permission-conditional rendering**

24. FL-PR-01 — The page is wrapped in `PagePermissionGuard` with `pageName="forms"`, `operation="read"`, `scope={{ organisationId, eventId, appId }}`. If denied, `<AccessDenied />` renders and no page content is shown.
25. FL-PR-02 — The "Create Form" button is wrapped in `PagePermissionGuard` with `pageName="forms"`, `operation="create"`, `scope={{ organisationId, eventId, appId }}`, `fallback={null}`. Hidden if denied.
26. FL-PR-03 — The Delete button on each card is wrapped in `PagePermissionGuard` with `pageName="forms"`, `operation="update"`, `scope={{ organisationId, eventId, appId }}`, `fallback={null}`. Hidden if denied. (The delete RPC uses the `update` permission key per §10.)

**Navigation**

27. FL-NV-01 — "Create Form" navigates to `/form-builder`. Event context is maintained by the shell across the navigation.
28. FL-NV-02 — "Edit" on a form card navigates to `/form-builder?formId={form.id}`.

**Edge cases and constraints**

29. FL-EC-01 — If `VITE_PORTAL_BASE_URL` is undefined or empty, the Preview and Copy URL buttons are rendered but clicking either shows a destructive toast: "Portal URL is not configured. Set VITE_PORTAL_BASE_URL." No navigation or clipboard write occurs.
30. FL-EC-02 — Event slug availability: if `selectedEvent.slug` is undefined, the portal URL is constructed using a slug derived from `selectedEvent.event_name` using the slug derivation algorithm in §6.2. The derivation is applied at render time and is not shown to the user.
31. FL-EC-03 — Forms where `is_active = false` are still displayed in the list — the admin surface shows all forms regardless of active state. The status badge shows `draft`, `published`, or `closed` and is the primary visibility indicator.

---

### 4.2 Form Builder — `/form-builder`

**Page entry**

32. FB-PE-01 — **Create mode** (no `formId` query param): on entry, the builder renders with the shell in an empty state. Initial `WorkflowAuthoringState` is set per §6.8. The page heading reads "Create Form". No data fetches are required before the shell renders. `useUnifiedAuth().selectedEventId` and `selectedOrganisationId` are populated into `state.metadata.eventId` and `state.metadata.organisationId` respectively.
33. FB-PE-02 — **Edit mode** (`?formId={uuid}` query param present): on entry, the builder shows a loading state while it fetches the saved `core_forms` row and its `core_form_fields` rows in parallel. If `workflowType === 'base_registration'`, a third fetch loads the saved form registration bindings for the form via registration-binding RPCs. The page heading reads "Edit Form" in this mode.
34. FB-PE-03 — The URL for create mode is `/form-builder`. The URL for edit mode is `/form-builder?formId={uuid}`. The builder reads the `formId` param from the URL via React Router's `useSearchParams`.

**Loading states**

35. FB-LS-01 — In edit mode, while the form data fetches are in flight, the content area renders a centred `LoadingSpinner` with the caption "Loading form…". The shell does not render during this loading phase. No page-level h1 is rendered above the spinner.

**No-event state**

36. FB-NV-01 — When no event context is available (`selectedEvent` is null from `useEvents()` or `selectedEventId` is null from auth context), the shell does not render. A `Card` is shown with the message: "Select an event from the header before creating or editing a form." No page-level h1 is rendered above the card — the BA00 shell header provides navigation context. This state takes precedence over the loading state and the shell.

**Error states**

37. FB-ER-01 — If the form fetch fails in edit mode (form not found, network error, or RLS denial), the loading state ends and an error card renders in place of the shell: a destructive `Alert` with the normalised error message. The user can navigate back to `/forms` via the "Back to Forms" link that appears below the alert.
38. FB-ER-02 — If the `base_registration_type` fetch fails for the binding panel, the `RegistrationTypeBindingPanel` renders with the error state (see §5.2 — Binding panel error) and does not block the rest of the builder from rendering.

**Primary content — shell and metadata**

39. FB-PC-01 — `WorkflowFormAuthoringShell` renders with these BASE-specific props:
    - `heading`: "Create Form" (create mode) or "Edit Form" (edit mode).
    - `subheading`: "Define this form's metadata, fields, and submission settings."
    - `allowedWorkflowTypes`: the `BASE_WORKFLOW_TYPES` constant (§6.6) — all types except `org_signup`.
    - `slugReadOnly`: `true` when `state.metadata.status === 'published'`, `false` otherwise.
    - `middleContent`: the `<BaseFormExtensions>` composite panel (§4.2 FB-PC-05).
    - `onSave`: the builder's save handler (§6.9).
    - `onStateChange`: the builder's intercepting state handler (§6.10).
    - `eventSlug`: the event slug string (from `selectedEvent.slug` or derived per §6.2).
    - `saveLabel`: "Save Form".
40. FB-PC-02 — The shell's embedded `WorkflowFormMetadataEditor` renders the following fields (supplied by the shell, not composed separately): Name, Slug (read-only when `status='published'` via `slugReadOnly`), Description, Workflow type (filtered to `BASE_WORKFLOW_TYPES`), Access mode, Status, Primary entrypoint checkbox, Active checkbox.
41. FB-PC-03 — The shell's embedded `WorkflowFormFieldEditor` renders below the metadata editor (and below the `middleContent` slot). It shows all fields in the current `state.fields` array. Default field type is `text`; default field key is `generic.field_N` (generated by the editor). "Add field" appends a new field. "Remove field" removes it from the array.
42. FB-PC-04 — The shell's validation summary renders automatically via the shell. When `validateWorkflowAuthoringState(state).isValid` is `false`, the Save button is disabled and the validation summary shows the error list. When valid, the summary shows a "Ready" alert.

**Primary content — middleContent panels**

43. FB-PC-05 — The `middleContent` slot renders three panels in vertical order:
    1. "Schedule" panel — always visible.
    2. "Submission Settings" panel — always visible.
    3. `RegistrationTypeBindingPanel` — visible only when `state.metadata.workflowType === 'base_registration'`.
44. FB-PC-06 — **Schedule panel**: a `Card` with title "Schedule". Contains two date inputs side by side:
    - "Opens at" — `DatePickerWithTimezone` with `value` (Date | null) and `onChange`. Maps to `state.metadata.opensAt` (stored as ISO 8601 string; convert to/from `Date` at the input boundary per §6.11). Optional.
    - "Closes at" — same component. Maps to `state.metadata.closesAt`. Optional.
    When either value changes, `onStateChange` is called with the updated ISO string in `metadata.opensAt` or `metadata.closesAt`.
45. FB-PC-07 — **Submission Settings panel**: a `Card` with title "Submission Settings". Contains:
    - "Max submissions" — number `Input`, min 1, optional. Maps to `state.metadata.workflowConfig.max_submissions`. When blank/cleared, the value is `null` in `workflowConfig`.
    - "Confirmation message" — `Textarea`, optional. Maps to `state.metadata.workflowConfig.confirmation_message`. Helper text: "Shown to participants after successful form submission."
46. FB-PC-08 — **RegistrationTypeBindingPanel** (shown only when `workflowType === 'base_registration'`): a `Card` with title "Registration Type Bindings". Renders a list of all active `base_registration_type` rows for the current event (fetched on panel mount). Each row shows: a checkbox (bound/unbound), the type `name`, and a radio button for "Set as default" (enabled only on checked rows). State of the panel is maintained in local React state (`bindings: { typeId: string, isDefault: boolean }[]`) and is passed to the save handler on Save (§6.9). Full binding panel spec in §5.2.

**Primary actions — save**

47. FB-PA-01 — Save button: rendered by the shell (`saveLabel="Save Form"`). Disabled when `validateWorkflowAuthoringState(state).isValid` is `false`, or when `isSaving === true` (the page tracks save in-flight state and passes `disabled={isSaving}` to the shell, preventing double-submit). When clicked, the builder's `onSave` handler fires.
48. FB-PA-02 — On save success: the builder navigates to `/forms` via React Router. A success toast fires: "Form saved successfully." (toast fires before navigation so it appears on the list page).
49. FB-PA-03 — On save error: a destructive toast fires with the normalised error message. The builder stays on `/form-builder`; the state is unchanged. The user can retry.

**Permission-conditional rendering**

50. FB-PR-01 — The page is wrapped in `PagePermissionGuard` with `pageName="form-builder"`, `operation="read"`, `scope={{ organisationId, eventId, appId }}`. If denied, `<AccessDenied />` renders.
51. FB-PR-02 — The Save button is wrapped additionally in `PagePermissionGuard` with `pageName="form-builder"`, `operation="update"`, `fallback={null}`. If denied, the Save button is hidden. The metadata and field editors remain visible (read-only effect via `disabled={true}` on the shell when the user does not have update permission).

**Navigation**

52. FB-NV-01 — After a successful save, the builder navigates to `/forms` with React Router.
53. FB-NV-02 — The "Back to Forms" link in the error state (FB-ER-01) navigates to `/forms`.

**Edge cases and constraints**

54. FB-EC-01 — In edit mode, if `formId` does not match any `core_forms` row scoped to the current event (the upsert RPC enforces event scope), the form fetch returns null or an error, and the error state (FB-ER-01) renders.
55. FB-EC-02 — When `workflowType` changes away from `base_registration`, the binding panel unmounts. The `bindings` state is reset. If the user switches back to `base_registration`, the binding panel mounts fresh and re-fetches the available types (existing DB bindings for this form are also re-fetched in edit mode).
56. FB-EC-03 — The `workflowConfig` field passed to the upsert RPC includes `returnUrl`, `preSubmissionChecks`, and all other keys in `state.metadata.workflowConfig`. The `max_submissions` and `confirmation_message` keys are extracted from `workflowConfig` and sent as top-level keys in `p_definition` — they are not stored inside the `workflow_config` JSON column (see §7.2 write contract).

---

## 5. Visual specification

- Visual scope is `/forms` and `/form-builder` authoring surfaces only.
- Keep this section to layout/state rendering; persistence contracts remain in §4/§7.
- Registration binding visuals reflect persisted contract state only.

## 6. Business rules

### BR-01 — Status badge mapping

| `status` value | Badge variant | Visual |
|---|---|---|
| `draft` | `soft-sec-muted` | Muted grey |
| `published` | `solid-main-normal` | Accent primary |
| `closed` | `outline-sec-muted` | Outlined grey |

Applied in the forms list card header on every `Badge` rendering the form status.

### BR-02 — `opens_at` / `closes_at` date display

- Both dates are stored as `timestamptz` and must be formatted for display using `formatDate` from `@solvera/pace-core`.
- If `opens_at` is null, the "Opens:" line is not rendered on the form card.
- If `closes_at` is null, the "Closes:" line is not rendered.
- Both lines are display-only on the list page.

### BR-03 — Portal URL construction (preview and copy)

Inputs: `form` (a forms list row with `workflow_type`, `slug`, `is_primary_entrypoint`), `eventSlug` (string), `VITE_PORTAL_BASE_URL` (string, no trailing slash).

```
partialState = {
  metadata: {
    workflowType: form.workflow_type,
    slug: form.slug,
    isPrimaryEntrypoint: form.is_primary_entrypoint,
    ... (other fields set to defaults)
  },
  fields: []
}
previewTarget = buildWorkflowPreviewTarget(partialState, { eventSlug })
portalUrl = `${VITE_PORTAL_BASE_URL}${previewTarget.path}`
```

- If `VITE_PORTAL_BASE_URL` is undefined or empty, no URL is constructed and the user is shown a destructive toast.
- `buildWorkflowPreviewTarget` path rules (from pace-core2):
  - `base_registration` + `isPrimaryEntrypoint=true` → `/{eventSlug}/application`
  - `base_registration` + `isPrimaryEntrypoint=false` → `/{eventSlug}/{slug}`
  - Any other type → `/forms/{slug}`

### BR-04 — Event slug derivation

`EventReadModel` (the shape returned by `useEvents()`) does not have a typed `slug` property. The event name is exposed as `selectedEvent.name`. Derive the event slug as follows:

```
// Try runtime slug first (may exist via index signature if EventService fetches it)
eventSlug = (selectedEvent as Record<string, unknown>).slug as string | undefined

// Fall back to derivation from selectedEvent.name
if (!eventSlug) {
  eventSlug = (selectedEvent.name ?? '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Final fallback if derivation produces empty string
if (!eventSlug) eventSlug = 'event'
```

**Verified (2026-05-01):** `EventReadModel.name` is the correct property for the event name. The BASE-local `EventConfiguration` type uses `event_name` but that type is not returned by `useEvents()` — do not reference it.

### BR-05 — Slug derivation from form name

Used by the builder's `onStateChange` interceptor to auto-generate the slug when the form name changes in create mode.

```
slug = name.toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
```

Edge cases:
- Empty or whitespace name → slug = `""` (empty; shell validation will reject it)
- Name produces a slug that fails `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` → the shell validation summary will surface the error

### BR-06 — Slug lock rule

When `state.metadata.status === 'published'` and the form has an existing `id` (edit mode), the slug must be read-only. Users cannot change the slug of a published form.

Implementation contract: pass `slugReadOnly={true}` to `WorkflowFormAuthoringShell` whenever `state.metadata.status === 'published'` in edit mode. The shell forwards this to `WorkflowFormMetadataEditor` so the slug field is rendered read-only.

In create mode (`!state.metadata.id`), the slug is editable and initially auto-generated from the name per BR-05. If the user manually edits the slug field, subsequent name changes no longer override it (see BR-13 for the interceptor logic that tracks this).

### BR-07 — Field count query

The field count displayed on each form card is derived from a batch query run once after the forms list loads:

1. Collect `form_id` values from all forms in the list.
2. Query: `SELECT form_id FROM core_form_fields WHERE form_id IN ($formIds) AND is_active = true`.
3. Count rows per `form_id` in JavaScript.
4. Map back to each form card by `form_id`.

If the forms list is empty, no count query is made. If the batch query fails, all cards show "? fields".

### BR-08 — Delete flow

1. User clicks "Delete" on a form card.
2. Confirmation dialog opens (destructive variant).
3. User confirms → `app_base_form_delete(p_event_id, p_form_id)` is called via `useSecureSupabase().rpc(...)`.
4. RPC returns `{ deleted, response_count, registration_binding_count }`.
5. If `deleted === true` → dialog closes, form removed from list, success toast "Form deleted successfully."
6. If `deleted === false` → dialog closes, blocking dialog opens per §5.1.
7. On RPC error → dialog closes, error toast via `HandleMutationError`.

The RPC internally performs all cascade logic (deletes fields, then the form). The client does not perform any cascading deletes.

### BR-09 — Delete blocking message

When `deleted === false`:

```
"'{form.name}' cannot be deleted because it has {response_count} submission(s) and {registration_binding_count} registration type binding(s). Remove these first before deleting."
```

Only show counts that are > 0. If `response_count === 0` and `registration_binding_count > 0`, say: "'{form.name}' cannot be deleted because it has {N} registration type binding(s). Remove these first before deleting." Adjust the sentence symmetrically for the opposite case.

### BR-10 — Allowed workflow types in BASE (BASE_WORKFLOW_TYPES)

```typescript
const BASE_WORKFLOW_TYPES: WorkflowType[] = [
  'base_registration',
  'information_collection',
  'activity_booking',
  'merch_order',
  'consent_capture',
  'generic',
]
```

`org_signup` is excluded because it is an org-level workflow type, not event-scoped. This constant is passed to the shell's `allowedWorkflowTypes` prop.

### BR-11 — Initial WorkflowAuthoringState for create mode

```typescript
{
  metadata: {
    id: undefined,
    eventId: selectedEventId,        // from useUnifiedAuth().selectedEventId
    organisationId: selectedOrganisationId,  // from useUnifiedAuth().selectedOrganisationId
    slug: '',
    name: '',
    description: undefined,
    workflowType: 'generic',
    accessMode: 'authenticated_member',
    status: 'draft',
    opensAt: null,
    closesAt: null,
    workflowConfig: {},
    isActive: true,
    isPrimaryEntrypoint: false,
  },
  fields: [],
}
```

### BR-12 — Loading an existing form into WorkflowAuthoringState (edit mode)

Map the `core_forms` DB row and `core_form_fields` rows into `WorkflowAuthoringState` as follows:

```typescript
{
  metadata: {
    id: form.id,
    eventId: form.event_id,
    organisationId: form.organisation_id,
    slug: form.slug,
    name: form.name,
    description: form.description ?? undefined,
    workflowType: form.workflow_type as WorkflowType,
    accessMode: form.access_mode as WorkflowAccessMode,
    status: form.status as WorkflowFormStatus,
    opensAt: form.opens_at ?? null,
    closesAt: form.closes_at ?? null,
    workflowConfig: {
      ...(form.workflow_config ?? {}),
      max_submissions: form.max_submissions ?? null,
      confirmation_message: form.confirmation_message ?? null,
    },
    isActive: form.is_active ?? true,
    isPrimaryEntrypoint: form.is_primary_entrypoint ?? false,
  },
  fields: fields.map((f) => ({
    id: f.id,
    fieldKey: f.field_key,
    fieldType: (f.display_options as Record<string, unknown>)?.field_type as string ?? 'text',
    fieldLabel: f.field_label ?? undefined,
    sortOrder: f.sort_order,
    isActive: f.is_active ?? true,
    isRequired: f.is_required ?? false,
    displayOptions: f.display_options ?? undefined,
  })),
}
```

### BR-13 — `WorkflowAuthoringState` change interceptor

The builder page defines a `handleStateChange` function passed to the shell's `onStateChange` prop. The page also maintains a `lastAutoGenSlug` ref (`useRef('')`) to track the last auto-generated slug value, enabling the "do not overwrite manual slug edits" behaviour.

```
function handleStateChange(nextState: WorkflowAuthoringState):
  // Slug auto-gen for new forms only (create mode = no id)
  if (!nextState.metadata.id):
    if nextState.metadata.name !== currentState.metadata.name:
      // Only override slug if it still equals the last auto-generated value
      // (i.e. the user has not manually changed the slug field)
      if nextState.metadata.slug === lastAutoGenSlug.current OR nextState.metadata.slug === '':
        autoSlug = deriveSlug(nextState.metadata.name)  // BR-05
        lastAutoGenSlug.current = autoSlug
        nextState = { ...nextState, metadata: { ...nextState.metadata, slug: autoSlug } }
      // If slug !== lastAutoGenSlug, user manually edited it — do not override

  // Update local React state
  setState(nextState)
```

**Key behaviours:**
- On first name entry (slug is `''`): slug auto-generates and `lastAutoGenSlug` is updated.
- On subsequent name changes where slug still matches the last auto-gen: slug re-generates from the new name.
- If the user manually edits the slug field: slug diverges from `lastAutoGenSlug`; subsequent name changes no longer override it.
- If the user clears the slug field (back to `''`): the next name change triggers auto-gen again.
- In edit mode for published forms, pass `slugReadOnly={true}` so slug locking is handled by the shell/metadata editor contract, not by slug-reversion logic in the interceptor.

### BR-14 — Builder save flow

Triggered when the shell calls `onSave(state)`. The page tracks `isSaving` in local state to prevent double-submit and propagate the disabled state to the shell (see §5.2 Save button):

1. Set `isSaving = true` (passes `disabled={true}` to shell immediately, preventing double-submit).
2. Extract `max_submissions` and `confirmation_message` from `state.metadata.workflowConfig`.
3. Build `p_definition` (see BR-15).
4. Call `app_base_form_upsert(p_event_id, p_organisation_id, p_form_id_or_null, p_definition)`. On error → `HandleMutationError` → set `isSaving = false` → abort. On success → get `resolvedFormId`.
5. Build `p_fields` array from `state.fields` (see BR-16).
6. Call `app_base_form_fields_replace(resolvedFormId, p_fields)`. On error → `HandleMutationError` → set `isSaving = false` → abort. (Note: the form was already saved in step 4; on fields error the form exists but may have an indeterminate field set. The user can retry the full save to restore fields.)
7. If `state.metadata.workflowType === 'base_registration'`:
   - Call `app_base_form_registration_bindings_replace` with `p_form_id`, `p_event_id`, `p_organisation_id`, and normalised bindings payload per BR-17.
   - On error → `HandleMutationError` → set `isSaving = false` → abort. (Note: form and fields were already saved. The user can retry the full save to reconcile bindings.)
8. On complete success: set `isSaving = false`, show toast "Form saved successfully.", navigate to `/forms`.

### BR-15 — `p_definition` construction for `app_base_form_upsert`

Strip `max_submissions` and `confirmation_message` from `workflowConfig` before embedding it as `workflow_config`, so these values are not stored redundantly inside the JSONB column (they are sent as separate top-level keys):

```typescript
const {
  max_submissions,
  confirmation_message,
  ...restWorkflowConfig
} = state.metadata.workflowConfig as {
  max_submissions?: number | null
  confirmation_message?: string | null
  [key: string]: unknown
}

const p_definition = {
  name: state.metadata.name,
  slug: state.metadata.slug,
  workflow_type: state.metadata.workflowType,
  access_mode: state.metadata.accessMode,
  workflow_config: restWorkflowConfig,  // stripped — excludes max_submissions and confirmation_message
  description: state.metadata.description ?? null,
  status: state.metadata.status,
  is_primary_entrypoint: state.metadata.isPrimaryEntrypoint,
  is_active: state.metadata.isActive,
  opens_at: state.metadata.opensAt ?? null,
  closes_at: state.metadata.closesAt ?? null,
  max_submissions: max_submissions ?? null,
  confirmation_message: confirmation_message ?? null,
}
```

For create mode, `p_form_id` is `null`. For edit mode, `p_form_id` is `state.metadata.id`.

### BR-16 — `p_fields` construction for `app_base_form_fields_replace`

```typescript
const p_fields = state.fields.map((f, idx) => ({
  field_key: f.fieldKey,
  sort_order: f.sortOrder ?? idx,
  is_required: f.isRequired ?? false,
  field_metadata: {
    label: f.fieldLabel,
    field_type: f.fieldType,
    ...(f.displayOptions ?? {}),
  },
}))
```

### BR-17 — Registration binding write

For each form save where `workflowType === 'base_registration'`, the binding write uses the canonical replace RPC:

```
const payload = bindings
  .filter((b) => b.checked)
  .map((b, idx) => ({
    registration_type_id: b.typeId,
    sort_order: idx,
    is_default: b.isDefault,
  }))

supabase.rpc('app_base_form_registration_bindings_replace', {
  p_form_id: resolvedFormId,
  p_event_id: selectedEventId,
  p_organisation_id: selectedOrganisationId,
  p_bindings: payload,
  p_actor: user?.id ?? null, // optional actor audit field when available
})
```

**Empty bindings case:** When `bindings.filter(b => b.checked).length === 0` (user unchecked all types), `p_bindings` is an empty array. The replace RPC clears existing bindings for the form/event scope and persists an empty set.

### BR-18 — `opensAt` / `closesAt` ISO 8601 ↔ Date conversion

`WorkflowAuthoringState.metadata.opensAt` and `closesAt` are `string | null` (ISO 8601 UTC strings). `DatePickerWithTimezone` works with `Date | null`.

- **State → picker value:** `opensAt ? new Date(opensAt) : null`
- **Picker onChange → state update:** `new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()` (midnight UTC, same pattern as BA01 §6.2). Store this ISO string in `state.metadata.opensAt` or `closesAt` via the `onStateChange` call from the schedule panel.
- **Clear (date removed):** store `null`.

---

## 7. API / Contract

### 7.1 Read contracts

**Forms list read** (used by `/forms`)

```
supabase
  .from('core_forms')
  .select('id, name, slug, status, workflow_type, is_active, is_primary_entrypoint, opens_at, closes_at, created_at, updated_at')
  .eq('event_id', selectedEventId)
  .order('created_at', { ascending: false })
```

Result: array of form rows or empty array. RLS filters to rows the user may read.

**Field count batch read** (used by `/forms`, after forms list loads)

```
supabase
  .from('core_form_fields')
  .select('form_id')
  .in('form_id', formIds)
  .eq('is_active', true)
```

Result: array of `{ form_id: string }` rows. Count per `form_id` in JavaScript.

**Form detail read** (used by `/form-builder` in edit mode)

```
supabase
  .from('core_forms')
  .select('id, name, title, description, slug, status, workflow_type, access_mode, workflow_config, is_active, is_primary_entrypoint, is_required, opens_at, closes_at, max_submissions, confirmation_message, event_id, organisation_id, owner_app_id')
  .eq('id', formId)
  .eq('event_id', selectedEventId)
  .single()
```

Result: single form row or error/null.

**Form fields read** (used by `/form-builder` in edit mode, in parallel with form detail)

```
supabase
  .from('core_form_fields')
  .select('id, field_key, field_label, is_required, is_active, sort_order, display_options')
  .eq('form_id', formId)
  .order('sort_order', { ascending: true })
```

Result: array of field rows.

**Registration types read** (used by `RegistrationTypeBindingPanel` on mount)

```
supabase
  .from('base_registration_type')
  .select('id, name, description, is_active')
  .eq('event_id', selectedEventId)
  .eq('is_active', true)
  .order('sort_order', { ascending: true })
```

Result: array of available registration types for the event.

**Registration bindings read** (used by `RegistrationTypeBindingPanel` in edit mode, in parallel with form detail)

```
supabase.rpc('app_base_form_registration_bindings_get', {
  p_form_id: formId,
  p_event_id: selectedEventId,
  p_organisation_id: selectedOrganisationId ?? null,
})
```

Result: array of existing binding rows, or empty array.

### 7.2 Write contracts

**Form upsert — `app_base_form_upsert`**

```
supabase.rpc('app_base_form_upsert', {
  p_event_id: selectedEventId,
  p_organisation_id: selectedOrganisationId,
  p_form_id: state.metadata.id ?? null,
  p_definition: p_definition,  // per BR-15
})
```

Success: returns `[{ form_id: uuid }]`. Use `data[0].form_id` as `resolvedFormId` for subsequent calls.
Failure: Supabase error with message. Pass to `HandleMutationError`.

**Fields replace — `app_base_form_fields_replace`**

```
supabase.rpc('app_base_form_fields_replace', {
  p_form_id: resolvedFormId,
  p_fields: p_fields,  // per BR-16
})
```

Success: void (no return data). Failure: Supabase error. Pass to `HandleMutationError`.

**Form delete — `app_base_form_delete`**

```
supabase.rpc('app_base_form_delete', {
  p_event_id: selectedEventId,
  p_form_id: formId,
})
```

Success: returns `[{ deleted: boolean, response_count: bigint, registration_binding_count: bigint }]`. Check `data[0].deleted`.
Failure: Supabase error. Pass to `HandleMutationError`.

**Registration bindings replace** (step 3 of save flow, when `workflowType === 'base_registration'`)

```
supabase.rpc('app_base_form_registration_bindings_replace', {
  p_form_id: resolvedFormId,
  p_event_id: selectedEventId,
  p_organisation_id: selectedOrganisationId,
  p_bindings: bindings
    .filter((b) => b.checked)
    .map((b, idx) => ({
      registration_type_id: b.typeId,
      sort_order: idx,
      is_default: b.isDefault,
    })),
  p_actor: user?.id ?? null,
})
```

### 7.3 Permission / RLS contracts

| Action | `pageName` / `operation` | Scope |
|---|---|---|
| Read `/forms` | `forms` / `read` | `{ organisationId, eventId, appId }` |
| Create a form (button visibility) | `forms` / `create` | same |
| Delete a form (button visibility + RPC enforcement) | `forms` / `update` | same |
| Read `/form-builder` | `form-builder` / `read` | same |
| Save form (button visibility) | `form-builder` / `update` | same |

The `app_base_form_upsert` and `app_base_form_delete` RPCs both enforce `update:page.forms` server-side. `app_base_form_fields_replace` enforces `update:page.form-builder` server-side. These server-side checks are independent of the client-side `PagePermissionGuard` but should be consistent with it.

### 7.4 Cross-slice handoffs

**Inputs from BA00:**
- `useEvents().selectedEvent` — event context (`EventReadModel | null`). Properties used: `name` (for event slug derivation per BR-04), `eventId` (the event UUID — verify this is `eventId` not `event_id` against `EventReadModel`). No typed `slug` property exists — BR-04 handles derivation.
- `useUnifiedAuth().selectedEventId` — typed event ID (`string | null`).
- `useUnifiedAuth().selectedOrganisationId` — typed org ID (`string | null`).
- `useUnifiedAuth().appId` — RBAC app ID (`string | null`).

**Outputs to sibling slices:** none (this slice does not export hooks or services consumed by others).

**Navigation handoffs:**
- `/forms` receives navigation from BA01 (the event dashboard nav card).
- `/form-builder` receives navigation from `/forms` only.
- `/forms` receives navigation back from `/form-builder` after save.

---

## 8. Data and schema references

### 8.1 Tables consumed

| Table | Purpose |
|---|---|
| `core_forms` | Primary form rows — read for list and edit, written via RPCs |
| `core_form_fields` | Form field rows — read for field count (list) and edit mode (builder), replaced via RPC |
| `base_form_registration_type` | Registration type bindings for forms — read and written via backend registration-binding RPCs |
| `base_registration_type` | Available registration types for an event — read for binding panel |
| `core_form_responses` | Not read by this slice. Referenced by `app_base_form_delete` internally to check response count. |

### 8.2 Column dependencies

`core_forms` columns used by this slice: `id`, `name`, `description`, `slug`, `status`, `workflow_type`, `access_mode`, `workflow_config`, `is_active`, `is_primary_entrypoint`, `is_required`, `opens_at`, `closes_at`, `max_submissions`, `confirmation_message`, `event_id`, `organisation_id`, `owner_app_id`, `created_at`.

`core_form_fields` columns used: `id`, `form_id`, `field_key`, `field_label`, `is_required`, `is_active`, `sort_order`, `display_options`, `organisation_id`.

`base_form_registration_type` columns used: `id`, `form_id`, `registration_type_id`, `event_id`, `organisation_id`, `sort_order`, `is_default`.

`base_registration_type` columns used: `id`, `event_id`, `name`, `description`, `is_active`, `sort_order`.

### 8.3 Backend-ready verification steps (Supabase MCP, dev-db `rkytnffgmwnnmewevqgp`)

Before implementation, verify:

1. `core_forms` has all columns in §8.2 with expected types.
2. `core_forms.status` is a `form_status` enum with values `draft`, `published`, `closed`.
3. `core_forms.workflow_type` is `text NOT NULL`.
4. `core_form_fields.field_key` is `text NOT NULL` (no `table_name` or `column_name`).
5. `base_form_registration_type` exists with columns: `id`, `form_id`, `registration_type_id`, `event_id`, `organisation_id`, `sort_order`, `is_default`.
6. `app_base_form_upsert`, `app_base_form_fields_replace`, `app_base_form_delete`, `app_base_form_registration_bindings_get`, and `app_base_form_registration_bindings_replace` all exist with the signatures in §7.1/§7.2.
7. `app_base_form_upsert` writes `status`, `is_primary_entrypoint`, `is_active`, `opens_at`, `closes_at`, `max_submissions`, `confirmation_message` from `p_definition` (Q12 DB fix applied).
8. Confirm the BASE event type shape: verify `useEvents().selectedEvent` exposes a `slug` property or only `event_name`.
9. **VERIFIED (2026-05-01):** `ConfirmationDialog` does not support single-button mode — `cancelLabel` is always rendered. Use `Dialog` sub-components directly for the blocking delete dialog. Verify the public export path of `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` at build time.
10. **VERIFIED (2026-05-02):** `WorkflowFormAuthoringShell` accepts `heading` (required), `subheading` (required), `middleContent?`, `allowedWorkflowTypes` (required), and `slugReadOnly?`. The shell forwards `slugReadOnly` to `WorkflowFormMetadataEditor`, which enforces read-only slug behaviour for published forms when enabled.

### 8.4 Domain reference

Bounded context: BA03 of `BASE-architecture.md`. `core_forms` and `core_form_fields` domain notes: `docs/database/domains/base.md`. Registration binding schema notes: `docs/database/domains/base.md`.

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA03 |
|---|---|---|
| `WorkflowFormAuthoringShell` | Scoped `@solvera/pace-core/forms` exception path | Canonical authoring shell |
| `buildWorkflowPreviewTarget` | Scoped `@solvera/pace-core/forms` exception path | Preview/copy URL path construction |
| `PagePermissionGuard` / `useSecureSupabase` | Default root import where available; scoped `@solvera/pace-core/rbac` allowed as exception path | Guard + data/RPC boundaries |
| `DatePickerWithTimezone` | Default root import; allow scoped exception if required by export location | Schedule inputs |
| `HandleMutationError` | Default root import | Error handling contract |

### 9.2 Slice-specific caveats only

- Save sequence remains ordered: upsert -> replace fields -> registration bindings.
- `org_signup` is excluded from BASE authoring workflow options.
- Published-form slug protections follow current package capability.
- Preview URLs depend on `VITE_PORTAL_BASE_URL` and preview-target builder output.
- Import style in this slice follows root-first policy; scoped imports are exception-only.

## 10. Permission and access rules

| Surface / action | pageName / operation | Scope | Result if denied |
|---|---|---|---|
| Render `/forms` | `forms` / `read` | `{ organisationId, eventId, appId }` | `<AccessDenied />` replaces page |
| "Create Form" button visibility | `forms` / `create` | same | Button hidden |
| Delete button visibility on form cards | `forms` / `update` | same | Delete button hidden |
| `app_base_form_delete` RPC (server-enforced) | `update:page.forms` | org + event context | RPC raises permission exception |
| Render `/form-builder` | `form-builder` / `read` | `{ organisationId, eventId, appId }` | `<AccessDenied />` replaces page |
| Save button visibility on `/form-builder` | `form-builder` / `update` | same | Save button hidden; shell rendered `disabled={true}` |
| `app_base_form_upsert` RPC (server-enforced) | `update:page.forms` | org + event context | RPC raises permission exception |
| `app_base_form_fields_replace` RPC (server-enforced) | `update:page.form-builder` | org + event context | RPC raises permission exception |
| `app_base_form_registration_bindings_replace` RPC (server-enforced) | `update:page.forms` + event/org scope checks | `{ form_id, event_id, organisation_id }` via RPC args | RPC raises permission exception |

The slice does not introduce new RLS policies on any table. All server-side enforcement is via RPC RBAC checks. **Build-time verification required (§8.3):** confirm via Supabase MCP (dev-db `rkytnffgmwnnmewevqgp`) that the registration-binding RPC signatures are available and enforce expected event/org scoping.

---

## 11. Acceptance criteria

Each criterion traces to one or more Functional Specification items. Do not pre-tick — verified post-build.

**Forms list — happy paths**

- [ ] Given a user with `read:page.forms` and an event selected, when they navigate to `/forms`, then the page renders the "Forms" h1, the "Create Form" button (if they also have `create` permission), and a card grid of all forms for the event in descending creation order. (FL-PE-01, FL-PE-02, FL-PA-01)
- [ ] Given the forms list renders, when data loads, then each form card shows: form name, field count ("N fields"), status badge with correct colour, workflow type, and opens_at / closes_at when non-null. (FL-PC-01–06, BR-01, BR-02)
- [ ] Given a form card with `opens_at = null` and `closes_at = null`, when the card renders, then neither "Opens:" nor "Closes:" lines appear. (BR-02)
- [ ] Given a user with `update:page.forms`, when they click the Preview button on a form card, then the portal URL opens in a new browser tab. (FL-PC-09, BR-03)
- [ ] Given a user clicks the Copy URL button on a form card, when the clipboard write succeeds, then the button icon shows a checkmark for 2 seconds. (FL-PC-10)
- [ ] Given `VITE_PORTAL_BASE_URL` is not set, when the user clicks Preview or Copy URL, then a destructive toast appears: "Portal URL is not configured. Set VITE_PORTAL_BASE_URL." (FL-EC-01)

**Forms list — delete**

- [ ] Given a user with `update:page.forms`, when they click Delete on a form card and confirm, and the RPC returns `deleted=true`, then the form card disappears from the list and a success toast "Form deleted successfully." appears. (FL-PA-03–05, BR-08)
- [ ] Given a form has submissions, when the user confirms deletion and the RPC returns `deleted=false` with `response_count=3`, then the confirmation dialog closes and a blocking dialog opens describing the 3 submissions. (FL-PA-04, BR-08, BR-09)
- [ ] Given a user without `update:page.forms`, when the form list renders, then no Delete buttons appear on any form card. (FL-PR-03)

**Forms list — empty and error states**

- [ ] Given no event is selected, when the user navigates to `/forms`, then no card grid renders and the message "Select an event from the header to manage forms." appears. (FL-ES-01)
- [ ] Given an event is selected and there are no forms, when the page loads, then the "No forms yet." empty state card renders. (FL-ES-02)
- [ ] Given the forms list query fails, when the page renders, then a destructive Alert with the error message appears in place of the card grid. (FL-ER-01)
- [ ] Given a user without `read:page.forms`, when they navigate to `/forms`, then `<AccessDenied />` renders. (FL-PR-01)

**Form builder — create mode**

- [ ] Given a user with `read:page.form-builder`, when they navigate to `/form-builder` (no formId), then the shell renders immediately with "Create Form" as the heading, all fields empty, and the Save button disabled (empty name fails validation). (FB-PE-01, BR-11)
- [ ] Given a user types a form name in create mode, when the name changes, then the slug field auto-populates with a derived value matching the slug derivation algorithm. (BR-05, BR-13)
- [ ] Given a user fills in valid form metadata and at least one field, when they click "Save Form", then `app_base_form_upsert` is called, then `app_base_form_fields_replace` is called with the form's ID, a success toast fires, and the page navigates to `/forms`. (FB-PA-01–02, BR-14)
- [ ] Given `workflowType = 'base_registration'` is selected, when the builder renders, then the Registration Type Binding Panel appears with all active types for the event listed as checkboxes. (FB-PC-08)

**Form builder — edit mode**

- [ ] Given a user navigates to `/form-builder?formId={id}`, when the page loads, then a loading spinner appears, then the shell renders with the saved form data pre-populated. (FB-PE-02, FB-LS-01, BR-12)
- [ ] Given a published form is loaded in edit mode, when the builder renders, then the Slug field is read-only and cannot be changed. (BR-06, FB-PC-02)
- [ ] Given a user edits `opensAt` in the schedule panel, when they save, then `app_base_form_upsert` is called with `opens_at` set to an ISO midnight-UTC string. (FB-PC-06, BR-18)
- [ ] Given a user edits max_submissions to 50, when they save, then `app_base_form_upsert`'s `p_definition` contains `max_submissions: 50`. (FB-PC-07, BR-15)

**Form builder — no-event and permission states**

- [ ] Given no event is selected, when the user navigates to `/form-builder`, then the shell does not render and the message "Select an event from the header before creating or editing a form." appears. (FB-NV-01)
- [ ] Given a user without `read:page.form-builder`, when they navigate to `/form-builder`, then `<AccessDenied />` renders. (FB-PR-01)
- [ ] Given a user with `read` but not `update:page.form-builder`, when the builder renders, then the Save button is hidden and the shell fields render disabled. (FB-PR-02)

---

## 12. Verification

- Verify list states (populated, no-event, empty, query-error).
- Verify create/edit save flow and ordered RPC chaining.
- Verify registration binding panel visibility/persistence for `base_registration` only.
- Verify schedule persistence and list rendering updates.
- Verify preview/copy URL and permission-denied states.

## 13. Testing requirements

- List tests cover state branches, permission actions, and delete outcomes.
- Builder tests cover create/edit entry, validation, and save sequencing.
- Workflow tests cover allowed workflow filter and binding-panel toggles.
- URL/date tests cover preview target and date conversion behaviour.

## 14. Build execution rules

- Scope is `/forms` and `/form-builder` only.
- No schema/RPC/RLS changes from this slice; stop on contract drift.
- Stop when required exports or RPC signatures are unavailable.
- Use documented secure data/RPC boundaries only.

## 15. Done criteria

- §4 authoring/list behaviours are demonstrable.
- §12 verification scenarios complete with evidence.
- §13 tests pass for core authoring contracts.

## 16. Do not

- Do not bypass `WorkflowFormAuthoringShell` with local editor composition.
- Do not include `org_signup` in BASE workflow options.
- Do not bypass required RPC flows with direct table writes.
- Do not implement participant submission runtime UI in BA03.
- Do not expand beyond `/forms` and `/form-builder` ownership.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/requirements/BA00-app-shell-and-access-requirements.md`
- `docs/requirements/BA02-shared-forms-platform-contracts-requirements.md`
- `docs/requirements/BA18-base-dev-seed-data-requirements.md`

## 18. Implementing Agent Instructions

- Implement BA03-owned authoring routes only.
- Preserve save-order and guard contracts; stop on blockers.
