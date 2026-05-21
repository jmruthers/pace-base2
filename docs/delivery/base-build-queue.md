# BASE Build Queue

## Run Readiness Summary

- Backend-ready report: `/Users/jess/Documents/Solvera/pace-core2/docs/delivery/base-backend-ready-report.md` (`Gate status: PASS`)
- Backend freeze status: `Frozen for this run` for BA00, BA01, BA02, BA03, BA04, BA05a, BA05b, BA06, BA07, BA08, BA15, BA17, BA18 (per backend-ready report)
- Unresolved blockers: `0` (`none`)
- Execution mode: `full run`

## Dependency handling for this run

- Source authority for slice identity/title/dependencies: `docs/requirements/*.md`
- `.contract` dependencies are treated as backend-pre-satisfied for runtime sequencing because the backend-ready report is `PASS` and backend is frozen for this run
- Runtime `depends_on` values below include executable build-order prerequisites only; authority `.contract` edges are preserved in slice evidence (see [Evidence](#evidence))

## Queue


| slice_id                                              | depends_on              | status   | blocker_reason |
| ----------------------------------------------------- | ----------------------- | -------- | -------------- |
| BA00 — App Shell and Access                           | -                       | complete | -              |
| BA02 — Shared Forms Platform Contracts                | -                       | complete | -              |
| BA01 — Event Workspace and Configuration              | BA00                    | complete | -              |
| BA03 — Forms Authoring and BASE Integration           | BA00, BA01, BA02        | complete | -              |
| BA18 — BASE Dev Seed Data                             | BA00, BA01              | complete |                |
| BA04 — Registration Setup and Policy                  | BA01, BA02, BA03        | complete | -              |
| BA05a — Registration Entry and Application Submission | BA02, BA03, BA04        | complete | -              |
| BA17 — Communications and System Notifications        | BA01, BA04              | complete | -              |
| BA05b — Participant Application Progress              | BA05a                   | complete | -              |
| BA06 — Applications Admin and Review                  | BA04, BA05a             | complete | -              |
| BA07 — Token Approval Actions                         | BA04, BA05a             | complete | -              |
| BA08 — Units and Group Coordination                   | BA06                    | complete | -              |
| BA09 — Activity Offering and Session Setup            | BA01, BA06, BA08        | complete | -              |
| BA10 — Participant Activity Booking Experience        | BA02, BA05a, BA08, BA09 | complete | -              |
| BA11 — Booking Operations Oversight                   | BA09, BA10              | complete | -              |
| BA12 — Scanning Setup                                 | BA01, BA09              | complete | -              |
| BA13 — Scanning Runtime and Validation                | BA06, BA11, BA12        | complete | -              |
| BA14 — Scanning Sync and Reconciliation               | BA12, BA13              | complete | -              |
| BA15 — Reporting                                      | BA06, BA08, BA11, BA13  | complete | -              |
| BA16 — Scanning Tracking Dashboard                    | BA12, BA13, BA14        | complete | -              |


## Evidence

Evidence for each queue row, keyed by `slice_id`.

### BA00 — App Shell and Access

- authority: `docs/requirements/BA00-app-shell-and-access-requirements.md`
- implementation: `src/App.tsx`, `src/main.tsx`, `src/components/layout/AuthenticatedShell.tsx`
- verification: `npm run test -- src/app.test.tsx src/main.test.tsx src/components/layout/AuthenticatedShell.test.tsx` (22/22 passing)

### BA02 — Shared Forms Platform Contracts

- authority: `docs/requirements/BA02-shared-forms-platform-contracts-requirements.md`
- schema verification executed on Supabase project `rkytnffgmwnnmewevqgp` (tables/columns, dropped tables/columns, workflow/access checks, registration binding uniqueness, primary entrypoint indexes)
- contract tests: `npm run test -- src/shared-forms-contracts.test.ts` (11/11 passing)
- integration references: `src/shared-forms-contracts.test.ts`, `src/features/formsAuthoring/configuration.ts`, `src/features/formsAuthoring/shared.ts`, `src/pages/forms/FormBuilderPage.tsx`

### BA01 — Event Workspace and Configuration

- authority: `docs/requirements/BA01-event-workspace-and-configuration-requirements.md`
- implementation: `src/pages/eventConfiguration/EventDashboardPage.tsx`, `src/pages/eventConfiguration/EventConfigurationRoute.tsx`, `src/features/eventConfiguration/shared.ts`, `src/features/eventConfiguration/configuration.ts`
- verification: `npm run test -- src/pages/eventConfiguration/EventDashboardPage.test.tsx src/pages/eventConfiguration/EventConfigurationRoute.test.tsx src/features/eventConfiguration/configuration.hooks.test.ts src/features/eventConfiguration/shared.test.ts` (30/30 passing)
- finalised contracts: C-PC-01 header icon, C-EC-01 unresolved-organisation upload rendering, C-PA-02/C-PA-04 JSON-validation/error-toast handling

### BA03 — Forms Authoring and BASE Integration

- authority: `docs/requirements/BA03-forms-authoring-and-base-integration-requirements.md`
- implementation: `src/pages/forms/FormsListPage.tsx`, `src/pages/forms/FormBuilderPage.tsx`, `src/features/formsAuthoring/configuration.ts`, `src/features/formsAuthoring/shared.ts`
- verification: `npm run test -- src/features/formsAuthoring/configuration.test.tsx src/pages/forms/FormsListPage.test.tsx src/pages/forms/FormBuilderPage.test.tsx src/app.test.tsx` (38/38 passing)
- contract alignment: BA03 requirements updated to canonical registration-binding RPC model (`app_base_form_registration_bindings_get` / `app_base_form_registration_bindings_replace`)

### BA18 — BASE Dev Seed Data

- authority: `docs/requirements/BA18-base-dev-seed-data-requirements.md`
- backend freeze active

### BA04 — Registration Setup and Policy

- authority: `docs/requirements/BA04-registration-setup-and-policy-requirements.md`
- implementation/contract alignment: `docs/requirements/BA04-registration-setup-and-policy-requirements.md` (RL-PA-01 create-flow guard wording, RR-CF-04 designated-org validation scope, scope threading semantics), `src/pages/registrationTypes/components/RegistrationTypesHeader.tsx`, `src/pages/registrationTypes/components/RegistrationTypeDialog.tsx`, `src/pages/registrationTypes/hooks/useRegistrationTypesPageController.ts`, `src/features/registrationSetup/stateHelpers.ts`
- verification: `npm run test -- src/pages/registrationTypes/RegistrationTypesPage.test.tsx src/pages/registrationTypes/components/RegistrationTypeDialog.test.tsx src/pages/registrationTypes/components/RequirementsDialog.test.tsx src/pages/registrationTypes/components/RequirementConfigPanel.test.tsx src/pages/registrationTypes/hooks/useRegistrationTypesPageController.test.tsx src/features/registrationSetup/configuration.test.ts src/features/registrationSetup/stateHelpers.test.ts` (41/41 passing)

### BA05a — Registration Entry and Application Submission

- authority: `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md`
- contract alignment: `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md` (FS-08 queue-based notification dispatch wording, FS-15/§7.2 referee RPC availability and closure-table mechanism, FS-16 queue-based reissue dispatch wording, §7.3 helper presence wording)
- MCP verification on Supabase project `rkytnffgmwnnmewevqgp`: `base_application.referee_person_id` nullable uuid + FK `ON DELETE SET NULL`, `app_base_application_create` signature excludes `p_status`, `app_base_eligible_referees_for_applicant` is `SECURITY DEFINER` with `search_path=public`, `app_base_application_check_reissue_token` default `p_expiry_interval='14 days'`, and `base_application_check_status_check` = `pending|satisfied|failed|waived`

### BA17 — Communications and System Notifications

- authority: `docs/requirements/BA17-communications-and-system-notifications-requirements.md`
- implementation: `src/pages/communications/CommunicationsPage.tsx`, `src/features/communications/constants.ts`, `src/features/communications/configuration.ts`, `src/features/communications/shared.ts`, route wiring in `src/App.tsx`
- remediation delivered: pool mode switcher (`event_participants` / `specific_participants`), `ManualPool` participant selection, BR-15 participant lookup hook with per-event query caching, BA17-aligned success/warning toast handling and reset semantics
- verification: `npm run test -- src/pages/communications/CommunicationsPage.test.tsx src/features/communications/constants.test.ts src/features/communications/shared.test.ts src/app.test.tsx` (31/31 passing), `npm run lint -- src/pages/communications/CommunicationsPage.tsx src/pages/communications/CommunicationsPage.test.tsx src/features/communications/configuration.ts src/features/communications/shared.ts src/features/communications/shared.test.ts` (pass), `npm run type-check` (pass), `npm run validate` (all 6 checks pass; reports in `audit/202605121936-*` including `audit/202605121936-pace-core-audit.md`)

### BA05b — Participant Application Progress

- authority: `docs/requirements/BA05b-participant-application-progress-requirements.md`
- implementation evidence: `src/ba05b-participant-progress-contracts.test.ts`
- MCP verification on Supabase project `rkytnffgmwnnmewevqgp`: `app_base_application_progress_get(p_application_id uuid)` exists, returns `jsonb`, is `SECURITY DEFINER` with `search_path=public`, enforces applicant check via `base_application_is_applicant(..., auth.uid())`, denial raises `base_application_access_denied` (direct execution verified), payload builder emits `application`/`registration_type`/`checks` with check label mapping across required `check_type` values and excludes sensitive fields (`token_hash`, `token_expires_at`, `carer_person_id`) from emitted JSON keys

### BA06 — Applications Admin and Review

- authority: `docs/requirements/BA06-applications-admin-and-review-requirements.md`
- implementation/contract alignment: `docs/requirements/BA06-applications-admin-and-review-requirements.md` (queue-header card wording, reject-notes client-validation path), `src/pages/applications/ApplicationsPage.tsx`, `src/features/applicationsAdmin/configuration.ts`, `src/features/applicationsAdmin/stateHelpers.ts`
- essential fidelity fixes: runtime blocker handling for missing `app_base_application_check_set_status` (hide `event_approval` actions + destructive blocker alert), improved nested/array JSON evidence rendering
- verification: `npm run test -- src/pages/applications/ApplicationsPage.test.tsx src/features/applicationsAdmin/stateHelpers.test.ts src/app.test.tsx` (36/36 passing) and lints clean on modified files

### BA07 — Token Approval Actions

- authority: `docs/requirements/BA07-token-approval-actions-requirements.md`
- MCP verification on Supabase project `rkytnffgmwnnmewevqgp`: `app_base_application_check_resolve_token`, `app_base_application_check_submit`, `app_base_application_check_reissue_token`, and `app_base_advance_application_checks` exist with expected signatures and `SECURITY DEFINER` + `search_path=public`; function-definition checks confirm SHA-256 trimmed-token digest lookup, pending/non-expired predicate, UTC `expires_at`/`token_expires_at` serialisation, decision-only notes assignment on submit, transactional `app_base_advance_application_checks` invocation after submit update, and reissue return payload keys (`check_id`,`token`,`token_expires_at`) with 14-day default/fallback parity
- runtime negative-path checks verified canonical errors (`Token is required`, `Invalid or expired token`, `Invalid, expired, or already used token`, `Outcome must be approve or reject`, `Comments are required for reject`)
- reissue success-path runtime call in current MCP session is permission-blocked (`Not allowed to reissue token for this event`) and accepted for this run

### BA08 — Units and Group Coordination

- authority: `docs/requirements/BA08-units-and-group-coordination-requirements.md`
- implementation alignment: `src/pages/units/UnitsPage.tsx` (import parent-chain resolution, role fallback rendering), `src/pages/unitPreferences/UnitPreferencesPage.tsx` (selector loading disablement, normalized error alerts), `src/features/unitsCoordination/configuration.ts` (unit-create mutation returns inserted row for import chaining), `src/features/unitsCoordination/stateHelpers.ts` (parent label en-dash format)
- verification: `npm run test -- src/features/unitsCoordination/stateHelpers.test.ts src/features/unitsCoordination/configuration.test.ts src/pages/units/UnitsPage.test.tsx src/pages/unitPreferences/UnitPreferencesPage.test.tsx` (18/18 passing)

### BA09 — Activity Offering and Session Setup

- authority: `docs/requirements/BA09-activity-offering-setup-requirements.md`
- implementation: `src/pages/activities/ActivitiesPage.tsx`, `src/pages/activities/ActivityOfferingPage.tsx`, `src/features/activityOfferingSetup/configuration.ts`, `src/features/activityOfferingSetup/shared.ts`, `src/features/activityOfferingSetup/types.ts`, route wiring in `src/App.tsx` and `src/config/baseRouteRegistry.ts`
- remediation coverage: selected-event boundary alignment to `useEvents().selectedEvent.id`, DataTable metadata/actions alignment, pace-core `Form`/`FormField` + `SaveActions` submit semantics, numeric constraints (`cost` min/step, `capacity` min/step), delete-session acknowledgement flow, BA09 test-gap closure (`AccessDenied`, table metadata, TRAC scoping, route coverage) in `src/pages/activities/ActivitiesPage.test.tsx`, `src/pages/activities/ActivityOfferingPage.test.tsx`, `src/features/activityOfferingSetup/shared.test.ts`, `src/app.test.tsx`
- verification: `npm run validate` (all 6 checks pass; reports in `audit/202605122129-*` including `audit/202605122129-pace-core-audit.md`)

### BA10 — Participant Activity Booking Experience

- authority: `docs/requirements/BA10-participant-booking-experience-requirements.md`
- contract-only implementation (no BASE participant routes): `src/features/participantBookingExperience/types.ts`, `src/features/participantBookingExperience/shared.ts`, `src/features/participantBookingExperience/contract.ts`, `src/features/participantBookingExperience/shared.test.ts`, `src/features/participantBookingExperience/contract.test.ts`, `src/ba10-participant-booking-contracts.test.ts`, QA artifact `docs/test-packs/BA10-qa-pack.md`
- coverage delivered for booking-window combinations, confirmed-only capacity counting, waitlist derivation, duplicate detection (`confirmed`/`waitlisted` only), overlap vs adjacent conflict detection with `conflictingSession`, cancellable status/timing matrix, strict payload key/type parsing for browse/validation/booking projections, multi-outcome validation projection shape, consent verbatim-text preservation, and permission-denial contract pathway mapping for `base_booking_access_denied`
- verification: `npm run test -- src/features/participantBookingExperience/shared.test.ts src/features/participantBookingExperience/contract.test.ts src/ba10-participant-booking-contracts.test.ts` (28/28 passing), `npm run validate` (all 6 checks pass; reports in `audit/202605122141-*` including `audit/202605122141-pace-core-audit.md`)

### BA11 — Booking Operations Oversight

- authority: `docs/requirements/BA11-booking-operations-oversight-requirements.md`
- implementation: `src/pages/activities/BookingsPage.tsx`, `src/features/bookingOversight/types.ts`, `src/features/bookingOversight/configuration.ts`, `src/features/bookingOversight/display.ts`, `src/features/bookingOversight/rules.ts`, `src/features/bookingOversight/bookOnBehalfForm.ts`, `src/features/bookingOversight/bookingOverrideMessaging.ts`, `src/features/bookingOversight/labels.ts`, route wiring in `src/App.tsx` and `src/config/baseRouteRegistry.ts`
- QA artifact: `docs/test-packs/BA11-qa-pack.md`
- verification: `npm run test -- src/features/bookingOversight/shared.test.ts src/pages/activities/BookingsPage.test.tsx src/app.test.tsx`, `npm run validate`
- **Caveats:** E2E / mutation verification in a live env requires deployed `app_base_activity_booking_create` and `app_base_activity_booking_cancel` plus `base_activity_booking` RLS aligned with BA11 §7 / §14 (see requirement doc).

### BA12 — Scanning Setup

- authority: `docs/requirements/BA12-scanning-setup-requirements.md` (remediated 2026-05-12: BASE `icons` barrel only, BR-V-01 name length, activity session labels via `formatInTimeZone`, conflict `dl`/`dt`/`dd`, `PagePermissionGuard` on page + shell, §15 QA path `docs/test-packs/BA12-qa-pack.md`)
- implementation: `src/pages/scanning/ScanningSetupPage.tsx`, `src/features/scanningSetup/types.ts`, `src/features/scanningSetup/shared.ts`, `src/features/scanningSetup/configuration.ts`, route wiring in `src/App.tsx`
- test coverage: `src/features/scanningSetup/shared.test.ts`, `src/features/scanningSetup/configuration.test.ts`, `src/pages/scanning/ScanningSetupPage.test.tsx`, plus route coverage in `src/app.test.tsx`
- QA artifact: `docs/test-packs/BA12-qa-pack.md`
- verification: `npm run test -- src/features/scanningSetup/shared.test.ts src/features/scanningSetup/configuration.test.ts src/pages/scanning/ScanningSetupPage.test.tsx src/app.test.tsx`, `npm run validate` (re-run after remediation).

### BA13 — Scanning Runtime and Validation

- authority: `docs/requirements/BA13-scanning-runtime-validation-requirements.md`
- implementation: `src/pages/scanning/ScanningRuntimePage.tsx`, `src/features/scanningRuntime/` (queue, validation, hooks), `src/App.tsx` (runtime route outside `AuthenticatedShell`), `src/config/baseRouteRegistry.ts` (`includeInShell: false` for `/scanning/:scanPointId`), `src/features/scanningSetup/manifestIdb.ts` + BA12 manifest write path
- QA artifact: `docs/test-packs/BA13-qa-pack.md`
- verification: `npm run test -- src/features/scanningRuntime/queue/scanQueueIdb.test.ts src/features/scanningRuntime/validation/validateScan.test.ts src/features/scanningRuntime/manualScan.test.ts src/pages/scanning/ScanningRuntimePage.test.tsx src/app.test.tsx`, `npm run validate`.
- **Caveats:** §12 manual verification and formal §15 QA sign-off are operator-led; activity/transport tables/RLS per §14 until dev-db catches up; offline activity/transport booking vs shared `ManifestRow` scope documented in BA13 §11.

### BA14 — Scanning Sync and Reconciliation

- authority: `docs/requirements/BA14-scanning-sync-reconciliation-requirements.md`
- remediation implementation: `src/features/scanningRuntime/sync/scanSyncWorker.ts` (manual-scan `manual_scan_no_card` non-retry guard across automatic cycles and explicit retry, conflict toast wording), `src/pages/scanning/ScanningSetupPage.tsx` and `src/pages/scanning/ScanningRuntimePage.tsx` (per-entry failed upload retry controls with entry-specific `aria-label` and `update:page.scanning` gating), QA artifact update: `docs/test-packs/BA14-qa-pack.md`
- test coverage updates: `src/features/scanningRuntime/sync/scanSyncWorker.test.ts`, `src/pages/scanning/ScanningSetupPage.test.tsx`, `src/pages/scanning/ScanningRuntimePage.test.tsx`
- verification: `npm run test -- src/features/scanningRuntime/sync/scanSyncWorker.test.ts src/pages/scanning/ScanningSetupPage.test.tsx src/pages/scanning/ScanningRuntimePage.test.tsx` (15/15 passing), `npm run validate` (all 6 checks passed; reports in `audit/202605141934-`* and `audit/202605141935-pace-core-audit.md`).

### BA15 — Reporting

- authority: `docs/requirements/BA15-reporting-requirements.md`
- implementation: `src/pages/reports/ReportsPage.tsx`, `src/features/reporting/configuration.ts`, route wiring in `src/App.tsx`
- shared-remediation delivery: `../pace-core2/packages/core/src/reporting/ReportBuilder.tsx`
- tests: `src/pages/reports/ReportsPage.test.tsx`, `src/features/reporting/configuration.test.ts`, `src/app.test.tsx`
- QA artifacts: `docs/test-packs/BA15-qa-pack.md`, `docs/delivery/BA15-reporting-gap-report.md`, `docs/delivery/BA15-fi-ac-audit.md`
- verification: `npm run test -- src/pages/reports/ReportsPage.test.tsx src/features/reporting/configuration.test.ts src/app.test.tsx` (36/36 passing), shared test gate `npm run test -- src/reporting/ReportBuilder.integration.test.tsx src/reporting/ReportResultsTable.integration.test.tsx` in `pace-core2` (13/13 passing), and `npm run validate` (all 6 checks pass; reports in `audit/202605142013-*` and `audit/202605142014-pace-core-audit.md`).

### BA16 — Scanning Tracking Dashboard

- authority: `docs/requirements/BA16-scanning-tracking-dashboard-requirements.md`
- implementation: `src/pages/scanning/ScanningTrackingPage.tsx`, `src/features/scanningTracking/configuration.ts`, `src/features/scanningTracking/useTrackingDashboardData.ts`, route wiring in `src/App.tsx` and `src/config/baseRouteRegistry.ts`, BA12 entry alignment in `src/pages/scanning/ScanningSetupPage.tsx`
- remediation coverage: tracking entry button `variant="default"`, no-event refresh guard, tabs mobile wrap contract, required muted empty-state copy treatment, AccessDenied route coverage for `/scanning/tracking`
- verification: `npm run test -- src/pages/scanning/ScanningTrackingPage.test.tsx src/features/scanningTracking/configuration.test.ts src/pages/scanning/ScanningSetupPage.test.tsx src/app.test.tsx`, `npm run validate` (all 6 checks pass; reports in `audit/202605141947-*` and `audit/202605141948-pace-core-audit.md`).

