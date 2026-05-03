# BA17 — Communications and System Notifications

## 1. Slice metadata

- Slice ID: BA17
- Name: Communications and System Notifications
- Status: Draft
- Depends on: BA01 (Event Workspace and Configuration), BA04 (Registration Setup and Policy — registration types feed the recipient-pool filter dropdown), BA05a.contract (Registration Entry and Application Submission — system notification call points SN-01..SN-04), BA06.contract (Applications Admin and Review — system notification call points SN-05 / SN-06), BA08.contract (Units and Group Coordination — `base_units` table contract feeds the unit filter dropdown; table verified present in dev-db 2026-05-01 per BA17 audit) _(BA00 shell is transitively required via BA01; not restated here, matching architecture's slice overview)_
- Backend impact: Read contract only (all pump_* schema, system_key rows, and `rbac_app_pages` prerequisites verified — see §8)
- Frontend impact: Both (UI for `/communications`; utility export for system notification call points in BA05a / BA06)
- Routes owned: `/communications`
- Safe for unattended execution: Backend-ready only
- Execution owner: BASE consuming app queue
- Execution lane: BASE overnight (after CR23 readiness gates clear)
- Backend-ready evidence required: All implementation gates in §8 confirmed PASSED before frontend execution begins (re-verify if regressions suspected)
- QA pack: `docs/delivery/test-packs/BA17-qa-pack.md`
- Seed data dependency: Recommended (BA18) for non-empty registration type and unit filter verification

---

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

### 5.1 Layout

The `/communications` page uses the BA00 app shell (header, nav sidebar, authenticated wrapper). The page content area is a single-column layout with the following top-to-bottom order:

1. **Page heading row** — `<h1>` "Communications", no subtitle.
2. **Filter bar** — a horizontal row of three `Select` (multi-select) components.
3. **CommComposer card** — full-width single-column compose form.
4. **RecipientPoolPreview** — rendered below the CommComposer card (CommComposer-internal; no separate page element required).

**Desktop:** single column, max-width constrained to the app shell's content width. CommComposer card occupies the full content width.

**Mobile (below 640 px / Tailwind `sm` breakpoint):** single column. Filter bar dropdowns stack vertically (one per row). CommComposer card is full width. Sticky footer is not used; the CommComposer footer scrolls with the content.

### 5.2 Components

#### Filter bar

Three `MultiSelect` components from `@solvera/pace-core/components`, arranged horizontally in a row (flex row, even spacing). Each `MultiSelect` allows multiple concurrent selections within its dimension; selecting zero values in a dimension applies no constraint for that dimension.

| Control | Label | Options source | Value format | Default |
|---|---|---|---|---|
| Registration type | "Registration type" | `base_registration_type` for selected event | `{ value: id, label: name }` | Empty (no filter) |
| Status | "Status" | Static list (see below) | `{ value: status_key, label: display_label }` | Empty (no filter) |
| Unit | "Unit" | `base_units` for selected event | `{ value: id, label: name }` | Empty (no filter) |

Status options (in order):

| Display label | Value |
|---|---|
| Submitted | `submitted` |
| Under review | `under_review` |
| Approved | `approved` |
| Rejected | `rejected` |
| Withdrawn | `withdrawn` |

A "Clear filters" link appears at the right end of the filter bar when any filter is active. On click, all three dropdowns are reset to empty.

When all three dropdowns are empty, no filter constraints are applied — the pool includes all event participants.

#### CommComposer (from `@solvera/pace-core/comms`)

`CommComposer` renders a single `<section>` containing the following elements in order:

**1. Alert banners (conditional, rendered at top of section)**

- Unresolved token banner: shown when `blockSendOnUnresolvedTokens={true}` and draft body or subject contains at least one unresolved token. Copy: "Resolve all tokens before sending."
- Read-only banner: shown when `rbac.canCompose = false`. Copy: "You have view-only access to this surface."
- Template validation banner: shown when the selected template has `require_merge_field_validation: true`. Copy: "All merge tokens must resolve for this template."

**2. Card (full width)**

*Card header:* "Compose communication"

*Card content (single column, stacked vertically from top):*

- **Channel selector:** A fieldset with two toggle buttons: "Email" and "SMS". The active channel is visually highlighted. Switching channel clears channel-specific draft fields (subject, body_html, sender_email cleared on switch to SMS; sender_phone cleared on switch to email).
- **Template selector:** A dropdown list of available templates filtered to the current channel. Placeholder: "Select a template (optional)". When no templates are available: "No templates available". Selecting a template pre-populates subject and body fields with the template's content.
- **Sender name input:** Label "Sender name". Required. Placeholder "e.g. PACE Events Team".
- *(Email channel only)* **Sender email input:** Label "From email". Required. Placeholder "noreply@org.example". **Subject input:** Label "Subject". Required. Placeholder "e.g. Important update for {{first_name}}".
- *(SMS channel only)* **Sender phone input:** Label "From phone". Required. Placeholder "+61400000000".
- **Field validation note:** `CommComposer` manages required-field validation internally. The "Send now" button is disabled until all required fields for the active channel are populated. Field-level error messages (empty required field, invalid email format, invalid phone format) are rendered by `CommComposer` — no custom error copy is required from the consuming page.
- **Preview / Edit toggle button:** Single button. Label "Preview" when in edit mode (clicking switches to preview). Label "Edit" when in preview mode (clicking switches to edit).
- *(Edit mode)* **Body editors:**
  - Email channel: HTML body `<textarea>` (label "Message body (HTML)") followed by plain text `<textarea>` (label "Message body (plain text)").
  - SMS channel: Plain text `<textarea>` only (label "Message body").
  - `MergeFieldToolbar` rendered below the body editors: a row of clickable chip buttons, one per available merge field (e.g. "First name — {{first_name}}"). Clicking a chip inserts `{{token}}` at the cursor position in the focused body textarea.
- *(Preview mode)* **MessagePreview component:** renders the draft body with merge tokens substituted using sample values.

*Card footer (bottom of card, stacked vertically):*

- If `rbac.canSend = false`: callout text "You do not have permission to send."
- If `rbac.canSend = true` (in order left to right):
  - "Send test" button (secondary variant) — sends draft to the signed-in user's email.
  - "Schedule" button (secondary variant) — disabled when `rbac.canSchedule = false`; when clicked opens a datetime picker popover.
  - "Cancel" button (tertiary variant) — rendered only if `onCancel` prop is provided.
  - "Send now" button (primary variant) — disabled when `blockSendOnUnresolvedTokens=true` and unresolved tokens are present.

**3. RecipientPoolPreview (below card, inside `<section>`)**

Rendered automatically by `CommComposer`. Shows:
- "Sending to N participants" (where N = `estimated_count` from `CommRecipientPreview`).
- Up to 5 sample recipient names as a comma-separated list.
- Warning callouts for each `CommPoolWarning` (e.g. "12 recipients have no email address — they will be skipped.").
- While pool is re-fetching: inline spinner replaces the count/sample names row.
- On resolve error: "Could not estimate recipient count. Try again." with a "Try again" link.

### 5.3 States

| State | Visual |
|---|---|
| Page loading | `LoadingSpinner` centred in main content area. No filter bar or CommComposer visible. |
| No event selected | Page heading visible. Filter bar and CommComposer not rendered. Body copy: "Select an event to compose a communication." |
| No permission | `AccessDenied` component fills main content area. |
| Read-only (canCompose=false) | CommComposer shown with all inputs disabled and read-only banner. Footer shows "You do not have permission to send." callout; no buttons. |
| Compose-only (canSend=false) | CommComposer fully editable. Footer shows callout "You do not have permission to send." No send buttons. |
| Full access | CommComposer fully editable. Footer shows all buttons. |
| Send in progress | "Send now" button shows loading indicator and is disabled. |
| Send success | Toast (success variant): "Message sent to N participants." Draft resets. Filters clear. If `suppression_skipped > 0`, second toast (default variant): "N recipients were suppressed and skipped." |
| Schedule in progress | "Schedule" button shows loading indicator and is disabled. |
| Schedule success | Toast (success variant): "Message scheduled for [formatted datetime]." Draft resets. |
| Send test in progress | "Send test" button shows loading indicator and is disabled. |
| Send test success | Toast (success variant): "Test email sent to your email address." |
| Error (send / schedule / test) | Toast (destructive variant) with `result.error.message` from the failed `ApiResult`. Draft not reset. |

### 5.4 Interactions

| Interaction | Behaviour |
|---|---|
| Filter dropdown change | Updates `EventParticipantsPool.filters`. Schedules a `RecipientPoolPreview` re-fetch (400 ms debounce). Filter bar and CommComposer remain interactive. |
| Clear filters link | Resets all three dropdowns to empty. Triggers pool preview re-fetch with no filters. |
| Channel toggle | Switches CommComposer channel. Clears channel-specific draft fields. Re-fetches templates and merge fields for new channel. |
| Template select | Pre-populates subject and body. Channel is constrained to template's channel. |
| Merge field chip click | Inserts `{{token}}` at cursor position in currently-focused body textarea. |
| Preview toggle click | Switches between edit and preview mode. No data fetch. |
| Send test click | Calls `adapter.sendTest()`. Button shows loading indicator. Toast on result. |
| Schedule click | Opens datetime picker popover (CommComposer-internal). On confirm: calls `adapter.schedule()`. Button shows loading indicator. Toast on result. |
| Send now click | Calls `adapter.send()`. Button shows loading indicator and disables. Toast on success (draft resets, filters clear) or failure (draft retained). |
| Event context change (via BA00 picker) | Draft resets. Filters clear. All adapter calls re-run with new event context. |

**Modal / popover: Schedule datetime picker**

- Trigger: "Schedule" button click.
- Contents: datetime input for selecting a future date and time.
- Primary action: "Confirm" — submits selected datetime.
- Secondary action: "Cancel" — dismisses popover without scheduling.
- Close behaviour: clicking outside or pressing Escape dismisses the popover.
- Focus management: focus moves to the datetime input on open; returns to "Schedule" button on close.

### 5.5 Permission-conditional rendering

| User state | `read` | `create` | `update` | Visible UI |
|---|---|---|---|---|
| No access | — | — | — | `AccessDenied` component only |
| Read-only viewer | ✅ | — | — | CommComposer rendered with all inputs disabled; read-only banner; no send buttons |
| Composer (no send) | ✅ | ✅ | — | CommComposer fully editable; footer shows "You do not have permission to send." callout only |
| Full operator | ✅ | ✅ | ✅ | Full compose surface; all footer buttons (Send test, Schedule, Send now) visible and enabled |

**Filter bar visibility:** The filter bar is rendered in all states where the page content area is visible (i.e., all states except No access and No event selected). The `MultiSelect` dropdowns are interactive regardless of `canCompose` or `canSend` — filtering the pool preview does not require compose or send permission.

---

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

### §9.1 Imports table

| Item | Type | Import path | Purpose |
|---|---|---|---|
| `CommComposer` | component | `@solvera/pace-core/comms` | Main compose UI |
| `useCommDraft` | hook | `@solvera/pace-core/comms` | External draft state management |
| `useCommSendAdapter` | hook | `@solvera/pace-core/comms` | Concrete CommSendAdapter implementation |
| `sendSystemNotification` | utility | `@solvera/pace-core/comms` | System notification dispatch (backend Edge Functions only) |
| `getUnresolvedTokens` | utility | `@solvera/pace-core/comms` | Identify unresolved merge tokens in draft content |
| `isEventParticipantsPool` | utility | `@solvera/pace-core/comms` | Type guard for EventParticipantsPool |
| `CommDraft` | type | `@solvera/pace-core/comms` | Draft state shape |
| `CommSendAdapter` | type | `@solvera/pace-core/comms` | Adapter interface |
| `CommSendRequest` | type | `@solvera/pace-core/comms` | Send request shape |
| `CommSendTestRequest` | type | `@solvera/pace-core/comms` | Test send request shape |
| `CommScheduleRequest` | type | `@solvera/pace-core/comms` | Schedule request shape |
| `CommSendResult` | type | `@solvera/pace-core/comms` | Send result shape |
| `CommScheduleResult` | type | `@solvera/pace-core/comms` | Schedule result shape |
| `CommRbacContext` | type | `@solvera/pace-core/comms` | RBAC context for CommComposer |
| `CommTemplate` | type | `@solvera/pace-core/comms` | Template record shape |
| `CommMergeField` | type | `@solvera/pace-core/comms` | Merge field record shape |
| `CommRecipientPreview` | type | `@solvera/pace-core/comms` | Pool preview result |
| `EventParticipantsPool` | type | `@solvera/pace-core/comms` | Pool descriptor type |
| `EventParticipantsPoolFilters` | type | `@solvera/pace-core/comms` | Pool filters (status values pending Q-3 PR) |
| `RecipientPoolDescriptor` | type | `@solvera/pace-core/comms` | Union of pool descriptor types |
| `SystemNotificationRequest` | type | `@solvera/pace-core/comms` | System notification request shape |
| `SystemNotificationRecipientDescriptor` | type | `@solvera/pace-core/comms` | Recipient descriptor union |
| `PagePermissionGuard` | component | `@solvera/pace-core/rbac` | Page-level RBAC guard |
| `AccessDenied` | component | `@solvera/pace-core/rbac` | Permission-denied fallback component |
| `useResourcePermissions` | hook | `@solvera/pace-core/rbac` | Derive per-operation permission booleans |
| `toPagePermission` | utility | `@solvera/pace-core/rbac` | Compose a `'op:page.name'` permission string (used internally by guards; not called directly in BA17) |
| `LoadingSpinner` | component | `@solvera/pace-core/components` | Full-page loading indicator |
| `MultiSelect` | component | `@solvera/pace-core/components` | Multi-select dropdown for filter bar |
| `MultiSelectOption` | type | `@solvera/pace-core/components` | Option shape for MultiSelect |
| `toast` | function | `@solvera/pace-core/components` | Dispatch toast notifications (requires ToastProvider in tree) |
| `ToastPropsOptions` | type | `@solvera/pace-core/components` | Props shape for `toast()` |
| `useEvents` | hook | `@solvera/pace-core/hooks` | Active event context |
| `useSecureSupabase` | hook | `@solvera/pace-core/rbac` | Authenticated Supabase client for filter data reads |
| `ApiResult` | type | `@solvera/pace-core/types` | Discriminated union for API call outcomes |
| `ApiError` | type | `@solvera/pace-core/types` | Error shape within `ApiResult` |

### §9.2 Usage details

#### CommComposer

**Export name:** `CommComposer`

**Props (`CommComposerProps`):**

| Prop | Type | Required | Notes |
|---|---|---|---|
| `adapter` | `CommSendAdapter` | Yes | Pass the object returned by `useCommSendAdapter(...)` |
| `organisationId` | `string` | Yes | Active organisation UUID |
| `sourceApp` | `string` | Yes | Pass `'base'` |
| `recipientPool` | `RecipientPoolDescriptor` | Yes | `EventParticipantsPool` descriptor constructed by the page from filter state |
| `rbac` | `CommRbacContext` | Yes | Derived from `useResourcePermissions('communications')` per BR-14 |
| `draft` | `CommDraft` | Yes | Controlled value from `useCommDraft` |
| `onDraftChange` | `(draft: CommDraft) => void` | Yes | Pass `updateDraft` or `setDraft` from `useCommDraft` |
| `blockSendOnUnresolvedTokens` | `boolean` | No | Default `false`. BASE **must** pass `true`. |
| `onCancel` | `() => void` | No | If provided, renders a "Cancel" button in the card footer |
| `onSendComplete` | `(result: CommSendResult) => void` | No | Called after successful send — use to reset draft and clear filters |
| `onSendError` | `(message: string) => void` | No | Called on send failure — use to show toast |
| `onScheduleComplete` | `(messageId: string) => void` | No | Called after successful schedule |
| `templates` | `CommTemplate[]` | No | Pre-loaded templates; if omitted CommComposer loads via `adapter.loadTemplates` internally |
| `mergeFields` | `CommMergeField[]` | No | Pre-loaded merge fields; if omitted CommComposer loads via `adapter.loadMergeFields` internally |
| `recipientPreview` | `CommRecipientPreview \| null` | No | Pre-resolved pool preview; if omitted CommComposer resolves via `adapter.resolvePool` internally |

**Actual rendered layout (single-column):**

CommComposer renders a `<section>`. Within it, in order:
1. Up to 3 conditional alert banners (unresolved tokens, read-only mode, template validation).
2. A `Card` with header "Compose communication", single-column card content (channel selector → template selector → sender fields → body editors + `MergeFieldToolbar` or `MessagePreview`), and a card footer with action buttons.
3. `RecipientPoolPreview` (below the card, always rendered).

For full structural detail see §5.2.

**Non-obvious behaviour:**
- `CommComposer` manages its own internal state for template selection, preview/edit mode, and pool re-fetch debouncing. The consuming page manages only `CommDraft` state and the pool descriptor.
- `onSendComplete` fires after the adapter call resolves successfully and CommComposer has reset its internal template selection. The page should reset `useCommDraft` and clear filter state in this callback.
- When `recipientPool` prop changes (e.g. filter update), CommComposer automatically calls `adapter.resolvePool` internally if `recipientPreview` prop is not provided.

---

#### useCommDraft

**Export name:** `useCommDraft`

**Signature:** `useCommDraft(initialDraft: CommDraft): CommDraftHookResult`

**Arguments:**
- `initialDraft`: The starting draft value. Pass `{ channel: 'email' }` for the BA17 page initial state.

**Return shape:**

| Field | Type | Notes |
|---|---|---|
| `draft` | `CommDraft` | Current draft state |
| `setDraft` | `(draft: CommDraft) => void` | Replace the entire draft |
| `updateDraft` | `(patch: Partial<CommDraft>) => void` | Patch specific draft fields |
| `setChannel` | `(channel: CommChannel) => void` | Switch channel and clear channel-specific fields |
| `resetDraft` | `() => void` | Reset to the `initialDraft` value |
| `commitDraft` | `(nextDraft?: CommDraft) => void` | Set a new baseline (resets `isDirty` to false) |
| `isDirty` | `boolean` | True when draft differs from the current baseline |

**Non-obvious behaviour:**
- `setChannel` clears channel-specific fields: switching email → SMS clears `subject`, `body_html`, `sender_email`, `reply_to`; switching SMS → email clears `sender_phone`.
- `commitDraft()` sets the current draft as the new baseline. Call this after a successful send to prevent false `isDirty` signals.
- Pass `updateDraft` (not `setDraft`) as `onDraftChange` to `CommComposer` — this preserves fields that CommComposer does not manage (e.g. `extra_merge_context`).

---

#### useCommSendAdapter

**Export name:** `useCommSendAdapter`

**Import path:** `@solvera/pace-core/comms`

**Signature:**
```typescript
useCommSendAdapter(options: {
  organisationId: string;
  sourceApp: string;
  sourceContextType?: string;
  sourceContextId?: string;
}): CommSendAdapter
```

**Arguments:**
- `organisationId`: Active organisation UUID.
- `sourceApp`: Pass `'base'`.
- `sourceContextType`: Pass `'event'` for `/communications`.
- `sourceContextId`: Pass `eventId`.

**Return shape:** A stable `CommSendAdapter` object with all 7 methods wired to PUMP Edge Functions via `useSecureSupabase()`. The `saveDraft` method stores draft state in-memory (no PUMP call).

**Non-obvious behaviour:**
- The returned adapter object is referentially stable across renders (memoised). Safe to pass as a prop to `CommComposer` without triggering unnecessary re-renders.
- All adapter methods use the authenticated Supabase client from `useSecureSupabase()` internally. No credentials need to be passed by the consumer.
- If called outside an authenticated context, adapter methods return `ApiResult.error` with an authentication error — they do not throw.

---

#### useResourcePermissions (for CommRbacContext derivation)

**Export name:** `useResourcePermissions`

**Import path:** `@solvera/pace-core/rbac`

**Signature:**
```typescript
useResourcePermissions(
  resource: string,
  operations?: readonly Operation[] | null,
  scopeOverride?: Scope | null
): ResourcePermissionsResult
```

**Usage in BA17:**
```typescript
const { canRead, canCreate, canUpdate, isLoading } = useResourcePermissions(
  'communications',
  ['read', 'create', 'update'],
  { organisationId, eventId, appId }
);

const rbac: CommRbacContext = {
  canCompose: canCreate,
  canSend: canUpdate,
  canSchedule: canUpdate,
  scopeType: 'event',
  scopeId: eventId,
};
```

**Return shape (relevant fields):**

| Field | Type | Notes |
|---|---|---|
| `canRead` | `boolean` | True when `read:page.communications` is granted |
| `canCreate` | `boolean` | True when `create:page.communications` is granted |
| `canUpdate` | `boolean` | True when `update:page.communications` is granted |
| `isLoading` | `boolean` | True while permission resolution is in flight |

**Non-obvious behaviour:**
- Returns `{ canRead: false, canCreate: false, canUpdate: false }` while loading (before the check resolves). Guard must handle this gracefully (show spinner, not AccessDenied).
- Also returns `canDelete`, `canExport`, `resilienceStatus`, `resilienceErrors`, `sourceOutcomes` — only `canRead`, `canCreate`, `canUpdate`, and `isLoading` are used by BA17.

---

#### PagePermissionGuard

**Export name:** `PagePermissionGuard`

**Import path:** `@solvera/pace-core/rbac`

**Props:**

| Prop | Type | Required | Notes |
|---|---|---|---|
| `pageName` | `string` | Yes | Pass `'communications'` — resolved directly by `toPagePermission` internally; no constant import required |
| `operation` | `'read' \| 'create' \| 'update' \| 'delete'` | Yes | Pass `'read'` for page-level access guard |
| `scope` | `{ organisationId?: string; eventId?: string; appId?: string }` | No | Pass full scope object including `eventId`; guard evaluates against org scope if `eventId` is absent |
| `fallback` | `ReactNode` | No | Rendered when access is denied; defaults to `<AccessDenied />` |
| `children` | `ReactNode` | Yes | Rendered when access is granted |
| `loading` | `ReactNode` | No | Rendered while permission is loading; if omitted the guard renders `null` during loading |
| `strictMode` | `boolean` | No | Default `false`. If `true`, renders fallback (not null) during loading. Do not use `strictMode` for the BA17 page guard. |

**Usage in BA17:**
```tsx
<PagePermissionGuard
  pageName="communications"
  operation="read"
  scope={{ organisationId, eventId, appId }}
  fallback={<AccessDenied />}
  loading={<LoadingSpinner />}
>
  {/* compose surface */}
</PagePermissionGuard>
```

---

#### sendSystemNotification

**Export name:** `sendSystemNotification`

**Import path:** `@solvera/pace-core/comms`

**Signature:**
```typescript
sendSystemNotification(
  adapter: Pick<CommSendAdapter, 'send'>,
  request: SystemNotificationRequest
): Promise<ApiResult<CommSendResult>>
```

**Arguments:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `adapter` | `Pick<CommSendAdapter, 'send'>` | Yes | Pass the full `CommSendAdapter` from `useCommSendAdapter` — `Pick` means any object with a `send` method is accepted |
| `request.systemKey` | `string` | Yes | One of `BASE_SYSTEM_KEYS` values (e.g. `BASE_SYSTEM_KEYS.APPLICATION_APPROVED`) |
| `request.recipient` | `SystemNotificationRecipientDescriptor` | Yes | `{ type: 'canonical_parent_contact', member_id }` or `{ type: 'member_context', member_id }` |
| `request.organisationId` | `string` | Yes | Organisation UUID |
| `request.sourceApp` | `string` | Yes | Pass `'base'` |
| `request.sourceContextType` | `string` | No | Pass `'event'` |
| `request.sourceContextId` | `string` | No | Pass `eventId` |
| `request.extraMergeContext` | `Record<string, string>` | No | Additional merge data if the system template uses custom tokens |

**Non-obvious behaviour:**
- Internally sets `bypass_suppression: true` — this is hardcoded and cannot be overridden by the caller.
- Calls `adapter.send()` internally. The caller receives the `ApiResult<CommSendResult>` from that call.
- Must only be called from server-side Edge Function code. Must not be called from React components or browser-executed code.

---

#### toast (function)

**Export name:** `toast`

**Import path:** `@solvera/pace-core/components`

**Signature:** `toast(props: ToastPropsOptions): string`

**`ToastPropsOptions` fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | `string` | No | Primary message line |
| `description` | `string` | No | Secondary line below title |
| `variant` | `'default' \| 'success' \| 'destructive'` | No | Default: `'default'`. Use `'success'` for send/schedule/test success; `'destructive'` for errors. |
| `action` | `ToastActionProps` | No | Optional action button inside the toast |
| `duration` | `number` | No | Auto-dismiss delay in ms. Default: 5 000. |

**Usage in BA17 callbacks:**
```typescript
// Send success (in onSendComplete)
toast({ title: `Message sent to ${result.total_recipients} participants.`, variant: 'success' });

// Error (in onSendError, using result.error.message upstream)
toast({ description: message, variant: 'destructive' });
```

**Non-obvious behaviour:**
- `toast()` throws if called outside a `ToastProvider` tree. `ToastProvider` must be mounted by the BA00 app shell.
- Returns a toast ID string that can be passed to `dismiss(id)` for programmatic dismissal (not required for BA17).
- Toasts auto-dismiss after `duration` ms (default 5 s). Duration `0` prevents auto-dismiss.

---

#### ApiResult / ApiError

**Export names:** `ApiResult` (type), `ApiError` (type)

**Import path:** `@solvera/pace-core/types`

**Shape:**
```typescript
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
type ApiError   = { code: string; message: string; details?: object };
```

**Usage in BA17:** Every adapter method (`adapter.send`, `adapter.schedule`, `adapter.sendTest`, `adapter.resolvePool`, `adapter.loadTemplates`, `adapter.loadMergeFields`) returns `ApiResult<T>`. Pattern:
```typescript
const result = await adapter.send(request);
if (!result.ok) {
  toast({ description: result.error.message, variant: 'destructive' });
  return;
}
// result.data is CommSendResult
```

**Non-obvious behaviour:**
- The `ok` discriminant must be checked before accessing `result.data` or `result.error`. TypeScript will enforce this if types are correctly imported.
- `result.error.message` is always a human-readable string suitable for display. `result.error.code` is a machine-readable error code for logging.
- Never cast `result` to bypass the discriminant check.

---

#### MultiSelect

**Export name:** `MultiSelect`

**Import path:** `@solvera/pace-core/components`

**Props (`MultiSelectProps`):**

| Prop | Type | Required | Notes |
|---|---|---|---|
| `value` | `string[]` | No | Controlled selected values |
| `defaultValue` | `string[]` | No | Uncontrolled initial selection |
| `onValueChange` | `(values: string[]) => void` | No | Fires when selection changes after user commits toggles in the dropdown |
| `options` | `MultiSelectOption[]` | Yes | Each option: `{ value: string; label: string; disabled?: boolean }` |
| `placeholder` | `string` | No | Shown in trigger when no values selected |
| `disabled` | `boolean` | No | Disables the entire control |
| `clearable` | `boolean` | No | When true, trigger shows a clear affordance to remove all selections |
| `positionMode` | `'auto' \| 'absolute' \| 'fixed'` | No | Passed through to internal listbox positioning (matches `Select` behaviour) |
| `className` | `string` | No | Optional wrapper class on the root |

**Usage in BA17:** Three instances — registration type filter, status filter, unit filter — each bound to local state arrays mapped to `EventParticipantsPool.filters` per BR-02 and SA-01.

**Non-obvious behaviour:**
- Checkbox rows inside the dropdown toggle membership in `value`; closing the popover commits the current set.
- BA17 applies a 400 ms debounce on pool re-fetch after filter changes (SA-01); debounce is page-level, not inside `MultiSelect`.

---

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

**Scenario 1 — Full send flow**
1. Log in as an event admin for an event with at least 3 participants in "approved" status.
2. Navigate to `/communications`.
3. Confirm the filter bar, CommComposer card, and RecipientPoolPreview all render.
4. Set Status filter to "Approved". Confirm pool preview count updates.
5. Select channel "Email". Enter sender name, sender email, subject, and body. Use the merge field toolbar to insert `{{first_name}}`.
6. Confirm "Send now" is disabled (unresolved token). Navigate merge fields to verify `{{first_name}}` is in the list.
7. Click "Send now". Confirm toast "Message sent to N participants." Confirm draft resets.

**Scenario 2 — Schedule flow**
1. Log in as event admin.
2. Navigate to `/communications`. Complete a valid draft.
3. Click "Schedule". Confirm datetime picker appears.
4. Select a future datetime and confirm.
5. Confirm toast "Message scheduled for [datetime]."

**Scenario 3 — Send test**
1. Log in as event admin.
2. Navigate to `/communications`. Enter sender name, email, subject, and body.
3. Click "Send test". Confirm toast "Test email sent to your email address."

**Scenario 4 — Permission denied**
1. Log in as a user without `read:page.communications`.
2. Navigate to `/communications`.
3. Confirm `AccessDenied` component renders. No compose surface visible.

**Scenario 5 — System notification (manual verification via logs)**
1. Trigger a guardian check issuance in BA05a for an application with a known parent contact.
2. Confirm via `pump_message` and `pump_message_recipient` dev-db tables that a `base.guardian_request_issued` row was created and the recipient was resolved.

**MCP verification:**
```sql
-- Verify system keys are present and active
SELECT system_key, is_active FROM pump_system_templates
WHERE system_key LIKE 'base.%' ORDER BY system_key;
-- Expected: 6 rows, all is_active = true

-- Verify communications page is registered for BASE
SELECT page_name, scope_type FROM rbac_app_pages
WHERE app_id = '25aaa04e-b230-4132-9984-f27ded97f861'
AND page_name = 'communications';
-- Expected: 1 row, scope_type = 'event'
```

---

## 13. Testing requirements

**Minimum automated coverage:**

- Happy path: render `/communications` with mocked adapter returning templates and merge fields; verify CommComposer renders, filter bar shows three dropdowns, pool preview shows estimated count.
- Validation failure: draft with unresolved token; assert "Send now" button is disabled and alert banner is visible.
- Auth / permission failure: render with `canRead = false`; assert `AccessDenied` is rendered and compose surface is not mounted.

**Additional coverage:**

- Filter change triggers `adapter.resolvePool` with updated filter values.
- Channel switch clears draft channel-specific fields.
- `onSendComplete` is called after successful send; draft resets.
- `sendSystemNotification` called with correct system_key and recipient type returns `ApiResult.ok = true` when adapter mock succeeds.
- `sendSystemNotification` failure does not throw; returns `ApiResult.ok = false`.
- Empty event context renders no-event empty state.

**Required quality gates:** `lint`, `type-check`, `tests`, `validate`

---

## 14. Build execution rules

- No schema, RPC, or RLS contract changes are permitted by this slice. If the build agent discovers a missing schema object, stop and flag — do not create migrations.
- This slice owns only the `/communications` route. Do not touch routes owned by other slices.
- Do not implement BA05a or BA06 Edge Functions in this slice. BA17's system notification responsibility is limited to: defining `BASE_SYSTEM_KEYS` constants, documenting the `sendSystemNotification()` call contract, and verifying the system keys are present.
- Do not implement `CommSendAdapter` locally. Use `useCommSendAdapter` from `@solvera/pace-core/comms`.
- Do not use `useCan` — it is retired. Use `PagePermissionGuard` and `useResourcePermissions` exclusively.
- All §8 implementation gates are ✅ PASSED as of 2026-05-01. If a gate regresses (missing export, missing DB row), stop and flag — do not implement workarounds or stubs.
- Stop on blockers: missing RBAC permissions, missing pace-core2 exports, failing validation. Do not substitute stubs.
- Respect backend freeze: pump_* tables and their RLS policies are owned by PUMP — do not alter them.

---

## 15. Done criteria

A slice is Done only when:

- All acceptance criteria (AC-01 through AC-18) pass and are verified (not pre-ticked).
- All Functional Specification items (PE-01 through SN-08) are implemented and demonstrable.
- All quality gates pass (`lint`, `type-check`, `tests`, `validate`).
- Manual QA pack run with evidence captured.
- Visual evidence (screenshots) covers: full compose surface (no filters), filtered pool (status = approved), AccessDenied state, read-only mode (canSend=false), loading state, send success toast, empty state (no event), pool estimate zero.
- Build queue row updated with `execution_status` and `evidence`.

---

## 16. Do not

- Do not add behaviour not present in this document.
- Do not expand scope outside the `/communications` route.
- Do not implement BA05a or BA06 Edge Functions in this slice.
- Do not implement a custom email editor, rich-text component, or bespoke messaging tool — use `CommComposer` exclusively.
- Do not query `pump_message`, `pump_message_recipient`, `pump_delivery_event`, or `pump_suppression` directly from the UI — these tables are written by PUMP Edge Functions only.
- Do not call `sendSystemNotification()` from React components or page-level browser code — it is a backend Edge Function call only.
- Do not implement template CRUD — BASE consumes `pump_organisation_templates` read-only.
- Do not implement sender identity management, gateway configuration, or suppression management UI.
- Do not use `useCan` — it is retired.
- Do not substitute stubs if any §8 implementation gate regresses — stop and flag instead.
- Do not pre-tick acceptance criteria.
- Do not introduce undocumented exports, props, or routes.

---

## 17. References

- `/rebuild/slices/BASE-project-brief.md`
- `/rebuild/slices/BASE-architecture.md` — §BA17 row in slice overview table; route ownership registry `/communications`; execution lane (BASE overnight, after CR23 readiness)
- BA00 — App Shell and Access (provides authenticated shell, navigation, event context)
- BA01 — Event Workspace and Configuration (owns `/event-dashboard` nav card linking to `/communications`)
- BA04 — Registration Setup and Policy (owns `base_registration_type` — filter data source)
- BA05a — Registration Entry and Application Submission (system notification call points: guardian + referee)
- BA06 — Applications Admin and Review (system notification call points: application approved/rejected)
- BA08 — Units and Group Coordination (owns `base_units` — filter data source)
- `pace-core2/packages/core/docs/requirements/CR23-comms-platform.md` — canonical comms architecture authority
- `docs/database/domains/base.md` — BASE domain schema reference
- `rebuild/_authoring/parity-audit/BA17.md` — Phase 1 parity audit with full resolution log

---

## 18. Implementing Agent Instructions

**Implementation scope**

Your scope is the `/communications` route and the `BASE_SYSTEM_KEYS` constants export. Do not absorb scope from adjacent slices. Do not touch BA05a, BA06, or any PUMP-owned code.

**Sources of truth**

This document is the only source of functional and visual truth for this slice. The architecture document and project brief govern cross-cutting decisions. pace-core2 standards govern shared patterns. Do not consult any legacy code. If something appears to be missing from this document, that is a documentation defect to report — not an excuse to infer from legacy code or make assumptions.

**Pre-implementation gate check**

Before writing any code, re-verify §8 gates have not regressed (spot-check against dev-db MCP queries and pace-core2 package exports):

1. `BA17.template.system_keys.base_v1` — 6 active `base.*` rows in `pump_system_templates`.
2. `BA17.RBAC.communications_page` — `communications` row in `rbac_app_pages` for BASE app (`scope_type` = `event`).
3. `BA17.adapter.useCommSendAdapter` — `useCommSendAdapter` exported from `@solvera/pace-core/comms`.
4. `BA17.pool.status_alignment` — `EventParticipantsPoolFilters.status` accepts BASE vocabulary in pace-core2 `comms/types.ts`.
5. `BA17.component.MultiSelect` — `MultiSelect` exported from `@solvera/pace-core/components`.

If any check fails, **stop and flag** — do not proceed with stubs or workarounds.

**Quality gates before marking Done**

- [ ] All Functional Specification items implemented and functional.
- [ ] All acceptance criteria verified (not pre-ticked).
- [ ] `lint`, `type-check`, `tests`, `validate` all pass.
- [ ] Visual evidence captured for all required states (see §15).
- [ ] QA pack scenarios run with evidence captured.
- [ ] Build queue row updated with `execution_status` and `evidence`.

---

## 19. Self-containment audit

The author confirms the following (run literally — not interpretively — using grep/search for keyword checks):

- [x] No legacy file paths anywhere in this document.
- [x] No legacy hook, component, utility, service, or route names anywhere in this document.
- [x] No language of the form "preserve / retain / keep / as today / the existing / the original" — verified by literal search. Zero matches outside this checklist.
- [x] "The current X" usages reviewed: all occurrences are runtime-state references (the current user, the current event, the current channel, the currently-selected template, the currently-focused textarea, the current filters). No legacy-capability references found.
- [x] Every property of the new app is stated as a positive declaration, not as a delta against an unstated baseline.
- [x] Every business rule referenced in §4 and §5 is defined explicitly in §6.
- [x] Cross-slice references (BA05a, BA06, BA01, BA04, BA08) are about contracts (route handoff, data shape, exported constants) — not about behaviour delegation.
- [x] A UI designer with no other context can mock up the `/communications` surface from §5 alone. §5 restates all repeated element details inline (filter bar controls, CommComposer card structure, footer buttons, permission table).
- [x] A QA tester with no code access can verify all 18 acceptance criteria.
- [x] Every non-trivial pace-core2 item in §9.1 has full prop/argument/return-shape detail in §9.2 (`CommComposer`, `useCommDraft`, `useCommSendAdapter`, `useResourcePermissions`, `PagePermissionGuard`, `sendSystemNotification`, `toast`, `ApiResult`/`ApiError`, `MultiSelect`). Primitive items (`LoadingSpinner`, `AccessDenied`, type-only imports except `MultiSelectOption` paired with `MultiSelect`) are table-only.
- [x] No "equivalent to X" or "similar to legacy Y" hedging language anywhere in this document. Every behaviour is named with an actual pace-core2 export and documented, or defined as an explicit business rule in §6.
- [x] §3 specifies evaluation order for the page guard + no-event state: guard fires first (before event context check); scope object fields documented for absent eventId; guard behaviour during loading documented.
- [x] §5 ↔ §16 cross-consistency checked: no feature described in §5 is prohibited by any "Do not" rule in §16. CommComposer is allowed; `sendSystemNotification` from React is correctly prohibited in §16 and not described in §5 as a UI action.
- [x] §6 → §9 propagation: `getUnresolvedTokens` (cited in BR-01), `EventParticipantsPool` / `EventParticipantsPoolFilters` (cited in BR-02, BR-10), `CommRbacContext` (cited in BR-14), `SystemNotificationRequest` (cited in BR-06, BR-07, BR-08), `ApiResult`/`ApiError` (cited in BR-05 and throughout §7) all appear in §9.1.
- [x] Cross-section consistency sweep after final gate clearance (2026-05-01): all §8 gates ✅ PASSED; `MultiSelect` and `rbac_app_pages` `communications` row verified against pace-core2 source and dev-db; §14 / §18 / §20 updated for regression-check wording; §9.2 `MultiSelect` props aligned to shipped component.
- [x] Visual rendering verified against pace-core2 source: CommComposer is documented as single-column per the actual `components.tsx` source (not the CR23 two-column spec). This matches the source observation recorded in the parity audit.

---

## 20. Open questions

No open questions. All Phase 1 questions resolved before Phase 2 commenced. All §8 implementation gates ✅ PASSED as of 2026-05-01 (final verification: dev-db `communications` `rbac_app_pages` row; pace-core2 `MultiSelect` export).
