# BASE Backend Delta Backlog (Authoritative)

## Purpose

This is the single authoritative backend backlog for BASE Phase 2+, aggregated from all Phase 1 slice plans (`BA00`-`BA16`).

## Status model

- `Open`: approved and pending implementation.
- `In progress`: implementation started in schema-owning repo.
- `Resolved`: implemented and verified with evidence linked.
- `Deferred`: intentionally postponed (must include reason and unblock condition).

## Ownership model

- **Shared forms owner**: cross-app forms contracts (CR21-aligned).
- **Shared reporting owner**: cross-app reporting contracts (CR22-aligned).
- **BASE backend owner**: BASE domain schema, RPC, RLS, and projections.
- **App integration owner (BASE app)**: consumer wiring and type adoption after backend readiness.

## Dedupe and conflict resolution decisions (resolved)

- Forms contract asks from BA02/BA03/BA05a/BA10 are deduped into `BD-002`, `BD-003`, and `BD-004`.
- Application lifecycle asks from BA05a/BA05b/BA06 are deduped into `BD-006` plus `BD-008`.
- Booking asks from BA10/BA11 are deduped into `BD-011`.
- Scanning asks from BA12/BA13/BA14/BA16 are split by hard ownership boundary:
  - BA12 owns setup/manifest only (`BD-012`)
  - BA13 owns runtime validation mapping (`BD-013`)
  - BA14 owns sync/idempotency/conflicts (`BD-014`)
  - BA16 owns tracking projections (`BD-015`)
- Participant-facing UI ownership conflicts are resolved: BASE owns contracts; pace-portal owns participant routes (BA05a/BA05b/BA07/BA10).

## Aggregated backlog

| Delta ID | Domain | Slices | Schema changes | RPC changes | RLS changes | Shared type impacts | Migration/seed requirements | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BD-001 | Event config | BA01 | Finalize `core_events` editable allowlist including `registration_scope`; enforce non-editable system fields | Optional contract wrapper for safe updates | Restrict updates to allowed organiser roles | Update event configuration DTOs and generated app types | Backfill `registration_scope` defaults where null | BASE backend owner | Resolved |
| BD-002 | Shared forms workflow metadata | BA02, BA03, BA05a, BA10 | Add/confirm `workflow_type`, `access_mode`, `workflow_config`, `owner_app_id` in `core_forms` | Add/confirm form definition and publish/read RPCs under CR21 model | Authoring vs submitter role boundaries by workflow/access mode | Introduce canonical workflow/access enums and form metadata types | Migration to populate new metadata fields for legacy rows | Shared forms owner | Resolved |
| BD-003 | Shared forms field/response identity | BA02, BA03, BA05a | Move to `field_key` in form fields/values; use `workflow_subject_type/id` in responses | Update submission/read RPCs to consume new identity model | Ensure subject-bound response access by actor role | Replace legacy table/column-targeted payload types with `field_key` model | Data migration remapping legacy field identity to `field_key` | Shared forms owner | Resolved |
| BD-004 | Forms legacy contract removal | BA02 | Remove rebuild dependency on `core_form_context_types` and `core_form_field_config` | Remove/retire RPCs that depend on removed tables | Remove stale policies tied only to retired tables | Remove obsolete generated types and references | Safe drop migration after compatibility window; no seed required | Shared forms owner | Resolved |
| BD-005 | Registration policy setup | BA04 | Normalize requirement ordering and eligibility schema constraints | Add/confirm policy CRUD and ordering RPCs | Enforce admin-only policy writes; scoped reader roles | Add policy requirement/eligibility contract types | Optional normalization migration for sort/order integrity | BASE backend owner | Resolved |
| BD-006 | Application lifecycle | BA05a, BA05b, BA06 | Confirm status/check state shape (`base_application`, `base_application_check`) | Backend-owned create/transition/check-activation RPC flow | Actor-based lifecycle mutation controls | Canonical application status/check-state type unions | Backfill status/check invariants where legacy rows violate flow | BASE backend owner | Resolved |
| BD-007 | Token approval lifecycle | BA05a, BA07 | Confirm token hash/expiry single-use fields on check records | Submit/resolve/reissue token RPCs with invalidation semantics | Public token actions constrained to scoped contract; admin resend/reissue restricted | Add token action request/result and error-state types | Expire stale active tokens during rollout; no seed required | BASE backend owner | Resolved |
| BD-008 | Admin review override + audit | BA06 | Persist override/audit metadata for manual decisions | Review decision and override RPC endpoints | Restrict override authority to event admins; preserve reviewer visibility | Add review decision/audit trail types | Migration to initialize audit columns for historical overrides (if present) | BASE backend owner | Resolved |
| BD-009 | Units + preferences | BA08 | Validate preference rank constraints and unit-role integrity | Preference submit/update RPCs | Unit leadership and coordinator write boundaries | Add unit preference ranking and role-assignment types | Optional dedupe migration for duplicate rank rows per unit/session | BASE backend owner | Resolved |
| BD-010 | Activity setup | BA09 | Enforce offering/session constraints (capacity/window/time validity) | Offering/session management RPCs | Restrict setup mutations to organiser roles | Add offering/session contract and validation result types | Data cleanup migration for invalid legacy session windows | BASE backend owner | Resolved |
| BD-011 | Booking contracts | BA10, BA11 | Confirm booking state fields and constraint support | Booking create/cancel/ops RPCs with conflict/capacity/window checks | Participant/coordinator/admin permissions for booking actions | Add booking status/source/conflict projection types | Optional migration to normalize historical booking statuses | BASE backend owner | Resolved |
| BD-012 | Scanning setup + manifests | BA12 | Confirm scan-point and manifest contract fields | Setup/manifest generation RPCs only | Setup/admin access policies for scanning resources | Add scan-point and manifest payload types | No seed required; optional scan-point defaults migration | BASE backend owner | Resolved |
| BD-013 | Scanning runtime validation | BA13 | Confirm persisted `validation_result` + `validation_reason` mapping | Runtime scan submit/manual/override RPCs | Runtime operator permissions and override boundaries | Add canonical runtime outcome -> persistence mapping types | No seed required; optional remap migration for legacy outcome values | BASE backend owner | Resolved |
| BD-014 | Scanning sync + reconciliation | BA14 | Confirm sync tracking/idempotency/conflict schema support | Ingest-only sync RPCs with idempotency key semantics | Sync upload permissions by device/operator context | Add sync payload, idempotency, and conflict result types | Migration for idempotency key backfill where required | BASE backend owner | Resolved |
| BD-015 | Scanning tracking projections | BA16 | Add/confirm projection/view support for tracking states | Tracking read RPC/view endpoints | Read policies for operations dashboards | Add tracking aggregates and `neverScanned` projection types | No seed required; projection refresh/backfill job may be needed | BASE backend owner | Resolved |
| BD-016 | Shared reporting foundations | BA15 | CR22-aligned field catalog/explore/template schema alignment | Shared reporting query/template RPCs | Reporting access + template ownership policies | Update shared reporting type contracts consumed by BASE | Migration for template schema updates and domain mapping | Shared reporting owner | Deferred (pending CR22) |

## Execution order for backend implementation

1. Shared foundations: `BD-002`, `BD-003`, `BD-004` (CR21 alignment), then `BD-016` when CR22 is ready.
2. Registration/application core: `BD-005`, `BD-006`, `BD-007`, `BD-008`.
3. Activity/unit contracts: `BD-009`, `BD-010`, `BD-011`.
4. Scanning stack in strict ownership order: `BD-012`, `BD-013`, `BD-014`, `BD-015`.
5. Event config contract hardening: `BD-001` can run in parallel with step 2.

## Phase 2 gate rule

A slice may move from `Blocked` to `Ready` only when every referenced `BD-*` is `Resolved` and has verification evidence for:

- schema shape,
- RPC behavior,
- RLS allow/deny paths,
- shared type publication/consumption impact,
- migration/seed completion (if required).

## Phase 4 gate decision (2026-04-21)

- Gate status: Pass (with scoped defer)
- Backend freeze status: Frozen for current run
- Evidence: `pace-core2/docs/delivery/reports/base-backend-ready-report.md`
- Deferred item: `BD-016` remains deferred and keeps `BA15` deferred; all other deltas are resolved for this run.
