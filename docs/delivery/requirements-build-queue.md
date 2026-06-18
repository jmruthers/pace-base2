# BASE requirements build queue (pass 2)

Pass 2 **uplifts implementation** in `src/` (and tests) against pass-1-updated requirement slices, prototype layout, and pace-core standards. **`npm run validate` must exit 0** before marking a slice **Built**.

**Pass 1 gate:** [requirements-audit-queue.md](./requirements-audit-queue.md) — row `audit_status` must be `Done` or `N/A` before starting that slice.

**Orchestration rule:** `.cursor/rules/base-requirements-build-pass2.mdc`

## How to kick off

Open the **pace-base2** workspace (with **pace-prototype** and **pace-core2** siblings available for `@` references).

In **Agent** mode (Plan-only is insufficient — validate must run), send:

```text
Continue BASE requirements pass 2 from docs/delivery/requirements-build-queue.md
```

Optional modifiers: `— one slice only` · `— plan only` · `— from BA06` · `— dry run`

## Status values

| Column | Values | Meaning |
|--------|--------|---------|
| `build_status` | `Pending` · `In progress` · `Built` · `Skipped` · `Blocked` | Orchestration state |
| `validate_status` | `—` · `Pass` · `Fail` | Last validate result for this slice |
| `uplift_summary` | free text | e.g. `No changes`, `Layout grid on ApplicationsPage` |

## N/A slices (contract-only)

**BA02**, **BA07**, **BA05a**, **BA05b**, **BA10** — verify hooks/tests still match requirement prose; mark `Skipped` with note; run repo validate before advancing.

## Queue

Process in **`audit_order`** sequence.

| audit_order | slice_id | requirement_doc | prototype_refs | impl_hints | build_status | validate_status | uplift_summary |
|---:|---|---|---|---|---|---|---|
| 1 | BA00 | [BA00-app-shell-and-access-requirements.md](../requirements/BA00-app-shell-and-access-requirements.md) | `pace-prototype/apps/pace-base/app.jsx` (shell, routing, auth, nav) | `src/App.tsx`, `AuthenticatedShell.tsx` | Built | Pass | User menu extras: All events → `/`, Operator profile → `/configuration` via `extraMenuActions` |
| 2 | BA01 | [BA01-event-workspace-and-configuration-requirements.md](../requirements/BA01-event-workspace-and-configuration-requirements.md) | `pages/LandingPage.jsx` (`ShellLandingPage`, `EventDashboardPage`), `pages/NewEventPage.jsx`, `pages/QuickEventPage.jsx` | event configuration pages | Built | Pass | Dashboard KPI row, six launchers, AttentionQueue already present; quick event route `/events/new` deferred (TBD in requirements) |
| 3 | BA02 | [BA02-shared-forms-platform-contracts-requirements.md](../requirements/BA02-shared-forms-platform-contracts-requirements.md) | Layout N/A — shared forms contracts | `src/features/formsAuthoring/` | Skipped | Pass | Contract-only; `shared-forms-contracts.test.ts` green — no UI uplift |
| 4 | BA03 | [BA03-forms-authoring-and-base-integration-requirements.md](../requirements/BA03-forms-authoring-and-base-integration-requirements.md) | `pages/FormsRegTypesPage.jsx` (`FormsListPage`, `FormBuilderPage`) | `src/pages/forms/` | Built | Pass | Import template stub button on Forms list; slug URL still uses `/form-builder?formId=` |
| 5 | BA04 | [BA04-registration-setup-and-policy-requirements.md](../requirements/BA04-registration-setup-and-policy-requirements.md) | `pages/FormsRegTypesPage.jsx` (`RegistrationTypesPage`, `RegistrationTypeBuilderPage`) | registration types pages | Built | Pass | Stacked horizontal list rows with progress bar and Configure action (prototype layout) |
| 6 | BA06 | [BA06-applications-admin-and-review-requirements.md](../requirements/BA06-applications-admin-and-review-requirements.md) | `pages/ApplicationsPage.jsx` (board + detail) | `src/pages/applications/` | Built | Pass | KPI row; queue columns per BR-NAME/BR-CHECK-MINI; Review action; Unit column (Unassigned until assignment data wired) |
| 7 | BA07 | [BA07-token-approval-actions-requirements.md](../requirements/BA07-token-approval-actions-requirements.md) | `pace-prototype/apps/pace-base/app.jsx` (`TokenApprovalPage` via `_pace-core`) | public token approval route | Skipped | Pass | Public token route owned by pace-core; `tokenApprovals/contract.test.ts` green |
| 8 | BA17 | [BA17-communications-and-system-notifications-requirements.md](../requirements/BA17-communications-and-system-notifications-requirements.md) | `pages/CommsReportsPage.jsx` (`CommunicationsPage`) | communications composer | Built | Pass | KPI row labels aligned to prototype (Sent, Scheduled, Recipient pool, Templates); send log still via CommComposer adapter |
| 9 | BA15 | [BA15-reporting-requirements.md](../requirements/BA15-reporting-requirements.md) | `pages/CommsReportsPage.jsx` (`ReportsPage`) | `src/pages/reports/` | Built | Pass | Re-verified — no changes required |
| 10 | BA08 | [BA08-units-and-group-coordination-requirements.md](../requirements/BA08-units-and-group-coordination-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`UnitsPage`; `/unit-preferences` if in prod only) | `src/pages/units/` | Built | Pass | KPI row on Units tab (units, capacity, assigned, unassigned) |
| 11 | BA09 | [BA09-activity-offering-setup-requirements.md](../requirements/BA09-activity-offering-setup-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`ActivitiesPage`) | activities setup pages | Built | Pass | KPI row above offering card grid; Create offering placement unchanged |
| 12 | BA11 | [BA11-booking-operations-oversight-requirements.md](../requirements/BA11-booking-operations-oversight-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`BookingsPage`) | bookings oversight | Built | Pass | Re-verified — no changes required |
| 13 | BA12 | [BA12-scanning-setup-requirements.md](../requirements/BA12-scanning-setup-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`ScanningPage`) | scanning setup | Built | Pass | Re-verified — scan history table unchanged aside from BA14 sync column |
| 14 | BA13 | [BA13-scanning-runtime-validation-requirements.md](../requirements/BA13-scanning-runtime-validation-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (`ScanRuntimePage`) | scan runtime | Built | Pass | Re-verified — no changes required |
| 15 | BA14 | [BA14-scanning-sync-reconciliation-requirements.md](../requirements/BA14-scanning-sync-reconciliation-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (scanning surfaces — sync UX may extend setup/runtime) | scanning sync | Built | Pass | Sync badge column on scan history DataTable via `getHistorySyncBadge` |
| 16 | BA16 | [BA16-scanning-tracking-dashboard-requirements.md](../requirements/BA16-scanning-tracking-dashboard-requirements.md) | `pages/UnitsActivitiesScanPage.jsx` (scanning/tracking — align with prototype scan list patterns) | tracking dashboard | Built | Pass | Re-verified — no changes required |
| 17 | BA05a | [BA05a-registration-entry-and-application-submission-requirements.md](../requirements/BA05a-registration-entry-and-application-submission-requirements.md) | `pace-prototype/apps/pace-portal/` (`FormPage`, event application routes) — participant UI owned by portal | pace-portal form fill | Skipped | Pass | Portal-owned; BASE contract tests only |
| 18 | BA05b | [BA05b-participant-application-progress-requirements.md](../requirements/BA05b-participant-application-progress-requirements.md) | `pace-prototype/apps/pace-portal/pages/EventParticipantPages.jsx` (`ApplicationProgressPage`) | portal progress page | Skipped | Pass | Portal-owned; `ba05b-participant-progress-contracts.test.ts` green |
| 19 | BA10 | [BA10-participant-booking-experience-requirements.md](../requirements/BA10-participant-booking-experience-requirements.md) | `pace-prototype/apps/pace-portal/pages/EventParticipantPages.jsx` (`ActivityBookingPage`) | portal activity booking | Skipped | Pass | Portal-owned; `ba10-participant-booking-contracts.test.ts` green |

## Prototype kit index

Route map: `pace-prototype/apps/pace-base/app.jsx` and `pace-prototype/apps/pace-base/README.md`.

Portal-owned participant UI: `pace-prototype/apps/pace-portal/` for BA05a, BA05b, BA10.

Shared shell: `pace-prototype/apps/_pace-core/`.

## Legacy build queue (Evidence)

On **Built**, optionally append a one-line uplift note to [base-build-queue.md](./base-build-queue.md) when the slice maps 1:1.

## Validate

From repo root: `npm run validate`. Do not mark **Built** until validate exits 0 after slice uplift.

**Pass 2 cycle 2 complete:** 2026-06-18 — all slices Built or Skipped; validate **6/6 Pass**, **435 tests**.
