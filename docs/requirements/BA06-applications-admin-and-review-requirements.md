# BA06 — Applications Admin and Review

## Slice metadata

- Status: Draft
- Depends on: BA04 (registration policy and requirement chains), BA05a.contract (application creation and `workflow_subject` linking), BA17.contract (system notification keys **SN-05** `base.application_approved` and **SN-06** `base.application_rejected` — keys must exist in `pump_system_templates` for BA06 status-transition Edge Functions to dispatch; verified present in dev-db 2026-05-01 per BA17 audit) _(BA00 shell is transitively required via BA04 → BA01; not restated here, matching architecture's slice overview)_
- Backend impact: Read + write contracts; **all three organiser RPCs verified present on dev-db (`app_base_application_set_status`, `app_base_application_check_set_status`, `app_base_application_check_reissue_token`)**. SN-05/SN-06 server-side dispatch wiring is implemented in backend and must remain contract-compatible with this slice.
- Frontend impact: UI

## 2. Overview

This slice gives event organisers a single place to see applications for the selected event, open a structured record of each applicant, inspect evidence bound to that application, walk the ordered review-step chain, and take the actions their role allows: approving or rejecting the application, satisfying or failing the **`event_approval`** check, and reissuing guardian or referee tokens when a check is still pending. Reads run through RLS-scoped Supabase clients; writes use backend RPCs only. Notification semantics for application-level approve and reject align with BA17 system notification contracts SN-05 and SN-06; Edge dispatch may ship in the same wave or immediately after stable RPC behaviour.

---

## 3. What this slice delivers

### Purpose

Operators with access need to triage applications fairly: see who applied, in what registration cohort, and where checks stand; drill into application-scoped evidence; act on **`event_approval`** when it is the pending organiser step; override chain state with explicit application-level approve or reject when policy allows; and reissue external approval links when a guardian or referee check is stuck.

### Surfaces

- `/applications` — gated page containing an applications queue (`DataTable`), error and empty handling, **application detail** in a centred **`Dialog`**, **review steps** in a second centred **`Dialog`**, row actions, **`ConfirmationDialog`** flows for mutations, and toolbars consistent with explicit **DataTable `features`**.

### Boundaries

- This slice does not own participant registration or portal UI (BA05a / pace-portal).
- This slice does not own token landing pages (BA07).
- This slice does not reimplement TEAM logged-in approval queues for **`home_leader_approval`** or **`designated_org_review`** — those remain TEAM surfaces calling the same check RPC where architecture requires.
- This slice does not own payment reconciliation or MINT automation.
- This slice does not define new check types or ad hoc client writes to `base_application_check` outside named RPCs.

### Architectural posture

- All reads and RPCs use **`useSecureSupabase()`** from `@solvera/pace-core/rbac`; no service-role client in route code.
- Application-level status changes use **`app_base_application_set_status`** only. Check-level organiser actions for **`event_approval`** use **`app_base_application_check_set_status`** (same family as TEAM consumers per `docs/requirements/base/BASE-architecture.md`). Token reissue uses **`app_base_application_check_reissue_token`**.
- **`PagePermissionGuard`** gates the route per pace-core RBAC standards; mutation affordances use **`create`** / **`update`** (or equivalent catalogue entries) as specified in §10.
- Evidence is **application-scoped**: `core_form_responses` rows whose **`workflow_subject_type`** is **`base_application`** and **`workflow_subject_id`** equals the application id (BA02 §7.2 pattern; BA05a FS-04).
- Import policy is root-first for consuming apps: use `@solvera/pace-core` by default. Scoped entrypoints are exception-only when a required symbol is not exposed from root or a documented advanced/performance/migration case requires it. Undocumented deep imports are forbidden.

### Page-level guards and evaluation ordering

**Route:** `/applications`.

**Evaluation order when context is incomplete**

1. Outer **`PagePermissionGuard`** with **`operation="read"`**, **`pageName="applications"`**, and **`scope={{ organisationId, eventId, appId }}`** wraps main content.
2. If the guard denies access, **`AccessDenied`** is shown; no-event messaging does not replace denial.
3. If the guard is loading and no custom **`loading`** prop is supplied, **`PagePermissionGuard`** renders **`null`** — neither children nor denial.
4. If the guard permits and **no event** is selected (`selectedEvent.id` falsy), the page shows the **select-event** blocking **`Card`** (copy instructs choosing an event in the shell). Queue fetches do not run.
5. If the guard permits and **an event** is selected, the queue and related data load for that **`event_id`**.

**Scope object when required context is absent**

- Pass organisation, event, and app identifiers from **`useUnifiedAuth()`** / **`Scope`** (`@solvera/pace-core/rbac`). When no event is selected, **`eventId`** is **`null`** or **`undefined`** — never a sentinel string.

**Partially-defined scope versus guard stall**

- While permission resolution is in flight, operators see a blank main region unless a **`loading`** fallback is provided. The UI must not show an empty authorised table that implies zero applications before permission resolution completes.

**Null Supabase client**

- If **`useSecureSupabase()`** returns **`null`** (transient auth client initialisation), render a centred **`LoadingSpinner`** in place of the queue region. Do not show an error; the client resolves automatically once auth state settles.

---

## 4. Functional specification

Prefix legend: **`PQ`** page and queue, **`PD`** detail dialog, **`PR`** review-steps dialog, **`PC`** check / token actions, **`PM`** permissions and misc.

### Page entry / surface entry

1. **PQ-PE-01 —** Navigating to `/applications` renders inside the BA00 authenticated shell; the URL has no mandatory query keys.
2. **PQ-PE-02 —** With an event selected, the page loads applications where **`base_application.event_id`** equals **`selectedEvent.id`** (canonical event key from **`EventServiceProvider`** / BA00).
3. **PQ-PE-03 —** List data includes joined **`core_person`** (or equivalent projection) for applicant contact fields and joined **`base_registration_type`** for cohort name.
4. **PQ-PE-04 —** Page chrome: **`h1`** "Applications" and a subtitle that names the **selected event** and frames the queue (managing applications for that event).

### Loading states

5. **PQ-LS-01 —** While the applications query is unresolved and the guard permits with an event selected, the **`DataTable`** receives **`isLoading` true** (table shows built-in loading row with **`LoadingSpinner`** per pace-core **`DataTable`** behaviour).

### Empty states

6. **PQ-ES-01 —** Event selected, zero applications: the **`DataTable`** shows its empty state (no custom illustration required) with copy "No applications have been submitted for this event."
7. **PQ-ES-02 —** No event selected on the permitted path: replace the queue region with a **`Card`** with copy "Select an event from the header to view its applications." Hide queue row actions. Queue fetches do not run.

### Error states

8. **PQ-ER-01 —** List fetch failure: **`Alert`** `variant="destructive"` below the header with **`NormalizeSupabaseError(error).message`** and a **Retry** control that refetches the list query.

### Primary content — queue (`DataTable`)

9. **PQ-PC-01 —** Queue header is rendered in a **`Card`** with a list icon (pace-core `ClipboardList` or equivalent), title "Application queue", and a description line showing **application count** and the **selected event name** when loaded. The queue **`DataTable`** is rendered in the same queue section directly beneath this header card.
10. **PQ-PC-02 —** **`DataTable`** lists one row per application. Columns (in order): **Applicant** (full name per **BR-NAME**), **Email** (from person), **Registration type** (type name), **Status** (**`Badge`** per **BR-APP-STATUS**), **Submitted** (per **BR-SUBMITTED**), **Checks** (priority badge per **BR-CHECK-SUMMARY**).
11. **PQ-PC-03 —** Row actions (via **`DataTable`** **`actions`**): **View** opens **`PD`**. **View review steps** opens **`PR`** — this action is only rendered when the application's **`checks`** array has at least one entry; it is hidden entirely for applications with zero checks.

### Primary content — detail dialog (`PD`)

12. **PD-PC-01 —** **`Dialog`** is **centred** (pace-core **`Dialog`**); scrollable **`DialogBody`**; **not** a drawer.
13. **PD-PC-02 —** Header shows applicant **full name** (**BR-NAME**) as **`DialogTitle`**; subtitle line shows **email** and **`Badge`** for application **status** (**BR-APP-STATUS**).
14. **PD-PC-03 —** Body includes **Registration type** label + resolved type name.
15. **PD-PC-04 —** Body includes **Evidence** section with heading "Form evidence". Each linked **`core_form_responses`** row per **BR-EVIDENCE-FILTER** is rendered as a separate **`Card`**. The Card header shows the **form name** (from joined **`core_forms`**) and the **submitted** timestamp formatted with **`formatDateTime`** (`@solvera/pace-core/utils`). The Card body lists field rows from **`core_form_response_values`** as key–value pairs: show human label from joined **`core_form_fields`** when **`form_field_id`** resolves, otherwise fall back to **`field_key`**; render **`value_text`** directly; render **`value_json`** per **BR-JSON-RENDER**. While the evidence query is resolving after dialog open, show a centred **`LoadingSpinner`** in the Evidence section body. If the evidence query fails, show a compact **`Alert variant="destructive"`** with **`NormalizeSupabaseError(error).message`** and a **Retry** control inside the Evidence section; the rest of the dialog remains visible. Empty evidence (zero matching rows): show neutral copy "No linked form responses were found for this application."
16. **PD-PC-05 —** Body includes **Checks overview**: concise list or summary of **`base_application_check`** rows for this application (same ordering rule as **PR** — **BR-STEP-ORDER**), showing **`check_type`** label (**BR-TYPELABEL**), **`status`** badge/checkmark styling, and for token types when **pending**: **`token_expires_at`** when present (for operator context). **Never** display **`token_hash`**. Checks overview uses data already loaded in the queue row (no second fetch); sort client-side by `requirement.sort_order` ascending, nulls last.
17. **PD-PC-06 —** **`event_approval`** row with **`pending`** status shows organiser actions **Satisfy check** and **Reject check** when **BR-EVENT-ACTIONS** permits.
18. **PD-PC-07 —** For **`guardian_approval`** or **`referee`** with **`pending`** status, show **Reissue link** when **BR-REISSUE** permits.
19. **PD-PC-08 —** Footer **`DialogClose`** "Close" dismisses the dialog and returns focus appropriately.

### Primary actions — application-level

20. **PD-PA-01 —** **Approve application** and **Reject application** buttons appear when **BR-OVERRIDE** permits (submitted / under_review → approved / rejected). Each opens a **`ConfirmationDialog`** per **§5 Confirmation dialog copy**. **Reject** requires a notes **`Textarea`** because current RPC contract rejects empty notes.
21. **PD-PA-02 —** Confirm **Approve** calls **`app_base_application_set_status`** with **`p_application_id`** and **`p_target_status: 'approved'`** (omit `p_actor` — server resolves from session). Success: toast "Application approved", close dialog, invalidate list. If the RPC raises **`validation_error.application_status_transition_invalid`** (or an equivalent transition-invalid message), show: "This application's status has already been updated — close this dialog and refresh the queue to see the current state." and close the confirmation dialog. All other errors: **`HandleMutationError`**; dialog remains open.
22. **PD-PA-03 —** Confirm **Reject** requires notes from the reject dialog textarea before mutation. When notes are present, call **`app_base_application_set_status`** with **`p_target_status: 'rejected'`** and **`p_notes`** (omit `p_actor`). Success: toast "Application rejected", close dialog, invalidate list. Same concurrency and error handling as **PD-PA-02**. **Unresolved checks stay pending** after override — **BR-UNRESOLVED-VISIBLE**.

### Primary actions — `event_approval` check

23. **PC-PA-01 —** **Satisfy check** opens a **`ConfirmationDialog`** per **§5 Confirmation dialog copy**. On confirm, call **`app_base_application_check_set_status`** with **`p_check_id`**, **`p_status: 'satisfied'`**, and **`p_notes: null`**. Success: toast "Check satisfied", refresh checks overview and list. Errors: **`HandleMutationError`**; dialog remains open. Chain advancement is **server-side** inside the RPC.
24. **PC-PA-02 —** **Reject check** opens a **`ConfirmationDialog variant="destructive"`** per **§5 Confirmation dialog copy**; dialog body includes an optional **`Textarea`** whose value is passed as **`p_notes`** to **`app_base_application_check_set_status`** with **`p_status: 'failed'`** (check-level notes land on **`base_application_check.notes`**). Success: toast "Check rejected", refresh checks overview and list.
25. **PC-PA-03 —** After successful check RPC, toast success, refresh detail projection and list; chain advancement is **server-side** inside the RPC.

### Primary actions — token reissue

26. **PC-PA-04 —** **Reissue** opens a **`ConfirmationDialog`** per **§5 Confirmation dialog copy**. On confirm, call **`app_base_application_check_reissue_token`** with **`p_check_id`** only (omit **`p_actor`** and **`p_expiry_interval`** — server defaults apply) when **BR-REISSUE** applies. Success: toast "Approval link reissued". Failure: **`HandleMutationError`**.

### Secondary actions — review steps dialog (`PR`)

27. **PR-SE-01 —** **View review steps** action opens **`PR`** for the selected application with a read-only ordered list per **BR-STEP-ORDER** and projection **BR-STEP-SHAPE**. This action is only available when the application has at least one check (see **PQ-PC-03**). Checks are sourced from the queue data already loaded — no additional fetch is made when **`PR`** opens; sort client-side by `requirement.sort_order` ascending, nulls last.
28. **PR-SE-02 —** Each step row shows: **order index** (1-based), **`check_type`** label (**BR-TYPELABEL**), **`status`** (pending / satisfied / failed / waived), **`token_expires_at`** when relevant, **`actioned_at`** when non-null, **`notes`** when non-null (read-only).
29. **PR-SE-03 —** Footer closes dialog only; no mutations inside **`PR`**.

### Secondary actions — table tooling

30. **PQ-SE-01 —** **`DataTable`** enables **global search**, **pagination**, **column sorting**, **column filters** (status, registration type as filterable columns), and **column visibility** UI per explicit **`features`** in §9. **Export**, **grouping**, **import**, **bulk create** / **edit** / **delete** are **off** unless this document is amended.
31. **PQ-SE-02 —** Column filter options for **status** use the discrete application statuses present in data (at minimum **submitted**, **under_review**, **approved**, **rejected**).

### Permission-conditional rendering

32. **PM-PR-01 —** Page **`read`** guard: denied ⇒ **`AccessDenied`**; no queue.
33. **PM-PR-02 —** **Approve / Reject application** visible only with **`update`** (or the catalogue permission mapped to organiser override for `applications`) — exact token in §10.
34. **PM-PR-03 —** **`event_approval`** actions visible only when **`check_type === 'event_approval'`**, check **`pending`**, and caller has permission to call **`app_base_application_check_set_status`** for this context (**§10**).
35. **PM-PR-04 —** **Reissue token** visible only for permitted operators and when **BR-REISSUE** true.

### Navigation

36. **PM-NV-01 —** This slice does not require outbound navigation to portal or TEAM; links to other BASE routes are optional and not mandated.

### Edge cases and constraints

37. **PM-EC-01 —** If **`app_base_application_check_set_status`** is absent on the linked Supabase project, **stop** implementation of **`event_approval`** actions and raise a backend blocker (**§14**). This is an environment parity check, not active for the current dev-db baseline.
38. **PM-EC-02 —** Applicant name empty after **BR-NAME** → show **"Unknown applicant"** (or email-only fallback) rather than blank headings.
39. **PM-EC-03 —** Notification dispatch (**SN-05**, **SN-06**) is a **contract**: backend or Edge must fire on transition to **`approved`** / **`rejected`**; BA06 UI must not fake notifications client-side only.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/ApplicationsPage.jsx` (`ApplicationsPage`, `ApplicationDetailPage`).

### Applications queue (`/applications`)

1. **PageHeader** — breadcrumb; title "Applications"; subtitle; optional primary "New application" (stub in prototype).
2. **KPI row** — four KPIs: Total, Submitted (warm when > 0), Under review, Approved (with conversion %).
3. **DataTable** — columns: Applicant (name + email subline), Registration type (filterable), Unit (or "Unassigned"), Submitted (right-aligned), Checks mini (count + status dots), Status badge (filterable), Review action. Search enabled. Row activate opens detail.

### Application review (`/applications/:applicationId` — full page)

Prototype uses a **full-page review** route, not an in-table dialog:

1. **PageHeader** — breadcrumb through Applications; title = applicant name; subtitle = email; secondary "Back to applications"; inline status badge, application id, submitted timestamp.
2. **Tabs** — Checks | Form evidence | History (segmented control pattern).
3. **Summary section** — definition list: registration type, unit assignment (editable), submitted, email, fee.
4. **Checks tab** — list of check rows with status icons, labels, mark satisfied/failed/waived actions.
5. **Evidence tab** — form completion summary lines + "Open full application transcript" secondary.
6. **History tab** — activity timeline list.
7. **Footer action bar** — outstanding checks note; **Reject** (secondary/destructive intent); **Approve** (primary, gated on checks unless already approved).

### Route map (prototype → BASE)

| Prototype | BASE |
|---|---|
| `#/events/:code/applications` | `/applications` |
| `#/events/:code/applications/:appId` | `/applications/:applicationId` (full-page detail — pass 2) |

### Implementation delta (pass 2)

- Requirement doc previously described "detail dialog"; prototype and pass-2 target use **full-page** `ApplicationDetailPage`.
- Production may open detail in dialog/sheet — migrate to full-page route for prototype parity.
- KPI row and checks mini indicators may be missing in production list view.

## 6. Business rules

### BR-NAME — Applicant display name

**Input:** `preferred_name`, `first_name`, `last_name` from person row.  
**Output:** `trim(COALESCE(preferred_name, first_name) || ' ' || last_name)`; if result empty after trim, fall back to **"Unknown applicant"**.

### BR-SUBMITTED — Submitted column

**Input:** `submitted_at`, `created_at`.  
**Output:** Prefer **`submitted_at`** formatted with **`formatDateTime`**; else **`created_at`**; if both null, show **"Not submitted"**.

### BR-APP-STATUS — Application status badges

| `base_application.status` | Label | Suggested `Badge` variant |
| --- | --- | --- |
| `submitted` | Submitted | `soft-sec-normal` |
| `under_review` | Under review | `soft-main-normal` |
| `approved` | Approved | `solid-main-normal` |
| `rejected` | Rejected | `solid-acc-strong` |

### BR-TYPELABEL — `check_type` labels

| `check_type` | Display |
| --- | --- |
| `payment` | Payment |
| `guardian_approval` | Guardian approval |
| `home_leader_approval` | Home leader approval |
| `referee` | Referee |
| `designated_org_review` | Designated organisation review |
| `event_approval` | Event approval |

### BR-EVIDENCE-FILTER — Evidence scope

Include only **`core_form_responses`** where **`workflow_subject_type = 'base_application'`** and **`workflow_subject_id = <selected application id>`**.  
Join **`core_form_response_values`** (and form metadata) under RLS. **Do not** broaden to all forms for the person across the event.

### BR-JSON-RENDER — `value_json` rendering

- If `value_json` is a scalar (string, number, or boolean), render its string representation directly inline.
- If `value_json` is an object, render as a two-column key–value sub-list (key on left, value on right) with keys humanised using `startCase` or equivalent.
- If `value_json` is an array, render as a comma-separated inline list.
- If `value_json` is null or undefined, skip the row entirely (do not render a blank field row).

### BR-STEP-ORDER — Review step ordering

Join each **`base_application_check`** to **`base_registration_type_requirement`** via **`requirement_id`**. Sort ascending by **`base_registration_type_requirement.sort_order`**, nulls last. This sort is performed client-side on data already loaded in the queue payload — no additional fetch is required.

### BR-STEP-SHAPE — Review-step projection (consumer)

Each element includes: **`sort_order`**, **`requirement_id`**, **`check_type`**, **`is_automated`**, **`config`**, **`check_id`**, **`check_status`** (same as `base_application_check.status`), **`token_expires_at`** (no hash), **`actioned_at`**, **`notes`**.  
**Select lists omit `token_hash`.**

### BR-CHECK-SUMMARY — Queue "Checks" column

Evaluate the application's checks array and render a single **`Badge`**:

1. If **any** check has `status === 'failed'`: show **"N failed"** with variant `solid-acc-strong` (where N is the count of failed checks).
2. Else if **any** check has `status === 'pending'`: show **"N pending"** with variant `soft-sec-normal` (where N is the count of pending checks).
3. Else: show **"All satisfied"** with variant `solid-main-normal`.

`waived` checks count as satisfied for summary purposes. Applications with zero checks: show no badge (empty cell).  
The summary must remain consistent after detail refresh.

### BR-EVENT-ACTIONS — When organiser check actions show

`check_type === 'event_approval' && base_application_check.status === 'pending' &&` caller permitted (**§10**) **&& `app_base_application_check_set_status` confirmed present on dev-db**.

### BR-REISSUE — Token reissue eligibility

Show reissue when requirement **`check_type`** ∈ (`guardian_approval`, `referee`) **and** check **`status === 'pending'`** **and** operator permitted. Call **`app_base_application_check_reissue_token`**.

### BR-OVERRIDE — Application approve / reject

May transition **`submitted`** or **`under_review`** → **`approved`** or **`rejected`** via **`app_base_application_set_status`** even if checks remain pending (**organiser override** per architecture). Any other source status causes the RPC to raise an exception — handle per **PD-PA-02** concurrency rule.

### BR-UNRESOLVED-VISIBLE

After approve/reject at application level, **pending** checks **stay** **pending** in read models; UI must **not** hide them.

### BR-NOTIFY — Notification contract alignment

When **`base_application.status`** becomes **`approved`**, dispatch **`base.application_approved`** (**BA17 SN-05**). When it becomes **`rejected`**, dispatch **`base.application_rejected`** (**BA17 SN-06**). Recipient shape and channel defaults per BA17. Implementation is **server-side** (Edge Function or database trigger pattern per platform choice); this slice documents **call points** and acceptance that workflows remain consistent.

---

## 7. API / Contract

### 7.1 Read contracts (`useSecureSupabase()`)

All queries assume RLS permits the organiser context. If **`useSecureSupabase()`** returns **`null`**, gate all queries and show the null-client loading state per §3 and §5.

**Applications list (queue)**

```
from('base_application')
.select(`
  id,
  event_id,
  person_id,
  status,
  submitted_at,
  created_at,
  registration_type_id,
  person:core_person!base_application_person_id_fkey (
    preferred_name,
    first_name,
    last_name,
    email
  ),
  registration_type:base_registration_type!base_application_registration_type_id_fkey (
    id,
    name
  ),
  checks:base_application_check (
    id,
    status,
    requirement_id,
    token_expires_at,
    actioned_at,
    requirement:base_registration_type_requirement (
      check_type,
      sort_order
    )
  )
`)
.eq('event_id', selectedEventId)
.order('submitted_at', { ascending: true, nullsFirst: false })
.order('created_at', { ascending: true })
```

_Queue ordering is FIFO: oldest submitted application first (`submitted_at asc`, nulls last), tiebreak by `created_at asc`._

_Note: FK hint names (`!...`) must match the consuming schema; adjust embed aliases to PostgREST **`*`** relationship names if generated names differ — parity is **filter + column list + ordering**, not a paste-ready string._

**Form evidence for application** — fetched lazily when the detail dialog opens.

```
from('core_form_responses')
.select(`
  id,
  submitted_at,
  form:core_forms ( id, name ),
  values:core_form_response_values (
    field_key,
    form_field_id,
    value_text,
    value_json,
    field:core_form_fields ( id, label, field_key )
  )
`)
.eq('workflow_subject_type', 'base_application')
.eq('workflow_subject_id', applicationId)
.order('submitted_at', { ascending: false })
```

_Adjust relationship names (`field:core_form_fields`) to match generated PostgREST hints for the **`form_field_id`** foreign key._

**Review steps bundle** — not a separate fetch. Derived client-side from the `checks` array already loaded in the queue payload. Sort by `requirement.sort_order` ascending, nulls last. See **BR-STEP-ORDER**.

### 7.2 Write contracts

**Application status (organiser override)**

```
.rpc('app_base_application_set_status', {
  p_application_id: uuid,
  p_target_status: 'approved' | 'rejected',
  p_notes: string | null, // required when target is 'rejected' in current RPC contract
  // p_actor: omit — server resolves from auth.uid()
})
```

_Verified present on dev-db (`rkytnffgmwnnmewevqgp`). Current signature includes optional `p_actor` and optional `p_notes`, with function logic requiring notes when target is `rejected` (`validation_error.reject_notes_required`). Server permission: `is_super_admin OR check_user_event_access`. Transition conflicts raise `validation_error.application_status_transition_invalid` — handle per **PD-PA-02** concurrency rule._

**Check status (`event_approval` and other consumers of this RPC)**

```
.rpc('app_base_application_check_set_status', {
  p_check_id: uuid,
  p_status: 'satisfied' | 'failed' | 'waived',
  p_notes: string | null,
  // p_actor: omit — server resolves from auth.uid()
})
```

_Verified present on dev-db (`rkytnffgmwnnmewevqgp`). Function is `SECURITY DEFINER`, enforces event access, and advances workflow server-side._

**Token reissue**

```
.rpc('app_base_application_check_reissue_token', {
  p_check_id: uuid,
  // p_actor: omit — server resolves from auth.uid()
  // p_expiry_interval: omit — server default '7 days' applies
})
```

_Verified present on dev-db (`rkytnffgmwnnmewevqgp`). Server permission: `is_super_admin OR check_user_event_access`._

**Failures:** surface messages via **`HandleMutationError`** for all RPCs above.

### 7.3 Permissions and server enforcement

- RPCs enforce contextual permissions via `check_user_event_access(event_id)` (or `is_super_admin`) at the database level; client **must not** bypass with direct table updates on `base_application` or `base_application_check`.
- The page-level RBAC guard (`update:page.applications`) controls UI visibility. The RPC enforces the actual permission. Both must be satisfied.
- **`app_base_application_check_set_status`** is **`SECURITY DEFINER`** per architecture on current dev-db; client **`pageName`** / permission resources must align with DB expectations (**§10**).

### 7.4 Cross-slice hand-offs

| Flow | Detail |
| --- | --- |
| Consumes | Registration types and requirement semantics from **BA04**; application + check rows from **BA05a** contract |
| Provides | Organiser-facing satisfaction for **`event_approval`**; override approve/reject; reissue hooks |
| Notifications | **SN-05 / SN-06** call points on application status transitions — owned end-to-end with **BA17** template catalogue |

### 7.5 ID contracts

UUIDs as text; PostgREST returns strings. The primary queue must not show **raw application UUIDs** as a column or debug block (**§16**).

### 7.6 Fixture policy

No hard-coded demo applications in production paths; use BA18 seeds for QA.

---

## 8. Data and schema references

| Artefact | Role |
| --- | --- |
| **`base_application`** | Queue and detail root |
| **`base_application_check`** | Check state, notes, token expiry |
| **`base_registration_type`**, **`base_registration_type_requirement`** | Cohort name, **`check_type`**, **`sort_order`** |
| **`core_person`** | Applicant identity |
| **`core_form_responses`**, **`core_form_response_values`**, **`core_forms`** | Evidence |
| **`app_base_application_set_status`**, **`app_base_application_check_set_status`**, **`app_base_application_check_reissue_token`** | Mutations |

**MCP / dev-db verification status (project `rkytnffgmwnnmewevqgp`):**

1. ✅ **`app_base_application_set_status(p_application_id, p_target_status)`** — present; `p_actor` omitted by client (server default); signature confirmed.
2. ✅ **`app_base_application_check_reissue_token(p_check_id)`** — present; `p_actor` and `p_expiry_interval` omitted by client (server defaults); signature confirmed.
3. ✅ **`app_base_application_check_set_status(p_check_id, p_status, p_notes)`** — present; `p_actor` not required by client (server resolves from auth.uid()).
4. RLS spot-check for `base_application` + checks + evidence pattern as organiser test session — pending (recommend confirming before QA).

Domain/decision docs: honour `docs/database/domains/*.md` where they overlap RLS narration.

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA06 |
|---|---|---|
| `DataTable` | Default root import; allow scoped exception if required by export location | Applications queue table |
| `PagePermissionGuard` / `AccessDenied` | Default root import; scoped `@solvera/pace-core/rbac` allowed as an exception path | Route/action gating |
| `useSecureSupabase` | Scoped `@solvera/pace-core/rbac` exception path (security boundary API) | Scoped reads/RPC calls |
| `Dialog` / `ConfirmationDialog` | Default root import; allow scoped exception if required by export location | Detail and approval/reject confirmation flows |
| `formatDateTime` | Default root import | Evidence/check timestamps |

### 9.2 Slice-specific caveats only

- Keep `DataTable` feature configuration restricted (no export/grouping enablement here).
- Evidence views must exclude secret fields (`token_hash` and similar).
- Keep `event_approval` actions gated by permission + pending state checks.
- Import style in this slice follows root-first policy; scoped imports are exception-only.

## 10. Permission and access rules

| Surface | Permission | Enforcement |
| --- | --- | --- |
| View `/applications` | `read:page.applications` (via **`pageName="applications"`**) | `PagePermissionGuard` + RLS |
| Approve / reject application | `update:page.applications` (or project equivalent for organiser mutations) | Guard wrappers + RPC (`check_user_event_access` enforced server-side) |
| `event_approval` RPC | `app_base_application_check_set_status(p_check_id, p_status, p_notes)` | Guard + RPC (`check_user_event_access` enforced server-side) |
| Reissue token | `update:page.applications` | Guard + RPC (`check_user_event_access` enforced server-side) |

_Row-level_: only applications for **`event_id`** in scope are visible; RLS enforces tenant boundaries.

_Note_: server-side permission enforcement for the two verified RPCs uses `is_super_admin(actor) OR check_user_event_access(event_id)`. The page-level RBAC guard controls UI visibility; the RPC enforces actual access. Both layers must be satisfied.

---

## 11. Acceptance criteria

- Given no event selected and read permitted, the user sees the select-event **`Card`** with copy "Select an event from the header to view its applications", not an empty table.
- Given event with applications, the queue shows **name**, **email**, **registration type**, **badged status**, **submitted** column, and **checks priority badge** (**BR-CHECK-SUMMARY**).
- Given queue ordering, oldest submitted application appears first (FIFO).
- Given a denied read permission, **`AccessDenied`** renders.
- Given view detail, evidence lists **only** responses with **`workflow_subject_id`** matching the application id and type **`base_application`**.
- Given detail open with evidence loading, evidence section shows **`LoadingSpinner`** until query resolves.
- Given evidence fetch failure, compact destructive alert with Retry appears inside evidence section; rest of dialog remains visible.
- Given **`event_approval`** pending, permitted user, and RPC present: **Satisfy** / **Reject check** succeed and refresh shows updated check status.
- Given **`guardian_approval`** pending, **Reissue** succeeds and shows success toast.
- Given application **under review**, **Approve** transitions status to **approved** (RPC success, list badge updates).
- Given application **reject** confirm without notes, client validation blocks mutation, shows the rejection-notes-required feedback, and keeps the dialog open.
- Given an application already approved by another session, calling Approve/Reject shows the concurrency message "This application's status has already been updated — close this dialog and refresh the queue to see the current state."
- Given list fetch error, destructive alert with **Retry** refetches successfully.
- Given an application with zero checks, **View review steps** does not appear in the row actions.
- Given backend environment missing **`app_base_application_check_set_status`**, `event_approval` actions are not rendered and a backend blocker is raised per **§14**.

---

## 12. Verification

- Verify `/applications` queue rendering, FIFO order, filters, and no-event/deny states.
- Verify detail dialog evidence/review-steps loading and error handling.
- Verify approve/reject/reissue flows for available RPCs and refreshed state.
- Verify concurrency message path for stale approval attempts.
- Verify MCP parity checks for queue counts and RPC availability.

## 13. Testing requirements

- Queue tests cover read deny, row rendering, and no-check action suppression.
- Rule tests cover check-summary and evidence-filter logic.
- Dialog/action tests cover confirmations, pending lock, and concurrency copy.
- Error tests cover list and evidence fetch failures with retry.

## 14. Build execution rules

- Scope is `/applications` only.
- No unapproved schema/RPC changes from this slice.
- Stop on missing/divergent organiser RPC contracts.
- Keep writes through approved RPC boundaries only.

## 15. Done criteria

- Queue/detail/review behaviours are demonstrable with current backend contracts.
- §12 verification scenarios complete with evidence for success/error/deny states.
- §13 tests pass for summary/filter/action contracts.
- Active backend blockers are preserved and reported.

## 16. Do not

- Do not replace detail dialog with a drawer.
- Do not expose sensitive fields (including token hashes) in organiser views.
- Do not broaden evidence query scope beyond documented filters.
- Do not bypass RPCs with direct table updates.
- Do not implement `event_approval` actions against environments where organiser RPC contracts are missing or divergent.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/requirements/BA02-shared-forms-platform-contracts-requirements.md`
- `docs/requirements/BA04-registration-setup-and-policy-requirements.md`
- `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md`
- `docs/requirements/BA17-communications-and-system-notifications-requirements.md`
- `docs/requirements/BA18-base-dev-seed-data-requirements.md`

## 18. Implementing Agent Instructions

- Implement BA06-owned queue/detail/review scope only.
- Keep `DataTable` feature and evidence allow-list constraints strict.
- Raise backend blockers instead of introducing local contract workarounds.
