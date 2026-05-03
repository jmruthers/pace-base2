# BA17 — Communications and System Notifications

## 1. Slice metadata

- Status: Draft
- Depends on: BA01 (Event Workspace and Configuration), BA04 (Registration Setup and Policy — registration types feed the recipient-pool filter dropdown), BA05a.contract (Registration Entry and Application Submission — system notification call points SN-01..SN-04), BA06.contract (Applications Admin and Review — system notification call points SN-05 / SN-06), BA08.contract (Units and Group Coordination — `base_units` table contract feeds the unit filter dropdown; table verified present in dev-db 2026-05-01 per BA17 audit) _(BA00 shell is transitively required via BA01; not restated here, matching architecture's slice overview)_
- Backend impact: Read contract only (all pump_* schema, system_key rows, and `rbac_app_pages` prerequisites verified — see §8)
- Frontend impact: Both (UI for `/communications`; utility export for system notification call points in BA05a / BA06)

## 2. Overview

This slice owns the event-scoped communications surface at `/communications` and exports the system notification utility consumed by sibling slices. On the `/communications` page, event operators compose and send email or SMS messages to event participants using `CommComposer` from `@solvera/pace-core/comms`, backed by the PUMP messaging platform. The slice also defines the six `base.*` system notification keys and exports `BASE_SYSTEM_KEYS` constants for BA05a and BA06 to call `sendSystemNotification()` at workflow trigger points. BA17 is a consumer of the shared PUMP communications platform — it does not own template management, gateway configuration, sender identity management, suppression management, or delivery analytics.

---

## 3. What this slice delivers

### 3.1 Operator communications surface (`/communications`)

**Purpose.** Event operators need to send targeted messages to event participants without building a bespoke messaging tool. The `/communications` page provides a compose-and-send surface backed by the shared PUMP platform, with a filter bar to target participant subsets by registration type, application status, and unit.

**Surfaces.**

- The `/communications` route, rendered inside the BA00 authenticated shell.
- A filter bar with three multi-select dropdowns (registration type, status, unit) above the CommComposer card.
- The `CommComposer` component, scoped to the selected event.
- A recipient pool summary rendered below the CommComposer card.

**Boundaries.**

- Template CRUD for `pump_organisation_templates` is owned by PUMP, not BASE. This page consumes templates read-only.
- Sender identity management (`pump_org_settings`) is owned by PUMP.
- Gateway configuration (`pump_gateway_config`) is owned by PUMP.
- Delivery analytics and comms-log dashboards are owned by PUMP.
- Suppression registry management is owned by PUMP.
- System notification call points (the code that calls `sendSystemNotification()`) live in BA05a and BA06 Edge Functions — this slice provides the constants and the contract, not the call sites.
- The authenticated app shell, global event picker, and navigation chrome are owned by BA00.

**Architectural posture.**

- All compose and send operations go through `CommComposer` from `@solvera/pace-core/comms` and the `useCommSendAdapter` hook — no custom editor or direct pump_* table writes from the frontend.
- `useCommSendAdapter` from `@solvera/pace-core/comms` provides the concrete `CommSendAdapter` implementation. No app-local adapter code is required.
- Draft state is managed externally by the page using `useCommDraft` and passed into `CommComposer` as controlled props.
- Page access is gated by `PagePermissionGuard` from `@solvera/pace-core/rbac` using `pageName="communications"`.
- All Supabase reads go through the authenticated boundary provided by `useSecureSupabase()` (used internally by `useCommSendAdapter`).
- RLS is enforced on all pump_* tables; direct queries from the page are not used for pump tables.
- Import policy is root-first for consuming apps: use `@solvera/pace-core` by default. Scoped entrypoints (`/comms`, `/rbac`, `/components`) are exception paths used when root does not expose the required symbol or a documented advanced/performance/migration case applies.

### 3.2 System notification utility

**Purpose.** Six transactional system notifications are dispatched at key moments in BA05a (guardian request issued/reissued, referee request issued/reissued) and BA06 (application approved, application rejected) workflows. Four additional check types (`home_leader_approval`, `designated_org_review`, `event_approval`, `payment`) have no issuance notification by design — see SN-09. This slice defines the `BASE_SYSTEM_KEYS` constants and specifies the `sendSystemNotification()` call contract for those Edge Functions.

**Surfaces.** No UI surface. The utility is an export consumed by BA05a and BA06 Edge Functions only.

**Boundaries.** `sendSystemNotification()` is called exclusively from Edge Functions. It is never called from client-side React code. BA17 does not own the BA05a or BA06 Edge Functions themselves.

### 3.3 Page-level guards and evaluation ordering

The `/communications` page requires two conditions to render the compose surface:

1. The user must have `read:page.communications` permission.
2. An event must be selected (non-null `eventId` in scope).

**Evaluation order:** `PagePermissionGuard` fires first, before event context is checked.

- If the user lacks `read:page.communications`: `AccessDenied` is rendered immediately, regardless of event context. The compose surface is never rendered.
- If the user has `read:page.communications` but no event is selected (`scope.eventId` is `null` or `undefined`): the guard fires with `scope = { organisationId, appId }` (eventId absent). The guard evaluates based on org-scoped permissions. If permission is granted at org level, the page renders a no-event empty state ("Select an event to compose a communication."). The compose surface is not rendered until an event is active.
- If the user has permission and an event is selected: the compose surface renders.

**Guard behaviour during RBAC loading:** While `useResourcePermissions` is loading (`isLoading = true`), `PagePermissionGuard` is not in `strictMode`, so it renders `null`. The page renders a `LoadingSpinner` in the main content area during this window.

**Scope object passed to the guard:**

```typescript
{
  organisationId: string,   // always present from org context
  eventId: string | undefined, // present when event selected; undefined when not
  appId: string,            // BASE app ID, always present
}
```

---

## 4. Functional specification

Items are numbered with prefix `PE-` (page entry), `LS-` (loading), `ES-` (empty), `ER-` (error), `PC-` (primary content), `PA-` (primary action), `SA-` (secondary action), `PP-` (permission-conditional), `NAV-` (navigation), `EC-` (edge case), `SN-` (system notification). Each item is independently testable by a QA reviewer with no code access.

### 4.1 `/communications` surface

**Page entry**

PE-01. When the user navigates to `/communications`, the page loads inside the authenticated BA00 shell. The URL is `/communications`. Required context: authenticated user, selected organisation (`organisationId`), selected event (`eventId`). If the user lacks `read:page.communications`, `AccessDenied` is shown immediately and no data fetches occur.

PE-02. On entry with permission and event context, the page initiates four concurrent fetches: (1) available organisation templates for the initial channel (email) via `adapter.loadTemplates`; (2) merge fields for the event context via `adapter.loadMergeFields`; (3) initial pool estimate for all event participants (no filters) via `adapter.resolvePool`; (4) registration types and units for the filter dropdowns from the selected event via `useSecureSupabase`.

PE-03. The initial draft state is `{ channel: 'email' }`. The filter bar starts with all three dropdowns cleared (no active filters), meaning the initial pool includes all event participants.

**Loading states**

LS-01. While initial page data is loading (RBAC check, initial fetches), a `LoadingSpinner` is displayed centred in the main content area. No compose controls are shown until loading resolves.

LS-02. When filter dropdowns change and the pool preview is re-fetching, an inline spinner appears inside the recipient pool preview area. The CommComposer card and filter bar remain interactive during pool preview re-fetches.

LS-03. When "Send now", "Send test", or "Schedule" is in progress, the triggered button shows a loading indicator and is disabled. Other buttons remain interactive.

**Empty states**

ES-01. If no event is selected, the page shows: heading "Communications", body text "Select an event to compose a communication." No compose surface or filter bar is shown.

ES-02. If no organisation templates exist for the selected channel, the CommComposer template selector shows placeholder text "No templates available" and remains collapsed. The operator can still compose manually without a template.

ES-03. If no units exist for the selected event, the Unit filter dropdown shows "No units available." The dropdown is rendered but contains no selectable options. The pool is not affected (unit filter is empty = no unit constraint applied).

ES-04. If the recipient pool estimate resolves to zero participants matching the current filters, the `RecipientPoolPreview` shows: "No matching participants — adjust your filters to include recipients." The "Send now" button remains accessible (sending to an empty pool is not blocked at the UI level; PUMP handles the zero-recipient result).

**Error states**

ER-01. If `adapter.loadTemplates` fails, the CommComposer template selector shows an error state ("Could not load templates"). The compose surface is still usable without templates; this failure is non-fatal.

ER-02. If `adapter.resolvePool` fails, the `RecipientPoolPreview` area shows: "Could not estimate recipient count. Check your filters and try again." A retry affordance (link: "Try again") re-triggers `adapter.resolvePool` with the current filters.

ER-03. If `adapter.send` fails, a toast notification (destructive variant) shows `result.error.message` from the failed `ApiResult<CommSendResult>`. The draft is not reset. The user can correct and retry.

ER-04. If `adapter.schedule` fails, a toast notification (destructive variant) shows `result.error.message` from the failed `ApiResult`. The draft is not reset.

ER-05. If `adapter.sendTest` fails, a toast notification (destructive variant) shows `result.error.message` from the failed `ApiResult`.

**Primary content**

PC-01. The `CommComposer` card renders a single-column compose form. It contains (in order): channel selector, template browser, sender name, channel-specific sender fields (email: sender email + subject; SMS: sender phone), preview/edit toggle, body editors with `MergeFieldToolbar`, and a card footer with action buttons. Full structural detail is in §5.

PC-02. The recipient pool is always `event_participants` type, scoped to the selected event. The `EventParticipantsPool` descriptor is constructed from the active filter state and passed to `CommComposer` via the `recipientPool` prop.

PC-03. A `RecipientPoolPreview` is rendered below the `CommComposer` card, always visible. It shows: estimated recipient count, up to 5 sample recipient names, and any pool warnings (e.g. "12 recipients have no email address"). This component is rendered by `CommComposer` internally — no separate implementation in the page.

PC-04. The template browser (inside CommComposer) shows templates from `pump_organisation_templates` for the active organisation, filtered to the current channel. Selecting a template pre-populates subject (email) and body fields. The channel is constrained to match the selected template's channel.

PC-05. When a template with `require_merge_field_validation: true` is selected, CommComposer shows an alert banner: "All merge tokens must resolve for this template."

PC-06. CommComposer renders both Email and SMS channel toggle buttons. Selecting "Email" reveals sender email, subject, and HTML body fields. Selecting "SMS" reveals sender phone and plain text body only. Templates, merge fields, and pool previews all re-fetch when channel switches.

**Primary actions**

PA-01. **Send now** — clicking "Send now" calls `adapter.send()` with the current `CommSendRequest`. On success: a toast (success variant) shows "Message sent to N participants" (where N = `CommSendResult.total_recipients`). The draft resets to `{ channel: 'email' }` and filters clear. If `suppression_skipped > 0`, an additional toast (default variant) shows "N recipients were suppressed and skipped." On failure: a toast (destructive variant) shows `result.error.message`; draft is not reset.

PA-02. **Send CTA blocked by unresolved tokens** — when `blockSendOnUnresolvedTokens` is `true` and the draft body or subject contains unresolved merge tokens (tokens not present in the loaded merge field list), the "Send now" button is disabled. CommComposer shows an alert banner: "Resolve all tokens before sending." Once all tokens are resolved, the button re-enables.

PA-03. **Schedule** — clicking "Schedule" in the CommComposer footer opens a datetime picker (CommComposer-internal). After the operator selects a future datetime and confirms, `adapter.schedule()` is called with `CommScheduleRequest` (extends `CommSendRequest` with `scheduled_at`). On success: a toast (success variant) shows "Message scheduled for [formatted datetime]." Draft resets. On failure: a toast (destructive variant) shows `result.error.message`.

PA-04. **Send test** — clicking "Send test" calls `adapter.sendTest()` with the current draft as `CommSendTestRequest`. The test message is sent to the signed-in user's email address (resolved by PUMP from the authenticated user's profile). On success: a toast (success variant) shows "Test email sent to your email address." On failure: a toast (destructive variant) shows `result.error.message`.

**Secondary actions**

SA-01. **Recipient filters** — the filter bar above CommComposer contains three multi-select dropdowns:
- *Registration type*: options are `base_registration_type` records for the selected event (label = `name`). Default: no selection (no filter applied).
- *Status*: options are the five BASE application statuses — "Submitted" (`submitted`), "Under review" (`under_review`), "Approved" (`approved`), "Rejected" (`rejected`), "Withdrawn" (`withdrawn`). Default: no selection (no filter applied).
- *Unit*: options are `base_units` records for the selected event (label = `name`). Default: no selection (no filter applied).

Changing any filter immediately updates the `EventParticipantsPool.filters` object in the pool descriptor and schedules a `RecipientPoolPreview` re-fetch, debounced by 400 ms. Rapid successive filter changes reset the debounce timer; only one re-fetch fires after the user stops changing filters.

SA-02. **Clear filters** — a "Clear filters" link appears in the filter bar when at least one filter has a value selected. Clicking it resets all three dropdowns to empty and triggers a pool preview re-fetch with no filters.

SA-03. **Merge field toolbar** — the `MergeFieldToolbar` inside CommComposer shows available merge fields as chips (e.g. `{{first_name}}`). Clicking a chip inserts the token at the cursor position in the active text area. See §9.2 for CommComposer rendered layout details.

**Permission-conditional rendering**

PP-01. Users without `read:page.communications` see the `AccessDenied` component. No compose surface, filter bar, or data fetch occurs.

PP-02. Users with `read:page.communications` but without `create:page.communications` see CommComposer in read-only mode (`rbac.canCompose = false`). CommComposer renders an alert: "You have view-only access to this surface." No editing of draft fields is possible.

PP-03. Users with `read:page.communications` and `create:page.communications` but without `update:page.communications` see CommComposer in compose-only mode (`rbac.canSend = false`, `rbac.canSchedule = false`). Send now, Schedule, and Send test buttons are hidden in the CommComposer footer. A callout reads "You do not have permission to send."

PP-04. Users with `read:page.communications`, `create:page.communications`, and `update:page.communications` see the full compose and send surface.

**Navigation**

NAV-01. `/communications` is linked from the event dashboard nav card "Communications" (owned by BA01). Clicking the nav card navigates to `/communications`.

NAV-02. On successful send or schedule, the user stays on `/communications`. No redirect occurs. The draft resets and filters clear.

NAV-03. Navigating away from `/communications` with an unsaved dirty draft does not trigger a confirmation dialog. No unsaved-draft warning is shown.

**Edge cases and constraints**

EC-01. If a filter combination selects no matching participants, the pool estimate = 0. The compose surface remains active. Sending to an empty pool is not blocked at the UI level.

EC-02. If the draft channel is switched while a template is selected, the template selection is cleared (CommComposer-internal). The operator must re-select a template for the new channel.

EC-03. If merge fields fail to load (ER-01 scenario), the `MergeFieldToolbar` shows an error state. Typing merge tokens manually into the body is still possible, but the tokens will be unresolved (blocking send if `blockSendOnUnresolvedTokens=true`).

EC-04. The "Send test" button is visible and enabled for any user with `update:page.communications`, even if the pool is empty or the recipient count is zero. Test sends are not pool-scoped.

EC-05. If the selected event changes while the operator is composing (via the global event picker in BA00), the draft resets, all filters clear, and all adapter calls re-run with the new event context.

### 4.2 System notification utility

SN-01. `base.guardian_request_issued` — dispatched by a BA05a Edge Function when a guardian approval check (`base_application_check` with type `guardian`) is created. Recipient: `{ type: 'canonical_parent_contact', member_id: applicant_member_id }`.

SN-02. `base.guardian_request_reissued` — dispatched by a BA05a Edge Function when a guardian approval check is re-issued (magic link regenerated). Recipient: `{ type: 'canonical_parent_contact', member_id: applicant_member_id }`.

SN-03. `base.referee_request_issued` — dispatched by a BA05a Edge Function when a referee check is created. Recipient: `{ type: 'member_context', member_id: referee_member_id }`.

SN-04. `base.referee_request_reissued` — dispatched by a BA05a Edge Function when a referee check is re-issued. Recipient: `{ type: 'member_context', member_id: referee_member_id }`.

SN-05. `base.application_approved` — dispatched by a BA06 Edge Function when an application status transitions to `approved`. Recipient: `{ type: 'member_context', member_id: applicant_member_id }`.

SN-06. `base.application_rejected` — dispatched by a BA06 Edge Function when an application status transitions to `rejected`. Recipient: `{ type: 'member_context', member_id: applicant_member_id }`.

SN-07. All six system notifications pass `sourceApp: 'base'`, `sourceContextType: 'event'`, and `sourceContextId: event_id`. All use the default `channel: 'email'` (no channel override in BA17 v1).

SN-08. If any system notification send fails, the calling Edge Function logs the failure and continues. The primary workflow action (check issuance, application approval, application rejection) is not rolled back. See §6 BR-05.

SN-09. The following check types have **no issuance notification** at check creation time. This is intentional by design, not an omission:

| `check_type` | Reason no notification fires at creation |
|---|---|
| `home_leader_approval` | Actioned by a home leader logged into TEAM; TEAM queries `base_application_check` directly — no magic-link or email is required to surface the pending check |
| `designated_org_review` | Actioned by a reviewing org member logged into TEAM; surfaced via TEAM's approval queue using `config.reviewing_org_id` |
| `event_approval` | Actioned by an event organiser inside BASE (BA06 approval surface); no external notification required |
| `payment` | Satisfied automatically by MINT when the payment is reconciled; no email notification at check creation — MINT integration is deferred and not scoped in this wave |

If a future wave adds notifications for any of these types, a new `base.*` system key must be added to `pump_system_templates` and a corresponding SN entry added here before any Edge Function calls `sendSystemNotification()` with that key.

---

## 5. Visual specification

- Visual scope is `/communications` compose/filter/recipient-preview states.
- Keep this section to layout and UI states; send/system-notification contracts remain in §4/§7.
- Filter/composer visuals reflect adapter and permission outputs without redefining backend behaviour.

## 6. Business rules

### BR-01 — Send CTA blocked by unresolved merge tokens

**Trigger:** `blockSendOnUnresolvedTokens` is `true` (always the case in BASE) and the draft body (`body_text` or `body_html`) or subject contains at least one token of the form `{{token_name}}` where `token_name` is not present in the list of available merge fields loaded by `adapter.loadMergeFields`.

**Resolution function (from `@solvera/pace-core/comms` — `getUnresolvedTokens`):**
```
unresolvedTokens = getUnresolvedTokens(content, mergeFields)
```
Where `content` is the concatenation of all draft text fields, and `mergeFields` is the current `CommMergeField[]` from the adapter.

**Effect:** "Send now" button disabled. Alert banner rendered.

**Edge case:** If merge fields have not yet loaded (adapter call pending), all tokens are treated as unresolved — send is blocked until fields load.

### BR-02 — Recipient pool is always event_participants scoped to selected event

The recipient pool descriptor for all operator sends on `/communications` is:

```typescript
{
  type: 'event_participants',
  event_id: selectedEventId,
  filters: {
    registration_type_ids: selectedRegTypeIds.length > 0 ? selectedRegTypeIds : undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    unit_ids: selectedUnitIds.length > 0 ? selectedUnitIds : undefined,
  }
}
```

No other pool type is available on this page. If `selectedEventId` is absent (no event selected), the pool descriptor cannot be constructed and the compose surface does not render.

### BR-03 — Operator sends never bypass suppression

`CommSendAdapter.send()` called from CommComposer always sends with `bypass_suppression: false` (default). BASE operators cannot override this. Recipients on the suppression registry are silently skipped by PUMP; `CommSendResult.suppression_skipped` records the count.

### BR-04 — System notifications always bypass suppression

`sendSystemNotification()` (from `@solvera/pace-core/comms`) sets `bypass_suppression: true` internally (hardcoded in the utility — the caller cannot override this). System notifications always reach their recipient unless a gateway failure occurs.

### BR-05 — System notification failure is non-fatal

If `sendSystemNotification()` returns `!result.ok`, the calling Edge Function (BA05a or BA06) must:

1. Log the error with fields: `system_key`, `member_id`, `result.error`.
2. Not throw or reject the Edge Function.
3. Not roll back the primary workflow action (check issuance, application approval, application rejection).
4. Continue executing remaining steps.

The operator is not notified of system notification failures in the BASE UI.

### BR-06 — Guardian notification recipient resolution

Guardian system notifications (`base.guardian_request_issued`, `base.guardian_request_reissued`) use recipient mode `canonical_parent_contact`:

```typescript
recipient: { type: 'canonical_parent_contact', member_id: applicant_member_id }
```

PUMP resolves the canonical parent contact as the contact record with `contact_type_id = 1` (Parent / Guardian, as per `core_contact_type.id = 1` — confirmed in dev-db) for the target member. If no such contact exists, PUMP records a warning; the failure is non-fatal per BR-05.

### BR-07 — Referee notification recipient resolution

Referee system notifications (`base.referee_request_issued`, `base.referee_request_reissued`) use recipient mode `member_context`, targeting the referee member:

```typescript
recipient: { type: 'member_context', member_id: referee_member_id }
```

The `referee_member_id` is the ID of the member selected as referee during the BA05a registration workflow.

### BR-08 — Application status notification recipient resolution

Application status notifications (`base.application_approved`, `base.application_rejected`) use recipient mode `member_context`, targeting the applicant:

```typescript
recipient: { type: 'member_context', member_id: applicant_member_id }
```

The `applicant_member_id` is derived from the `base_application` record being approved or rejected.

### BR-09 — System notification call points are backend-only

`sendSystemNotification()` is called exclusively from Edge Functions invoked by BA05a and BA06 workflows. It must never be called from client-side React components, page-level code, or browser-executed logic.

### BR-10 — Status filter values use BASE application status vocabulary

`EventParticipantsPool.filters.status` uses BASE application status values:

```typescript
type PoolStatusFilter = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
```

These values map directly to `base_application.status` column values. The PUMP pool resolver queries `base_application.status = ANY($status_filter)` — no mapping table is required.

**Edge case:** Empty `status` filter (`undefined` or empty array) → no status constraint applied; all statuses are included.

### BR-11 — Templates consumed read-only by BASE

BASE uses `adapter.loadTemplates()` to read `pump_organisation_templates` records. BASE has no UI for creating, editing, or deleting templates. If no templates exist for the organisation, CommComposer shows "No templates available" in the template browser; manual composition is still available.

### BR-12 — System key namespace

All BA17 system notification keys use the `base.*` namespace prefix. These keys resolve rows in `pump_system_templates` by their immutable `system_key` column. All 6 keys are confirmed present in dev-db (see §8). Calling `sendSystemNotification()` with a key that does not exist in `pump_system_templates` produces a PUMP error; the failure is handled per BR-05.

### BR-13 — Filter dimensions combine with AND logic

When multiple filter dropdowns have active selections, the pool applies cross-dimension AND logic: a participant must satisfy at least one selected value in **each** active dimension.

| Scenario | Result |
|---|---|
| Registration type = [A, B], status = [], unit = [] | Participants in type A or B, any status, any unit |
| Registration type = [A], status = [approved], unit = [] | Participants in type A who are approved |
| Registration type = [A, B], status = [approved, submitted], unit = [U1] | Participants in (type A or B) AND (approved or submitted) AND unit U1 |
| All filters empty | All event participants |

Within a single dimension, multiple values are OR'd (participant must match at least one selected value in that dimension).

### BR-14 — CommRbacContext permission derivation

| `CommRbacContext` field | Derived from |
|---|---|
| `canCompose` | `create:page.communications` — from `useResourcePermissions('communications')` `canCreate` |
| `canSend` | `update:page.communications` — from `useResourcePermissions('communications')` `canUpdate` |
| `canSchedule` | `update:page.communications` — same as `canSend`; scheduling and sending require the same update permission |
| `scopeType` | `'event'` (always, for `/communications`) |
| `scopeId` | `eventId` from active event context |

**Note:** In BASE v1, `canSend` and `canSchedule` are always equal — both derive from `update:page.communications`. The `CommRbacContext` type supports independent values for future differentiation, but BASE does not use that capability in v1. Do not implement independent permission checks for scheduling.

---

## 7. API / Contract

### 7.1 Read contracts

**Operator sends (via `useCommSendAdapter`):**

| Method | PUMP operation | Input | Return |
|---|---|---|---|
| `adapter.loadTemplates({ organisationId, channel })` | List org templates | Channel-scoped | `ApiResult<CommTemplate[]>` |
| `adapter.loadMergeFields({ organisationId, channel, recipientPool, sourceContextType: 'event', sourceContextId: eventId })` | List available merge fields | Event + pool context | `ApiResult<CommMergeField[]>` |
| `adapter.resolvePool(pool, { organisationId, channel })` | Estimate recipient count | Pool descriptor | `ApiResult<CommRecipientPreview>` |

**Filter bar data (via `useSecureSupabase`):**

```typescript
// Registration types
supabase
  .from('base_registration_type')
  .select('id, name')
  .eq('event_id', eventId)
  .order('name', { ascending: true })

// Units
supabase
  .from('base_units')
  .select('id, name')
  .eq('event_id', eventId)
  .order('name', { ascending: true })
```

### 7.2 Write contracts

**Send now:**
```typescript
adapter.send(CommSendRequest) → ApiResult<CommSendResult>
```
`CommSendRequest` shape (relevant fields):
- `organisation_id: string`
- `channel: CommChannel`
- `body_text: string` (required)
- `subject?: string` (email only)
- `body_html?: string` (email only)
- `pool: EventParticipantsPool`
- `sender_name: string`
- `sender_email?: string` (email only)
- `sender_phone?: string` (SMS only)
- `reply_to?: string`
- `source_app: 'base'`
- `source_context_type: 'event'`
- `source_context_id: string` (event_id)
- `template_id?: string`
- `extra_merge_context?: Record<string, string>`

`CommSendResult` shape:
- `message_id: string`
- `total_recipients: number`
- `suppression_skipped: number`
- `warnings: CommTokenWarning[]`

**Send test:**
```typescript
adapter.sendTest(CommSendTestRequest) → ApiResult<CommSendResult>
```
`CommSendTestRequest` = `CommSendRequest` minus `pool`, `system_key`, `system_recipient`, `bypass_suppression`.

**Schedule:**
```typescript
adapter.schedule(CommScheduleRequest) → ApiResult<CommScheduleResult>
```
`CommScheduleRequest` = `CommSendRequest` extended with `scheduled_at: string` (ISO 8601 datetime).

`CommScheduleResult`: `{ message_id: string }`.

**System notifications:**
```typescript
sendSystemNotification(
  adapter: Pick<CommSendAdapter, 'send'>,
  request: SystemNotificationRequest
) → Promise<ApiResult<CommSendResult>>
```
Called from BA05a and BA06 Edge Functions only.

### 7.3 Cross-slice handoffs

| Handoff | Direction | Contract |
|---|---|---|
| `BASE_SYSTEM_KEYS` constants | BA17 → BA05a, BA06 | Exported object; BA05a and BA06 import these constants to pass to `sendSystemNotification()` |
| `sendSystemNotification()` contract | BA17 defines → BA05a and BA06 call | Calling pattern documented in §4.2 and §6 |
| Event context | BA00 → BA17 (consumed) | `useEvents()` from `@solvera/pace-core/hooks` |
| `/communications` nav card | BA01 → BA17 | BA01 renders a "Communications" nav card linking to `/communications`; BA17 owns the route |

### 7.4 Exported constants

```typescript
// Exported from BA17's constants module; imported by BA05a and BA06 Edge Functions
export const BASE_SYSTEM_KEYS = {
  GUARDIAN_REQUEST_ISSUED:   'base.guardian_request_issued',
  GUARDIAN_REQUEST_REISSUED: 'base.guardian_request_reissued',
  REFEREE_REQUEST_ISSUED:    'base.referee_request_issued',
  REFEREE_REQUEST_REISSUED:  'base.referee_request_reissued',
  APPLICATION_APPROVED:      'base.application_approved',
  APPLICATION_REJECTED:      'base.application_rejected',
} as const;

export type BaseSystemKey = typeof BASE_SYSTEM_KEYS[keyof typeof BASE_SYSTEM_KEYS];
```

### 7.5 ID contracts

- `organisationId`: `string` (UUID) — from org context
- `eventId`: `string` (UUID) — from event context via `useEvents()`
- `member_id` (system notifications): `string` (UUID) — from `base_application` or `base_application_check` records
- `template_id` (optional): `string` (UUID) — from `pump_organisation_templates`

---

## 8. Data and schema references

### Tables and views consumed

| Resource | Type | Access | Purpose |
|---|---|---|---|
| `pump_organisation_templates` | Table | Read via adapter | Operator template list |
| `pump_system_templates` | Table | Read by PUMP Edge Functions | System notification template resolution |
| `pump_message` | Table | Written by PUMP Edge Functions only | Send batch envelope (not queried by BASE UI) |
| `pump_message_recipient` | Table | Written by PUMP Edge Functions only | Per-recipient rows (not queried by BASE UI) |
| `pump_comms_log` | View | Available for future use | Message send history (DB-405; not surfaced in BA17 v1 UI) |
| `base_registration_type` | Table | Read via `useSecureSupabase` | Registration type filter options |
| `base_units` | Table | Read via `useSecureSupabase` | Unit filter options |
| `core_contact_type` | Table | Read by PUMP Edge Functions | Guardian recipient resolution (id=1 = "Parent / Guardian") |

### Implementation gates (all ✅ PASSED as of 2026-05-01 — re-verify before build if environment may have diverged)

| Gate ID | Description | Status |
|---|---|---|
| `BA17.template.system_keys.base_v1` | All 6 `base.*` system_keys present and active in `pump_system_templates` | ✅ PASSED (verified 2026-05-01 via Supabase MCP on rkytnffgmwnnmewevqgp) |
| `BA17.CR23.ready_reference` | CR23 acceptance criteria all marked complete | ✅ PASSED |
| `BA17.RBAC.communications_page` | `communications` page added to `rbac_app_pages` for BASE app (`scope_type` = `event`); pass `'communications'` as a plain string to `PagePermissionGuard` / `useResourcePermissions` (no `RESOURCE_NAMES` constant) | ✅ PASSED (verified 2026-05-01 via Supabase MCP on rkytnffgmwnnmewevqgp) |
| `BA17.adapter.useCommSendAdapter` | `useCommSendAdapter` hook shipped in `@solvera/pace-core/comms` | ✅ PASSED (verified 2026-05-01 against pace-core2 source) |
| `BA17.pool.status_alignment` | `EventParticipantsPoolFilters.status` updated to BASE status vocabulary in pace-core2 | ✅ PASSED (verified 2026-05-01 against pace-core2 source) |
| `BA17.component.MultiSelect` | `MultiSelect` component exported from `@solvera/pace-core/components` | ✅ PASSED (verified 2026-05-01 against pace-core2 source) |

### MCP verification steps (for build agent / QA)

```sql
-- Verify all 6 BA17 system keys are present
SELECT system_key, is_active FROM pump_system_templates
WHERE system_key LIKE 'base.%'
ORDER BY system_key;
-- Expected: 6 rows, all is_active = true

-- Verify communications page registered for BASE
SELECT page_name, scope_type FROM rbac_app_pages
WHERE app_id = '25aaa04e-b230-4132-9984-f27ded97f861'
AND page_name = 'communications';
-- Expected: 1 row, scope_type = 'event' (verified 2026-05-01)
```

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA17 |
|---|---|---|
| `CommComposer` / `useCommDraft` | Scoped `@solvera/pace-core/comms` exception path | Draft and send UI workflow |
| `useCommSendAdapter` | Scoped `@solvera/pace-core/comms` exception path | Canonical send adapter integration |
| `PagePermissionGuard` / `useResourcePermissions` | Default root import where available; scoped `@solvera/pace-core/rbac` allowed as exception path | Read/update gating |
| `MultiSelect` | Default root import; allow scoped exception if required by export location | Recipient filter controls |
| `sendSystemNotification` types | Scoped `@solvera/pace-core/comms` exception path | Backend call contract for BA05a/BA06 integrations |

### 9.2 Slice-specific caveats only

- `sendSystemNotification` is backend/Edge only; do not call from route React code.
- Keep unresolved-token send blocking enabled for compose actions.
- Event-context changes reset draft and filters before re-resolving pool estimates.
- Route guard uses `pageName="communications"` with event scope values.
- Import style in this slice follows root-first policy; scoped imports are exception-only.

## 10. Permission and access rules

### Page access (`/communications`)

| Permission | Grants |
|---|---|
| `read:page.communications` | Page is visible; user can view the compose surface in read-only mode |
| `create:page.communications` | User can edit draft fields (channel, subject, body, sender); `CommRbacContext.canCompose = true` |
| `update:page.communications` | User can send, schedule, and send test; `CommRbacContext.canSend = true`, `canSchedule = true` |

### Role assignments (event-scoped)

| Role | `read` | `create` | `update` |
|---|---|---|---|
| Event admin | ✅ | ✅ | ✅ |
| Event planner | ✅ | ✅ | ✅ |
| Read-only viewer | ✅ | — | — |
| No assigned role | — | — | — |

Roles are assigned via `rbac_event_app_roles`. The `rbac_page_permissions` rows for the `communications` page must exist in dev-db for role grants to take effect (`BA17.RBAC.communications_page` gate — verify with §8 MCP query).

### Record-level access

BASE does not directly read or write `pump_message` or `pump_message_recipient` from the UI. All pump_* table access is mediated by PUMP Edge Functions, which enforce their own RLS. The `/communications` page reads `base_registration_type` and `base_units` via `useSecureSupabase`, which enforces RLS through the authenticated user's session.

### System notification access

`sendSystemNotification()` is called from BA05a and BA06 Edge Functions running as `service_role`. No UI-level permission check is required for system notifications — they are triggered by workflow events, not direct user action.

---

## 11. Acceptance criteria

**Happy path — send message**

- [ ] AC-01. Given a user with `update:page.communications` and an active event, when they navigate to `/communications` and CommComposer loads, then the compose surface is visible with the filter bar, channel selector, and all composer fields.
- [ ] AC-02. Given AC-01, when the user selects a channel, enters sender details, types a body without merge tokens, and clicks "Send now", then a toast appears "Message sent to N participants" and the draft resets.
- [ ] AC-03. Given AC-01, when the user activates status filter "Approved" only and the pool estimate updates, then the RecipientPoolPreview shows a count reflecting only approved participants.

**Happy path — schedule message**

- [ ] AC-04. Given a user with `update:page.communications`, when they complete a valid draft and click "Schedule", then a datetime picker appears and, after selecting a future time and confirming, a toast shows "Message scheduled for [datetime]."

**Happy path — send test**

- [ ] AC-05. Given a user with `update:page.communications` and a draft with channel "Email", when they click "Send test", then a toast shows "Test email sent to your email address."

**Happy path — system notification (BA05a call point)**

- [ ] AC-06. Given a BA05a Edge Function that issues a guardian check, when `sendSystemNotification` is called with `BASE_SYSTEM_KEYS.GUARDIAN_REQUEST_ISSUED` and a `canonical_parent_contact` recipient, then PUMP dispatches an email to the canonical parent contact and the Edge Function continues without error.

**Happy path — system notification failure non-fatal**

- [ ] AC-07. Given a BA05a Edge Function that issues a guardian check, when `sendSystemNotification` returns an error result, then the check issuance completes successfully and the error is logged but not surfaced to the operator.

**Validation failure — unresolved tokens**

- [ ] AC-08. Given a user composing an email with body containing `{{unknown_token}}` where "unknown_token" is not in the merge field list, when they attempt to click "Send now", then the button is disabled and the alert banner "Resolve all tokens before sending" is visible.

**Validation failure — missing sender name**

- [ ] AC-09. Given a user who clears the sender name field, when CommComposer validates the draft, then the "Send now" button is disabled until a sender name is entered.

**Permission-denied — no read permission**

- [ ] AC-10. Given a user without `read:page.communications`, when they navigate to `/communications`, then the `AccessDenied` component is displayed and no compose surface or filter bar is rendered.

**Permission-denied — no update permission**

- [ ] AC-11. Given a user with `read:page.communications` and `create:page.communications` but not `update:page.communications`, when they view `/communications`, then the CommComposer is editable but the Send now, Schedule, and Send test buttons are not visible.

**Empty state — no event selected**

- [ ] AC-12. Given a user with `read:page.communications` but no active event in context, when they navigate to `/communications`, then no compose surface is rendered and the text "Select an event to compose a communication." is shown.

**Empty state — pool estimate zero**

- [ ] AC-13. Given a user who applies filters that match no participants, then the RecipientPoolPreview shows "No matching participants — adjust your filters to include recipients." and the "Send now" button remains accessible.

**Error state — pool resolution failure**

- [ ] AC-14. Given `adapter.resolvePool` returns an error, then the RecipientPoolPreview shows "Could not estimate recipient count. Try again." with a "Try again" link.

**Filter logic**

- [ ] AC-15. Given a user who selects Registration type = [Type A] and Status = [approved], when the pool preview updates, then the estimated count reflects only participants in Type A with approved status.

**Filter interaction — clear filters**

- [ ] AC-16. Given a user with at least one active filter (e.g. Status = Approved), when they click "Clear filters", then all three `MultiSelect` dropdowns reset to empty, the "Clear filters" link disappears, and the pool preview re-fetches with no filter constraints.

**Happy path — send SMS message**

- [ ] AC-17. Given a user with `update:page.communications` and an active event, when they select channel "SMS", enter sender name, sender phone, and a plain text body without merge tokens, and click "Send now", then a toast (success variant) shows "Message sent to N participants" and the draft resets.

**Edge case — event context change**

- [ ] AC-18. Given a user composing a message with active filters and a partial draft, when the event context changes via the BA00 event picker, then the draft resets to `{ channel: 'email' }`, all three filter dropdowns clear, and the pool preview re-fetches for the new event.

---

## 12. Verification

- Verify compose flows: send now, schedule, and send test for valid drafts.
- Verify unresolved-token and sender validation blocks send actions.
- Verify read-denied and update-denied route states.
- Verify no-event and zero-pool states.
- Verify filter updates and clear-filters behaviour in pool resolution calls.
- Verify MCP checks for system template keys and communications page registration.

## 13. Testing requirements

- Render tests for compose + filter surface with adapter mocks.
- Validation tests for unresolved tokens and required sender fields.
- Permission tests for read deny and update action suppression.
- Adapter tests for pool-resolution args, channel reset, and send-complete reset.
- Notification-contract tests for success/failure return handling.

## 14. Build execution rules

- Scope is `/communications` and this slice’s constants/contracts only.
- No schema/RPC/RLS changes from BA17.
- Do not implement BA05a/BA06 Edge logic in this route slice.
- Stop and report on comms export/DB readiness gate regressions.

## 15. Done criteria

- Compose/filter/pool behaviours in §4 are demonstrable.
- §12 verification scenarios are completed with evidence for key states.
- §13 tests pass for adapter, validation, and permission contracts.
- System-notification prerequisites remain verified for dependent slices.

## 16. Do not

- Do not build custom editor/messaging UIs outside `CommComposer`.
- Do not query PUMP delivery tables directly from UI code.
- Do not call `sendSystemNotification` from browser route code.
- Do not implement template CRUD or sender-management UI here.
- Do not use retired `useCan` route gating.

## 17. References

- `docs/requirements/base/BASE-project-brief.md`
- `docs/requirements/base/BASE-architecture.md`
- `docs/requirements/base/BA00-app-shell-and-access-requirements.md`
- `docs/requirements/base/BA01-event-workspace-and-configuration-requirements.md`
- `docs/requirements/base/BA04-registration-setup-and-policy-requirements.md`
- `docs/requirements/base/BA05a-registration-entry-and-application-submission-requirements.md`
- `docs/requirements/base/BA06-applications-admin-and-review-requirements.md`
- `packages/core/docs/requirements/CR23-comms-platform.md`
- `docs/database/domains/base.md`

## 18. Implementing Agent Instructions

- Implement only BA17 route composition and constants owned by this slice.
- Re-check comms package/database readiness gates and stop on drift.
