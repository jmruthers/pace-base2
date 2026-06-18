# BA15 — Reporting

## Slice metadata

- Status: Draft
- Depends on: BA06.contract (`base_application` table — applications domain via `base.participant` explore), BA08.contract (`base_units` table — units domain via `base.unit` explore), BA11.contract (`base_activity_booking` table — activity domain via `base.activity` explore), BA13.contract (`base_scan_event` table — scan domain via `base.scan` explore; BA13 is the runtime that owns the table contract). _BA14 sync/reconciliation is a runtime data-correctness concern (reports should run after sync has reconciled offline scans for the event), captured in §12 verification scenarios — not a metadata dep._
- Backend impact: Read + write contracts; no schema changes
- Frontend impact: UI

---

## 2. Overview

BA15 owns the `/reports` route inside the BASE authenticated shell. It delivers an event-scoped, self-service reporting surface that covers four operational explore domains: participant applications, unit groups, activity bookings, and scan events. The shared `ReportBuilder` component from `@solvera/pace-core/reporting` handles field selection, filter configuration, sort definition, and report execution. BA15 implements the two adapter interfaces — `ReportingMetadataProvider` and `ReportingExecutionAdapter` — that connect the shared engine to the BASE database and `core_field_list` registry, and implements a `ReportingTemplateStore` adapter that persists report templates to `core_report_template`. BA15 has no schema changes: all required contracts are in place in the database.

---

## 3. What this slice delivers

### 3.1 Purpose

Give event organisers a composable, on-demand reporting tool scoped to the selected event. Organisers can choose a reporting domain (participants, units, activities, scans), select fields, apply filters and sorts, run the query, and inspect or export results. They can save report configurations as named templates — private or event-shared — and reload them in subsequent sessions.

### 3.2 Surfaces

- The `/reports` route, rendered inside the BA00 authenticated shell.
- The shared `ReportBuilder` component, occupying the main content column, wired to BASE-specific metadata and execution adapters.
- A template management panel alongside `ReportBuilder`, rendering the shared component's template UI via a BASE-owned `ReportingTemplateStore` adapter.

### 3.3 Boundaries

- This slice does not own the global event picker — that lives in the BA00 shell and is consumed via `useEvents()`.
- This slice does not own the `core_field_list` field registry or its content — field rows are authored and maintained as part of the broader DATA platform.
- This slice does not own the explore definitions (`base.participant`, `base.unit`, `base.activity`, `base.scan`) — these are declared in pace-core2 and consumed read-only.
- This slice does not own `core_report_template` schema or RLS policy — those are backend contracts consumed as-is.
- This slice does not own cross-event or org-level aggregate reporting. All queries are scoped to the selected event.
- This slice does not own participant-facing reporting surfaces.

### 3.4 Architectural posture

- The shared `ReportBuilder` from `@solvera/pace-core/reporting` is the primary UI component. No local equivalent is built.
- BA15 implements three adapter interfaces declared by pace-core2:
  - `ReportingMetadataProvider` — queries `core_field_list` via `useSecureSupabase()` and returns `ReportingFieldMeta[]` for the requested explore domain.
  - `ReportingExecutionAdapter` — receives a `ReportingExecutionRequest` from the query planning engine and executes it against the Supabase database using `useSecureSupabase()`.
  - `ReportingTemplateStore` — reads and writes `core_report_template` via `useSecureSupabase()` to persist template configurations, visibility, and ownership.
- All database access goes through `useSecureSupabase()`. No unscoped Supabase client is used.
- Permission gating uses `PagePermissionGuard` from `@solvera/pace-core/rbac`. Page-level CRUD states use `useResourcePermissions('reports')`.
- No schema changes, RPC additions, or RLS policy changes are introduced by this slice.

### 3.5 Page-level guards and evaluation ordering

**Evaluation order when no event is selected:**
`PagePermissionGuard pageName="reports" operation="read"` wraps the entire page surface and fires first, before any page content renders. When the user navigates to `/reports` with no event selected, the guard is called with `scope={{ organisationId: <org_id>, eventId: undefined }}`. The guard resolves `reports.read` against the user's org-level role with this partial scope.

- If the user **lacks** `reports.read`: the guard's `fallback` renders (standard access-denied component). The user never sees any reporting UI, including the no-event empty state.
- If the user **holds** `reports.read`: the guard's `children` render. Because `eventId` is absent, the no-event empty state is shown (see FI-08). The `ReportBuilder` and template panel are not rendered.

**Guard behaviour with partially-undefined scope:**
The guard does not stall on `eventId: undefined`. It evaluates org-level permission with `{ organisationId, eventId: undefined }` and returns a definitive allow or deny immediately. There is no indefinite loading state while waiting for event context to resolve.

---

## 4. Functional specification

Items are numbered `FI-01` through `FI-47`. Each is independently testable without code access.

### Page entry

**FI-01** — On navigation to `/reports`, the page renders inside the BA00 authenticated shell. The URL is `/reports` with no required path or query parameters. The page reads selected event context from `useEvents()`.

**FI-02** — On entry, `PagePermissionGuard` evaluates `reports.read` for the authenticated user before any page content renders. If the user lacks this permission, the access-denied fallback renders and replaces all page content.

**FI-03** — When the user holds `reports.read` and has an event selected, the page renders `ReportBuilder` in the main content column and the template panel in the secondary column. `ReportBuilder` initialises with the Participants explore (`base.participant`) active and no fields selected.

**FI-04** — When the user holds `reports.read` but no event is selected, the page renders the no-event empty state (see FI-08). Neither `ReportBuilder` nor the template panel is rendered.

### Loading states

**FI-05** — While `ReportBuilder` loads field metadata for the selected explore from `core_field_list`, the component renders an internal loading indicator. The page chrome (shell header, navigation) remains visible and interactive throughout.

**FI-06** — While report execution is running (after "Run report" is pressed), `ReportResultsTable` renders in its loading state (`isLoading = true`). The "Run report" button is disabled for the duration.

**FI-07** — While the template store loads the saved templates list for the selected event, the template panel shows a loading indicator inside its list area.

### Empty states

**FI-08** — No event selected: the main content area shows the message "Select an event to run reports" with a muted icon. No `ReportBuilder`, results table, or template panel is rendered.

**FI-09** — No fields selected: `ReportBuilder` shows a validation alert and disables "Run report" when the selected field count is zero.

**FI-10** — No report executed yet: the results area below the report configuration does not show `ReportResultsTable` before the first "Run report" execution. The area is empty.

**FI-11** — Empty results: when a report executes and returns zero rows, `ReportResultsTable` shows its empty state: title "No rows returned", description "Adjust fields or filters and run the report again."

**FI-12** — No saved templates: when the authenticated user has no templates visible for the selected event, the template list shows "No templates saved. Run a report and save it as a template to get started."

### Error states

**FI-13** — Execution failure: if `ReportingExecutionAdapter.execute()` returns an error result, `ReportBuilder` displays an error message inline in the results area. The user can adjust the selection and press "Run report" again. No partial results are shown alongside an error.

**FI-14** — Engine limit / timeout: if the query exceeds the execution engine's capacity (result count ceiling, statement timeout, or complexity limit), the error must be surfaced explicitly with a message indicating the query was too large. The message must suggest reducing field selection or adding filters to narrow results. Silent truncation is not permitted.

**FI-15** — Template list load failure: if the template store's `listTemplates` call fails, the template panel shows an inline error with a "Retry" affordance.

**FI-16** — Template save failure: if `saveTemplate` fails, a toast notification shows the error message. The save form remains populated so the user can retry without re-entering data.

**FI-17** — Template delete failure: if `deleteTemplate` fails, a toast notification shows the error. The template row remains visible in the list.

### Primary content

**FI-18** — The explore selector displays four options: "Participants" (key `base.participant`), "Units" (key `base.unit`), "Activities" (key `base.activity`), "Scans" (key `base.scan`). The active explore is highlighted. On initial load the Participants explore is active.

**FI-19** — The field catalog for the active explore shows all fields returned by `ReportingMetadataProvider.getFields(exploreKey)` — that is, all `core_field_list` rows with `report_availability = true` whose `report_domains` array contains the active explore's `domainId`. Each field displays its `label` (from `friendly_field_name`) and an add/remove toggle.

**FI-20** — The selected fields panel shows chosen fields in selection order with a label and a remove affordance per field.

**FI-21** — The filter configuration area renders an "Add filter" control. Each active filter row shows: the field selector (populated from selected fields), the operator selector (showing all applicable `ReportingFilterOperator` values for the field; see BR-02), a value input, and a remove button. Filters are applied on the next "Run report" execution.

**FI-22** — The sort configuration area renders an "Add sort" control. Each active sort row shows: the field selector (populated from selected fields) and a direction selector (Ascending / Descending). Sorts are applied on the next "Run report" execution.

**FI-23** — After "Run report" succeeds, `ReportResultsTable` renders below the configuration area. It displays the result rows with one column per selected field, using each field's `label` as the column header.

**FI-24** — `ReportResultsTable` includes: client-side search across fetched rows, column visibility toggle, export to CSV (see BR-07), column sorting, and pagination with configurable rows-per-page. These are standard DataTable features enabled via the shared component; no custom implementation is required.

**FI-25** — The template panel is visible at all times when an event is selected. It shows a collapsible save-template form and a saved-templates list (see §5 for layout).

**FI-26** — Each visible template row in the list shows: the template name, a visibility badge ("Private" or "Event-shared"), a "Load" button, and — only when `template.created_by === current user id` — "Edit" and "Delete" buttons.

### Primary actions

**FI-27** — Run report: pressing "Run report" triggers `ReportingExecutionAdapter.execute()` with the request produced by the shared query planning engine. Disabled when no fields are selected or the selection fails validation. On success, renders `ReportResultsTable` with the returned rows. On failure, renders an error per FI-13 / FI-14.

**FI-28** — Add filter: pressing "Add filter" appends a new filter row to the filter area. The initial row defaults to the first selected field and the first available operator. The filter takes effect on the next "Run report" execution.

**FI-29** — Remove filter: pressing the remove button on a filter row deletes that row. Takes effect on the next "Run report" execution.

**FI-30** — Add sort: pressing "Add sort" appends a new sort row. Initial defaults: first selected field, Ascending direction. Takes effect on the next "Run report" execution.

**FI-31** — Remove sort: pressing the remove button on a sort row deletes that row. Takes effect on the next "Run report" execution.

**FI-32** — Save template: pressing "Save" in the template save form validates that the name field is non-empty (after trimming) and that at least one field is selected. On validation pass, the template store's `saveTemplate` is called with the entered template name, description, visibility (`is_private`), and the serialised config (produced via `serializeReportTemplateConfig`). On success, a "Template saved" toast appears and the new template is prepended to the list. On failure, a toast shows the error and the form remains populated.

**FI-33** — Load template: pressing "Load" on a template row calls the template store's `loadTemplate` and then passes the deserialised config (via `deserializeReportTemplateConfig`) back into `ReportBuilder`. The explore switches if the template's explore differs from the active one. Fields, filters, sorts, and column config are restored to the stored state. The report does not auto-execute after loading. Available to all users who can see the template row.

**FI-34** — Edit template: pressing "Edit" on a template row (visible only when the user is the creator) populates the save form with the template's existing name, description, and visibility, and changes the form's submit action to update. On submit, `saveTemplate` is called with the template's `id` and the updated fields. On success, a "Template updated" toast appears and the list updates. On failure, a toast shows the error.

**FI-35** — Delete template: pressing "Delete" on a template row (visible only when the user is the creator) opens a `ConfirmationDialog` with the message "Delete '[template name]'? This cannot be undone." Primary action: "Delete" (destructive style). Secondary action: "Cancel". On confirmation, `deleteTemplate(template.id)` is called. On success, the template is removed from the list and a "Template deleted" toast appears. On failure, a toast shows the error and the row remains.

**FI-36** — Switch explore: selecting a different explore from the explore selector immediately clears all selected fields, filters, sorts, column config, and execution results. No confirmation prompt is shown (the action is recoverable by re-selecting fields). The template list does not reload on explore switch — all event templates remain visible regardless of the active explore.

### Secondary actions

**FI-37** — Column visibility: the DataTable column visibility toggle allows the user to show or hide individual columns in `ReportResultsTable` without re-running the report.

**FI-38** — Export: the DataTable export action downloads the displayed results as a CSV file. The exported data is identical to what is rendered in `ReportResultsTable`; no separate query is executed (see BR-07).

**FI-39** — Search: the DataTable search input filters visible rows client-side across all columns in the fetched result set.

**FI-40** — Pagination: the DataTable pagination control allows the user to page through results and configure rows per page.

### Permission-conditional rendering

**FI-41** — The entire `/reports` surface requires `reports.read`. Users without this permission see the access-denied fallback (see §3.5).

**FI-42** — The "Save template" form and "Save" button are visible only when `canCreate` is `true` per `useResourcePermissions('reports')`.

**FI-43** — "Edit" and "Delete" buttons on a template row are rendered only when `template.created_by === user.id` (identity comparison — not an RBAC check). "Load" is rendered for all users who can see the row.

**FI-44** — Private templates are visible in the list only to their creator. Event-shared templates are visible to all users with event access and `reports.read` (enforced by RLS).

### Navigation

**FI-45** — `/reports` is linked from BA00 in-event header nav (**Reports**) and from the event dashboard only indirectly (not a launcher card per BA01). No navigation exits the page other than shell-level navigation.

### Edge cases

**FI-46** — When fields are removed from the selected field list, any filters or sorts that reference those field keys are automatically cleared by `ReportBuilder` before the next execution.

**FI-47** — When a template is loaded whose `exploreKey` differs from the active explore, the explore switches automatically as part of the load operation, clearing any in-progress field selection for the prior explore before restoring the template's state.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/CommsReportsPage.jsx` (`ReportsPage`).

### Prototype layout summary

1. **PageHeader** — breadcrumb; title "Reports"; subtitle describing participant/unit/activity/scan explores.
2. **ReportsWorkstation** — shared reporting surface (`_shared/reports.jsx` / pace-core `ReportBuilder`):
   - Explores: `base.participant`, `base.unit`, `base.activity`, `base.scan`.
   - Event-scoped `scope` from selected event.
   - Seeded saved templates (Approved roll, Medical brief, Unit fill, Activity sign-ups).
   - Builder + live results + export in workstation grid.

### Route map (prototype → BASE)

| Prototype | BASE |
|---|---|
| `#/events/:code/reports` | `/reports` |

### Implementation delta (pass 2)

- §5.1–5.2 below describe `ReportBuilder` internal grid — align naming with pace-core `ReportsWorkstation` / `ReportBuilder` export used in production.
- Prototype seeds four template definitions; production may start empty until templates saved.

### 5.1 Layout

**All viewports:** `ReportBuilder` fills the full BA00 shell content area. No BA15-level page layout is required; `ReportBuilder` manages its own internal two-column grid (`minmax(20rem,24rem)_1fr` — config Card left, results right). The template section is embedded inside the config Card. Page title "Reports" rendered as the BA00 shell page heading (h1).

**Scroll behaviour:** The shell header and navigation are sticky. The main content area scrolls. `ReportResultsTable`, when present, is embedded in the right column of `ReportBuilder`'s internal grid and scrolls with the page.

### 5.2 Components

#### ReportBuilder (shared, `@solvera/pace-core/reporting`)

Renders as a two-column grid (`grid gap-4 lg:grid-cols-[minmax(20rem,24rem)_1fr]`). On viewports narrower than `lg`, the columns stack vertically (config Card on top, results section below).

**Left column — configuration Card:**

`CardHeader` with title "Report builder". `CardContent` holds a single-column vertical stack from top to bottom:

1. **Explore selector** — a `Select` dropdown labelled "Explore". The four options map to BA15's four explores; labels come from the explore's `label` value in the registry. Changing the selected explore immediately clears all selected fields, filters, sorts, column config, and results.

2. **Field catalog** — a scrollable list of all fields for the active explore. A search `Input` above the list filters rows by label. Each row shows the field `label` with an "Add" toggle button (switches to "Remove" when the field is already selected).

3. **Selected fields list** — labelled "Selected fields". Each row shows the field label and a × remove button. Rows appear in selection order.

4. **Filter section** — labelled "Filters". A persistent draft fieldset sits at the top of the section: a Field `Select` (populated from selected fields), an Operator `Select` (populated with labels from BR-02), and a Value `Input`. Clicking "Add filter" commits the draft to a read-only list below and resets the draft. Each committed filter row shows the field label, operator, and value with a × remove button on the right. Committed rows are not directly editable; to change a filter the user removes it and re-adds via the draft fieldset.

5. **Sort section** — labelled "Sort". A persistent draft fieldset: a Field `Select` and a Direction `Select` ("Ascending" / "Descending"). Clicking "Add sort" commits the draft. Each committed sort row shows the field label and direction with a × remove button.

6. **Template section** — rendered only when `templateStore` is provided. Contains the save-template form and saved-templates list as described in the "Template panel" section below. Hidden when `templateStore` is `undefined`.

`CardFooter` contains two buttons:
- **"Run report"** — primary `Button`. Disabled when no fields are selected or `validateReportingSelection` returns `valid: false`. Shows a spinner during execution.
- **"Save"** — secondary `Button`. Visible only when `templateStore` is provided. Disabled when the template name input is empty.

**Right column — results area (within ReportBuilder's own grid):**

Stacked vertically from top:
- Validation `Alert` (destructive) — shown when the selection has errors (e.g. no fields selected).
- Execution error `Alert` (destructive) — shown when the most recent run returned an error.
- `ReportResultsTable` — rendered once a run completes successfully. Shows loading state (`isLoading = true`) during execution.

Before the first run, the right column is empty (nothing rendered).

> **Layout note:** BA15 renders `ReportBuilder` at full content width. The template section is embedded in the left configuration Card — no separate page-level layout column is required.

#### ReportResultsTable (shared, `@solvera/pace-core/reporting`)

Renders as a `Card` with a `CardHeader` containing the title "Report results" and a `CardContent` wrapping a `DataTable`. The DataTable has all features enabled: search input (top-left), column visibility toggle (top-right icon), export button (top-right), pagination controls (bottom-right), and per-column sort (header click). Each column header shows the field's `label`. Empty state: "No rows returned" (title), "Adjust fields or filters and run the report again." (description). Loading state: DataTable's internal skeleton / spinner.

Note: `ReportResultsTable` passes `rbac={{ pageName: 'reports' }}` to `DataTable`, correctly scoping all DataTable RBAC-gated features to the `reports` page permissions (PC-04 resolved).

#### Template panel (shared `ReportBuilder` component)

> **Ownership note:** BA15 does not build this component. BA15 implements a `ReportingTemplateStore` adapter (data layer) and passes it to `ReportBuilder`. The template panel UI — including the save form, visibility selector, and saved-templates list — is rendered by the shared `ReportBuilder` component inside its left configuration Card. The specification below defines the shared component behaviour that BA15 depends on.

A `Card` positioned in the right column with the heading "Report Templates".

**Card header:** Title "Report Templates" (left) + collapse/expand toggle icon (ChevronDown / ChevronUp, right-aligned).

**Collapsed state:** Card header only. No content visible.

**Expanded state (default):** Two vertically stacked sections inside `CardContent`:

---

**Save template form** — collapsible sub-section within the expanded panel.

Sub-section header: "Save template" (bold, small) + independent chevron toggle.

Fields (visible when sub-section is expanded):
- **Template name** — text `Input`, required. Placeholder: "Template name". Error copy (shown below input on failed save): "Template name is required." Max visible length: full width of the panel.
- **Description** — `Textarea`, optional, 2 rows. Placeholder: "Optional description."
- **Visibility** — `Select` component with two options:
  - Label: "Private (only me)" / value: `true` (is_private)
  - Label: "Event-shared (all with access)" / value: `false` (is_private)
  - Default selection: "Private (only me)"

Button row:
- "Save" — primary `Button`, full width. Disabled when name field is empty. Shows loading state (spinner replacing label text) during save. When in Edit mode (user clicked "Edit" on an existing template), label changes to "Update".
- "Cancel" — ghost `Button`, full width, below "Save". Shown only when the form is in Edit mode. Clears the form and returns to default (empty) Save mode.

---

**Saved templates list** — below the save form, always visible in the expanded panel.

Sub-section header: "Saved templates" (bold, small).

**Loading state:** centred spinner inside the list area.

**Empty state:** muted text: "No templates saved. Run a report and save it as a template to get started."

**Error state:** inline `Alert` (destructive) with the error message and a "Retry" text button.

**Template row** (one per visible template, vertical list):
- **Name:** bold text, single line, truncated with ellipsis if overflow.
- **Visibility badge:** `Badge` component. "Private" — muted / grey variant. "Event-shared" — secondary / blue variant.
- **Action buttons** (right-aligned, small, ghost style):
  - "Load" — ghost `Button` with download/load icon. Visible to all users who can see the row.
  - Pencil icon `Button` (edit action) — visible only when `template.created_by === user.id`.
  - × icon `Button` (delete action, destructive ghost) — visible only when `template.created_by === user.id`.
- Rows are ordered by `created_at` descending (most recent first).

#### ConfirmationDialog (shared, `@solvera/pace-core/components`)

Triggered by the delete button on a template row. Modal dialog:
- Title: "Delete template?"
- Body: "'[template name]' will be permanently deleted."
- Primary action: "Delete" — destructive `Button`. On click, calls `deleteTemplate(template.id)`.
- Secondary action: "Cancel" — ghost `Button`. Closes without action.
- Close behaviour: clicking Cancel, pressing Escape, or clicking the backdrop dismisses the dialog without deleting.

### 5.3 States

**Loading — field metadata:** `ReportBuilder` internal loading indicator occupies the configuration rail area. Shell chrome and the template panel remain visible.

**Loading — report execution:** `ReportResultsTable` renders with `isLoading = true` (DataTable skeleton). The "Run report" button is disabled with a spinner.

**Loading — template list:** centred spinner inside the saved templates sub-section.

**Empty — no event selected:** centred in the main content area — a muted icon, heading "Select an event to run reports", and no further call to action. The template panel is not rendered.

**Empty — no fields selected:** `ReportBuilder` shows a validation `Alert` ("Select at least one field") above the "Run report" button. The button is disabled.

**Empty — no report run:** the results area (right column of ReportBuilder's grid) is empty (no component rendered).

**Empty — no results returned:** `ReportResultsTable` empty state (see component description).

**Empty — no templates:** saved templates list empty state (see component description).

**Error — execution failure:** `Alert` (destructive) in the results area showing the error message. No table rendered. The user can modify the selection and press "Run report" again.

**Error — template list failure:** `Alert` (destructive) in the saved templates sub-section with a "Retry" text button.

**Success — template saved:** toast notification: "Template saved."

**Success — template updated:** toast notification: "Template updated."

**Success — template deleted:** toast notification: "Template deleted."

**Access denied:** the standard pace-core2 access-denied component (rendered by `PagePermissionGuard`'s `fallback`). Replaces all page content.

### 5.4 Interactions

**Explore selector:** Changing the explore `Select` dropdown immediately clears all selected fields, filters, sorts, column config, and results. No confirmation prompt. The new explore's field catalog loads asynchronously; a loading indicator is shown in the field catalog area during load.

**"Add filter":** commits the draft fieldset (Field, Operator, Value) to the read-only committed list. The draft fieldset resets after commit. No-op if the draft fieldset is incomplete.

**"Add sort":** commits the draft fieldset (Field, Direction) to the committed list. The draft fieldset resets after commit.

**"Run report":** shows loading spinner on the button; disables the button; shows `ReportResultsTable` in loading state. On completion (success or error), re-enables the button.

**"Load" (template):** immediately replaces the active `ReportBuilder` state (explore + fields + filters + sorts + column config) with the template's stored values. Does not close or alter the template panel. Does not auto-run the report.

**"Edit" (template):** populates the save-template form with the template's name, description, and visibility. Scrolls to or expands the save form if collapsed. The form submit changes to "Update" mode.

**"Delete" (template):** opens `ConfirmationDialog`. Focus moves to the dialog. On confirmation, dialog closes and the delete action proceeds. On cancel, dialog closes with no action.

**ConfirmationDialog:** Pressing Escape or clicking Cancel closes the dialog and returns focus to the delete button that triggered it.

**Save form — Cancel:** clears the form fields, resets visibility to "Private (only me)", and returns the submit action to "Save" (new template) mode.

**Template panel collapse:** clicking the collapse toggle on the card header collapses the panel. The save form's fields are cleared and the panel returns to its default (save form collapsed, list visible) state on next expand.

### 5.5 Permission-conditional rendering

| Context | What renders | Condition |
|---------|-------------|-----------|
| `/reports` page — entire surface | Access-denied fallback | `reports.read` denied (PagePermissionGuard fires first) |
| `/reports` page — content | Full page (`ReportBuilder` + template panel) | `reports.read` granted AND event selected |
| `/reports` page — content | No-event empty state only | `reports.read` granted AND no event selected |
| Save template form + Save button | Visible | `canCreate` from `useResourcePermissions('reports')` is `true` |
| Save template form + Save button | Hidden | `canCreate` is `false` |
| Edit button (per template row) | Visible | `template.created_by === user.id` |
| Delete button (per template row) | Visible | `template.created_by === user.id` |
| Load button (per template row) | Visible | User can see the row (always when row is rendered) |
| Private template rows | Visible in list | `template.created_by === user.id` (RLS enforces this; no additional client-side filter needed) |
| Event-shared template rows | Visible in list | User has event access (RLS enforces this; always visible when row is returned) |

---

## 6. Business rules

### BR-01: Template ownership

- **Rule:** Only the template creator may edit or delete a template, regardless of visibility.
- **Evaluation:** Identity comparison — `template.created_by === user.id`. This is not an RBAC check; it is a data ownership check using the authenticated user's ID from `useUnifiedAuth()`.
- **Display:** "Edit" and "Delete" controls are rendered only when the identity check passes. "Load" is rendered for all users who can see the row.
- **DB-level note:** `core_report_template` RLS permits org admins to UPDATE and DELETE any row at the database layer. This broader permission exists for administrative override and is not surfaced in the UI. The UI correctly restricts edit/delete to creator only.

### BR-02: Filter operator display labels

The shared `ReportingFilterOperator` type does not differentiate by field data type — all ten operators are available for any field. The human-readable labels to display in the operator dropdown are:

| Operator value | Display label |
|---------------|--------------|
| `eq` | equals |
| `neq` | does not equal |
| `contains` | contains |
| `starts_with` | starts with |
| `ends_with` | ends with |
| `gt` | greater than |
| `gte` | greater than or equal to |
| `lt` | less than |
| `lte` | less than or equal to |
| `in` | is one of |

The `in` operator requires a multi-value input (comma-separated or tag input). All other operators require a single value input.

### BR-03: Template visibility semantics

| `is_private` value | Stored label | Visible to |
|-------------------|-------------|------------|
| `true` | Private | Creator only (`created_by = current_user`) |
| `false` | Event-shared | All users with `reports.read` and `check_user_event_access(event_id)` |

Default when saving a new template: `is_private = true`.

RLS on `core_report_template` enforces this at query time. No client-side filtering of the returned list is required — the database only returns rows the user may see.

### BR-04: Template save and update validation

- Template name: required; non-empty string after whitespace trimming. Validation fires on "Save" / "Update" press.
- At least one field must be selected in `ReportBuilder` before saving.
- Config serialisation: `serializeReportTemplateConfig(config)` is called before INSERT / UPDATE. The produced `SerializedReportTemplateConfig` carries `app_id`, `domain_id`, `selected_fields`, `filters`, `sort_config`, `column_config`.
- Runtime scope values (`event_id`, `organisation_id`) must not be included in the serialised config. They are injected at query time from the selected event context.
- `event_id` is written to `core_report_template` as a separate top-level column (not inside the config), set to `selectedEvent.event_id` at save time.
- `organisation_id` is written as a separate top-level column, sourced from the scoped Supabase context.
- `created_by` is set to `user.id` at INSERT time and is not modified on UPDATE.

### BR-05: Template config deserialisation and load

- On load, `deserializeReportTemplateConfig(serialized)` reconstructs `ReportTemplateConfig` from the stored `SerializedReportTemplateConfig`.
- The reconstructed config's `exploreKey` is derived as `${app_id}.${domain_id}` from the stored columns.
- If the stored config contains runtime scope fields (`event_id`, `organisation_id`), `deserializeReportTemplateConfig` throws an error. This indicates a data integrity problem; surface as a template load error (FI-15) rather than crashing.
- After deserialisation, the `ReportTemplateConfig` is passed to `ReportBuilder` to restore the session state. The report does not auto-execute.

### BR-06: Event scope enforcement

- All report queries are scoped to the selected event. `scopeValue` passed to `ReportBuilder` is `selectedEvent.event_id` (a string). The shared query planning engine applies `WHERE {explore.baseTable}.{explore.scopeColumn} = scopeValue`.
- Templates do not query across events. The template list shows only templates where `event_id` matches the selected event (enforced by scoped Supabase client and RLS).

### BR-07: Export data contract

- The DataTable export action (CSV) produces output from the rendered rows in `ReportResultsTable`.
- No separate query is executed for export.
- The exported column order and column names match what is displayed.
- Export is only available when results have been rendered (i.e., "Run report" has been executed successfully).

### BR-08: Engine limit and timeout error display

- If `ReportingExecutionAdapter.execute()` returns a non-ok `ApiResult` with an error indicating row limit exceeded, timeout, or query complexity, the error message rendered in the UI must explicitly state that the query was too large and include a suggestion to reduce field selection or add filters.
- Silent truncation (returning a partial result without surfacing the limit) is not permitted.
- The build agent should detect these specific error types from the execution result's error code or message and render an appropriate user-facing copy rather than a raw error string.

### BR-09: Field–explore domain filtering in metadataProvider

- `ReportingMetadataProvider.getFields(exploreKey)` is called by `ReportBuilder` whenever the active explore changes.
- The BASE implementation queries `core_field_list` where `report_availability = true`.
- Each row is then filtered to include only rows where `report_domains` contains the `domainId` of the requested explore. The explore's `domainId` is obtained from `getReportingExplore(exploreKey).domainId`.
- The `fieldKey` for each `ReportingFieldMeta` is formed as `${table_name}.${field_name}` — matching the format expected by `validateReportingSelection` and stored in `selected_fields` on `core_report_template`.
- The `core_field_list` columns map to `ReportingFieldMeta` as follows:

| `core_field_list` column | `ReportingFieldMeta` field |
|--------------------------|---------------------------|
| `table_name` | `tableName` |
| `friendly_field_name` (falling back to `field_name` if null) | `label` |
| `report_availability` | `reportAvailability` |
| `report_domains` | `reportDomains` |
| `aggregate_strategy` | `aggregateStrategy` |
| `aggregate_config` | `aggregateConfig` |
| `${table_name}.${field_name}` (derived) | `fieldKey` |

### BR-10: Explore switching clears all state

When the user selects a different explore, all of the following are cleared immediately by `ReportBuilder`: selected field keys, active filters, active sorts, column config, and execution results. Any loaded template association is cleared. No confirmation prompt is shown before switching.

---

## 7. API / Contract

### Read contracts

**Field metadata** — `core_field_list`
- Query: `SELECT table_name, field_name, friendly_field_name, field_type, report_availability, report_domains, aggregate_strategy, aggregate_config FROM core_field_list WHERE report_availability = true ORDER BY table_name, field_name`
- Consumed via scoped Supabase client (`useSecureSupabase()`).
- Called per `getFields(exploreKey)` invocation; client-side domain filtering applied after fetch.

**Template list** — `core_report_template`
- Query: `SELECT id, name, description, is_private, created_by, event_id, organisation_id, app_id, domain_id, selected_fields, filters, sort_config, column_config, created_at FROM core_report_template ORDER BY created_at DESC`
- Scoped Supabase client applies `event_id` scope; RLS applies `is_private` and event-access filtering.
- Called on template panel mount and after any successful save / update / delete.

**Template load** — `core_report_template`
- Query: `SELECT ... FROM core_report_template WHERE id = :templateId LIMIT 1`
- Returns null if not found (or RLS denies access).

### Write contracts

**Template INSERT** — `core_report_template`
- Columns written: `name`, `description`, `is_private`, `event_id`, `organisation_id`, `created_by`, `app_id`, `domain_id`, `selected_fields` (jsonb), `filters` (jsonb), `sort_config` (jsonb), `column_config` (jsonb)
- `created_by` set to `user.id`
- `event_id` set to `selectedEvent.event_id`
- Returns inserted row

**Template UPDATE** — `core_report_template`
- Columns written: `name`, `description`, `is_private`, `app_id`, `domain_id`, `selected_fields`, `filters`, `sort_config`, `column_config`, `updated_at` (auto-managed), `updated_by` (set to `user.id`)
- Filter: `WHERE id = :templateId`
- RLS permits: creator or org admin

**Template DELETE** — `core_report_template`
- Filter: `WHERE id = :templateId`
- RLS permits: creator or org admin

### Execution contract

`ReportingExecutionAdapter.execute(request: ReportingExecutionRequest)` receives a `ReportingExecutionRequest` (containing a fully resolved `ReportingQueryPlan`) from the shared `ReportBuilder`. The BASE adapter translates this into a Supabase query:
- Base table: `plan.explore.baseTable`
- Scope clause: `WHERE {plan.scopeClause.table}.{plan.scopeClause.column} = {plan.scopeClause.value}`
- Joins: constructed from `plan.requiredJoins`
- Selected columns: derived from `plan.selectedFields` (using `fieldKey` to compose `tableName.fieldName` projections)
- Filters: applied from `plan.filters` using `plan.filters[].operator` and `plan.filters[].value`
- Sorts: applied from `plan.sorts` using `plan.sorts[].direction`
- Aggregations: applied from `plan.aggregations` (using `strategy` per field)
- Returns `ApiResult<ReportingExecutionData>` with `{ rows: ReportingExecutionRow[], totalCount?: number }`

### RLS contracts

| Operation | Permitted actors |
|-----------|-----------------|
| SELECT `core_report_template` | Super admin; creator (own templates); users with event access (non-private templates only) |
| INSERT `core_report_template` | Authenticated org members |
| UPDATE `core_report_template` | Creator; org admin; super admin |
| DELETE `core_report_template` | Creator; org admin; super admin |
| SELECT `core_field_list` | Inherited from scoped client; all authenticated users via `useSecureSupabase()` |

### Cross-slice handoffs

- **Receives:** selected event context (`selectedEvent.event_id`) from BA00 shell via `useEvents()`.
- **Exports:** none. No contracts published to sibling slices.

### ID contracts

- `event_id: string` — from `selectedEvent.event_id` (BA00 shell context)
- `organisation_id: uuid` — from `useSecureSupabase()` scope context
- `user.id: uuid` — from `useUnifiedAuth()`, used for `created_by` and ownership checks
- `template.id: uuid` — primary key of `core_report_template`

---

## 8. Data and schema references

### Tables

| Table | Purpose in BA15 |
|-------|----------------|
| `core_field_list` | Field registry; queried for all rows with `report_availability = true`; domain-filtered per explore |
| `core_report_template` | Template persistence; read/write via `ReportingTemplateStore` adapter |

### DB-319 column verification (confirmed 2026-05-01 against `rkytnffgmwnnmewevqgp`)

Both tables have all required columns. Build agent should re-verify before execution:

```sql
-- Verify core_field_list DB-319 columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_field_list'
  AND column_name IN ('report_domains', 'aggregate_strategy', 'aggregate_config');
-- Expected: 3 rows

-- Verify core_report_template DB-319 columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_report_template'
  AND column_name IN ('domain_id', 'app_id', 'sort_config', 'column_config');
-- Expected: 4 rows
```

### RLS verification

```sql
-- Verify RLS policies on core_report_template
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'core_report_template';
-- Expected: rbac_select, rbac_insert, rbac_update, rbac_delete, service_role_can_manage_all
```

### Seed data dependency

`core_field_list` must contain rows with `report_availability = true` and `report_domains` values matching BASE explore domain IDs for non-trivial QA. Use BA18 seed procedures. Query to verify:

```sql
SELECT report_domains, count(*) FROM core_field_list
WHERE report_availability = true GROUP BY report_domains;
```

---

## 9. pace-core2 imports

### §9.1 Imports table

| Item | Type | Import path | Purpose |
|------|------|-------------|---------|
| `ReportBuilder` | component | `@solvera/pace-core/reporting` | Shared report composition, execution, and template UI |
| `ReportResultsTable` | component | `@solvera/pace-core/reporting` | Results table with DataTable features |
| `getReportingExplore` | utility | `@solvera/pace-core/reporting` | Resolves explore by key; used in `metadataProvider` to get `domainId` |
| `serializeReportTemplateConfig` | utility | `@solvera/pace-core/reporting` | Produces `SerializedReportTemplateConfig` before persistence |
| `deserializeReportTemplateConfig` | utility | `@solvera/pace-core/reporting` | Reconstructs `ReportTemplateConfig` on load |
| `ReportingMetadataProvider` | interface | `@solvera/pace-core/reporting` | Interface implemented by BA15's field metadata adapter |
| `ReportingExecutionAdapter` | interface | `@solvera/pace-core/reporting` | Interface implemented by BA15's query execution adapter |
| `ReportingTemplateStore` | interface | `@solvera/pace-core/reporting` | Interface implemented by BA15's template persistence adapter |
| `ReportingTemplateRecord` | type | `@solvera/pace-core/reporting` | Record shape returned by template store operations |
| `ReportingTemplateSaveInput` | type | `@solvera/pace-core/reporting` | Input shape for `saveTemplate`: `{ id?, name, is_private, description?, config }` |
| `ReportTemplateConfig` | type | `@solvera/pace-core/reporting` | Runtime config shape (explore + fields + filters + sorts + columns) |
| `SerializedReportTemplateConfig` | type | `@solvera/pace-core/reporting` | Persisted config shape (app_id, domain_id, selected_fields, filters, sort_config, column_config) |
| `ReportingExploreKey` | type | `@solvera/pace-core/reporting` | `${string}.${string}` — valid explore key format |
| `ReportingFieldMeta` | type | `@solvera/pace-core/reporting` | Field descriptor; shape see §9.2 |
| `ReportingFilter` | type | `@solvera/pace-core/reporting` | `{ fieldKey, operator: ReportingFilterOperator, value: unknown }` |
| `ReportingSort` | type | `@solvera/pace-core/reporting` | `{ fieldKey, direction: 'asc' \| 'desc' }` |
| `ReportingColumnConfig` | type | `@solvera/pace-core/reporting` | `{ fieldKey, visible?, width?, order? }` |
| `ReportingFilterOperator` | type | `@solvera/pace-core/reporting` | `'eq' \| 'neq' \| 'contains' \| 'starts_with' \| 'ends_with' \| 'gt' \| 'gte' \| 'lt' \| 'lte' \| 'in'` |
| `ReportingExecutionRequest` | type | `@solvera/pace-core/reporting` | `{ plan: ReportingQueryPlan }` — passed to execution adapter |
| `ReportingExecutionData` | type | `@solvera/pace-core/reporting` | `{ rows: Record<string, unknown>[]; totalCount?: number }` |
| `ReportingExecutionResult` | type | `@solvera/pace-core/reporting` | `ApiResult<ReportingExecutionData>` — returned by execution adapter |
| `ReportingQueryPlan` | type | `@solvera/pace-core/reporting` | Resolved query plan; see §9.2 for shape |
| `PagePermissionGuard` | component | `@solvera/pace-core/rbac` | Page-level permission gating |
| `useResourcePermissions` | hook | `@solvera/pace-core/rbac` | Per-operation permission booleans for the `reports` resource |
| `useSecureSupabase` | hook | `@solvera/pace-core/rbac` | Scoped Supabase client with `organisation_id`, `event_id`, `app_id` |
| `useEvents` | hook | `@solvera/pace-core/hooks` | Event context — `selectedEvent.event_id` |
| `useUnifiedAuth` | hook | `@solvera/pace-core/hooks` | Current user identity — `user.id` |
| `useToast` | hook | `@solvera/pace-core/hooks` | Toast notifications |
| `ConfirmationDialog` | component | `@solvera/pace-core/components` | Delete confirmation modal |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | components | `@solvera/pace-core/components` | Template panel layout |
| `Input`, `Textarea`, `Button`, `Badge`, `Alert` | components | `@solvera/pace-core/components` | Template panel form elements and state display |
| `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` | components | `@solvera/pace-core/components` | Visibility selector in save form |

### §9.2 Component / hook / utility usage details

#### `ReportBuilder`

**Export name:** `ReportBuilder`

**Props:**

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `metadataProvider` | `ReportingMetadataProvider` | Yes | — | BA15 implements; see below |
| `executionAdapter` | `ReportingExecutionAdapter` | Yes | — | BA15 implements; see below |
| `templateStore` | `ReportingTemplateStore` | No | `undefined` | BA15 passes a BASE adapter. Template UI is hidden when omitted. Interface includes `saveTemplate(ReportingTemplateSaveInput)`, `listTemplates`, `loadTemplate`, and `deleteTemplate`. |
| `initialExploreKey` | `ReportingExploreKey` | No | `'team.participant'` | BA15 passes `'base.participant'` |
| `scopeValue` | `ReportingScopeValue` | Yes | — | BA15 passes `selectedEvent.event_id` |
| `availableExploreKeys` | `ReportingExploreKey[]` | No | all registered | BA15 passes `['base.participant', 'base.unit', 'base.activity', 'base.scan']` |

**Non-obvious behaviour:**
- Switching explore clears `selectedFieldKeys`, `filters`, `sorts`, `columnConfig`, `result`, and `activeTemplateId` immediately with no confirmation prompt.
- Filters and sorts are auto-pruned when their referenced `fieldKey` is removed from `selectedFieldKeys`.
- "Run report" is disabled when `selectedFieldKeys.length === 0` or `validateReportingSelection` returns `valid: false`.
- When `templateStore` is `undefined`, the template save and list UI are not rendered by the component.

#### `ReportResultsTable`

**Export name:** `ReportResultsTable`

**Props:**

| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `fields` | `ReportingFieldMeta[]` | Yes | — | Selected fields; renders as table columns using `field.label` as header |
| `result` | `ReportingExecutionData \| null` | Yes | — | `null` renders empty state |
| `isLoading` | `boolean` | No | `false` | DataTable loading state |
| `title` | `string` | No | `'Report results'` | Card and DataTable title |
| `columnConfig` | `ReportingColumnConfig[]` | No | `[]` | Controls column order and visibility |
| `sorts` | `ReportingSort[]` | No | `[]` | Maps to `initialSorting` on DataTable |

**Non-obvious behaviour:**
- Renders a `Card > CardHeader > CardTitle` + `CardContent > DataTable` structure.
- All DataTable features are enabled: `search`, `export`, `filtering`, `sorting`, `pagination`, `columnVisibility`.
- Empty state copy (built in): "No rows returned" / "Adjust fields or filters and run the report again."
- **PC-04 resolved:** `DataTable` is called with `rbac={{ pageName: 'reports' }}`, which composes `'read:page.reports'` via `toPagePermission`. DataTable RBAC-gated features (search, export, filtering, sorting, pagination, column visibility) are gated correctly against the `reports` page permissions.
- `columnConfig.visible === false` causes the field to be excluded from the rendered column set.

#### `ReportingMetadataProvider` (BA15 implementation)

**Interface:**
```typescript
interface ReportingMetadataProvider {
  getFields: (exploreKey: ReportingExploreKey) => Promise<ReportingFieldMeta[]> | ReportingFieldMeta[];
}
```

**BA15 implementation contract:**
- Queries `core_field_list` via `useSecureSupabase()` where `report_availability = true`.
- Filters results to rows where `report_domains` contains the `domainId` of the requested explore. Resolve `domainId` via `getReportingExplore(exploreKey).domainId`.
- Maps rows to `ReportingFieldMeta` using the column mapping in BR-09.
- `fieldKey` format: `${table_name}.${field_name}` — this must be consistent with what is stored in `selected_fields` on `core_report_template`.
- Returns an empty array (not an error) if no fields match the explore domain.

#### `ReportingFieldMeta` (type reference)

```typescript
interface ReportingFieldMeta {
  fieldKey: string;            // "${table_name}.${field_name}" — BA15 convention
  tableName: string;           // core_field_list.table_name
  label: string;               // core_field_list.friendly_field_name (fallback: field_name)
  reportAvailability: boolean; // core_field_list.report_availability
  reportDomains: string[] | null; // core_field_list.report_domains
  aggregateStrategy?: ReportingAggregateStrategy | null; // core_field_list.aggregate_strategy
  aggregateConfig?: Record<string, unknown> | null;      // core_field_list.aggregate_config
}
```

#### `ReportingExecutionAdapter` (BA15 implementation)

**Interface:**
```typescript
interface ReportingExecutionAdapter {
  execute: (request: ReportingExecutionRequest) => Promise<ReportingExecutionResult> | ReportingExecutionResult;
}
```

**`ReportingExecutionRequest` shape:**
```typescript
interface ReportingExecutionRequest {
  plan: ReportingQueryPlan;
}
```

**`ReportingQueryPlan` key fields used by the adapter:**

| Field | Type | Usage |
|-------|------|-------|
| `plan.explore.baseTable` | `string` | The FROM table for the query |
| `plan.scopeClause` | `{ table, column, operator: 'eq', value }` | The `WHERE` scope filter |
| `plan.requiredJoins` | `ReportingJoin[]` | Joins to construct (`type`, `table`, `on`) |
| `plan.selectedFields` | `ReportingFieldMeta[]` | Fields to project; use `fieldKey` to derive `table.column` |
| `plan.filters` | `ReportingFilter[]` | User-defined filters (`fieldKey`, `operator`, `value`) |
| `plan.sorts` | `ReportingSort[]` | Sort rules (`fieldKey`, `direction`) |
| `plan.aggregations` | `ReportingAggregationPlan[]` | Aggregate strategies per field (`strategy`, `fieldKey`, `tableName`) |
| `plan.groupByFieldKeys` | `string[]` | Fields to GROUP BY when aggregations are present |

**Return:** `ApiResult<ReportingExecutionData>` where `ReportingExecutionData = { rows: Record<string, unknown>[]; totalCount?: number }`.

#### `getReportingExplore`

**Export name:** `getReportingExplore`

**Source:** `src/reporting/explores.ts`

**Signature:**
```typescript
function getReportingExplore(exploreKey: ReportingExploreKey): ReportingExplore
```

**Return shape:** `ReportingExplore` — `{ key, label, domainId, appId, baseTable, scopeColumn, joins }`

**BA15 usage:** called inside the `metadataProvider.getFields` implementation to resolve `domainId` for the requested explore, which is then used to filter `core_field_list` rows by `report_domains`:
```typescript
const domainId = getReportingExplore(exploreKey).domainId;
```

**Non-obvious behaviour:** Throws if `exploreKey` is not registered in the shared explore registry. BA15's `metadataProvider` should only be called with keys from `['base.participant', 'base.unit', 'base.activity', 'base.scan']` (passed via `availableExploreKeys`), so unregistered key errors indicate a misconfiguration, not a user error.

---

#### `ReportingTemplateStore` (BA15 implementation)

**Interface:**
```typescript
interface ReportingTemplateStore {
  listTemplates: (exploreKey: ReportingExploreKey) => Promise<ReportingTemplateRecord[]> | ReportingTemplateRecord[];
  saveTemplate: (template: ReportingTemplateSaveInput) => Promise<ReportingTemplateRecord> | ReportingTemplateRecord;
  loadTemplate: (templateId: string) => Promise<ReportingTemplateRecord | null> | ReportingTemplateRecord | null;
  deleteTemplate: (templateId: string) => Promise<void> | void;
}
```

Where `ReportingTemplateSaveInput` is:
```typescript
interface ReportingTemplateSaveInput {
  id?: string;
  name: string;
  is_private: boolean;
  description?: string;
  config: ReportTemplateConfig;
}
```

And `ReportingTemplateRecord` is:
```typescript
interface ReportingTemplateRecord {
  id: string;
  name: string;
  is_private: boolean;
  created_by: string;
  description?: string;
  config: ReportTemplateConfig;
}
```

**BA15 adapter implementation contract:**
- `listTemplates(exploreKey)`: queries `core_report_template` via scoped client; returns all visible templates for the selected event. The `exploreKey` filter may be applied client-side or as a DB filter on `app_id` + `domain_id`. Maps DB rows to `ReportingTemplateRecord`.
- `saveTemplate(input)`: if `input.id` is provided, performs UPDATE on `core_report_template`; otherwise performs INSERT. Calls `serializeReportTemplateConfig(input.config)` to produce the jsonb columns. Sets `event_id`, `organisation_id`, `created_by` (INSERT only) from scoped context and `user.id`.
- `loadTemplate(templateId)`: queries `core_report_template WHERE id = :templateId`. Maps DB row to `ReportingTemplateRecord`. Calls `deserializeReportTemplateConfig` to reconstruct `config`.
- `deleteTemplate(templateId)`: deletes `core_report_template WHERE id = :templateId`.

#### `serializeReportTemplateConfig` / `deserializeReportTemplateConfig`

**`serializeReportTemplateConfig(config: ReportTemplateConfig): SerializedReportTemplateConfig`**
- Input shape: `{ exploreKey, selectedFieldKeys: string[], filters: ReportingFilter[], sorts: ReportingSort[], columnConfig: ReportingColumnConfig[] }`
- Output shape: `{ app_id: string, domain_id: string, selected_fields: string[], filters: ReportingFilter[], sort_config: ReportingSort[], column_config: ReportingColumnConfig[] }`
- Derives `app_id` and `domain_id` by splitting `exploreKey` on `.` (format: `{app}.{domain}`)

**`deserializeReportTemplateConfig(serialized: SerializedReportTemplateConfig): ReportTemplateConfig`**
- Reconstructs `exploreKey` as `${app_id}.${domain_id}`
- **Throws `Error`** if the serialised record contains runtime scope fields (`event_id`, `organisation_id`, `scope`)
- Callers must wrap in try/catch; surface as a template load error rather than crashing the page

#### `PagePermissionGuard`

**Export name:** `PagePermissionGuard`

**Props:** `pageName: string`, `operation: 'read' | 'create' | 'update' | 'delete'`, `children: ReactNode`, `fallback?: ReactNode`, `scope?: Scope | null`, `loading?: ReactNode`, `strictMode?: boolean`, `auditLog?: boolean`, `pageId?: string | null`, `onDenied?: () => void`

**BA15 usage:**
```tsx
<PagePermissionGuard
  pageName="reports"
  operation="read"
  scope={{ organisationId, eventId: selectedEvent?.event_id }}
  fallback={<AccessDenied />}
>
  {/* page content */}
</PagePermissionGuard>
```

**Non-obvious behaviour:** When loading and no `loading` prop is provided, returns `null` (blank). Set `loading={<PageSkeleton />}` to avoid a flash of blank during permission resolution. When `scope.eventId` is `undefined`, evaluates at org level — does not stall.

**How permission resolution works:** `PagePermissionGuard` calls `usePageCan(pageName, operation, scope)` which calls `toPagePermission('reports', 'read')` → composes `'read:page.reports'`. This permission string is checked against the user's grants via `isPermittedCached`. No additional constants registration is required.

#### `useResourcePermissions`

**Export name:** `useResourcePermissions`

**Signature:** `useResourcePermissions(resource: string, operations?: readonly Operation[] | null, scopeOverride?: Scope | null): ResourcePermissionsResult`

**BA15 usage:** `const { canCreate, isLoading } = useResourcePermissions('reports')`

**Return shape (relevant fields):**

| Field | Type | Notes |
|-------|------|-------|
| `canRead` | `boolean` | Page read access |
| `canCreate` | `boolean` | Used to show/hide save template form |
| `canUpdate` | `boolean` | Available; not directly used in BA15 UI |
| `canDelete` | `boolean` | Available; not directly used in BA15 UI (template delete uses identity check, not RBAC) |
| `isLoading` | `boolean` | True while permissions resolve; gate template form rendering behind `!isLoading` |

**How permission resolution works:** For each operation, calls `toPagePermission('reports', op)` to compose e.g. `'read:page.reports'`, then checks it via `isPermittedCached`. No lookup table is involved; any `resource` string resolves automatically. All operations return `false` only when the user has no matching grants, not due to missing constants.

#### `useSecureSupabase`

**Signature:** `useSecureSupabase(baseClient?: RBACSupabaseClient | null): RBACSupabaseClient | null`

**Return:** Scoped Supabase client with `organisation_id`, `event_id`, `app_id` from resolved context. Returns `null` if no base client is available (guard against this before using).

---

## 10. Permission and access rules

| Permission / check | Action | Actors permitted |
|-------------------|--------|-----------------|
| `reports.read` via `PagePermissionGuard` | Access `/reports` | Users with `reports.read` on their event/org role |
| `canCreate` via `useResourcePermissions('reports')` | Save new template | Users with `create:page.reports` grant |
| Identity check: `template.created_by === user.id` | Edit a template | Template creator only |
| Identity check: `template.created_by === user.id` | Delete a template | Template creator only |
| `reports.read` + event access (RLS) | Load / view event-shared templates | All users with `reports.read` and `check_user_event_access` |
| RLS: `created_by = current_user` | View own private templates | Template creator only (enforced at DB level) |
| RLS: org admin | UPDATE / DELETE any template at DB level | Org admins and super admins (not surfaced in UI) |

---

## 11. Acceptance criteria

**AC-01** (FI-03) — Given an authenticated user with `reports.read` and an event selected, when they navigate to `/reports`, then the page renders with `ReportBuilder` active on the Participants explore and the template panel visible.

**AC-02** (FI-02) — Given an authenticated user without `reports.read`, when they navigate to `/reports`, then the access-denied component renders and no `ReportBuilder`, results table, or template panel is visible.

**AC-03** (FI-04, FI-08) — Given an authenticated user with `reports.read` and no event selected, when they navigate to `/reports`, then the no-event empty state ("Select an event to run reports") renders and no `ReportBuilder` is visible.

**AC-04** (FI-27, FI-23) — Given a user with at least one field selected from the Participants explore, when they press "Run report", then `ReportResultsTable` renders with one column per selected field using the field's label as the column header.

**AC-05** (FI-09) — Given a user with no fields selected, when they view `ReportBuilder`, then the "Run report" button is disabled.

**AC-06** (FI-13, FI-14) — Given a report execution that fails (adapter returns an error result), when the user presses "Run report", then an error `Alert` renders in the results area with a message that does not show a partial results table; silent truncation is not acceptable.

**AC-07** (FI-32) — Given a user with `reports.create`, at least one field selected, and a template name entered, when they select "Private (only me)" and press "Save", then a new row is created in `core_report_template` with `is_private = true` and `created_by = user.id`, and a "Template saved" toast appears.

**AC-08** (FI-32 validation) — Given a user who presses "Save" with no name entered, then the save is blocked, a validation error is shown on the name field, and no row is written to `core_report_template`.

**AC-09** (FI-33) — Given a saved template, when a user clicks "Load", then `ReportBuilder` restores the explore, selected fields, filters, sorts, and column config from the template, and the report does not auto-execute.

**AC-10** (FI-34) — Given a template the authenticated user created, when they click "Edit", update the name, and press "Update", then the template's `name` column is updated in `core_report_template` and a "Template updated" toast appears.

**AC-11** (FI-35) — Given a template the authenticated user created, when they click "Delete" and confirm in the dialog, then the row is deleted from `core_report_template`, the template disappears from the list, and a "Template deleted" toast appears.

**AC-12** (FI-43) — Given a template created by a different user with `is_private = false`, when the authenticated user views the template list, then the "Edit" and "Delete" buttons are not rendered on that row; only "Load" is visible.

**AC-13** (FI-41, FI-42) — Given a user without `reports.create`, when they view `/reports`, then the save-template form is not rendered.

**AC-14** (FI-44, BR-03) — Given User A saves a private template and User B shares the same event access and `reports.read`, when User B views the template list, then User A's private template does not appear in User B's list.

**AC-15** (FI-36, BR-10) — Given a user who has selected three fields in the Participants explore, when they switch to the Units explore, then all previously selected fields, filters, sorts, and results are cleared and the Units field catalog loads.

**AC-16** (FI-18) — Given the `/reports` page with an event selected, when the page loads, then the explore selector shows exactly four options: "Participants", "Units", "Activities", "Scans".

**AC-17** (BR-06) — Given a user who saves a template while Event A is selected, when they switch to Event B and view the template list, then the template saved under Event A is not visible in the Event B list.

---

## 12. Verification

**Scenario 1 — Access control**
1. Log in as a user without `reports.read`.
2. Navigate to `/reports`.
3. Expected: access-denied component renders; no report UI visible.

**Scenario 2 — Basic report execution**
1. Log in as a user with `reports.read` and select an event with seeded data.
2. Navigate to `/reports`.
3. Select the Participants explore.
4. Select 3–5 fields from the catalog.
5. Press "Run report".
6. Expected: `ReportResultsTable` renders with the selected fields as columns and at least one row of data.

**Scenario 3 — Filter application**
1. Continue from Scenario 2 (Participants, results visible).
2. Press "Add filter", select a field, choose "contains", enter a partial value.
3. Press "Run report".
4. Expected: results table updates; only rows matching the filter are shown.

**Scenario 4 — Explore switching**
1. Select Participants explore, select 2 fields.
2. Switch to Units explore.
3. Expected: field catalog reloads with Units fields; selected fields, filters, and results are cleared.

**Scenario 5 — Template save and load**
1. Select Participants explore, select 3 fields, add 1 filter.
2. Enter "My Test Template" in the name field, select "Private (only me)", press "Save".
3. Expected: "Template saved" toast; template appears in the saved templates list with "Private" badge.
4. Clear the field selection.
5. Click "Load" on the saved template.
6. Expected: the 3 fields and 1 filter are restored in `ReportBuilder`; report does not auto-run.

**Scenario 6 — Template visibility**
1. User A saves a template with "Private (only me)".
2. User B (same event, `reports.read`) navigates to `/reports`.
3. Expected: User A's private template does not appear in User B's list.
4. User A edits the template and changes visibility to "Event-shared".
5. User B reloads `/reports`.
6. Expected: the template now appears in User B's list with "Event-shared" badge; only "Load" is visible for User B (no Edit/Delete).

**Scenario 7 — Template delete**
1. Locate a template you own.
2. Click "Delete".
3. Expected: `ConfirmationDialog` appears with the template's name.
4. Click "Cancel".
5. Expected: dialog closes; template remains.
6. Click "Delete" again, then "Delete" in the dialog.
7. Expected: "Template deleted" toast; template removed from list.

**Scenario 8 — No event selected**
1. Clear the selected event in the BA00 shell event picker.
2. Navigate to `/reports`.
3. Expected: no-event empty state renders; no `ReportBuilder` visible.

**Scenario 9 — Scan-domain reporting after sync (runtime data-correctness check)**
1. Run scan operations during an event using BA13's runtime (creates `base_scan_event` rows; BA14's sync layer reconciles offline scans).
2. Wait for BA14 to confirm sync has completed for the event (no pending offline-queue rows for the event).
3. Navigate to `/reports` with the event selected.
4. Select the Scans explore (`base.scan`); add fields including `validation_result` and `validation_reason`; run the report.
5. Expected: results match the reconciled scan-event set in dev-db. Rows with `validation_result = 'upload_conflict'` (created by BA14's sync conflict resolution) are visible alongside accepted/rejected scans.
6. Note: this scenario verifies BA15 reads the same `base_scan_event` table that BA13/BA14 write to. BA15 itself does not validate that sync has run — that is an operational precondition the operator manages before running scan reports.

**MCP dev-db verification steps**
```sql
-- Confirm field metadata is available for all 4 BASE explores
SELECT report_domains, count(*) FROM core_field_list
WHERE report_availability = true GROUP BY report_domains;

-- Confirm template table has required columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_report_template'
ORDER BY ordinal_position;

-- Inspect RLS policies
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'core_report_template';
```

---

## 13. Testing requirements

**Happy path — report execution:** Select an explore, choose fields, run report, verify results table renders with correct columns.

**Happy path — template lifecycle:** Save, load, edit, and delete a template through the full cycle.

**Validation failure — save without name:** Attempt to save a template with an empty name field; verify save is blocked and error is shown.

**Validation failure — run without fields:** Verify "Run report" is disabled and shows a validation alert when no fields are selected.

**Auth failure — `reports.read` denied:** Verify access-denied component renders; no report UI accessible.

**Auth failure — edit/delete not own template:** Verify "Edit" and "Delete" are not rendered on templates created by other users.

**Visibility — private template not shared:** Verify a private template is not visible to other users (can be tested by querying `core_report_template` to confirm `is_private = true` and then verifying the list response does not include it for non-creator users).

**Explore switching:** Verify field selection, filters, sorts, and results clear correctly on explore change.

**Error state — execution failure:** Mock or trigger an adapter error; verify error `Alert` renders and no partial results are shown.

**Context — no event selected:** Verify no-event empty state renders when `selectedEvent` is absent.

**Required quality gates:** `lint`, `type-check`, `tests`, `validate` must all pass before marking Built.

---

## 14. Build execution rules

- No schema, RPC, or RLS contract changes are permitted by this slice. The build agent must not add columns, create RPCs, or alter RLS policies.
- Scope boundary: this slice owns only the `/reports` route. Do not modify routes owned by other slices.
- Do not implement a custom page-level layout for the template panel. `ReportBuilder` renders at full content width; the template section is embedded in its left configuration Card.
- Do not implement a local/custom template management panel. Template UI must come from the shared `ReportBuilder` via the `templateStore` prop.
- Do not implement a local query builder. Query planning uses `buildReportingQueryPlan` from `@solvera/pace-core/reporting`.
- Do not consult legacy source files. This document is the complete specification.
- If the implementation surfaces unexpected behaviour in `ReportBuilder` or `ReportResultsTable` that conflicts with this spec, stop and flag rather than working around it.
- If `core_field_list` returns no rows with `report_availability = true` for a given explore domain, surface this as a "no fields available" state in the field catalog — not as an application error.

---

## 15. Done criteria

A slice is `Done` only when:

- All acceptance criteria AC-01 through AC-17 are verified (not pre-ticked) by a QA reviewer.
- All functional specification items FI-01 through FI-47 are implemented and demonstrable.
- All quality gates pass: `lint`, `type-check`, `tests`, `validate`.
- Manual QA pack scenarios run with evidence captured in the QA pack at `docs/delivery/test-packs/BA15-qa-pack.md`.
- Visual evidence (screenshots) captured for: initial page load, empty state (no event), access-denied state, report results, template save flow, template list (with Private and Event-shared badges), ConfirmationDialog.
- Build queue row for BA15 updated with `execution_status: done` and `evidence` links.

---

## 16. Do not

- Do not implement a local/custom template management panel or template table. Template persistence is owned by the `ReportingTemplateStore` adapter; template UI is owned by the shared `ReportBuilder`. Duplicating this in BASE creates drift.
- Do not implement a local query builder or field metadata RPC. Use the shared `buildReportingQueryPlan` + `ReportingExecutionAdapter` pattern.
- Do not query `base_report_template`. This table does not exist. The authoritative table is `core_report_template`.
- Do not add behaviour not present in this document. If something is missing, flag it rather than improvising.
- Do not expand scope outside `/reports`. Do not modify event dashboard, applications, or other BASE routes.
- Do not substitute stubs for missing contracts — stop and flag.
- Do not pre-tick acceptance criteria. These are verified post-build.
- Do not hard-code field lists, explore domain IDs, or operator sets. These are driven by `core_field_list` and the shared pace-core2 types.
- Do not apply client-side app-permission filtering to the field catalog. Explore-level domain filtering via `report_domains` is the only field access control applied by this slice.
- Do not use `useCan` for page access checks. Use `PagePermissionGuard` for gate rendering and `useResourcePermissions('reports')` for CRUD UI state.

---

## 17. References

- `docs/requirements/BASE-project-brief.md` — project brief, scope, and quality gates.
- `docs/requirements/BASE-architecture.md` — route ownership, implementation order, and execution lanes.
- `docs/requirements/BA00-app-shell-and-access-requirements.md` — authenticated shell and event context.
- `docs/requirements/BA01-event-workspace-and-configuration-requirements.md` — event dashboard link to `/reports`.
- `docs/requirements/BA06-applications-admin-and-review-requirements.md` — `base_application` contract for `base.participant` explore.
- `docs/requirements/BA08-units-and-group-coordination-requirements.md` — `base_units` contract for `base.unit` explore.
- `docs/requirements/BA11-booking-operations-oversight-requirements.md` — `base_activity_booking` contract for `base.activity` explore.
- `docs/requirements/BA13-scanning-runtime-validation-requirements.md` — `base_scan_event` contract for `base.scan` explore.
- `docs/requirements/BA18-base-dev-seed-data-requirements.md` — seed data dependency for non-empty reporting QA.

---

## 18. Implementing Agent Instructions

**Implementation scope**
Your scope is exactly the `/reports` route and the components, adapters, and hooks it owns. Do not modify routes, components, or files owned by other slices. If you discover a defect in a sibling slice or in pace-core2, log it and continue — do not fix it.

**Sources of truth**
This document is the only source of functional and visual truth for this slice. The architecture document governs route ownership and cross-cutting decisions. pace-core2 standards govern shared patterns. Do not consult any legacy source files — this document is complete by design. If something appears to be missing, that is a documentation defect to report, not an instruction to read legacy code.

**Adapter implementation pattern**
This slice requires three adapter objects passed as props to `ReportBuilder`:
1. `metadataProvider` — implements `ReportingMetadataProvider` using `useSecureSupabase()` to query `core_field_list`. Follow BR-09 exactly for field mapping and domain filtering.
2. `executionAdapter` — implements `ReportingExecutionAdapter` using `useSecureSupabase()` to execute the `ReportingQueryPlan`. The plan object contains all join, filter, and projection information; translate it faithfully into a Supabase query.
3. `templateStore` — implements `ReportingTemplateStore` using `useSecureSupabase()` to read/write `core_report_template`. Follow §9.2 and BR-04 / BR-05 for serialisation behaviour.

**pace-core2 prerequisites**
All pace-core2 blockers (PC-03, PC-04, PC-05) are resolved. No layout pre-check is required — `ReportBuilder` renders at full content width with the template section embedded in the left Card.

RBAC: `PagePermissionGuard pageName="reports"` and `useResourcePermissions('reports')` compose permission strings via `toPagePermission` automatically — no constants registration required.

**Quality gates before marking Done**
- [ ] All functional specification items FI-01 through FI-47 implemented and functional
- [ ] All acceptance criteria AC-01 through AC-17 verified (not pre-ticked)
- [ ] `lint`, `type-check`, `tests`, `validate` all pass
- [ ] Visual evidence captured for all required states
- [ ] QA pack scenarios run with evidence at `docs/delivery/test-packs/BA15-qa-pack.md`
- [ ] Build queue row updated with `execution_status` and `evidence`

---

## 19. Open questions

| # | Question | Why it matters | Blocked artefact | Owner |
|---|----------|----------------|------------------|-------|
| 1 | ~~PC-03~~ **RESOLVED** — Interface additions shipped (`deleteTemplate`, `ReportingTemplateSaveInput`, `is_private`/`created_by`/`description` on `ReportingTemplateRecord`). Template panel positioning decided: embedded layout in left configuration Card is accepted for BA15; no separate positioning export required. | N/A — resolved. | N/A | — |
| 2 | ~~PC-05: `RESOURCE_NAMES.REPORTS` and `PAGE_PERMISSIONS.REPORTS`~~ **RESOLVED** — `useResourcePermissions` and `PagePermissionGuard` now use `toPagePermission(resource, operation)` to compose permission strings directly. No constants registration is required. | N/A — resolved. | N/A | — |
| 3 | ~~PC-04: `ReportResultsTable` hardcodes `rbac={{ pageName: 'shared-reporting' }}`~~ **RESOLVED** — `rbac={{ pageName: 'reports' }}` now in place; DataTable features gated correctly. | N/A — resolved. | N/A | — |
