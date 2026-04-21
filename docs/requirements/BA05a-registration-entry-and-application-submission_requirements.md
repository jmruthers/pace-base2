# BA05a Registration Entry And Application Submission

## Slice metadata

- Status: Planned
- Depends on: BA02, BA03, BA04
- Backend impact: Write contract change required
- Frontend impact: Both
- Safe for unattended execution: No
- Ownership notes:
  - Backend: Owns application creation, eligibility/scope enforcement, consent/approval triggers, and entrypoint resolution contracts.
  - Frontend: Participant UI is pace-portal-owned; BASE owns workflow contract boundaries and integration requirements.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA05a-registration-entry-and-application-submission_requirements.md`**

## Overview

This slice owns the **BASE registration workflow contract**: entrypoint resolution, registration-type selection where required, form-response capture, eligibility and scope enforcement, consent triggers, referee contact capture, and backend application creation.

**UI and routes** are **pace-portal** responsibilities (authenticated member shell + auth-required handoff; see portal [PR14-event-selector-and-hub.md](../../portal/PR14-event-selector-and-hub.md), [PR15-authenticated-form-rendering.md](../../portal/PR15-authenticated-form-rendering.md), [PR16-event-application-submission.md](../../portal/PR16-event-application-submission.md), [PR17-form-journey-shell.md](../../portal/PR17-form-journey-shell.md), and [PR00-portal-architecture.md](../../portal/PR00-portal-architecture.md)). The BASE app does **not** implement `/events/:eventCode/register/:slug`. Slice prose below that refers to “participant route” means the **product journey**, not a BASE-origin URL.

## Current baseline behavior

The legacy app treats registration too much like a generic client-side form submission flow.

- Legacy code directly writes `base_application` from the client in places that should now be backend-owned.
- Legacy form plumbing still reflects table-and-column coupling instead of a typed workflow contract.
- The legacy app does not provide a trustworthy boundary between configurable registration content and the downstream application-creation workflow.

## Rebuild delta

### Summary

- What changes: Defines workflow-driven registration submission with backend-owned application creation and requirement-aware outcomes.
- What stays: Participant UI routing remains in pace-portal; BASE does not host participant registration pages.

Define the rebuild contract for configurable registration submission.

- Support registration-form content that can vary by event and registration type.
- Keep the participant-facing registration entrypoint in **pace-portal**; BASE supplies configuration, typed forms alignment, and backend application creation—no duplicate BASE participant SPA.
- Create applications through the backend-owned workflow contract.
- Enforce registration type, eligibility, registration-scope, and approval requirements before an application is accepted.
- Keep application creation, consent triggers, and approval activation outside generic client-side form writes.
- Capture referee contact details as part of the registration workflow when the selected registration type includes a `referee` requirement.
- Treat `core_forms` with `workflow_type = 'base_registration'` as the registration entrypoint record.
- Support canonical entry via `/:eventSlug/application` by resolving the event form marked `is_primary_entrypoint = true`.
- Support fixed-type and open-selection entrypoints through `base_form_registration_type`.
- Use `access_mode` and `workflow_config` as part of the participant-entrypoint contract.

### pace-core2 delta

The legacy generic-form model is not the target.

- `pace-core2` provides primitives for rendering, validation, and shared interaction patterns.
- Consuming-app participants surfaces (in pace-portal) must use `@solvera/pace-core` components/hooks for form rendering, auth context, permission checks, and secure data access before introducing any local equivalent.
- The shared form layer must not become the owner of BASE registration semantics.
- Application creation must be orchestrated through the rebuild contract and backend service entrypoints.
- Do not assume legacy root-barrel imports or legacy client-write helpers still exist.

### pace-core2 imports

Use the following import families where implementation work in this slice requires shared primitives:

- `@solvera/pace-core/providers`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/components`
- `@solvera/pace-core/services`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

Use `pace-core2` form and validation primitives for any registration UI that lives in a participant surface, but do not let those primitives own the workflow side effects.

### Data and schema references

- `base_registration_type`
- `base_registration_type_eligibility`
- `base_registration_type_requirement`
- `base_application`
- `base_application_check`
- `base_consent`
- `core_events.registration_scope`
- `core_forms`
- `core_form_fields`
- `core_form_responses`
- `core_form_response_values`
- `base_form_registration_type`
- `app_base_application_create(p_event_id, p_person_id, p_registration_type_id, ...)`
- `event_applicant_org_allowed(...)`

Upstream implementation authority for shared-form runtime behaviour in this slice is [`../../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md`](../../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md) (**Forms platform architecture (canonical)**).

Approved registration-entrypoint interpretation:

- `core_forms.workflow_type = 'base_registration'` identifies a registration entrypoint.
- `core_forms.slug` is the event-scoped form URL identifier.
- `base_form_registration_type` binds the form to one or more allowed `base_registration_type` rows.
- One bound row means fixed registration type.
- Multiple bound rows mean open selection among eligible types.
- `workflow_config.pre_submission_checks` replaces legacy profile-confirmation booleans.
- For the current BASE rebuild, participant entrypoints default to `authenticated_member`; `public` is allowed only when explicitly approved by slice contract.
- `DEC-068` and `docs/database/domains/base.md` are the workflow authority for approval-chain activation, `under_review`, and `base_application_check` semantics.
- When a registration type includes `referee`, the participant flow must collect referee contact data needed for the backend to issue a token-based request. BASE requirements do not assume a persisted `referee_person_id` column.

## Acceptance criteria

- The registration experience is configurable by event and registration type.
- The registration **workflow contract** is owned by this slice; the **route/UI** is owned by **pace-portal** (outside the BASE app).
- Application creation uses the backend-owned contract and not a direct client write.
- Registration-type eligibility and scope failures are surfaced distinctly from validation failures.
- Consent and approval triggers are wired through the workflow contract rather than generic form persistence.
- Submission without requirements can advance directly to `approved`; submission with requirements must move to `under_review`, initialise `base_application_check`, and activate the first requirement through the backend contract.
- Entrypoint resolution uses event code, slug, workflow type, access mode, and bound registration types explicitly.
- Referee contact capture is required before submission when the selected registration type has a `referee` requirement.

## API / Contract

- Participant registration journey contract.
- Registration-entrypoint route contract for **pace-portal** participant surfaces (BASE origin does not host this UI).
- Backend application-creation contract.
- Approval-check initialisation contract after application submission.
- Registration-type and scope check contract.
- Consent-trigger contract at application creation time.
- Referee contact-capture contract for referee-gated registration types.
- Workflow payload contract for configurable registration content.
- Form-response capture and workflow-subject linking contract.

Portal integration contract index for this slice:

- Route host: pace-portal `/:eventSlug/application` (primary) and form-entry variants owned by PR14-PR17.
- Required backend contracts: `app_base_application_create(...)`, registration-scope check via `event_applicant_org_allowed(...)`, and approval-check initialisation semantics from this slice.
- Failure classes that must be surfaced distinctly in portal UI: payload validation failure, eligibility denial, registration-scope denial, and backend contract failure.

## Visual specification

- Visual implementation: **pace-portal** shell (see portal PR14–PR15), not the BASE admin shell.
- Keep participant navigation minimal and task-specific: event/form heading, registration-type context where relevant, and a configured return action without exposing organiser navigation.
- Keep submission-state transitions explicit so the participant knows whether the result is validation failure, eligibility/scope denial, `under_review`, or direct approval.

## Verification

- Resolve an event-code plus slug registration entrypoint and confirm form open/closed behaviour is enforced.
- Resolve both fixed-type and open-selection entrypoints.
- Start a registration journey for an eligible registration type and confirm the backend creates the application through the approved contract.
- Start a registration journey for a registration type with no approval requirements and confirm the application does not stall in `under_review`.
- Start a registration journey for a registration type with ordered approval requirements and confirm the submission result reflects the resulting `under_review` state.
- Attempt registration with invalid input and confirm validation fails before backend creation.
- Attempt registration for an ineligible or out-of-scope person and confirm the workflow is rejected distinctly from validation.
- Confirm the participant journey runs on **pace-portal** and does not mount inside the BASE admin shell.

## Testing requirements

- Happy path: end-to-end registration submission creates an application through the backend contract.
- Validation failure: malformed or incomplete registration payload is rejected before persistence.
- Auth/permission failure: a caller without permission to create the application cannot trigger the backend contract.
- Add coverage for eligibility denial, scope denial, approval-required paths, referee-required paths, access-mode handling, and workflow-subject linking.

## Acceptance traceability

- Registration configurability and entrypoint criteria -> Workflow/slug/access-mode entrypoint resolution contracts -> Fixed/open registration-type entry tests.
- Backend application creation and outcome criteria -> Backend-owned submission + approval initialisation contracts -> Approved vs under-review path tests.
- Eligibility/scope and referee criteria -> Policy checks + referee contact capture requirements -> Denial and referee-required coverage in tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for entrypoint resolution, valid submission, approval-required submission, validation failures, and scope/eligibility denial.
- Expected outcomes: Participant journey outcomes and backend workflow side effects match contract definitions and remain pace-portal hosted.

## Build execution rules

- Backend schema, RPC, and RLS changes are allowed only when the exact delta is pre-listed in `docs/delivery/backend-delta-backlog.md` and linked from this slice before implementation.
- Stop on blockers: missing backend create contract behavior, unresolved registration-type binding, unresolved access-mode semantics, or unresolved portal route ownership dependencies.

## Done criteria

- Tests pass: Registration workflow, eligibility/scope, approval-init, referee, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA05a remains aligned with portal, architecture, and shared forms/runtime references.

## Do not

- Do not preserve legacy client-side `base_application` write behaviour.
- Do not let a generic form engine own BASE workflow semantics.
- Do not implement this journey as a route on the **BASE** app origin; do not reuse the BASE admin shell for participant registration UI.
- Do not build local replacement components/hooks for shared form/auth/RBAC primitives already available in `@solvera/pace-core`.
- Do not copy legacy form-table write coupling forward.
- Do not preserve superseded `base_registration_form` or `base_registration_form_type` assumptions.

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`../../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md`](../../../../packages/core/docs/requirements/CR21-workflow-forms-runtime.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
- [`../../../database/decisions/DB-change-decisions-p3.md`](../../../database/decisions/DB-change-decisions-p3.md) (forward schema batch)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
