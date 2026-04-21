# BASE Architecture

BASE is the event operations module within PACE. This document defines the architectural foundation and bounded contexts for the rebuilt app.

## Filename convention

BASE architecture docs in this requirement family use:

**`BA00-base-architecture.md`**

| Segment | Meaning |
|--------|---------|
| `BA` | BASE app shorthand. |
| `00` | Foundation slot shared with project brief and slice family. |
| `base` | App slug. |
| `architecture` | Fixed suffix for this document type. |

## Document Framing

- `Current legacy baseline` sections describe observed behaviour in the existing app only.
- `Rebuild target` sections describe the intended architecture and are authoritative for implementation planning.
- Known exclusions are defined in [`BA00-base-project-brief.md`](./BA00-base-project-brief.md) and must not be silently reintroduced through architecture prose.
- Known redesign areas are intentional and should be treated as architectural direction, not optional polish.

### Conflict-resolution rules

- Requirement slices are authoritative for slice-local acceptance and workflow contracts.
- This architecture is authoritative for route ownership, implementation order, and cross-slice boundaries.
- Database contract disputes are resolved using the database authority references called out in the owning slice plus the active backend-delta backlog.
- If any of the three sources disagree and no tie-break rule applies, execution pauses and the owning slice must be updated before coding proceeds.

## Design principles

- Prefer explicit contracts over legacy inference.
- Push privileged or stateful workflow transitions into backend contracts, not ad hoc client writes.
- Treat routing, permissions, and data scope as first-class design boundaries.
- Use `pace-core2` scoped entrypoints and branded IDs instead of legacy convenience imports and raw string propagation.
- Keep slices small, independently verifiable, and dependency-aware.

## Architectural boundaries

- App-owned frontend surfaces: BASE admin/operator surfaces in the shared shell (`/`, `/event-dashboard`, `/configuration`, `/forms`, `/form-builder`, `/registration-types`, `/applications`, `/units`, `/unit-preferences`, `/activities`, `/activities/:offeringId`, `/activities/bookings`, `/scanning`, `/scanning/tracking`, `/reports`) plus dedicated runtime `/scanning/:scanPointId`.
- Shared pace-core surfaces: `@solvera/pace-core/*` entrypoints for shell/layout primitives, auth/session providers, RBAC guards, secure data hooks, form primitives, utility/resilience services, and branded ID types.
- Backend-owned contracts: registration and approval lifecycle contracts, application creation and state transitions, token lifecycle, scan ingest and sync semantics, reporting field/explore contracts, and schema/RLS enforcement.
- Cross-slice handoff areas: BA02->BA03/BA05a forms contracts, BA04->BA05a/BA06/BA07 registration policy to submission/review/token flows, BA09->BA10/BA11 offering setup to booking and oversight, BA12->BA13->BA14->BA16 scanning setup/runtime/sync/tracking.
- Explicit non-ownership areas: participant-facing BASE journeys (BA05a, BA05b, BA10 UI) and token approval UI route ownership live in pace-portal; TEAM retains card lifecycle and logged-in approval-queue ownership.

## Backend readiness expectations

- Required schema contracts: validated BASE workflow structures across `core_events`, forms runtime tables, registration/application/check tables, consent, units/preferences, activity offering/session/booking, scan point/event, and reporting metadata/template tables.
- Required RPC contracts: backend-owned workflows such as `app_base_application_create(...)`, `event_applicant_org_allowed(...)`, token approval submit/resolve RPCs, and scanning ingest/sync/reissue contracts where slice docs define RPC ownership.
- Required RLS expectations: role-scoped read/write boundaries for organiser/admin/operator/member actors, explicit denied states for unauthorized access, and no privileged client-side bypass of protected mutations.
- Blocking conditions for frontend execution: unresolved schema deltas against approved slice contracts, missing/unstable backend-owned workflow contracts, unresolved RLS policy gaps, and upstream shared-foundation blockers (`CR21` forms runtime and `CR22` reporting foundations) where applicable.

## Architectural decisions

- AD-001: Single participant-facing app boundary (pace-portal) — Participant journeys for BASE workflows are delivered in pace-portal to avoid duplicate member shells; consequence: BASE slices keep workflow/contracts authority while route/UI ownership remains outside BASE origin.
- AD-002: Single authenticated BASE organiser/operator shell — Admin and operator routes share one shell contract, with `/login` and scanner runtime boundary exceptions; consequence: route ownership and nav derivation are centralized in this document.
- AD-003: Backend-owned privileged workflow transitions — Application state, approval activation, token lifecycle, and sync-sensitive operations are backend-owned contracts; consequence: direct privileged client writes are architectural violations.
- AD-004: Shared foundation first (`@solvera/pace-core`) — Consuming app code must reuse shared components/hooks/services before local equivalents; consequence: missing capability becomes explicit shared-foundation backlog, not silent local divergence.
- AD-005: Slice-based contract handoffs as execution model — Dependencies and route ownership are enforced by the implementation plan and slice mapping; consequence: downstream slices cannot redefine upstream contracts ad hoc.

## Cross-cutting contracts

### Member-facing UI vs organiser/operator UI (pace-portal boundary)

- **pace-portal** is the **single member-facing web app** for authenticated self-service: profile, medical, contacts, delegated/proxy editing, **and** participant journeys that touch BASE workflows (registration/application forms, application status, activity booking, and other future TEAM/MEDI participant surfaces). This avoids shipping parallel participant SPAs in BASE, TEAM, and every other module.
- **BASE** owns **event operations**: organiser configuration, form authoring integration, registration policy, application review, units, activity setup, booking oversight, scanning setup/runtime (operator/kiosk), and reporting. BASE implements **admin/operator UI** only in the BASE app shell, plus **backend/RPC contracts** that portal (and other consumers) call.
- **Consent ownership is intentionally distributed**: this architecture keeps consent as its own bounded context, while implementation remains distributed across registration and booking slices (`BA05a`, `BA10`) with no standalone BA consent slice in this wave.
- **Participant-facing pages are not implemented in the BASE frontend repo.** BASE slices **BA05a**, **BA05b**, and **BA10** remain authoritative for **workflow semantics, data contracts, acceptance criteria, and verification**; **UI route ownership and implementation** live in **pace-portal** (see [`PR00-portal-architecture.md`](../portal/PR00-portal-architecture.md) — *Cross-app: BASE workflow UI*). Canonical URLs for those journeys are portal routes (not `/events/:eventCode/...` on the BASE origin).
- **Exceptions (non–day-to-day member shell):**
  - **Token approval (slice BA07)** — **pace-portal** route **`/approvals/:token`** per [`PR20-token-approval-host.md`](../portal/PR20-token-approval-host.md). **BA07** remains authoritative for **workflow + backend/RPC contracts**; UI is **not** a `@solvera/pace-core` shared page. **No BASE-origin route** for token approval in this rebuild wave.
  - **Scanning** (**BA12–BA14**, **BA16**) and **`/scanning/:scanPointId`** are **operator/kiosk** surfaces; they stay **BASE** (or dedicated hardware clients), not portal.

### Shared shell and surface boundaries

- Authenticated BASE admin/operator routes use one shared shell contract for `/`, `/event-dashboard`, `/configuration`, `/forms`, `/form-builder`, `/registration-types`, `/applications`, `/units`, `/unit-preferences`, `/activities`, `/activities/:offeringId`, `/activities/bookings`, `/scanning`, `/scanning/tracking`, and `/reports`.
- Standalone routes on the **BASE** app (outside the authenticated admin shell) are **`/login`** only. **Participant registration, application progress, activity booking, and token approval UIs are not BASE routes—they are pace-portal routes** (token approval: PR20).
- `/scanning/:scanPointId` is a dedicated operator surface and must not inherit the authenticated admin shell.
- Navigation and route ownership derive from the implementation plan in this document, not from page-local constants or a separate registry file.

### pace-core2 compliance

- **Naming:** the workspace/repo is colloquially **pace-core2**; the installable package is **`@solvera/pace-core`** (not yet published — will ship with the correct name). Local path authority remains `packages/core` in this monorepo until the shared package location is finalised.
- Prefer scoped `@solvera/pace-core/*` entrypoints such as `/components`, `/providers`, `/hooks`, `/rbac`, `/types`, `/events`, `/services`, `/crud`, `/utils`, `/location`, `/resilience`, `/theming`, and `/icons`.
- Use branded IDs at app-service and domain boundaries instead of propagating raw strings.
- Treat root-barrel imports as minimal bootstrap-only usage, not convenience defaults.
- Do not assume legacy helpers such as `createBaseClient` still exist.
- Do not preserve privileged client-side writes, legacy RPC coupling, or legacy published-package assumptions without confirming current `pace-core2` support.

### Consuming-app implementation mandate

- For all BASE rebuild slices, consuming apps must implement UI, hooks, and shared workflow plumbing by **reusing `@solvera/pace-core` surfaces first** and not by rebuilding equivalent local abstractions.
- Do not create local replacement components for shared primitives (`Button`, `Input`, `Card`, `Dialog`, `Select`, `Tabs`, `DataTable`, form primitives, layout shell primitives) when a `pace-core2` equivalent exists.
- Do not create local replacement hooks/utilities for shared concerns (auth/session context, permissions, secure Supabase access, event context, form validation helpers, formatting/sanitization) when `pace-core2` provides them.
- Avoid direct library bypasses (`@radix-ui/*`, `lucide-react`, ad hoc auth/query helpers) when `pace-core2` wrappers/entrypoints already define the contract for consuming apps.
- If a required capability is genuinely missing from `pace-core2`, document the gap in the owning slice and treat it as an explicit shared-foundation backlog item rather than silently introducing a permanent BASE-local equivalent.

## Implementation plan

This section is the authoritative orchestration record for slice boundaries, dependencies, implementation order, risk, and route ownership.

### Slice overview

| Order | Slice | Routes | Depends on | Risk |
| --- | --- | --- | --- | --- |
| 1 | `BA00-app-shell-and-access` | `/login`, `/`, `*` | None | Medium |
| 2 | `BA01-event-workspace-and-configuration` | `/event-dashboard`, `/configuration` | `BA00` | Medium |
| 3 | `BA02-shared-forms-platform-contracts` | None | None | High |
| 4 | `BA03-forms-authoring-and-base-integration` | `/forms`, `/form-builder` | `BA00`, `BA01`, `BA02` | Medium |
| 5 | `BA04-registration-setup-and-policy` | `/registration-types` | `BA01`, `BA02`, `BA03` | Medium |
| 6 | `BA05a-registration-entry-and-application-submission` | **Portal UI** (registration entry + submit; see portal PR14–PR16 / workflow forms). BASE: contracts + organiser tooling. | `BA02`, `BA03`, `BA04` | High |
| 7 | `BA05b-participant-application-progress` | **Portal UI** (application status/progress at `/:eventSlug/applications/:applicationId`; see portal PR18). BASE: read contracts. | `BA05a` | Medium |
| 8 | `BA06-applications-admin-and-review` | `/applications` | `BA04`, `BA05a` | Medium |
| 9 | `BA07-token-approval-actions` | **Portal:** `/approvals/:token` (PR20). No BASE route. | `BA04`, `BA05a` | Medium |
| 10 | `BA08-units-and-group-coordination` | `/units`, `/unit-preferences` | `BA06` | Medium |
| 11 | `BA09-activity-offering-and-session-setup` | `/activities`, `/activities/:offeringId` | `BA01` | Medium |
| 12 | `BA10-participant-activity-booking-experience` | **Portal UI** (participant booking on `/:eventSlug/activities`; see portal PR19). BASE: contracts + organiser surfaces (`BA09`, `BA11`). | `BA02`, `BA05a`, `BA08`, `BA09` | High |
| 13 | `BA11-activity-booking-operations-and-oversight` | `/activities/bookings` | `BA09`, `BA10` | Medium |
| 14 | `BA12-scanning-setup` | `/scanning` | `BA01`, `BA09` | Medium |
| 15 | `BA13-scanning-runtime-and-validation` | `/scanning/:scanPointId` | `BA06`, `BA11`, `BA12` | Medium |
| 16 | `BA14-scanning-sync-and-reconciliation` | None | `BA12`, `BA13` | High |
| 17 | `BA16-scanning-tracking-dashboard` | `/scanning/tracking` | `BA08`, `BA11`, `BA12`, `BA13`, `BA14` | Medium |
| 18 | `BA15-reporting` | `/reports` | `BA06`, `BA08`, `BA11`, `BA14` | Medium |

### Dependencies and dependency rationale

- `BA00-app-shell-and-access`: foundational shell, auth, routing, and guard slice with no upstream BASE dependency.
- `BA01-event-workspace-and-configuration`: depends on `BA00` because event context and protected routing belong to the shared shell.
- `BA02-shared-forms-platform-contracts`: parallel documentation track with no BASE route dependency, but an implementation prerequisite for later form-driven slices.
- `BA03-forms-authoring-and-base-integration`: depends on `BA00`, `BA01`, and `BA02` because BASE authoring needs the shell, event scope, and final shared forms contract.
- `BA04-registration-setup-and-policy`: depends on `BA01`, `BA02`, and `BA03` because registration policy is event-scoped and built on the shared forms integration direction.
- `BA05a-registration-entry-and-application-submission`: depends on `BA02`, `BA03`, and `BA04` because participant registration must consume the typed forms contract and approved registration policy.
- `BA05b-participant-application-progress`: depends on `BA05a` because participant progress is downstream of successful application creation and approval activation.
- `BA06-applications-admin-and-review`: depends on `BA04` and `BA05a` because review tooling is meaningless before application creation and approval policy exist.
- `BA07-token-approval-actions`: depends on `BA04` and `BA05a` because token actions rely on approval-chain semantics and application creation outputs.
- `BA08-units-and-group-coordination`: depends on `BA06` because unit role assignment and grouped coordination anchor to applications already visible to organisers.
- `BA09-activity-offering-and-session-setup`: depends on `BA01` because organiser activity setup is event-scoped but independent from participant booking UI.
- `BA10-participant-activity-booking-experience`: depends on `BA02`, `BA05a`, `BA08`, and `BA09` because participant booking needs shared workflow contracts, participant identity/application context, optional unit coordination, and approved activity setup.
- `BA11-activity-booking-operations-and-oversight`: depends on `BA09` and `BA10` because organiser oversight must consume established setup and participant-booking rules rather than invent them.
- `BA12-scanning-setup`: depends on `BA01` and `BA09` because scan-point setup is event-scoped and activity-aware.
- `BA13-scanning-runtime-and-validation`: depends on `BA06`, `BA11`, and `BA12` because runtime validation consumes approved application, booking, and scan-point contracts.
- `BA14-scanning-sync-and-reconciliation`: depends on `BA12` and `BA13` because sync semantics are downstream of scan-point setup and runtime event creation.
- `BA16-scanning-tracking-dashboard`: depends on `BA08`, `BA11`, `BA12`, `BA13`, and `BA14` because tracking relies on stable scan semantics plus activity, transport, and unit context.
- `BA15-reporting`: depends on `BA06`, `BA08`, `BA11`, and `BA14` because reporting should consume stabilised application, unit, booking, and scan contracts rather than discover them.

### Implementation order

1. `BA00-app-shell-and-access`
2. `BA01-event-workspace-and-configuration`
3. `BA02-shared-forms-platform-contracts`
4. `BA03-forms-authoring-and-base-integration`
5. `BA04-registration-setup-and-policy`
6. `BA05a-registration-entry-and-application-submission`
7. `BA05b-participant-application-progress`
8. `BA06-applications-admin-and-review`
9. `BA07-token-approval-actions`
10. `BA08-units-and-group-coordination`
11. `BA09-activity-offering-and-session-setup`
12. `BA10-participant-activity-booking-experience`
13. `BA11-activity-booking-operations-and-oversight`
14. `BA12-scanning-setup`
15. `BA13-scanning-runtime-and-validation`
16. `BA14-scanning-sync-and-reconciliation`
17. `BA16-scanning-tracking-dashboard`
18. `BA15-reporting`

### High-risk slices

- `BA02-shared-forms-platform-contracts`: cross-app contract and schema direction with multiple downstream consumers.
- `BA05a-registration-entry-and-application-submission`: participant-facing registration, backend application creation, approval activation, and consent triggers intersect here.
- `BA10-participant-activity-booking-experience`: booking rules and portal-hosted participant UX must stay explicit (no BASE-origin participant routes).
- `BA14-scanning-sync-and-reconciliation`: offline queueing, idempotency, and conflict semantics are easy to under-specify and hard to repair later.

### Route ownership

| Route | Owning slice |
| --- | --- |
| `/login` | `BA00-app-shell-and-access` |
| `/` | `BA00-app-shell-and-access` |
| `*` | `BA00-app-shell-and-access` |
| `/event-dashboard` | `BA01-event-workspace-and-configuration` |
| `/configuration` | `BA01-event-workspace-and-configuration` |
| `/forms` | `BA03-forms-authoring-and-base-integration` |
| `/form-builder` | `BA03-forms-authoring-and-base-integration` |
| `/registration-types` | `BA04-registration-setup-and-policy` |
| `/applications` | `BA06-applications-admin-and-review` |
| **Portal** `/approvals/:token` (PR20) | `BA07-token-approval-actions` |
| `/units` | `BA08-units-and-group-coordination` |
| `/unit-preferences` | `BA08-units-and-group-coordination` |
| `/activities` | `BA09-activity-offering-and-session-setup` |
| `/activities/:offeringId` | `BA09-activity-offering-and-session-setup` |
| `/activities/bookings` | `BA11-activity-booking-operations-and-oversight` |
| `/scanning` | `BA12-scanning-setup` |
| `/scanning/:scanPointId` | `BA13-scanning-runtime-and-validation` |
| `/scanning/tracking` | `BA16-scanning-tracking-dashboard` |
| `/reports` | `BA15-reporting` |

**Participant journeys (registration entry, application progress, activity booking)** — **no routes on the BASE app.** Workflow contracts: slices **BA05a**, **BA05b**, **BA10**; **UI and canonical URLs: pace-portal** (see portal [`PR00-portal-architecture.md`](../portal/PR00-portal-architecture.md)).

- `BA02-shared-forms-platform-contracts` and `BA14-scanning-sync-and-reconciliation` are authoritative route-less slices.

## Table of contents

- § 1 App Shell And Access
- § 2 Event Workspace And Configuration
- § 3 Forms And Structured Data Capture
- § 4 Registration And Application Lifecycle
- § 5 Units And Group Coordination
- § 6 Participant Activity Booking
- § 7 Consent And Legal Records
- § 8 Participant Scanning
- § 9 Reporting And Data Access

---

## § 1 App Shell And Access

### Overview

- Purpose and scope: define the authenticated app shell, login flow, protected route model, navigation ownership, and base provider composition.
- Dependencies: none.
- Standards: follow the cross-cutting contracts in this document.

### Requirement slice mapping

- Covered by slices: `BA00-app-shell-and-access`.
- Depends on slices: None.
- Upstream/downstream handoffs: Feeds shell, route boundary, and guard contracts to all downstream BASE slices.

### Current legacy baseline

- The legacy app uses `ProtectedRoute`, `PaceAppLayout`, and `PaceLoginPage` from legacy `@solvera/pace-core`.
- Route definitions live in a single `src/App.tsx`.
- Event selection is embedded into the authenticated shell.
- RBAC checks are page-centric and stringly typed.

### Rebuild target

- Keep a single authenticated app shell for admin/operator routes.
- Keep unauthenticated/token flows outside the BASE authenticated shell.
- Make route ownership explicit in the implementation plan.
- Centralise app bootstrapping and permission boundaries around `pace-core2` providers and guards.

### pace-core2 assumptions and delta

- A local `../pace-core2/packages/core` workspace exists and exposes scoped entrypoints.
- The rebuild should prefer `/components`, `/providers`, `/hooks`, `/rbac`, `/types`, `/events`, and related scoped exports over broad root imports.
- Legacy assumptions such as `createBaseClient` availability must not be carried forward without confirming `pace-core2` support.

### Data and integration assumptions

- Auth, organisation, event, and RBAC context come from shared PACE services and `pace-core2`.
- Route-level permissions must continue to align with shared RBAC resource names.
- Dev-db validation is still required for any route or permission metadata persisted in DB.

### Acceptance criteria

- [ ] Admin/operator routes use one shared authenticated shell contract.
- [ ] Participant-facing journeys are **not** implemented in the BASE app; they use **pace-portal** so BASE does not ship a parallel member shell.
- [ ] Token-based or standalone pages are explicitly outside the authenticated admin shell.
- [ ] Route ownership is fully recorded in the implementation plan in this document.

### API / Contract

- Auth bootstrap and provider stack.
- Protected route contract.
- App shell and navigation contract.
- Route registry contract.
- No implementation detail.

### Verification

- Login, logout, session restoration, context selection, and access denied flows.
- Navigation visibility matches slice-owned routes.

### Testing requirements

- Provider composition tests.
- Route guard tests.
- Shell render and denied-state coverage.

### Do not

- Do not preserve legacy route structure only because it already exists.
- Do not let pages define their own routing truth.
- Do not mix authenticated shell concerns with token/public pages.
- Do not implement participant registration, application progress, or activity booking as routes in the BASE app; those UIs belong in **pace-portal** (see cross-cutting *Member-facing UI vs organiser/operator UI*).

### References

- [`BA00-base-project-brief.md`](./BA00-base-project-brief.md)

---

## § 2 Event Workspace And Configuration

### Overview

- Purpose and scope: event landing, event dashboard, event-scoped operational entrypoints, and event configuration.
- Dependencies: § 1 App Shell And Access.
- Standards: route ownership from the implementation plan in this document.

### Requirement slice mapping

- Covered by slices: `BA01-event-workspace-and-configuration`.
- Depends on slices: `BA00-app-shell-and-access`.
- Upstream/downstream handoffs: Provides selected-event and configuration contracts consumed by forms, registration policy, activity setup, scanning setup, and reporting slices.

### Current legacy baseline

- The legacy app has `/event-dashboard` and `/configuration`.
- Event configuration edits `core_events` directly from the client.
- Dashboard cards aggregate counts for applications and forms only.
- The legacy configuration page assumes a field set that no longer matches the current dev-db `core_events` shape.

### Rebuild target

- Keep event workspace as the operational handoff into BASE bounded contexts.
- Event configuration should own event-level settings such as registration scope where appropriate.
- Event workspace should expose only approved operational entrypoints, not every possible table operation.
- Event configuration should expand in line with the validated event data model rather than chasing field parity with the legacy screen.

### pace-core2 assumptions and delta

- `useEvents` and related provider contracts should come from `pace-core2`.
- Context selection should use the shared layout contract rather than bespoke page logic.
- Legacy page-local RBAC glue should be reduced where shared hooks already provide the scope.

### Data and integration assumptions

- `core_events` remains central.
- `registration_scope` exists on `core_events` in dev-db and is an event-level concern.
- The validated dev-db `core_events` shape includes `public_readable`, `registration_scope`, `expected_participants`, and `typical_unit_size`, which materially differs from the legacy configuration screen.
- File/logo behaviour should align with shared file contracts rather than legacy ad hoc usage.

### Acceptance criteria

- [ ] Event workspace is clearly separate from feature-specific operational pages.
- [ ] Event configuration contracts are documented without assuming legacy field parity.
- [ ] Event registration scope is treated as rebuild scope, not omitted because the legacy UI lacks it.

### API / Contract

- Event read model consumed by the dashboard.
- Event configuration write contract.
- Event-scoped navigation contract.

### Verification

- Event selection and routing.
- Read-only versus update-capable configuration behaviour.
- Registration scope visibility and save behaviour.

### Testing requirements

- Event dashboard composition tests.
- Configuration form validation tests.
- Permission coverage for event-scoped reads and writes.

### Do not

- Do not assume every `core_events` column from the legacy screen belongs in MVP.
- Do not keep direct client updates for privileged event transitions without explicit approval.
- Do not couple event dashboard composition to current hard-coded card set.

### References

- [`BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- BASE feature brief, sections 3 and 9

---

## § 3 Forms And Structured Data Capture

### Overview

- Purpose and scope: form definitions, workflow typing, semantic field identity, response capture, and BASE authoring surfaces that consume the shared forms platform.
- Dependencies: § 1 App Shell And Access, § 2 Event Workspace And Configuration.
- Standards: `pace-core2` form and validation utilities where applicable.

### Requirement slice mapping

- Covered by slices: `BA02-shared-forms-platform-contracts`, `BA03-forms-authoring-and-base-integration`.
- Depends on slices: `BA00-app-shell-and-access`, `BA01-event-workspace-and-configuration`.
- Upstream/downstream handoffs: BA02 defines shared typed forms contracts; BA03 consumes them for BASE authoring and hands registration-entrypoint contracts to registration lifecycle slices.

### Current legacy baseline

- The legacy app supports `/forms` and `/form-builder`.
- Form submission logic groups fields by table name and writes directly to multiple tables from the client.
- The form builder depends on legacy RPCs such as `data_core_field_list_base_form`.
- The legacy app mixes generic form infrastructure with application submission concerns that now have stronger BASE-specific contracts in dev-db.
- Legacy schema coupling still depends on `core_form_context_types`, `core_form_field_config`, and table/column-targeted field identity.

### Rebuild target

- Keep form definition as an admin capability where it is still required.
- Replace generic table/column write ownership with a typed shared forms platform.
- Make workflow intent explicit through `core_forms.workflow_type`.
- Use semantic `field_key` identity for authored fields and captured responses.
- Keep the shared forms platform responsible for definition and response capture, not downstream domain persistence.
- Treat BASE registration entrypoints as `core_forms` rows with `workflow_type = 'base_registration'`, not as a second BASE-local form model.
- Required-form behavior is modeled as `is_required` plus audience restrictions (event forms by registration type; org forms by member type in TEAM-owned contracts), not by ad hoc UI-only rules.
- Treat the BASE forms contract as authorable now, but implementation-dependent on upstream `pace-core2` work defined in [`CR21-workflow-forms-runtime.md`](../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md) (**Forms platform architecture (canonical)**).

### pace-core2 assumptions and delta

- Prefer `useZodForm`, shared components, and scoped form hooks from `pace-core2`.
- Do not rely on legacy root imports or undocumented RPC helper behaviour.
- `pace-core2` supplies primitives and shared reporting/authoring building blocks, but it must not own BASE workflow side effects.

### Data and integration assumptions

- Current legacy dependencies include `core_forms`, `core_form_fields`, `core_form_context_types`, `core_form_field_config`, `core_form_responses`, and `core_form_response_values`.
- Shared forms rescope confirms `core_form_context_types` and `core_form_field_config` are dropped before the rebuild consumes the platform.
- `core_forms` is reshaped around `workflow_type`, `owner_app_id`, `access_mode`, and `workflow_config`.
- `core_form_fields` replaces `table_name`/`column_name` with `field_key`.
- `core_form_responses` replaces generic `target_table`/`target_record_id` targeting with `workflow_subject_type`/`workflow_subject_id`.
- `core_form_response_values` stores `field_key` instead of denormalised table/column targeting.
- `base_application` in dev-db now has a required `registration_type_id`, which means registration flow design cannot be treated as generic form submission alone.
- The rebuild should assume backend mediation is required where form submission crosses into privileged BASE workflow creation.
- `core_field_list` cleanup is explicitly outside the forms-platform rescope and should not be silently folded into BASE forms architecture.

### Acceptance criteria

- [ ] Form authoring remains bounded and explicitly documented.
- [ ] Shared forms contracts use explicit workflow typing and semantic field identity.
- [ ] Submission contracts do not rely on undocumented generic table writes.
- [ ] Response capture is documented independently from downstream domain record creation.

### API / Contract

- Form definition contract.
- Workflow type and access-mode contract.
- Field key contract.
- Submission contract.
- Response/audit contract.

### Verification

- Form list, create, edit, publish-state handling, and preview/share flows.
- Submission flow for approved target contexts.
- BASE registration entrypoint resolution against workflow type, slug, and access mode.

### Testing requirements

- Builder validation tests.
- Submission happy path and invalid payload coverage.
- Permission coverage for authoring versus submitting.

### Do not

- Do not preserve generic client-side multi-table writes by default.
- Do not retain `table_name`/`column_name` as the primary semantic contract.
- Do not silently keep `core_form_context_types` or `core_form_field_config` in the rebuild-facing architecture.
- Do not treat current form builder UX as mandatory if the domain contract changes.

### References

- BASE feature brief, sections 1 and 9
- [`CR21-workflow-forms-runtime.md`](../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md)

---

## § 4 Registration And Application Lifecycle

### Overview

- Purpose and scope: registration types, eligibility, registration scope enforcement, application submission lifecycle, approval workflow, and admin application operations.
- Dependencies: § 1 App Shell And Access, § 2 Event Workspace And Configuration, § 3 Forms And Structured Data Capture.
- Standards: backend-owned workflow transitions; explicit status model.

### Requirement slice mapping

- Covered by slices: `BA04-registration-setup-and-policy`, `BA05a-registration-entry-and-application-submission`, `BA05b-participant-application-progress`, `BA06-applications-admin-and-review`, `BA07-token-approval-actions`.
- Depends on slices: `BA01-event-workspace-and-configuration`, `BA02-shared-forms-platform-contracts`, `BA03-forms-authoring-and-base-integration`.
- Upstream/downstream handoffs: Registration policy/config and typed form entrypoints feed participant submission and organiser review; tokenized approval actions feed back into application-check progression.

### Current legacy baseline

- The legacy app exposes `/applications` and basic application viewing.
- The current code writes to `base_application` directly from client-side submission logic even though the April 2026 brief says inserts are controlled by service-role/RPC flow.
- There is no legacy UI for registration types, approval workflow, or approval checks.

### Rebuild target

- Registration types and registration scope are in-scope.
- Application status flow is `draft -> submitted -> under_review -> approved/rejected`, with `withdrawn` allowed from pre-approved states.
- Approval checks are configured per registration type, ordered by `sort_order`, and executed sequentially by backend contracts.
- Requirement configuration lives on `base_registration_type_requirement`; per-application state, including `token_hash` and `token_expires_at` for guardian/referee magic-link flows, lives on `base_application_check`.
- Submission is not the end of the workflow: if a registration type has no requirements the application can advance directly to `approved`; otherwise the backend must move it to `under_review`, create the required `base_application_check` rows, and activate the first check.
- Participant-visible blocking detail belongs to check rows, not to a multiplied application-status enum.
- Application admin tooling must reflect the new approval model instead of only exposing a read-only table.
- Event admins retain final approve/reject authority over submitted or `under_review` applications even when checks remain unresolved; this manual decision is distinct from the optional `event_approval` check type and unresolved checks must remain visible after an override.
- Registration should be a purpose-built BASE workflow that can render event-customisable form content, support multiple registration entrypoints, and still create applications through the correct backend contract.
- A registration entrypoint is a `core_forms` row with `workflow_type = 'base_registration'`.
- `core_forms.slug` is the participant URL identifier and `base_form_registration_type` binds the entrypoint to one or more permitted registration types.
- A single event form may be marked as the primary registration entrypoint (`is_primary_entrypoint = true`) for canonical portal routing on `/:eventSlug/application`.
- `workflow_config.pre_submission_checks` and `access_mode` are part of the registration-entrypoint contract.
- Participant-facing registration and application-progress **experiences** are implemented in **pace-portal** (authenticated member shell + auth-required handoff). BASE owns registration policy, form authoring alignment, RPC/workflow contracts, and organiser review—not duplicate participant SPAs.
- Event lead/EOI participant journeys are out of MVP scope.
- When a registration type includes a `referee` requirement, the participant registration journey must capture referee contact details, at minimum an email address, as part of the workflow payload before submission.
- BASE owns registration setup, participant progress, organiser review, and **token-based approval contracts/RPCs**; **pace-portal** hosts the **token approval UI** (PR20). TEAM-owned pending-approval queues for logged-in actors remain a separate downstream product surface and must not be backfilled into BASE IA.

### pace-core2 assumptions and delta

- RBAC, secure Supabase access, and page guards should come from `pace-core2` scoped entrypoints.
- Legacy page-name string handling should be aligned with shared resource constants where available.
- Direct client mutation of approval state or privileged application records must not be carried forward.

### Data and integration assumptions

- Relevant schema from the feature brief includes `base_registration_type`, `base_registration_type_eligibility`, `base_registration_type_requirement`, `base_application`, `base_application_check`, and `core_events.registration_scope`.
- Dev-db validation confirms these structures exist in the current dev project.
- `base_application` includes `registration_type_id`, `status_updated_at`, and `status_updated_by`.
- `DEC-068` and `docs/database/domains/base.md` are the authoritative workflow references for ordered requirements, `under_review`, `token_hash`, and type-specific failure behaviour.
- `core_forms` with `workflow_type = 'base_registration'` is the canonical registration entrypoint record.
- `base_form_registration_type` replaces earlier BASE-side registration-form binding assumptions.
- One bound registration-type row means a fixed-type entrypoint; multiple bound rows mean an open-selection entrypoint.
- For the current BASE rebuild, participant entrypoints default to `authenticated_member`; `public` is allowed only by explicit slice approval.
- Dev-db exposes `app_base_application_create(p_event_id, p_person_id, p_registration_type_id, ...)` and `event_applicant_org_allowed(...)`, which should be treated as evidence for backend-owned application creation and scope checks.
- Registration submission creates `core_form_responses` / `core_form_response_values`, then calls `app_base_application_create(...)`, then links the response via `workflow_subject_type` / `workflow_subject_id`.
- `guardian_approval` and `referee` use hashed, single-use, 14-day magic-link tokens stored on `base_application_check`; regeneration or resend invalidates the previously active token immediately.
- MINT, email delivery, and TEAM pending-approval queues are integration concerns that must be treated as contracts, not UI-only logic or silently absorbed into BASE pages.

### Acceptance criteria

- [ ] Registration type and approval workflow are explicitly documented as rebuild scope.
- [ ] The application status model matches the feature brief, not legacy inference.
- [ ] Privileged transitions are backend-owned.

### API / Contract

- Registration type read/write contract.
- Eligibility evaluation contract.
- Application creation and status contract.
- Approval-check initialisation and activation contract.
- Application review, override, and approval-request reissue contract.
- Magic-link approval contract.
- Configurable registration-entrypoint contract.

### Verification

- Registration type setup.
- Fixed-type and open-selection registration entrypoint resolution.
- Application submission with and without approval requirements.
- Approval progression, failure, resend/reissue, override, and rejection scenarios.

### Testing requirements

- Status transition tests.
- Eligibility validation tests.
- Permission tests for applicant, reviewer, and event admin roles.

### Do not

- Do not preserve client-side `base_application` write patterns.
- Do not collapse approval detail back into a single status field.
- Do not hide magic-link or service-role dependencies inside UI prose.
- Do not invent a separate token table or BASE-local token lifecycle model that conflicts with `base_application_check`.
- Do not make BASE pages the owner of TEAM queue behaviour for logged-in approval actors.
- Do not let generic form submission bypass registration-type, scope, approval, or consent rules.
- Do not carry forward superseded `base_registration_form` or `base_registration_form_type` assumptions.

### References

- BASE feature brief, sections 2, 3, 4, and 9
- [`DB-change-decisions-p1.md`](../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../database/domains/base.md`](../../database/domains/base.md)
- [`CR21-workflow-forms-runtime.md`](../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md)
- Forward DDL backlog: [`DB-change-decisions-p3.md`](../../database/decisions/DB-change-decisions-p3.md)

---

## § 5 Units And Group Coordination

### Overview

- Purpose and scope: unit hierarchy, unit roles, and sub-unit preference submission workflows.
- Dependencies: § 1 App Shell And Access, § 4 Registration And Application Lifecycle.
- Standards: group-level workflows remain separate from individual application workflows.

### Requirement slice mapping

- Covered by slices: `BA08-units-and-group-coordination`.
- Depends on slices: `BA06-applications-admin-and-review`.
- Upstream/downstream handoffs: Provides unit hierarchy and preference contracts consumed by participant booking, scanning tracking breakdowns, and reporting domains.

### Current legacy baseline

- The legacy app supports `/units`, unit CRUD, role types, and unit role assignment.
- No legacy UI exists for ranked activity preferences.

### Rebuild target

- Preserve unit and unit-role management where still needed.
- Add sub-unit preference submission as a first-class bounded context rather than hiding it inside activity booking.
- Keep preference submission distinct from booking allocation.

### pace-core2 assumptions and delta

- Shared tables and data-grid utilities should come from scoped entrypoints.
- Permission guards should align with `pace-core2` RBAC hooks instead of page-local ad hoc logic.

### Data and integration assumptions

- Legacy app touches `base_units`, `base_unit_role_types`, and `base_unit_roles`.
- The April 2026 brief adds `base_activity_preference`.
- Dev-db validation confirms `base_activity_preference` exists with `unit_id`, `session_id`, `rank`, `submitted_at`, and `submitted_by`.

### Acceptance criteria

- [ ] Unit structure and role assignment remain bounded and event-scoped.
- [ ] Sub-unit preferences are documented as separate from individual bookings.
- [ ] Preference ranking rules are explicit.

### API / Contract

- Unit CRUD contract.
- Unit role assignment contract.
- Sub-unit preference submission contract.

### Verification

- Unit create/edit/delete.
- Role assignment updates.
- Preference ordering and lock/submission flow.

### Testing requirements

- Hierarchy and validation tests.
- Role assignment tests.
- Preference ranking tests.

### Do not

- Do not assume the current `/units` UI covers all group coordination needs.
- Do not auto-allocate bookings from preferences without explicit approval.
- Do not merge unit leadership flows into generic application admin tooling.

### References

- BASE feature brief, section 6

---

## § 6 Participant Activity Booking

### Overview

- Purpose and scope: activity offerings, sessions, participant booking flows, booking windows, capacity, waitlist, and session conflict rules.
- Dependencies: § 4 Registration And Application Lifecycle, § 5 Units And Group Coordination.
- Standards: application-layer enforcement for capacity, windows, and overlaps unless explicitly moved into backend contracts.

### Requirement slice mapping

- Covered by slices: `BA09-activity-offering-and-session-setup`, `BA10-participant-activity-booking-experience`, `BA11-activity-booking-operations-and-oversight`.
- Depends on slices: `BA01-event-workspace-and-configuration`, `BA02-shared-forms-platform-contracts`, `BA05a-registration-entry-and-application-submission`, `BA08-units-and-group-coordination`.
- Upstream/downstream handoffs: BA09 defines offering/session setup contracts, BA10 defines participant booking contracts (portal UI ownership), BA11 consumes both for organiser oversight and operations.

### Current legacy baseline

- No legacy UI exists for activity booking.
- The bounded context is entirely driven by the April 2026 feature brief and dev-db schema claims.

### Rebuild target

- Support event-scoped offerings and sessions.
- Allow participant or coordinator booking according to source rules.
- Enforce booking windows, capacity, duplicate prevention, and scheduling conflict rules.
- Keep waitlist promotion manual or scheduled-job based for MVP.
- Participant-facing booking journeys are implemented in **pace-portal**; BASE owns activity setup, oversight, and booking contracts (`BA09`, `BA11`), not the member booking UI.

### pace-core2 assumptions and delta

- Shared date/time, form, and table components should come from scoped `pace-core2` entrypoints.
- Participant-facing booking UI is implemented in **pace-portal**, not as a standalone layout inside the BASE app.

### Data and integration assumptions

- Relevant schema includes `base_activity_offering`, `base_activity_session`, and `base_activity_booking`.
- Dev-db validation confirms:
  - `base_activity_offering` has booking window fields, optional `cost`, optional `payment_due_at`, and optional `trac_activity_id`
  - `base_activity_session` has `capacity`, `start_time`, `end_time`, and optional session/location display fields
  - `base_activity_booking` has `status`, `source`, `booked_at`, and `cancelled_at`
- Optional TRAC linkage and optional future MINT linkage must remain decoupled.

### Acceptance criteria

- [ ] Booking rules are documented explicitly.
- [ ] Offering/session modelling is separated from booking state.
- [ ] Waitlist and cost handling stay within MVP boundaries from the brief.

### API / Contract

- Activity offering contract.
- Activity session contract.
- Booking and waitlist contract.

### Verification

- Browse offering, select session, create booking, hit capacity, hit time conflict, and cancel flow.

### Testing requirements

- Capacity and conflict tests.
- Booking window tests.
- Permission tests for self-service versus coordinator paths.

### Do not

- Do not merge TRAC logistics assumptions into BASE booking rules.
- Do not promise automatic waitlist promotion in MVP.
- Do not invent participant route structure on the **BASE** origin; participant routes are **pace-portal** concerns (coordinate URL schemes with portal PR00).

### References

- BASE feature brief, section 5

---

## § 7 Consent And Legal Records

### Overview

- Purpose and scope: immutable consent capture for event terms, code of conduct, and activity waivers.
- Dependencies: § 4 Registration And Application Lifecycle, § 6 Participant Activity Booking.
- Standards: immutable legal record handling.

### Requirement slice mapping

- Covered by slices: Primary coverage within `BA05a-registration-entry-and-application-submission` and `BA10-participant-activity-booking-experience`; context-level consent domain retained here for architectural clarity.
- Depends on slices: `BA04-registration-setup-and-policy`, `BA05a-registration-entry-and-application-submission`, `BA09-activity-offering-and-session-setup`, `BA10-participant-activity-booking-experience`.
- Upstream/downstream handoffs: Registration and booking workflows trigger immutable consent capture contracts; downstream reporting/audit consumption is as a consumer of consent records, not as an ownership transfer.

### Current legacy baseline

- No legacy UI exists for BASE consent capture.
- Consent requirements come from the April 2026 brief.

### Rebuild target

- Capture consent at application and booking time where required.
- Preserve verbatim consent text shown at the time of acceptance.
- Support guardian/proxy consent where the consenting person differs from the participant.

### pace-core2 assumptions and delta

- Form and validation patterns should use `pace-core2`.
- Legal-record capture should not depend on legacy mutable form-response assumptions.

### Data and integration assumptions

- Relevant schema includes `base_consent`.
- Dev-db validation confirms `base_consent` stores `verbatim_text`, `consented_by`, `consented_for`, and application/booking anchors.
- Consent rows are immutable and anchored to either application or booking.

### Acceptance criteria

- [ ] Consent capture is documented as a legal record, not a soft preference.
- [ ] Application-time and booking-time consent triggers are separated clearly.
- [ ] Guardian consent is supported where required.

### API / Contract

- Consent capture request contract.
- Consent persistence contract.
- Consent display/audit contract.

### Verification

- Application submission with event terms.
- Activity booking with waiver.
- Guardian consent case.

### Testing requirements

- Immutability tests.
- Validation tests for mutually exclusive anchors.
- Permission and actor-role coverage.

### Do not

- Do not treat consent as editable profile data.
- Do not replace verbatim text storage with a document reference only.
- Do not delete legal records automatically when upstream records change.

### References

- BASE feature brief, section 7

---

## § 8 Participant Scanning

### Overview

- Purpose and scope: scan-point administration, live scanning runtime, offline sync, validation results, and operational tracking interfaces.
- Dependencies: § 1 App Shell And Access, § 4 Registration And Application Lifecycle, § 6 Participant Activity Booking.
- Standards: immutable scan events and offline-safe workflow design.

### Requirement slice mapping

- Covered by slices: `BA12-scanning-setup`, `BA13-scanning-runtime-and-validation`, `BA14-scanning-sync-and-reconciliation`, `BA16-scanning-tracking-dashboard`.
- Depends on slices: `BA01-event-workspace-and-configuration`, `BA06-applications-admin-and-review`, `BA09-activity-offering-and-session-setup`, `BA11-activity-booking-operations-and-oversight`.
- Upstream/downstream handoffs: BA12 setup contracts feed BA13 runtime validation; BA13 event outputs feed BA14 sync/idempotency; BA16 derives operational tracking from stabilized scan and sync contracts.

### Current legacy baseline

- No legacy UI exists for participant scanning.
- The bounded context is new rebuild scope from the April 2026 brief.

### Rebuild target

- Support scan points across site, activity, transport, and meal contexts.
- Split scanning into distinct BASE surfaces:
  - `/scanning` for admin and ops work such as scan-point setup, manifest download, conflict review, and scan-history access
  - `/scanning/:scanPointId` for the dedicated live scanner runtime on handheld or kiosk-like devices
  - `/scanning/tracking` for live operational tracking and headcount dashboards
- Support online and offline scanning with queued sync.
- Support offline manifests for site, activity, transport, and meal contexts. Manifests remain participant-scoped only.
- Treat manifests, validation results, override behaviour, and manual scan behaviour as explicit operational contracts.
- Keep slice boundaries hard:
  - `BA12-scanning-setup` owns scan-point setup, manifest download entrypoints, conflict review entrypoints, and scan-history access only
  - `BA14-scanning-sync-and-reconciliation` owns queue state, upload semantics, idempotency, and conflict persistence semantics only
  - `BA12` must not invent queue behaviour, upload retry rules, or conflict-resolution semantics
  - `BA14` must not grow route ownership, scan-point setup mutations, or manifest-configuration rules
- Support two operator intervention flows:
  - override of an invalid card-based scan where the rejection class is overridable
  - manual scan without a card read where a coordinator selects the participant and records their presence explicitly
- Non-participant site access remains online-only. Coordinators or staff without participant applications are not carried in offline manifests.
- Sync uploads the scan decision made at scan time and handles ingest, idempotency, and conflict only; it does not re-run business validation.
- Keep card lifecycle management out of BASE. Card issue, deactivate, and replace remain TEAM-owned because `core_member_card` is member-scoped rather than event-scoped.
- The persisted scan-event contract uses separate `validation_result` and `validation_reason` fields rather than a single coarse outcome field.
- Runtime-to-persistence mapping is fixed for all scanning slices:
  - Runtime `accepted` -> `validation_result=accepted`, `validation_reason=null`
  - Runtime `rejected_card_not_recognised` -> `validation_result=rejected`, `validation_reason=card_not_recognised`
  - Runtime `rejected_card_not_valid` -> `validation_result=rejected`, `validation_reason=card_not_valid`
  - Runtime `rejected_registration_not_valid` -> `validation_result=rejected`, `validation_reason=registration_not_valid`
  - Runtime `rejected_booking_not_valid` -> `validation_result=rejected`, `validation_reason=booking_not_valid`
  - Runtime `rejected_duplicate_scan` -> `validation_result=rejected`, `validation_reason=duplicate_scan`
  - Upload conflict from sync reconciliation -> `validation_result=upload_conflict`, `validation_reason` carries the original runtime reason
- Tracking definition guardrail: in scanning dashboards, "never scanned" means no recorded scan attempt of any accepted or rejected class for the participant in that event.

### pace-core2 assumptions and delta

- Shared shell, file, form, and resilience patterns should come from `pace-core2`.
- A scanning surface may require a specialised UI mode and should not be forced into a desktop admin layout if that harms the workflow.

### Data and integration assumptions

- Relevant schema includes `core_member_card`, `base_scan_point`, `base_scan_event`, `base_application`, `base_activity_booking`, and TRAC transport assignment data.
- Dev-db validation confirms:
  - `core_member_card` stores reusable org-contextual cards with `card_identifier` and `is_active`
  - `base_scan_point` stores `context_type`, `direction`, and optional `resource_type` / `resource_id`
  - `base_scan_event` stores immutable scan records with `scan_point_id`, `scan_card_id`, `validation_result`, `scanned_at`, and `synced_at`
- Offline manifests are API-generated for MVP and not a persistent DB table.
- **Dev-db alignment:** [`docs/database/domains/base.md`](../../database/domains/base.md) (current dev-db shape, including **FU-029** scan enums) matches this rebuild for `base_scan_point`, `base_scan_event`, and separate persisted **`validation_result`** vs **`validation_reason`**. Treat the legacy **DEC-066** summary row in [`DB-change-decisions-p1.md`](../../database/decisions/DB-change-decisions-p1.md) as historical index text only if its product wording differs (for example transport offline manifest scope); **this document and BASE slice requirements** define MVP scanning behaviour.
- Sync remains **ingest-only** (upload does not re-run business validation); that contract is unchanged.
- TEAM is the owner of card lifecycle. BASE consumes active card state and scan history only.

### Acceptance criteria

- [ ] Scan points and scan events are treated as separate contracts.
- [ ] Offline queueing and later sync are part of the documented MVP.
- [ ] Separate admin/ops, runtime, and tracking surfaces are documented explicitly.
- [ ] Immutable scan event behaviour is explicit.

### API / Contract

- Scan point configuration contract.
- Manifest download contract.
- Live scan submission contract.
- Manual scan contract.
- Scan submission/sync contract.
- Tracking and operational view contract.
- Validation result contract.

### Verification

- Online valid scan.
- Online manual scan.
- Offline queued scan and later sync.
- Invalid/conflict outcomes.
- Tracking dashboard refresh for on-site, off-site, and never-scanned views.

### Testing requirements

- Scan result handling tests.
- Offline queue/sync tests.
- Role-based access tests for scan operations.
- Tracking-view derivation tests.

### Do not

- Do not model scan events as editable records.
- Do not assume coordinators and participants share the same scan validation rules.
- Do not move card issue/deactivate/replace into BASE while cards remain member-scoped.
- Do not invent a device registry for MVP.

### References

- BASE feature brief, section 8

---

## § 9 Reporting And Data Access

### Overview

- Purpose and scope: BASE consumption of the shared reporting engine, including report field metadata, app/domain explore selection, query building, saved templates, and event-scoped reporting surfaces.
- Dependencies: § 1 App Shell And Access, § 4 Registration And Application Lifecycle, plus any domain whose data is reportable.
- Standards: field availability, row grain, and joins must be explicit.

### Requirement slice mapping

- Covered by slices: `BA15-reporting`.
- Depends on slices: `BA06-applications-admin-and-review`, `BA08-units-and-group-coordination`, `BA11-activity-booking-operations-and-oversight`, `BA14-scanning-sync-and-reconciliation`.
- Upstream/downstream handoffs: Consumes stabilized application/unit/activity/scan domain contracts and shared reporting foundations (`CR22`) for event-scoped reporting delivery.

### Current legacy baseline

- The legacy app supports `/reports` and saved templates.
- It depends on legacy RPCs such as `data_core_field_list_report`.
- Query building is tightly coupled to current known table prefixes.
- Reporting is treated as a BASE-local concern rather than a shared cross-app capability.

### Rebuild target

- Keep reporting as an event-scoped admin capability.
- **Gate:** slice **BA15** implementation ships **after** [`CR22-shared-reporting-foundations.md`](../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md) lands in `@solvera/pace-core` (see [`BA15-reporting_requirements.md`](./BA15-reporting_requirements.md)).
- Consume the shared reporting engine defined above `pace-core2`.
- Use app/domain explore selection plus runtime event scope instead of BASE-local dataset heuristics.
- Source field availability from `core_field_list` metadata, not naming prefixes or legacy RPC behaviour.
- Keep BASE aligned to the shared reporting engine across the approved BASE domains: `participant`, `unit`, `activity`, and `scan`.
- Treat the BASE reporting contract as authorable now, but implementation-dependent on upstream `pace-core2` work defined in [`CR22-shared-reporting-foundations.md`](../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md) (**Reporting architecture (canonical)**).

### pace-core2 assumptions and delta

- Prefer shared reporting primitives and query services from `pace-core2`.
- Reporting must not rely on root-barrel import sprawl, legacy helper assumptions, or DB-owned join topology.

### Data and integration assumptions

- `core_field_list` is the authoritative field catalog source for reporting exposure.
- Shared reporting architecture adds `report_domains`, `aggregate_strategy`, and `aggregate_config` to `core_field_list`.
- `core_report_template` remains the template store and is extended with `domain_id`, `app_id`, `sort_config`, and `column_config`.
- Join topology is owned by TypeScript explore config, not stored in `core_field_list`.
- BASE reporting consumes shared explores with runtime `event_id` scope:
  - `base.participant` via `base_application`
  - `base.unit` via `base_units`
  - `base.activity` via `base_activity_booking`
  - `base.scan` via `base_scan_event`
- BASE reporting scope for this rebuild remains `participant`, `unit`, `activity`, and `scan`. Do not collapse `BA15` back to participant-only scope during implementation.

### Acceptance criteria

- [ ] Reporting scope is bounded and event-scoped.
- [ ] BASE reporting is explicitly documented as a consumer of the shared reporting engine.
- [ ] Template persistence is documented explicitly.
- [ ] Field catalog and explore dependencies are surfaced instead of assumed.

### API / Contract

- Report field catalog contract.
- App/domain explore contract.
- Report query contract.
- Saved template contract.

### Verification

- Build a report, save a template, reload a template, and export results.
- Confirm BASE passes event scope into the shared participant explore rather than constructing ad hoc joins locally.

### Testing requirements

- Query-builder tests.
- Template CRUD tests.
- Permission tests for report access and template ownership rules.
- Explore validation tests for BASE participant reporting.

### Do not

- Do not assume every `base_` or `core_` table should be reportable by default.
- Do not hide field catalog dependencies behind undocumented RPCs.
- Do not store join topology in `core_field_list`.
- Do not let reporting drive primary application architecture.

### References

- BASE feature brief, sections 1 and 9
- [`CR22-shared-reporting-foundations.md`](../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification flows as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this architecture doc.
