# BASE project brief

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
- Define implementation-ready bounded contexts and slice boundaries before coding begins.
- Bring schema-complete April 2026 BASE features into documented rebuild scope, even where the legacy app has no UI.
- Remove undocumented legacy coupling, especially direct client-side data writes and implicit RBAC or routing assumptions.
- Make route ownership, dependencies, and implementation order explicit and conflict-free in the authoritative docs.

### Non-goals

- Preserving legacy behaviour solely because it exists today.
- Editing the legacy codebase to repair or modernise it.
- Treating generated frontend DB types as current schema authority.
- Pulling requirements from production DB behaviour.

## Rebuild framing

- This rebuild is documentation-first.
- Authoritative bounded-context and slice requirements live under [`architecture.md`](./architecture.md) and [`slices/`](./slices/).
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
  - participant activity offering, **organiser** session setup, booking oversight, and booking-time consent **contracts** (participant booking **UI** in pace-portal per [`architecture.md`](./architecture.md))
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

## Known exclusions

- No legacy-code remediation inside `src/`
- No production-schema inference
- No automatic preservation of generic form-to-arbitrary-table write behaviour
- No post-MVP items already excluded by the April 2026 feature brief

## Known redesign areas

- registration workflow ownership
- forms platform architecture and app/core boundary
- participant-facing surface ownership consolidated in **pace-portal**; BASE owns workflows/RPCs and organiser UI only ([`architecture.md`](./architecture.md) cross-cutting boundary)
- event configuration alignment to validated `core_events` rather than the legacy screen

## Constraints and assumptions

- The rebuild docs are the implementation authority.
- The current legacy app is useful evidence, but not the contract.
- The current legacy app should be treated as a POC and may be structurally wrong in multiple areas.
- The attached BASE feature brief is in-scope and overrides missing legacy UI coverage.
- Supabase schema validation must use dev-db via MCP, not production.
- A local `../pace-core2` workspace exists and is the best available dependency reference until the shared package location in `solvera/pace-core` is finalised.
- Shared forms-platform delivery in BASE depends on:
  - [`ARC-CORE-forms-platform-rescope.md`](../ARC-CORE-forms-platform-rescope.md)
  - [`CR23-workflow-forms-runtime.md`](../../../packages/core/docs/requirements/CR23-workflow-forms-runtime.md)
- Shared reporting delivery in BASE depends on:
  - [`ARC-REPORTING-architecture.md`](../ARC-REPORTING-architecture.md)
  - [`CR24-shared-reporting-foundations.md`](../../../packages/core/docs/requirements/CR24-shared-reporting-foundations.md)
- Route ownership, slice dependencies, and implementation order are owned by the `Implementation plan` section in [`architecture.md`](./architecture.md).
- Key BASE workflow structures have now been validated against the current dev-db, including the new registration, approval, booking, consent, scanning, and `core_events.registration_scope` structures.
- Participant-facing BASE module journeys remain in scope as **contracts and backend behaviour**; **UI** is delivered through **pace-portal** (see [`architecture.md`](./architecture.md) and [`../portal/PR00-portal-architecture.md`](../portal/PR00-portal-architecture.md)).

## Tech and dependency assumptions

- Shared foundation: local `../pace-core2/packages/core` evolving toward `solvera/pace-core`
- Frontend stack baseline: React 19, TypeScript, React Router, TanStack Query
- Data source and schema validation: Supabase dev-db via MCP
- Legacy package usage patterns should not be assumed valid

## Quality gates

- Project brief, architecture, shared constraints, slices, and explicit upstream dependencies are internally consistent.
- Known blockers have been surfaced and logged.
- No unresolved critical ambiguity affecting behaviour, scope, architecture, permissions, data contracts, UX, or slice boundaries is hidden in prose.
- Each slice is implementation-sized for a single reliable Cursor prompt.
- Route ownership is explicit, conflict-free, and owned only once in [`architecture.md`](./architecture.md).
- `pace-core2` migration assumptions are explicit.
- Legacy behaviour is only preserved where explicitly re-approved for the rebuild.
- Event configuration scope follows the validated dev-db contract rather than the current legacy configuration screen.
- Registration workflows must remain event-customisable even though application creation is treated as a first-class BASE workflow rather than a generic form submit.
