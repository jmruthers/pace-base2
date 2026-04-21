# BA16 Scanning Tracking Dashboard

## Slice metadata

- Status: Planned
- Depends on: BA08, BA11, BA12, BA13, BA14
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: Backend-ready only
- Ownership notes:
  - Backend: Owns scan-derived tracking query semantics and permission contracts.
  - Frontend: Owns `/scanning/tracking` operational dashboard UX and refresh-driven views.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA16-scanning-tracking-dashboard_requirements.md`**

## Overview

This slice owns `/scanning/tracking` as the live operational tracking surface for participant scanning. It covers headcount, location-state dashboards, attendance and boarding views, and other refresh-based tracking views derived from scan events.

## Current baseline behavior

The legacy app does not provide an authoritative scanning dashboard or live tracking contract. There is no legacy operational dashboard behaviour that should be treated as binding.

## Rebuild delta

### Summary

- What changes: Defines refresh-based operational tracking dashboards derived from immutable scan history.
- What stays: No realtime push guarantee in MVP; card lifecycle remains TEAM-owned.

Provide a refresh-based tracking surface that lets authorised event operators:

- see how many participants are currently on-site and off-site
- break down current presence by unit, subcamp, activity, transport context, or off-site state where derivable from scan history
- see who has never scanned
- compare activity attendance scans against confirmed bookings
- compare transport boarding scans against confirmed assignments
- inspect participant scan history in event context

This page is a live operational dashboard, not the handheld scanning runtime and not the scanning admin/ops hub.

### pace-core2 delta

`pace-core2` provides auth, RBAC, secure data access, and generic display components. This slice adds the scan-derived operational view logic that is specific to BASE and must not be inferred ad hoc in page code.

### pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/providers`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

### Data and schema references

- `base_scan_event`: immutable event stream that drives presence and attendance views
- `base_scan_point`: scan-point context, direction, and resource binding used to interpret scans
- `base_application`: approved participant population and event-scope anchor
- `base_units`: unit and subcamp breakdowns for participant presence
- `base_activity_booking`: confirmed activity bookings used to compare scans against expected attendance
- `trac_itinerary_assignment`: confirmed transport assignments used to compare boarding scans against expected passengers

Approved scanning authority for this slice:

- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy archive — DEC-066)
- [`../../../database/domains/base.md`](../../../database/domains/base.md) (live schema — authoritative)

Approved rebuild deltas that require upstream `pace-core2` follow-up:

- transport offline manifests are included in BASE MVP
- persisted scan outcome must be split into `validation_result` and `validation_reason`

Tracking derivation contract for this slice:

- on-site versus off-site state is derived from site `in` and `out` scans, not from mutable participant flags
- activity and transport presence views use the latest relevant accepted scan events plus the linked booking or assignment population
- “never scanned” means no scan attempt event (accepted, rejected, or upload-conflicted) has been recorded for that participant in the event context
- dashboards are refresh-based in MVP; no realtime push contract is assumed

Card ownership contract for this slice:

- card lifecycle remains TEAM-owned
- BASE tracking may surface scan history keyed by participant or card identifier, but it does not own card issue or replacement workflows

## Acceptance criteria

- `/scanning/tracking` loads an event-scoped operational tracking surface for authorised users.
- The dashboard can show current on-site and off-site headcount.
- The dashboard can show participant location-state breakdowns where derivable from scan events.
- Activity attendance can be compared against confirmed bookings.
- Transport boarding can be compared against confirmed assignments.
- The dashboard can surface participants who have never scanned.
- The surface remains refresh-based rather than promising realtime push in MVP.
- Unauthorised users see an access-denied state rather than partial tracking data.

## API / Contract

- Headcount and location-state query contract
- Activity attendance comparison contract
- Transport boarding comparison contract
- Participant scan-history read contract
- Event-scoped permission contract for tracking access

## Visual specification

Use a dense operational dashboard, not a marketing-style analytics page.

- high-signal summary cards first
- clear tabs or sections for site presence, activity attendance, transport boarding, and participant history
- explicit refresh actions and last-updated timestamps
- filters for event, scan-point context, activity session, transport leg, unit, and subcamp where relevant
- layout optimised for desktop or large-tablet operations use

## Verification

- Load `/scanning/tracking` and confirm event-scoped summary counts appear.
- Refresh the page after new scans and confirm summary counts update.
- Open an activity attendance view and confirm scanned participants can be compared against confirmed bookings.
- Open a transport boarding view and confirm boarded versus not-yet-boarded participants can be compared against confirmed assignments.
- Open a participant history view and confirm scans appear chronologically in event context.
- Attempt access with an unauthorised role and confirm the access-denied state.

## Testing requirements

- Happy path: load the dashboard and derive current on-site and off-site counts
- Happy path: derive activity attendance and transport boarding comparisons from scan plus booking/assignment data
- Validation failure: reject malformed or unsupported filter combinations cleanly
- Auth/permission failure: block a user without tracking permission

## Acceptance traceability

- Tracking visibility criteria -> `/scanning/tracking` summary and breakdown implementation -> Headcount and location-state derivation tests.
- Comparison criteria -> Activity/transport comparison contracts -> Booking/assignment vs scan comparison tests.
- Access and refresh criteria -> Event-scoped permission + refresh-based behavior -> Unauthorized access and refresh-state update tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for summary counts, refreshed tracking updates, activity/transport comparisons, participant history, and denied access.
- Expected outcomes: Dashboard remains scan-derived, refresh-based, and operationally actionable.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: unresolved derivation rules for presence state, missing compare-query contracts, or missing tracking permission mapping.

## Done criteria

- Tests pass: Tracking derivation, comparison views, filter validation, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA16 remains aligned with scanning authority and BA13/BA14 dependencies.

## Do not

- Do not invent mutable “current location” columns when the contract is scan-derived.
- Do not promise realtime WebSocket updates in MVP.
- Do not turn this dashboard into the handheld scanning runtime.
- Do not move card issue/deactivate/replace into this slice.

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
