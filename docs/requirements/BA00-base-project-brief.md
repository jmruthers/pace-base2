# BASE project brief

## Filename convention

BASE project brief docs in this requirement family use:

**`BA00-base-project-brief.md`**

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
- An organiser-facing BASE shell for event operations, with **participant-facing module journeys implemented in pace-portal** (single member-facing app) rather than duplicate participant SPAs in BASE.
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

## Delivery model

- Requirement slices drive delivery: `docs/requirements/base/BA##_..._requirements.md` slices define implementation scope, dependency order, and acceptance contracts; architecture implementation-plan ordering is authoritative.
- Backend aggregated then frozen: Schema/RPC/RLS prerequisites are aggregated across slices first and treated as backend-ready gates before frontend slice execution.
- Frontend executed sequentially: Frontend implementation proceeds in architecture-plan dependency order (BA00 -> BA16 -> BA15) with portal-owned participant surfaces honoring BASE workflow-contract ownership.

## Source of truth hierarchy

Use this order when documentation or implementation appears to conflict:

1. Requirement slices in `docs/requirements/base/*_requirements.md`
2. `BA00-base-architecture.md`
3. This project brief
4. Existing codebase implementation details

Tie-break rules for recurring conflict classes:

- Route ownership and execution order are always resolved by the `Implementation plan` and route-ownership tables in `BA00-base-architecture.md`.
- Schema, RPC, and RLS shape disputes are resolved by approved database authority references linked in the owning slice (for example `docs/database/domains/base.md`) plus the active backend-delta backlog.
- If a slice requires backend deltas but shared backend authority is not yet aligned, slice status remains `Planned` and cannot move to `Backend Ready`.

## Engineering workflow

- Plan per slice: Maintain or update a slice-level implementation plan before coding each slice.
- Backend backlog: Track backend prerequisites (schema, RPC, RLS, integration contracts) as a consolidated backlog in `docs/delivery/backend-delta-backlog.md` before frontend execution. Any slice with backend write impact must list the exact required deltas in that backlog before implementation starts.
- Backend ready gate: Treat unresolved backend-owned workflow gaps, schema mismatches, or RLS ambiguity as stop conditions.
- Sequential execution: Build and verify slices in dependency order from the architecture implementation plan and active queue in `docs/delivery/build-queue.md`; avoid parallel execution that bypasses contract handoffs.
- Manual QA + feedback loop: Execute verification scenarios per slice using packs in `docs/delivery/test-packs/`, log failures/blockers, patch contracts or implementation, then re-run QA until acceptance criteria are met and record outcomes in `docs/delivery/reports/`.

## Document statuses

Use a consistent status model across the brief, architecture references, and slices:

- Draft
- Planned
- Backend Ready
- Built
- QA
- Done

## Generated artifacts

- Plan files: Slice-level execution plans and implementation notes in `docs/delivery/plans/`.
- Backend backlog: Consolidated prerequisite contract backlog spanning schema/RPC/RLS dependencies in `docs/delivery/backend-delta-backlog.md`.
- Build queue: Architecture `Implementation plan` in `BA00-base-architecture.md` plus active execution tracking in `docs/delivery/build-queue.md`.
- Test packs: Per-slice verification and manual QA scenario packs derived from slice `Verification` and `Testing requirements`.
- Reports: Validation/QA completion records tied to slice acceptance outcomes in `docs/delivery/reports/`.

## Rebuild framing

- This rebuild is documentation-first.
- Authoritative bounded-context and slice requirements live under [`BA00-base-architecture.md`](./BA00-base-architecture.md) and `BA*` requirement docs in this folder.
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
  - participant activity offering, **organiser** session setup, booking oversight, and booking-time consent **contracts** (participant booking **UI** in pace-portal per [`BA00-base-architecture.md`](./BA00-base-architecture.md))
  - **operator** scanning flows and supporting operational interfaces (not portal)
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

## Known redesign areas

- registration workflow ownership
- forms platform architecture and app/core boundary
- participant-facing surface ownership consolidated in **pace-portal**; BASE owns workflows/RPCs and organiser UI only ([`BA00-base-architecture.md`](./BA00-base-architecture.md) cross-cutting boundary)
- event configuration alignment to validated `core_events` rather than the legacy screen

## Constraints and assumptions

- The rebuild docs are the implementation authority.
- The current legacy app is useful evidence, but not the contract.
- The current legacy app should be treated as a POC and may be structurally wrong in multiple areas.
- The attached BASE feature brief is in-scope and overrides missing legacy UI coverage.
- Supabase schema validation must use dev-db via MCP, not production.
- A local `../pace-core2` workspace exists and is the best available dependency reference until the shared package location in `solvera/pace-core` is finalised.
- Consuming-app code in this rebuild reuses `@solvera/pace-core` primitives first; local wrappers/replacements for existing shared components/hooks are treated as contract drift unless explicitly approved in slice docs.
- Shared forms-platform delivery in BASE depends on [`CR21-workflow-forms-runtime.md`](../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md) (canonical forms platform architecture in **Forms platform architecture (canonical)**).
- Shared reporting delivery in BASE depends on [`CR22-shared-reporting-foundations.md`](../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md) (canonical reporting architecture in **Reporting architecture (canonical)**).
- Route ownership, slice dependencies, and implementation order are owned by the `Implementation plan` section in [`BA00-base-architecture.md`](./BA00-base-architecture.md).
- Key BASE workflow structures have now been validated against the current dev-db, including the new registration, approval, booking, consent, scanning, and `core_events.registration_scope` structures.
- Participant-facing BASE module journeys remain in scope as **contracts and backend behaviour**; **UI** is delivered through **pace-portal** (see [`BA00-base-architecture.md`](./BA00-base-architecture.md) and [`../portal/PR00-portal-architecture.md`](../portal/PR00-portal-architecture.md)).

## Tech stack

- Shared foundation: local `../pace-core2/packages/core` evolving toward `solvera/pace-core`
- Frontend stack baseline: React 19, TypeScript, React Router, TanStack Query
- Data source and schema validation: Supabase dev-db via MCP
- Legacy package usage patterns should not be assumed valid

## Repo structure

- `docs/requirements/base/` contains the BASE project brief, architecture, and bounded-context slices used for implementation prompts.
- `docs/requirements/base/` contains implementation-sized requirement docs (`BA00` through `BA16`) that map to route ownership and dependency order.
- Supporting docs referenced by BASE requirements live under `docs/requirements/` and `docs/database/`, plus shared requirement docs in `packages/core/docs/requirements/`.

## Quality gates

- Project brief, architecture, shared constraints, slices, and explicit upstream dependencies are internally consistent.
- Known blockers have been surfaced and logged.
- No unresolved critical ambiguity affecting behaviour, scope, architecture, permissions, data contracts, UX, or slice boundaries is hidden in prose.
- Each slice is implementation-sized for a single reliable Cursor prompt.
- Route ownership is explicit, conflict-free, and owned only once in [`BA00-base-architecture.md`](./BA00-base-architecture.md).
- `pace-core2` migration assumptions are explicit.
- `pace-core2` adoption guardrails are explicit so consuming apps do not rebuild shared components/hooks/services locally.
- Legacy behaviour is only preserved where explicitly re-approved for the rebuild.
- Event configuration scope follows the validated dev-db contract rather than the current legacy configuration screen.
- Registration workflows must remain event-customisable even though application creation is treated as a first-class BASE workflow rather than a generic form submit.
