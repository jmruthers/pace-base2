# BA04 — Registration Setup and Policy

## Slice metadata

- Status: Draft
- Depends on: BA01 (Event Configuration — event-level registration scope stays on `/configuration`), BA02, BA03 _(BA00 shell is transitively required via BA01; not restated here, matching architecture's slice overview)_
- Backend impact: Read + write contracts; no schema changes in this slice (RPC bodies already enforced in dev-db)
- Frontend impact: UI

## 2. Overview

This slice configures how an event distinguishes registration cohorts and which checks run before an application is admitted. Operators manage named registration types, optional eligibility gates, and ordered approval prerequisites for each type. Everything is anchored to the event selected in the BA00 shell. Event-level openness (`core_events.registration_scope`) remains under BA01; this slice configures only per-type eligibility rows and requirement chains that sit downstream of that scope. Operators see a list of types at `/registration-types` and use the **registration type builder** (`/registration-type-builder`) for type fields, eligibility, and approval workflow.

---

## 3. What this slice delivers

### Purpose

Let permitted operators define registration types for the selected event: human-readable naming, monetary cost (Australian cents server-side), optional capacity messaging, cohort eligibility rules, and a drag-ordered prerequisite chain evaluated at application time downstream.

### Surfaces

- `/registration-types` — Registration types card grid inside the authenticated shell with create, edit, delete (when **`app_base_registration_type_delete`** allows), **Registration type active** on the builder page (saved with **Save**), approval workflow on the builder page (saved with **Save** on the card, no second confirmation), informational panels for specialised check kinds, eligibility rule builder subsection, **sortable** approval workflow list (drag reorder via **`@solvera/pace-core/forms`**, which re-exports `@dnd-kit` primitives — the app does not install `@dnd-kit/*` separately).

### Boundaries

- This slice does not own event-level **`registration_scope`** configuration or UX on `/registration-types` — BA01 owns read/write UX on `/configuration` and the authoritative values (`org_only`, `hierarchy`, `open`).
- This slice does not own workflow form authoring (`/forms`, `/form-builder`) — BA03 owns forms and binds forms to registration types only as a consumer of `base_registration_type` rows.
- This slice does not own application review workspaces, TEAM queues, MINT webhook handling, or participant-facing portals — sibling slices consume the saved policy.
- This slice does not implement evaluation engines that decide cohort membership at submission time beyond validating and persisting authoring inputs.
- Explicitly omitted: **`home_leader_approval` multi-select role types UX**; **`pending_backend_support`** badges; **`is_automated` toggle** exposed to organisers; standalone `/approval-workflows` route. **Hard delete** of a registration type is allowed only when **`app_base_registration_type_delete`** reports no blocking applications or form bindings (see **RL-PA-04** / **BR-REGDELETE**); a **preflight** read (dependency counts) may run **before** opening the delete confirmation so operators are not asked to confirm a delete that would fail. Otherwise operators must resolve dependencies first or use **`is_active`** false in **`RB`** to retire a type without removing historical rows.

### Architectural posture

- All reads and RPCs route through **`useSecureSupabase()`** from `@solvera/pace-core/rbac`; no unrestricted Supabase singleton.
- Writes use **`app_base_registration_type_upsert`**, **`app_base_registration_type_set_active`**, and **`app_base_registration_type_delete`** only — no privileged direct `INSERT`/`UPDATE`/`DELETE` to `base_registration_type`, eligibility, or requirement tables from the authenticated client outside these RPCs.
- > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).
- Mutation affordances use **`PagePermissionGuard`** with **`create`** and **`update`** checks; builder authoring surfaces render within an **`update`** guard.
- Drag-and-drop for requirement reorder uses **`DndContext`**, **`SortableContext`**, and related symbols from **`@solvera/pace-core/forms`** (pace-core bundles **`@dnd-kit/core`**, **`@dnd-kit/sortable`**, **`@dnd-kit/utilities`** for consuming apps).
- Composition uses pace-core primitives named in §9; layout follows Standard 07 (Semantic HTML + grids as per project rules).
- Import policy is root-first for consuming apps: use `@solvera/pace-core` by default. Scoped entrypoints (`/rbac`, `/components`) are exception paths used when root does not expose the required symbol or a documented advanced/performance/migration case applies.

### Page-level guards and evaluation ordering

**Route:** `/registration-types`.

**Evaluation order when context is incomplete**

1. > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).

2. **Route read access** is enforced by the authenticated shell / `PaceAppLayout` `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). If access is denied, **`AccessDenied`** renders; no-event messaging does not replace it.
3. If the guard is loading (no custom `loading` prop), **`null`** is rendered (`PagePermissionGuard` default) — neither children nor denial yet.
4. If the guard permits and **no event** is selected, the page shows the configured **select-event** blocking card (`Card` explaining that an event must be chosen in the shell header).
5. If the guard permits and **an event** is selected, the main list surface loads.

**Scope object when required context is absent**

- Pass scope through the route/controller helper as `{ organisationId, eventId, appId }`, where `organisationId` / `eventId` are resolved from **`useResolvedScope()`** with fallback to **`useUnifiedAuth()`** selected ids when unresolved.
- When no event selected: `eventId` remains `null` or `undefined` per hook state (no sentinel strings).

**Partially-defined scope versus guard stall**

- `PagePermissionGuard` without a `loading` prop returns **`null`** while permission resolves (see §9 `usePageCan` coupling). Operators see a blank main region until resolved.
- Operators must never see an empty authorised grid implying “zero types” while permission is still unresolved.

---

## 4. Functional specification

Prefix legend: **`RL`** list surface, **`RB`** registration type builder page (`/registration-type-builder`, create/edit fields + eligibility), **`RW`** approval workflow section on the builder page (ordered requirements), **`RQ`** miscellaneous quality cases.

Cover every category template requires; numbering runs contiguous.

### Page entry / surface entry

1. **RL-PE-01 —** Navigating to `/registration-types` renders inside BA00 authenticated shell; URL has no mandatory query keys.
2. **RL-PE-02 —** With an event selected, the page fetches **`base_registration_type`** rows scoped to **`event_id`**, ascending primary sort **`sort_order`**, secondary **`name`**; null `sort_order` sorts after finite integers.
3. **RL-PE-03 —** The page fetches **`base_registration_type_eligibility`** rows for the event in parallel (or chained after types) to derive per-type counts.
4. **RL-PE-04 —** List header shows **`h1`** “Registration types” and subtitle explaining these types drive registration grouping and prerequisites for the selected event.

### Loading states

5. **RL-LS-01 —** While prerequisites for the list are loading (`types` unresolved), the zone below headers shows **`LoadingSpinner`**, centred horizontally; headings remain visible unless hidden by denial.

### Empty states

6. **RL-ES-01 —** No-event selected (`selectedEventId` falsy permitted path): replaces grid area with **`Card`** copy: “Select an event from the header to manage registration types.” **Hide** permission-gated create actions.
7. **RL-ES-02 —** Event selected yet zero types: **`Card`** with “No registration types yet. Create a registration type to begin.” Empty-state card renders whenever the selected event has zero types; **`Create`** button visibility still follows **RL-PR-02**.

### Error states

8. **RL-ER-01 —** Any qualifying read failure surfaces **`Alert`** `variant="destructive"` spanning page width beneath header with **`NormalizeSupabaseError(error).message`**; spinner absent.

### Primary content — list cards

9. **RL-PC-01 —** Each card **`title`** = registration **`name`**; optional description snippet below (truncate visually after ~two lines (`line-clamp-2`), no tooltip mandated).
10. **RL-PC-02 —** Status badge **`Enabled`** when **`is_active` true**, variant **`solid-main-normal`**; **`Disabled`** when **`is_active` false**, variant **`outline-sec-muted`** (reflects persisted state after list refetch — not a live draft).
11. **RL-PC-03 —** Summary line **`N eligibility rules`** exact label with integer `N` ≥ 0 (same copy at zero).
12. **RL-PC-04 —** Card grid uses **`grid-cols-1`**, **`md:grid-cols-2`**, **`lg:grid-cols-3`** so up to **three** cards appear per row at large breakpoints.
13. **RL-PC-05 —** When **`capacity`** and/or **`cost`** is present, a **single** summary row uses **`grid grid-flow-col auto-cols-max`** with horizontal gap (or equivalent one-row layout such as **`flex flex-wrap`**): render **`Capacity …`** (integer string) only when **`capacity`** is numeric; render **`Cost …`** (Australian currency from stored cents: divide by 100, **`en-AU` / AUD**) only when **`cost`** is non-null; omit the entire row when both are absent.

### Primary actions — list toolbar & row actions

14. **RL-PA-01 —** Toolbar **`Button`** “Create registration type” is wrapped in **`PagePermissionGuard`** with **`pageName="registration-types"`**, **`operation="create"`**, **`scope={{ organisationId, eventId, appId }}`**, **`fallback={null}`** (same nesting pattern as BA03 create buttons). Clicking it navigates to **`/registration-type-builder`** (no query id). The builder page is guarded with **`operation="update"`** on the same **`pageName`**.
14a. **RL-PA-01a —** Because the builder requires **`update`**, BASE RBAC should grant **create** and **update** together for roles that author new types; a user with **create** only reaches the builder route but sees **`AccessDenied`** until **update** is granted.

15. **RL-PA-02 —** Row **`Button`** “Edit” wrapped in **`PagePermissionGuard`** with **`operation="update"`**, **`fallback={null}`**; navigates to **`/registration-type-builder?registrationTypeId={id}`** populated via **BR-SNAPSHOT**. **Edit** is placed in **`CardFooter`** with row actions.
16. **RL-PA-03 —** **`CardFooter`** hosts permission-gated **Edit** and icon-only **Delete** (**`flex`/`flex-wrap`** with gap is acceptable); **no** list-level **`Switch`** for **`is_active`**; **no** separate list action for approval workflow (authoring lives on the builder page).
17. **RL-PA-04 —** Row **`Button`** **Delete** uses an icon-only control with accessible name **Delete {type name}**, **`PagePermissionGuard`** **`operation="update"`**, **`fallback={null}`**. A **preflight** dependency count (applications / form bindings) may run when **Delete** is invoked; if counts block deletion, show the informational **Cannot delete registration type** dialog (body per **BR-REGDELETE**) **without** opening the destructive confirmation. When not blocked, it opens a **`ConfirmationDialog`** (**`variant="destructive"`**, **`title="Delete registration type"`**, **`confirmLabel="Delete"`**, **`cancelLabel="Cancel"`**) with description **Are you sure you want to delete '{name}'? This action cannot be undone.** On confirm → **`app_base_registration_type_delete`**. While the RPC is in flight, the dialog **`isPending`** disables confirm. If the RPC returns **`deleted: false`**, close the confirmation and open an informational **`Dialog`** with **`title="Cannot delete registration type"`** and body per **BR-REGDELETE**. If **`deleted: true`**, invalidate the types list (and requirements query key for that type), and fire **`ShowSuccessMessage`** **Registration type deleted successfully.**

### Registration type builder page (`RB`)

18. **RB-PE-01 —** Route **`/registration-type-builder`** is registered in the shell with **`includeInNavigation: false`** (parity with form builder). Optional query **`registrationTypeId`** selects edit mode; absence selects create mode.
18a. **RB-PE-02 —** Page shows **`h1`** “Create registration type” vs “Edit registration type”, and a primary type **`Card`** with fields per **RB-FL-01** plus footer **Cancel** (navigate back) and **Save** (Standard 07, bottom right).
19. **RB-FL-01 —** Fields: **`name`** (required), **`description`**, **`eligibility_message`**, **`cost`** (presented as AUD dollars in UI, persisted as cents integer), **`capacity`** (optional positive integer cleared → `null` payload), **`Registration type active`** (**`Switch`** with **`aria-label="Registration type active"`** and **`Label`**, draft **`is_active`**, default **`false`** on create until the operator enables it — persisted on **Save** via **`p_registration_type.is_active`** on **`app_base_registration_type_upsert`**).
20. **RB-VL-01 —** Blocking validation inline: **`name`** trimmed nonempty; **`cost`** ≥ 0 finite; **`capacity`** when provided integer ≥ 1; **`capacity` cleared** ⇒ treat as unrestricted (`null`).
21. **RB-EL-01 —** Segment heading “Eligibility rules” with a `default`-variant **`Alert`** containing the copy: **”Rules of different types are combined with AND — a member must satisfy all types. Multiple rules of the same type are combined with OR — a member need only satisfy one.”**
22. **RB-EL-02 —** “Add eligibility rule” appends editable row trio: **`Select`** of `membership_type` / `dob_before` / `dob_after` (stored values remain those slugs; the **closed trigger shows the same human-readable labels** as the menu: **Membership type**, **DOB before**, **DOB after**); value control: membership uses **`Select`** with options from loaded membership types for the event; the **closed trigger shows the selected membership type `name`** (value string = integer id string per **BR-RULEVALUE**); date types use **`Input type="date"`** delivering ISO **YYYY-MM-DD** day component.
23. **RB-EL-03 —** Each row exposes remove control: **`Button variant="outline"` `size="icon"`** with **`Trash2`** from **`@solvera/pace-core/icons`**, **`aria-label`** describing removal (for example **Remove eligibility rule**), **no** visible **Remove** text.
23a. **RB-EL-04 —** Eligibility rule rows and **Add eligibility rule** sit **inside** the same **`Alert`** as **RB-EL-01** (below the guidance copy), in **one** list region with **compact vertical spacing** between rows.
24. **RB-SV-01 —** On first successful **create** **Save**, the app updates the URL with **`registrationTypeId`** (replace navigation) so **RW** becomes active without returning to the list.

### Approval workflow section (`RW`)

25. **RW-PE-01 —** Section title **Approval workflow** on the builder page below the type card.
25a. **RW-PE-02 —** When no persisted type id exists yet, the section shows copy **Save the registration type first to configure the approval workflow.** and does not load requirements.
25b. **RW-LS-01 —** While requirements are being fetched, the section shows a centred **`LoadingSpinner`**. On fetch error, render a destructive **`Alert`** using **`NormalizeSupabaseError`** copy; **Save** remains disabled.
25. **RR-LI-01 —** Ordered list renders each requirement showing index **1-based human label**, textual **`check_type` label map** (**BR-TYPELABEL**).
26. **RR-LI-02 —** Each row **`Button`** Remove (blocked when removal would contradict minimum chain policy — chain may be empty; **BR-RPC** allows empty **`p_requirement_rules`** arrays).
27. **RR-LI-03 —** Drag handle activates **`SortableContext`** reorder; **`DragOverlay`** optional; reorder mutates draft only until save (**BR-SNAPSHOT** merges on save compose).
28. **RR-LI-04 —** A persistent **add bar** sits below the sortable list: a **`Select`** populated with the allowed `check_type` catalogue (**BR-AUTHCHECKS**, display labels from **BR-TYPELABEL**) plus a **`Button`** “Add”. Clicking Add with a `check_type` selected appends a scaffold row to the draft list with the default config from **BR-CONFIGDEFAULT**; the Select resets to its placeholder after insertion. The bar remains available whenever the approval workflow section is enabled (not while it shows only the “save the registration type first” disabled state).
28a. **RR-LI-05 —** Requirement authoring rows follow the same **single list region inside a bordered container** pattern as **RB-EL-04** (compact vertical spacing, **no** per-row boxed card inside that list).
29. **RR-CF-01 —** **`guardian_approval`**: show informational copy referencing parent/guardian contact directory semantics and optional **`Checkbox`** “Require approval from **all** linked guardians”; maps JSON **`{ require_all_guardians: boolean }`** default `{ require_all_guardians: false }` when unchecked.
30. **RR-CF-02 —** **`designated_org_review`**: informational line plus **`Select`** of eligible organisations (**BR-REVORG**) choosing **`reviewing_org_id`**; payload JSON **`{ reviewing_org_id: "<uuid>" }`**.
31. **RR-CF-03 —** **`home_leader_approval`** / **`payment`** / **`referee`** / **`event_approval`**: informational read-only **`Alert`** or paragraph per **BR-INFOCOPY**; **no hidden extra dynamic inputs** besides ordering + delete.
32. **RW-CF-04 —** **Save** is blocked until all **`designated_org_review`** rows possess a selected reviewing org UUID. When the user attempts to save with an unresolved `designated_org_review` row, render an inline error message **"Select a reviewing organisation"** immediately below the org `Select` for that row; do not fire the RPC.

### Save behaviour & confirmations

33. **RB-SV-02 —** Type **Save** invokes validation; when valid, **`app_base_registration_type_upsert`** runs immediately, the user **stays on the builder page**, and **`ShowSuccessMessage`** toast **Saved registration type settings.** runs — **no** intermediate confirmation for the type form.
34. **RB-SV-03 —** Type **Save** builds **`app_base_registration_type_upsert`** using **fresh type row + untouched requirements snapshot** (requirements snapshot refreshed on edit save when a type id exists) per **BR-SNAPSHOT**.
35. **RW-SV-01 —** Approval workflow **Save** validates configs; when valid, **`app_base_registration_type_upsert`** runs immediately (requirements payload per **BR-RPC** + **BR-SNAPSHOT**), the user stays on the builder page, and **`ShowSuccessMessage`** toast **Saved approval workflow.** runs — **no** intermediate confirmation dialog.
36. **SV-TO-01 —** Successful saves call **`ShowSuccessMessage`** toast “Saved registration type settings.” or approval-workflow-only wording **“Saved approval workflow.”**
37. **SV-TO-02 —** RPC errors routed through **`HandleMutationError`**; builder page stays open with editable state intact.

### Secondary actions / navigation

38. **RB-SC-01 —** **Cancel** on the type card navigates back to **`/registration-types`** without persisting.

### Permission-conditional rendering

39. **RL-PR-01 —** Page outer wrapper uses **`PagePermissionGuard`** with **`pageName="registration-types"`**, **`operation="read"`**, **`scope={{ organisationId, eventId, appId }}`**; denied ⇒ **`AccessDenied`** and no operational content beneath.
40. **RL-PR-02 —** **`Create`** button hidden when **`create`** denied (`fallback=null` guard per **RL-PA-01**).
41. **RL-PR-03 —** **Edit** and **Delete** chrome hidden via **`PagePermissionGuard`** **`operation="update"`** wrappers (**`fallback={null}`** for controls). Read-only operators still see cards and **Enabled**/**Disabled** badges (**RL-PC-02**).

### Navigation

42. **RL-NV-01 —** List **Create** / **Edit** navigate to **`/registration-type-builder`**; builder **Back** / type **Cancel** return to **`/registration-types`**.

### Edge cases & constraints

43. **RQ-EDGE-01 —** First successful **create** save may emit **`p_requirement_rules: []`**; later requirement authoring fills the snapshot on subsequent upserts.
44. **RQ-EDGE-02 —** Saving with zero eligibility rows issues **`[]`**, signalling an open cohort per **BR-COMBINATION** once downstream evaluates.
45. **RQ-EDGE-03 —** Changing **`is_active`** in **`RB`** persists only on successful **`app_base_registration_type_upsert`**; list badges update after refetch. The standalone **`app_base_registration_type_set_active`** RPC remains available for non-UI callers but is **not** used from this slice’s list or builder surfaces.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/FormsRegTypesPage.jsx` (`RegistrationTypesPage`, `RegistrationTypeBuilderPage`).

### Registration types list (`/registration-types`)

1. **PageHeader** — breadcrumb (pace-base → event → Registration types); title; subtitle explaining pathways; primary "New registration type".
2. **Empty state** — "No registration types yet" with Add action when zero types.
3. **List rows** (prototype: stacked cards; production may use three-column `Card` grid per RL-PC-04): each row shows initial avatar, name, capacity progress bar (`applications` of `capacity`, percentage), formatted cost, "Configure" action. Row click opens builder.
4. **New type flow:** create draft with defaults and navigate directly to builder (no create dialog).

### Registration type builder (`/registration-type-builder`)

1. **PageHeader** — breadcrumb; title = type name; secondary **Preview portal flow** (stub).
2. **Details card** — display name, status (`open` | `waitlist` | `closed`), capacity, fee, description (grid layout).
3. **Eligibility card** — rules editor + eligibility message textarea.
4. **Linked forms card** — **Anchor form** (single `base_registration` form; link/create picker) + **Supplementary forms** (required checkbox per link; link/create picker).
5. **Pre-submission checks card** — toggle list (`member_profile`, `medical_profile`, `additional_contacts`, …).
6. **Approval workflow card** — checkbox per authoritative `check_type` with automated/manual descriptor.
7. **PageSaveBar** — Cancel → list; **Save** (whole-page commit in prototype).

### Route map (prototype → BASE)

| Prototype | BASE |
|---|---|
| `#/events/:code/registration-types` | `/registration-types` |
| `#/events/:code/registration-types/:id` | `/registration-type-builder` |

### Implementation delta (pass 2)

- §4 RL-PC-* three-column card grid is a production layout variant; prototype list uses stacked horizontal progress-bar rows (§5 item 3).
- Prototype uses horizontal list cards with inline progress bars; production spec (RL-PC-04) targets three-column `Card` grid with footer-aligned actions — reconcile layout in pass 2 while preserving data density (capacity, cost, applications).
- KPI summary row in prototype (total apps/cap) optional for production.

## 6. Business rules

### BR-AUTHCHECKS — Authoritative `check_type` catalogue

| `check_type` | Automation (`is_automated`) | Config shape |
| --- | --- | --- |
| `payment` | `true` | `null` |
| `guardian_approval` | `false` | `{ require_all_guardians: boolean }` |
| `home_leader_approval` | `false` | `null` |
| `referee` | `false` | `null` |
| `designated_org_review` | `false` | `{ reviewing_org_id: uuid string }` |
| `event_approval` | `false` | `null` (always) |

No other `check_type` strings are valid in UI saves.

### BR-DERIVE — Derive `is_automated` from `check_type`

Row payload **must** set **`is_automated`** exactly as **BR-AUTHCHECKS** even though RPC defaults false when omitted.

### BR-TYPELABEL — Display labels

| `check_type` | Card / list label text |
| --- | --- |
| `payment` | Payment |
| `guardian_approval` | Guardian approval |
| `home_leader_approval` | Home leader approval |
| `referee` | Referee |
| `designated_org_review` | Designated organisation review |
| `event_approval` | Event approval |

### BR-COMBINATION — Eligibility combination semantics

- Distinct `rule_type` values across rows → combined with logical **AND** at evaluation time (downstream).
- Multiple rows sharing same `rule_type` → OR within that type.
- Empty array after save → no eligibility rows → downstream treats base open subject to other gates.

### BR-RULEVALUE — `rule_type` payload rules

| `rule_type` | `value` string format |
| --- | --- |
| `membership_type` | `String(core_membership_type.id)` (integer branded as textual token) |
| `dob_before` | Strict `YYYY-MM-DD` |
| `dob_after` | Strict `YYYY-MM-DD` |

### BR-RPC — Upsert deletes then inserts children

Mirrors server:

1. Upsert **`base_registration_type`** parent (`INSERT` vs `UPDATE` keyed on `p_registration_type_id`).
2. **DELETE ALL** eligibility rows for resolved type id → insert each element **`{ rule_type, value }`** from JSON array preserving UI order irrelevant to semantics.
3. **DELETE ALL** requirement rows → insert each JSON object **`{ check_type, sort_order?, is_automated, config }`** repositioned; server sets `sort_order` default to zero-based **`ordinal - 1`** when property absent.

Sending partial subsets **wipes unstated siblings** server-side — client must ship full arrays (**BR-SNAPSHOT**).

### BR-REGDELETE — Registration type delete (BA03 forms parity)

0. **Optional preflight:** Before showing the destructive **`ConfirmationDialog`**, the client may read **`base_application`** / **`base_form_registration_type`** counts (same blockers as the RPC). If either count is non-zero, show only the informational **Cannot delete** dialog (**step 4** messaging); **do not** ask the operator to confirm delete.
1. Operator confirms in **`ConfirmationDialog`** → **`app_base_registration_type_delete(p_event_id, p_registration_type_id)`** via **`useSecureSupabase().rpc(...)`**.
2. RPC returns **`{ deleted, application_count, form_binding_count }`** (counts are **`bigint`**; client normalises for messaging).
3. If **`deleted === true`** → eligibility and requirement rows **`CASCADE`** from **`base_registration_type`**; confirmation closes; list refetch; success toast **Registration type deleted successfully.**
4. If **`deleted === false`** → confirmation closes; informational **`Dialog`** **Cannot delete registration type** using the same composition pattern as BA03’s blocked delete (`DialogTitle` + **`DialogDescription`** + single **OK** **`Button`** in **`DialogFooter`**). Message text mirrors **`buildDeleteBlockedMessageForRegistrationType`** — only include **applications** and/or **form binding** clauses when the corresponding count is **> 0**.
5. On RPC error → confirmation closes; **`HandleMutationError`**; list not eagerly refreshed.

**Server blockers:** non-zero **`base_application`** rows for **`(event_id, registration_type_id)`**, or non-zero **`base_form_registration_type`** rows for that pair. Permission: same contextual **`update:page.registration-types`** check as **`app_base_registration_type_upsert`**.

### BR-SNAPSHOT — Snapshot coherence before each upsert classify

Maintain frozen server snapshots **`typeSnapshot`, `eligibilitySnapshot`, `requirementsSnapshot`**, refreshed whenever:

- Opening **Edit** on the builder (**RB**),
- After every successful **`app_base_registration_type_upsert`** (including **`is_active`** chosen in **`RB`**),
- After successful **`app_base_registration_type_set_active`** when a non-UI path calls it (list refetch; if the builder is open for that type id, reload that type into **`typeSnapshot`** so **`is_active`** matches the server).

Compose calls:

| Save origin | `p_registration_type` fields | Eligibility payload | Requirement payload |
| --- | --- | --- | --- |
| Type card **Save** (**RB**) | From builder type + eligibility edits | From builder edits | **`requirementsSnapshot` unchanged ordering & configs** |
| Approval workflow **Save** (**RW**) | **`typeSnapshot` merged with `is_active` etc.** | **`eligibilitySnapshot` unchanged** | From drag/drop + config edits |

### BR-COSTMAP — Dollars ↔ cents

- UI inputs dollars with two decimals (`Number.parseFloat` sanitised).
- Persist `Math.round(amount * 100)` as BIGINT-compatible integer in JSON field **`cost`**; default server maps missing → `0`.

### BR-REVORG — Reviewing organisation picklist

Eligible organisations are fetched via a **two-step read** using the dev-db closure function `get_org_descendants`:

1. Call `.rpc('get_org_descendants', { p_root_org_id: eventOrganisationId })` — returns `SETOF uuid` of all descendants **including the root itself** (the closure table contains self-referential rows).
2. Fetch `core_organisations` filtered to that UUID set, excluding the event root: `.from('core_organisations').select('id, name, display_name').in('id', descendantUuids).neq('id', eventOrganisationId).eq('is_active', true).order('display_name', { ascending: true })`.

Display label: `display_name` when populated, fallback `name`. The `eventOrganisationId` is sourced from `core_events.organisation_id` for the selected event (see §7.1 Event root organisation).

### BR-CONFIGDEFAULT — Newly added requirement row configs

Upon insert in UI drafts:

| `check_type` | Initial `config` |
| --- | --- |
| `payment` | `null` |
| `guardian_approval` | `{ require_all_guardians: false }` |
| `home_leader_approval` | `null` |
| `referee` | `null` |
| `designated_org_review` | `null` pending user selection _(validation blocks save)_ |
| `event_approval` | `null` |

### BR-INFOCOPY — Informational snippets

Render the following copy verbatim inside the config row for each check type (use a `default`-variant `Alert` or plain `p` — consistent with whichever element is used for non-config types in RR-CF-03):

- **`guardian_approval`**: "This check requires approval from a parent or guardian. An email will be sent to the Parent/Guardian linked to the member's profile."
- **`home_leader_approval`**: "This check requires approval from the member's home leader before the application can proceed."
- **`referee`**: "This check requires a referee from the next level (or higher) in the organisation tree. The referee will receive a link by email to complete their response."
- **`event_approval`**: "This check requires manual review by an event coordinator."
- **`payment`**: "This check requires payment for the event to be successfully processed."

---

## 7. API / Contract

### 7.1 Read contracts (`useSecureSupabase()`)

All filtered by RLS-permitted subsets.

**Registration types list**

```
from('base_registration_type')
.select('id, name, description, eligibility_message, cost, capacity, is_active, sort_order, organisation_id, event_id, created_at')
.eq('event_id', selectedEventId)
.order('sort_order', { ascending: true })
.order('name', { ascending: true })
```

**Eligibility batch**

```
from('base_registration_type_eligibility')
.select('registration_type_id, rule_type, value')
.eq('event_id', selectedEventId)
```

Count rows per **`registration_type_id`** client-side.

**Requirements prefetch (opening Manage dialog)**

```
from('base_registration_type_requirement')
.select('id, check_type, sort_order, is_automated, config')
.eq('registration_type_id', registrationTypeId)
.order('sort_order', { ascending: true })
```

**Membership types picker**

```
from('core_membership_type')
.select('id, name')
.eq('organisation_id', eventOrganisationId)  // core_events.organisation_id for the selected event
.eq('is_active', true)
.order('name', { ascending: true })
```

**Organisation subtree helper (for BR-REVORG picklist)**

Step 1 — resolve descendant UUIDs via the dev-db closure function:

```
.rpc('get_org_descendants', { p_root_org_id: eventOrganisationId })
// Returns SETOF uuid; includes the root itself (exclude in step 2)
```

Step 2 — fetch org display data:

```
from('core_organisations')
.select('id, name, display_name')
.in('id', descendantUuids)
.neq('id', eventOrganisationId)
.eq('is_active', true)
.order('display_name', { ascending: true })
```

**Event root organisation**

`eventOrganisationId` = `core_events.organisation_id` for the selected event. If not already available in the `useUnifiedAuth` event model, fetch it:

```
from('core_events')
.select('organisation_id')
.eq('event_id', selectedEventId)
.single()
```

This id is required before the subtree and membership-type reads can proceed.

---

### 7.2 Write contracts

**Upsert**

```
.rpc('app_base_registration_type_upsert', {
  p_event_id: selectedEventUuid,
  p_organisation_id: selectedOrganisationUuid,
  p_registration_type_id: existingUuid | null,
  p_registration_type: {
    name: string.trim(),
    description: string|null,
    eligibility_message: string|null,
    cost: integerCents | 0,
    capacity: positiveInteger|null,
    is_active: boolean, /* from draft: create defaults false until operator enables **Registration type active** in **RB**; existing types: edited in **RB** and persisted on **Save** */
    sort_order: integer|null /* new types: send null — server assigns; existing types: from typeSnapshot */
  },
  p_eligibility_rules: Array<{ rule_type: 'membership_type'|'dob_before'|'dob_after', value: string }>,
  p_requirement_rules: Array<{
      check_type: string,
      sort_order?: number,
      is_automated: boolean,
      config?: object|null
  }>,
})
```

Server returns **`[{ registration_type_id }]`**; reuse id for drafts.

Failures include `'Permission denied'`, `'Registration type name is required'`, payload shape errors documented by thrown messages.

**Set active**

```
.rpc('app_base_registration_type_set_active', {
  p_event_id,
  p_registration_type_id,
  p_is_active: boolean,
})
```

Returns **`[{ registration_type_id, is_active }]`**.

**Delete**

```
.rpc('app_base_registration_type_delete', {
  p_event_id: selectedEventUuid,
  p_registration_type_id: registrationTypeUuid,
})
```

Returns **`[{ deleted, application_count, form_binding_count }]`**. When **`deleted`** is **`true`**, the **`base_registration_type`** row is removed and dependent eligibility/requirement rows cascade per FK definitions. When **`deleted`** is **`false`**, counts explain **`base_application`** and/or **`base_form_registration_type`** blocks.

All mutation errors surfaced via **`HandleMutationError`** with context label **Registration Types** (delete handler may use **`registration-types-delete`** for telemetry parity with other surfaces).

---

### 7.3 Permissions & server enforcement symmetry

RPCs enforce super admin bypass **OR** event creator flag **OR** context permission **`update:page.registration-types`** referencing **organisation + event + BASE app**.

Client page guard uses **`read`** at boundary; authoring controls consult **`create`/`update`** as listed in §10.

---

### 7.4 Cross-slice hand-offs

| Flow | Detail |
| --- | --- |
| Provides | `base_registration_type` rows plus eligibility/requirement payloads materialised downstream to BA03 form binding surfaces and BA05a/portal submission flows |
| Depends on | BA00 auth/event selection; BA01 for event-level registration scope authored elsewhere (`/configuration`) |

---

### 7.5 ID contracts

Boundary UUID strings match Supabase textual ids; **`core_membership_type.id`** remains integer — cast when rendering **Select values**.

---

### 7.6 Fixture policy

No route-local hard-coded registration fixtures in production paths; QA uses BA18 seeded events.

---

## 8. Data and schema references

| Artefact | Notes |
| --- | --- |
| **`base_registration_type`** | Monetary **`cost BIGINT`**, **`capacity INT NULL`** |
| **`base_registration_type_eligibility`** | Columns align RPC insert |
| **`base_registration_type_requirement`** | **`config` JSON nullable** |
| **`core_membership_type`** | Integer **`id`** per dev-db |
| **`core_events`** | Source of **`organisation_id`** root |
| **`core_organisations`** | **`parent_id` graph** |

Verify via Supabase MCP project **`rkytnffgmwnnmewevqgp`**.

Domains / decisions: honour `docs/database/domains/base.md` when overlapping RLS narration (this slice cites behaviour not file paths executable in code).

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA04 |
|---|---|---|
| `PagePermissionGuard` / `AccessDenied` | Default root import where available; scoped `@solvera/pace-core/rbac` allowed as exception path | Route and action gating |
| `useSecureSupabase` | Scoped `@solvera/pace-core/rbac` exception path (security boundary API) | Scoped reads/writes |
| `Dialog`, `Select`, `Switch`, `Checkbox` | Default root import; allow scoped exception if required by export location | Registration-type authoring controls |
| `HandleMutationError` / `ShowSuccessMessage` | Default root import | Mutation feedback handling |
| `DndContext`, `SortableContext`, `useSortable`, … | `@solvera/pace-core/forms` | Approval workflow drag reorder |

### 9.2 Slice-specific caveats only

- Save payloads must preserve full eligibility/requirement arrays.
- Requirement reorder writes persisted `sort_order`; local order is not authoritative until save.
- `PagePermissionGuard` is the page/action gate; do not switch to retired hooks.
- `core_events.registration_scope` writes are not owned by BA04.
- Import style in this slice follows root-first policy; scoped imports are exception-only.

## 10. Permission and access rules

| Surface action | Permission token | Enforcement |
| --- | --- | --- |
| View page (`read`) | `read:page.registration-types` (via **`PagePermissionGuard` pageName **`registration-types`**) | Client guard + data RLS |
| Create (`Button`) | `create:page.registration-types` _(pattern mirrors BA forms naming_) | Hidden if absent |
| Author saves / drag / reqs | `update:page.registration-types` hidden when absent plus RPC denies | Matching RPC contextual check |
| Delete registration type (`Button` + RPC) | `update:page.registration-types` | Same contextual check as saves; UI hides **Delete** when **`update`** denied |

Server strings observed inside SQL: **`'update:page.registration-types'`** literal — client permission naming must remain compatible with project's RBAC catalogue (adjust naming if codebase uses dotted variant — implementer aligns **pageName `'registration-types'`** with DB permission factory).

_Scope_: thread `{ organisationId, eventId, appId }` via the registration scope helper (resolved-scope first, selected-id fallback). `organisationId` and `eventId` can be nullable during selection/loading; no sentinel string placeholders.

---

## 11. Acceptance criteria

- Given no event selection, permission passes, navigating page shows select-event **`Card`** and hides create control.
- Given event selection with types, authorised user sees **`N eligibility rules`** summary matching database counts.
- Given valid create inputs, **Save** executes upsert returning id, refreshes grid, toast success.
- Given invalid dob format, validation blocks save before any RPC (no second-step prompt for the type dialog).
- Given user lacks `read`, **`AccessDenied`** renders.
- Given user lacks `update`, edit/manage/**Delete** controls are absent (`fallback={null}` guards) while read-only badges still render.
- Given **`Registration type active`** is changed in **`RB`** and **Save** succeeds, the list badge reflects the new **`is_active`** after refetch without page reload failures.
- Given drag reorder + save requirements, reorder reflected by ascending **`sort_order`** after server refetch confirms the new ordering.
- Given **`update`** and confirming **Delete** when **`app_base_registration_type_delete`** returns **`deleted: true`**, the card disappears after refetch and toast **Registration type deleted successfully.** runs.
- Given confirming **Delete** when the RPC returns **`deleted: false`**, an informational **Cannot delete registration type** dialog explains applications and/or form bindings; the types list is not removed.

## 12. Verification

- QA scenario definitions and execution notes (manual + automated command): `docs/test-packs/BA04-qa-pack.md`.
- Verify `/registration-types` list load and no-event state.
- Verify create/edit persistence of type fields and requirement/eligibility arrays.
- Verify reorder saves expected `sort_order` values.
- Verify **Delete** confirmation, blocked delete messaging, and successful removal refetch.
- Verify count/summary parity between UI and persisted rows.

## 13. Testing requirements

- Guard tests for read deny and update affordance suppression.
- Validation tests for required fields and date/format boundaries.
- Save tests for snapshot merge and full-array payload integrity.
- Reorder tests for deterministic ordering outputs.

## 14. Build execution rules

- Scope is `/registration-types` only.
- RPC contract updates (e.g. **`app_base_registration_type_delete`**) ship through **pace-core** Supabase migrations; do not patch database DDL from the consuming app in isolation.
- Stop on RPC/contract mismatch; do not apply local schema workarounds.
- Keep writes through documented secure boundaries.

## 15. Done criteria

- BA04 route behaviours are demonstrable with list/edit/reorder flows.
- Verification scenarios in §12 are completed with evidence.
- Automated tests in §13 pass for guards, validation, and ordering logic.

## 16. Do not

- Do not write `core_events.registration_scope` from this slice.
- Do not bypass approved persistence paths with ad-hoc direct inserts.
- Do not expose manual override of system-managed automation flags.
- Do not use retired page-guard patterns.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/requirements/BA00-app-shell-and-access-requirements.md`
- `docs/requirements/BA01-event-workspace-and-configuration-requirements.md`
- `docs/requirements/BA03-forms-authoring-and-base-integration-requirements.md`
- `docs/requirements/BA18-base-dev-seed-data-requirements.md`

## 18. Implementing Agent Instructions

- Implement only BA04-owned registration-type authoring behaviour.
- Preserve save snapshot and ordering contracts; stop on blockers.
