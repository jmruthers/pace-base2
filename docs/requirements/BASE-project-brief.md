# BASE project brief

## Filename convention

BASE project brief docs in this requirement family use:

**`BASE-project-brief.md`**

| Segment | Meaning |
|--------|---------|
| `BA` | BASE app shorthand. |
| `00` | Foundation slot shared with architecture and requirement slices. |
| `base` | App slug. |
| `project-brief` | Fixed suffix for this document type. |

## What is BASE?

BASE is the PACE module for event registrations, participant application handling, approvals, unit coordination, reporting, participant activity booking, consent capture, and event scanning workflows. This rebuild defines the admin and operational surfaces that should exist, using rebuild documentation as the authority and the legacy app as background only.

## Current legacy baseline

- The current app is a POC-quality legacy implementation.
- It covers only part of the intended BASE scope.
- It uses legacy `@solvera/pace-core` assumptions and several client-side patterns that should not be preserved automatically.
- It is useful for observation, terminology, and identifying risky seams, but it is not authoritative.

## Intended rebuild target

- A full BASE rebuild aligned to the validated dev-db schema, April 2026 feature brief, and local `pace-core2` authority.
- An organiser-facing BASE shell for event operations, with participant-facing module journeys treated as external consumer-app dependencies rather than BASE-delivered UI.
- Purpose-built workflow orchestration for registration, approvals, booking, consent, and scanning, with configurable form content where needed.

## Goals and non-goals

### Goals

- Rebuild BASE against `pace-core2` conventions instead of legacy `@solvera/pace-core` assumptions.
- Require consuming-app implementation to use `@solvera/pace-core` components/hooks/providers/rbac/services before introducing local equivalents.
- Define implementation-ready bounded contexts and slice boundaries before coding begins.
- Bring schema-complete April 2026 BASE features into documented rebuild scope, even where the legacy app has no UI.
- Remove undocumented legacy coupling, especially direct client-side data writes and implicit RBAC or routing assumptions.
- Make route ownership, dependencies, and implementation order explicit and conflict-free in the authoritative docs.

### Non-goals

- Preserving legacy behaviour solely because it exists today.
- Editing the legacy codebase to repair or modernise it.
- Treating generated frontend DB types as current schema authority.
- Pulling requirements from production DB behaviour.

## Delivery model (queue-only PDLC)

- Requirement slices drive delivery: `docs/requirements/base/BA##_..._requirements.md` slices define implementation scope, dependency order, acceptance contracts, and stop conditions.
- Backend built once then frozen: schema/RPC/RLS prerequisites are aggregated across slices, implemented once, and verified through backend-ready evidence before frontend execution starts.
- Frontend queue execution: consumer-app execution runs one slice at a time in dependency order via `docs/delivery/base-build-queue.md`.
- QA feedback loop: manual QA outcomes update implementation and, where behavior changed, update slice requirements before delta reruns.
- Execution-lane ownership: queues may execute only slices owned by the running lane (`BASE overnight`, `External consumer`, `Backend/upstream`, or `Deferred/blocked`); cross-lane slices are deferred, not partially implemented by assumption.

## Unattended execution metadata contract

Every BASE requirement slice metadata block must include the following fields so queue generation is deterministic:

- `Execution owner`: repo/team that executes implementation (`BASE`, `external consumer`, `backend/upstream`)
- `Execution lane`: `BASE overnight` | `External consumer` | `Backend/upstream` | `Deferred/blocked`
- `Backend-ready evidence required`: links to required freeze evidence (report/domain/contracts)
- `QA pack required`: expected `docs/test-packs/[SLICE_ID]-qa-pack.md` path
- `Seed data dependency`: whether BA18 seed setup is required for non-empty verification
- `Block if`: explicit blocker conditions that force `Blocked` or `Deferred`
- `Dependency artifacts`: explicit external-consumer dependency notes and `contract_dependency` entries used by queue preflight

Safety-gate scope:

- `Safe for unattended execution` is evaluated only for slices in the active run lane.
- Out-of-lane slices must be set to `Deferred` and handed off; they must not block the lane queue solely because their safety value is `No`.

## Source of truth hierarchy

Use this order when documentation or implementation appears to conflict:

1. Requirement slices in `docs/requirements/base/*_requirements.md` for slice-local execution scope
2. `BASE-architecture.md` for route ownership, implementation order, and cross-slice orchestration
3. This project brief
4. Existing codebase implementation details

Tie-break rules for recurring conflict classes:

- Route ownership and execution order are always resolved by the `Implementation plan` and route-ownership tables in `BASE-architecture.md`.
- Schema, RPC, and RLS shape disputes are resolved by approved database authority references linked in the owning slice (for example `docs/database/domains/base.md`) plus the active backend-delta backlog.
- If a slice requires backend deltas but shared backend authority is not yet aligned, slice status remains `Planned` and cannot move to `Backend Ready`.

## Standards and DB workflow authority

- Standards authority for BASE execution is defined in [`BASE-architecture.md`](./BASE-architecture.md#standards-and-authority-links).
- Supabase DB inspection/change workflow authority is defined in [`BASE-architecture.md`](./BASE-architecture.md#database-and-supabase-mcp-workflow-ai-execution).
- Requirement slices should reference these BA00 sections instead of duplicating conflicting variants.

## Engineering workflow

- Harden requirement slices until implementation-directive and queue-ready.
- Verify backend-ready evidence and freeze backend contracts for the run.
- Build and verify slices sequentially from `docs/delivery/base-build-queue.md`.
- Treat missing or undefined contracts as blockers; do not proceed with assumptions or route-local stubs.
- Execute manual QA packs, classify findings, then run a dependency-safe delta queue for impacted slices only.
- Publish run outcomes and resume state in `docs/delivery/`.

Run modes for unattended execution:

- `base-only overnight`: BASE lane rows only
- `external-consumer-only overnight`: External consumer lane rows only
- `coordinated multi-lane run`: separate lane queues executed with artifact refresh between runs

## Document statuses

Use a consistent status model across the brief, architecture references, and slices:

- Draft
- Planned
- Backend Ready
- Built
- QA
- Done

## Generated artifacts

- Build queue: `docs/delivery/base-build-queue.md`
- Test packs: `docs/test-packs/[SLICE_ID]-qa-pack.md`
- Queue-row execution evidence in `docs/delivery/base-build-queue.md`
- Backend-ready evidence report: `docs/delivery/[APP]-backend-ready-report.md`
- Run summary: `docs/delivery/[APP]-run-summary-[YYYY-MM-DD].md`

Not required by this workflow:

- Per-slice plan docs (`docs/delivery/plans/*`)

Transitional note:

- Existing slices may still reference `docs/delivery/backend-delta-backlog.md` while migrating to queue-row blocker evidence in `docs/delivery/base-build-queue.md` and run reports. Queue and report evidence remains the required authority for execution.

## Rebuild framing

- This rebuild is documentation-first.
- Authoritative bounded-context and slice requirements live under [`BASE-architecture.md`](./BASE-architecture.md) and `BA*` requirement docs in this folder.
- The legacy codebase is observational only and not authoritative.
- Legacy behaviour is not automatically preserved.
- `pace-core2` is the target shared foundation.
- No implementation should begin while known blocking ambiguities remain unresolved.

## Scope boundaries

- Included:
  - authenticated BASE app shell, auth boundaries, navigation, and route ownership
  - event dashboard and event configuration
  - form definition and form-driven data capture contracts
  - application operations, registration types, registration scope, approval workflow, and related consent capture at application time
  - units, unit roles, and sub-unit activity preferences
  - participant activity offering, **organiser** session setup, booking oversight, and booking-time consent contracts (participant booking UI is external to BASE implementation scope per [`BASE-architecture.md`](./BASE-architecture.md))
  - **operator** scanning flows and supporting operational interfaces (not an external member-facing app)
  - event-scoped reporting across the approved BASE domains: participant, unit, activity, and scan
- Excluded:
  - legacy-code remediation inside `src/`
  - post-MVP items already called out in the April 2026 feature brief
  - event lead/EOI participant journeys in the current MVP wave
  - production-schema inference
  - unapproved preservation of generic form-to-arbitrary-table write behaviour
- Intentionally redesigned:
  - dependency model from legacy `pace-core` usage to `pace-core2`
  - slice planning, routing ownership, and implementation workflow
  - backend contract expectations for privileged workflows such as approvals, magic-link handling, and scanning sync
  - registration as a purpose-built workflow with configurable form content, rather than a generic form owning BASE application creation

## Out of scope

- No legacy-code remediation inside `src/`
- No production-schema inference
- No automatic preservation of generic form-to-arbitrary-table write behaviour
- No post-MVP items already excluded by the April 2026 feature brief

## Related documents (optional)

- [`BASE-architecture.md`](./BASE-architecture.md) - canonical route ownership, cross-slice boundaries, and implementation order.
- [`BASE-feature-list.md`](./BASE-feature-list.md) - traceability index of capabilities and source references.

## Known redesign areas

- registration workflow ownership
- forms platform architecture and app/core boundary
- participant-facing surface ownership treated as external to BASE delivery; BASE owns workflows/RPCs and organiser UI only ([`BASE-architecture.md`](./BASE-architecture.md) cross-cutting boundary)
- event configuration alignment to validated `core_events` rather than the legacy screen

## Constraints and assumptions

- The rebuild docs are the implementation authority.
- The current legacy app is useful evidence, but not the contract.
- The current legacy app should be treated as a POC and may be structurally wrong in multiple areas.
- The attached BASE feature brief is in-scope and overrides missing legacy UI coverage.
- Supabase schema validation must use dev-db via MCP, not production, and must follow [`BASE-architecture.md`](./BASE-architecture.md#database-and-supabase-mcp-workflow-ai-execution).
- A local `../pace-core2` workspace exists and is the best available dependency reference until the shared package location in `solvera/pace-core` is finalised.
- Consuming-app code in this rebuild reuses `@solvera/pace-core` primitives first; local wrappers/replacements for existing shared components/hooks are treated as contract drift unless explicitly approved in slice docs.
- Shared forms-platform delivery in BASE depends on [`CR21-workflow-forms-runtime.md`](../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md) (canonical forms platform architecture in **Forms platform architecture (canonical)**).
- Shared reporting delivery in BASE depends on [`CR22-shared-reporting-foundations.md`](../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md) (canonical reporting architecture in **Reporting architecture (canonical)**).
- Shared communications delivery in BASE depends on [`CR23-comms-platform.md`](../../../packages/core/docs/requirements/CR23-comms-platform.md) (canonical comms architecture in **Comms architecture (canonical)**).
- Route ownership, slice dependencies, and implementation order are owned by the `Implementation plan` section in [`BASE-architecture.md`](./BASE-architecture.md).
- Key BASE workflow structures have now been validated against the current dev-db, including the new registration, approval, booking, consent, scanning, and `core_events.registration_scope` structures.
- Participant-facing BASE module journeys remain in scope as contracts and backend behavior; UI delivery is an external dependency outside BASE implementation scope.

## Tech stack

- Shared foundation: local `../pace-core2/packages/core` evolving toward `solvera/pace-core`
- Frontend stack baseline: React 19, TypeScript, React Router, TanStack Query
- Data source and schema validation: Supabase dev-db via MCP
- DB verification/change sequence: follow the canonical BA00 architecture MCP workflow (inspect -> delta-only -> verify -> blocker on ambiguity)
- Legacy package usage patterns should not be assumed valid

## Repo structure

- `docs/requirements/base/` contains the BASE project brief, architecture, and bounded-context slices used for implementation prompts.
- `docs/requirements/base/` contains implementation-sized requirement docs (`BA00` through `BA18`) that map to route ownership and dependency order.
- Supporting docs referenced by BASE requirements live under `docs/requirements/` and `docs/database/`, plus shared requirement docs in `packages/core/docs/requirements/`.

## Quality gates

- Project brief, architecture, shared constraints, slices, and explicit upstream dependencies are internally consistent.
- Known blockers have been surfaced and logged.
- No unresolved critical ambiguity affecting behaviour, scope, architecture, permissions, data contracts, UX, or slice boundaries is hidden in prose.
- Each slice is implementation-sized for a single reliable Cursor prompt.
- Route ownership is explicit, conflict-free, and owned only once in [`BASE-architecture.md`](./BASE-architecture.md).
- `pace-core2` migration assumptions are explicit.
- `pace-core2` adoption guardrails are explicit so consuming apps do not rebuild shared components/hooks/services locally.
- Automated implementations follow [UI data binding guardrails](./BASE-architecture.md#automated-implementation-ui-data-binding), including real contract wiring for shipping UI and seed/RPC setup for non-empty QA states where required.
- Legacy behaviour is only preserved where explicitly re-approved for the rebuild.
- Event configuration scope follows the validated dev-db contract rather than the current legacy configuration screen.
- Registration workflows must remain event-customisable even though application creation is treated as a first-class BASE workflow rather than a generic form submit.
- Consumer-app quality gates must pass (`npm run validate`, including lint, type-check, tests, and build) before a slice can move from `Built` to `QA`.

## Blocker and stop conditions

- Stop when required schema/RPC/RLS contracts are missing, unstable, or contradictory with slice authority.
- Stop when backend-ready evidence is missing; do not start frontend queue execution.
- Stop when a slice depends on unresolved upstream shared contracts (`CR21`, `CR22`, `CR23`) and the dependency is not marked backend ready.
- Stop when a requirement slice, architecture contract, and implementation behavior disagree without an explicit tie-break update in the owning authority document (slice and/or architecture).
- Missing contracts are blockers, not permission to stub.
