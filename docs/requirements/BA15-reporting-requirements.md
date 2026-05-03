# BA15 — Reporting

## 1. Slice metadata

- Status: Planned
- Depends on: BA06 (Applications Admin and Review), BA08 (Units and Group Coordination), BA11 (Activity Booking Operations and Oversight), BA14 (Scanning Sync and Reconciliation)
- Backend impact: Read + write contracts; no schema changes
- Frontend impact: UI

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

- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints (for example `@solvera/pace-core/reporting` and `/rbac`) are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
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

**FI-45** — `/reports` is linked from the Event Dashboard nav card (BA01). No navigation exits the page other than shell-level navigation (sidebar links, event picker).

### Edge cases

**FI-46** — When fields are removed from the selected field list, any filters or sorts that reference those field keys are automatically cleared by `ReportBuilder` before the next execution.

**FI-47** — When a template is loaded whose `exploreKey` differs from the active explore, the explore switches automatically as part of the load operation, clearing any in-progress field selection for the prior explore before restoring the template's state.

---

## 5. Visual specification

- Visual scope is `/reports` with `ReportBuilder` and `ReportResultsTable` states.
- Keep this section to layout and user-visible states; query/execution contracts remain in §4/§7.
- Template ownership visuals reflect existing contract rules and do not redefine RLS.

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

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA15 |
|---|---|---|
| `ReportBuilder` / `ReportResultsTable` | Scoped `/reporting` exception path (reporting module surface) | Shared reporting UX surfaces |
| `PagePermissionGuard` / `useResourcePermissions` | Default root import where available; allow scoped `/rbac` exception when required | Read/create/update UI gating |
| `useSecureSupabase` | Default root import where available; allow scoped `/rbac` exception when required | Metadata, execution, and template adapters |
| `buildReportingQueryPlan` | Scoped `/reporting` exception path (reporting module surface) | Canonical query planning |

### 9.2 Slice-specific caveats only

- Use adapter contracts (`metadataProvider`, `executionAdapter`, `templateStore`) instead of local report engines.
- `ReportResultsTable` RBAC context for this slice is `pageName="reports"`.
- Template edit/delete controls are owner-only; non-owners are load-only.
- Field catalog source is `core_field_list`; no hardcoded catalogs.
- Import style in this slice follows root-first policy; `/reporting` and `/rbac` references are documented scoped exceptions where needed.

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

- Verify `/reports` read access, deny state, and no-event state.
- Verify report execution with selected fields and error handling for failed runs.
- Verify explore switching clears selection, filters, sorts, and results.
- Verify template save/load/edit/delete lifecycle for owner and non-owner users.
- Verify private vs event-shared template visibility behaviour across users.
- Verify MCP checks for field metadata, template table columns, and RLS policies.

## 13. Testing requirements

- Execution tests for selected fields -> expected results-table columns.
- Validation tests for run-without-fields and save-without-name paths.
- Permission tests for read-denied route and non-owner template restrictions.
- Adapter tests for template serialization and explore-switch reset.
- Error tests for execution failures with no partial results leak.

## 14. Build execution rules

- Scope is `/reports` only.
- No schema/RPC/RLS changes are permitted from BA15.
- Do not implement local template/query builders where shared contracts exist.
- Stop and report shared-reporting contract mismatches.

## 15. Done criteria

- Reporting behaviours in §4 are demonstrable across core success/error/empty states.
- §12 verification scenarios are completed with evidence.
- §13 tests pass for execution, permissions, and adapter contracts.

## 16. Do not

- Do not build local template-management or query-builder alternatives.
- Do not use non-authoritative template tables (`core_report_template` is required).
- Do not hardcode field catalogs/operator sets.
- Do not use `useCan` for route access where page/resource guards apply.
- Do not expand scope beyond `/reports`.

## 17. References

- `docs/requirements/base/BASE-project-brief.md`
- `docs/requirements/base/BASE-architecture.md`
- `docs/requirements/base/BA00-app-shell-and-access-requirements.md`
- `docs/requirements/base/BA01-event-workspace-and-configuration-requirements.md`
- `docs/requirements/base/BA18-base-dev-seed-data-requirements.md`
- `packages/core/docs/requirements/CR22-shared-reporting-foundations.md`
- `docs/database/domains/base.md`

## 18. Implementing Agent Instructions

- Implement only BA15 `/reports` route composition and adapters.
- Preserve shared reporting contracts and stop on upstream drift.
