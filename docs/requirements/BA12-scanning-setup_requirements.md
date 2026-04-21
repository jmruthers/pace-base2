# BA12 Scanning Setup

## Slice metadata

- Status: Planned
- Depends on: BA01, BA09
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: Backend-ready only
- Ownership notes:
  - Backend: Owns scan-point, manifest eligibility, and event-history read contracts.
  - Frontend: Owns `/scanning` admin/ops setup and operator entrypoint UX.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA12-scanning-setup_requirements.md`**

## Overview

This slice owns `/scanning` as the event-operator admin and ops surface for participant scanning. It covers scan-point creation and configuration, manifest download, conflict review entrypoints, and scan-history access for authorised event staff.

## Current baseline behavior

The legacy app does not provide a documented participant-scanning admin or ops UI. There is no authoritative legacy contract for scan-point setup, manifest handling, or operational review, so the rebuild starts from the approved scanning brief and explicit rebuild decisions rather than copied implementation.

## Rebuild delta

### Summary

- What changes: Defines `/scanning` as scan-point setup and ops hub with manifest and review entrypoints.
- What stays: Queue/sync semantics remain in BA14; runtime behavior remains in BA13.

Provide an operator-facing scanning admin and ops surface that lets an authorised event team:

- create, edit, and deactivate scan points
- bind each scan point to a supported context such as site, activity, transport, or meal
- configure direction and resource targeting explicitly
- download on-demand manifests for supported offline contexts
- review unresolved sync conflicts and operational scan-history detail
- launch or hand off into the live runtime for a chosen scan point
- keep card lifecycle work out of BASE while still exposing the card-backed scan history needed for event operations

`/scanning` is the admin and ops hub for scanning. It is not the handheld runtime and it is not the live dashboard.

Boundary guardrails for this slice:

- `BA12` owns scan-point setup, manifest download entrypoints, conflict review entrypoints, and scan-history access only.
- `BA12` must not define offline queue state, upload retry rules, idempotency semantics, or conflict persistence rules; those belong to `BA14`.
- `BA12` may surface conflict and history review entrypoints, but it must consume the sync semantics defined by `BA14` rather than inventing them locally.

### pace-core2 delta

`pace-core2` supplies auth, RBAC, secure-client, and shared form primitives. This slice adds scanning-domain workflow and operational mapping that do not exist in `pace-core2`, and it must not reintroduce legacy direct table-write behaviour.

### pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/providers`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

### Data and schema references

- `core_member_card`: reusable card identity and active-state source for scan eligibility; TEAM-owned for lifecycle management
- `base_scan_point`: scan-point configuration, including `context_type`, `direction`, `resource_type`, and `resource_id`
- `base_scan_event`: immutable scan-event history and conflict-review source
- `base_application`: approved application source for site and meal manifest generation
- `base_activity_booking`: confirmed booking source for activity manifests
- `trac_itinerary_assignment`: confirmed transport-assignment source for transport manifests

Approved scanning authority for this slice:

- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy archive — DEC-066)
- [`../../../database/domains/base.md`](../../../database/domains/base.md) (live schema — authoritative)

Approved rebuild deltas that require upstream `pace-core2` follow-up:

- transport offline manifests are included in BASE MVP
- card lifecycle remains TEAM-owned and is not a BASE admin workflow
- scan-event persistence will move to separate `validation_result` and `validation_reason` fields

Manifest contract for this slice:

- manifests are generated on demand per scan point; no DB snapshot table in MVP
- manifests are participant-only and exclude coordinators or staff without participant applications
- `site`: all active card identifiers with an approved application for the event
- `activity`: active card identifiers with a confirmed `base_activity_booking` for the linked session
- `transport`: active card identifiers with a confirmed transport assignment for the linked leg
- `meal`: all active card identifiers with an approved application for the event

Card ownership contract for this slice:

- card issue, deactivate, and replace remain TEAM-owned
- BASE may read card-backed scan history but must not become the canonical card-management workflow

## Acceptance criteria

- `/scanning` loads an event-scoped scanning admin and ops surface for authorised users.
- A user can create a scan point for a supported context and save its resource binding and direction.
- A user can edit or deactivate an existing scan point without editing historical scan events.
- A user can download an on-demand manifest for a manifest-supported scan point, including transport.
- Operational review from `/scanning` can surface unresolved conflicts and scan-history detail without mutating immutable scan events.
- Validation failures for missing event context, invalid resource binding, unsupported context/direction combinations, or missing linked resources surface inline.
- Unauthorised users see an access-denied state rather than a partial setup UI.

## API / Contract

- Scan-point list contract for the selected event context
- Scan-point create/update/deactivate contract
- On-demand manifest download contract for site, activity, transport, and meal scan points
- Conflict-list and conflict-detail read contract
- Scan-history read contract for participant and card-backed audit within event ops
- Event-scoped permission contract for viewing and mutating scanning admin/ops surfaces

## Visual specification

Use a dense operator surface optimised for event staff rather than a consumer-facing or marketing-style page.

- scan-point list first, editor second
- clear admin/ops sections for scan points, manifests, and conflict/history review
- compact cards or table rows for existing scan points
- explicit status chips for active, inactive, and offline-capable points
- launch actions into the live runtime from the relevant scan point
- event selector or event context summary visible at all times
- form controls sized for fast operator use on desktop and tablet

## Verification

- Create a scan point for a valid event and context.
- Edit the scan point to change resource binding or direction.
- Deactivate the scan point and confirm it no longer appears as live.
- Download a valid manifest for site, activity, transport, and meal contexts where applicable.
- Review an unresolved conflict from `/scanning` and confirm the immutable event history is visible.
- Attempt to save an invalid context or resource and confirm the validation failure is clear.
- Attempt access with an unauthorised role and confirm the access-denied state.

## Testing requirements

- Happy path: create and update a valid scan point
- Happy path: download a valid manifest for a supported scan point
- Validation failure: reject unsupported context, invalid direction, missing event, or invalid resource binding
- Auth/permission failure: block a user without scanning-admin permission

## Acceptance traceability

- Scan-point management criteria -> `/scanning` create/edit/deactivate implementation -> Scan-point CRUD and deactivation tests.
- Manifest and review-entry criteria -> On-demand manifest + conflict/history entrypoint contracts -> Manifest generation and review-access tests.
- Validation and permission criteria -> Context/resource validation + RBAC contracts -> Invalid config and unauthorized access tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for scan-point lifecycle, manifest downloads by context, conflict/history review entry, invalid config saves, and denied access.
- Expected outcomes: Setup and ops workflows match context contracts and do not mutate immutable scan history.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: unresolved scan-point schema constraints, missing manifest source contracts, or unresolved role permissions for scanning admin.

## Done criteria

- Tests pass: Scan-point setup, manifest generation, validation, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA12 remains aligned with BA13/BA14 boundaries and database authority references.

## Do not

- Do not copy legacy scanning setup behaviour or legacy form wiring.
- Do not model scan events as editable setup records.
- Do not treat manifest eligibility as a hidden boolean rule detached from scan-point context.
- Do not move card issue/deactivate/replace into BASE while cards remain member-scoped in `core_member_card`.
- Do not introduce a device registry for MVP.
- Do not invent a persisted manifest table unless that contract is explicitly approved elsewhere.
- Do not define queue semantics, upload retry behaviour, or conflict-resolution rules in this slice.

## References

- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the pace-core2 compliance rules in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
