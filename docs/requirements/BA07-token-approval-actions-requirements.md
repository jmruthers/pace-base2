# BA07 — Token Approval Actions

## 1. Slice metadata

- Status: Ready for implementation
- Depends on: BA04 (Registration Setup and Policy — requirement types and chains), BA05a.contract (Registration Entry and Application Submission — application and check creation, token issue, `app_base_application_check_reissue_token`, chain helper and satisfaction RPC wiring per architecture)
- Backend impact: **RPC body and signature behaviour changes** — extend **`app_base_application_check_resolve_token`** return shape; change **`app_base_application_check_submit`** notes assignment and chain progression call; align **`app_base_application_check_reissue_token`** default interval (normative **14 days**, implemented with BA05a migration track). Creation of **`app_base_advance_application_checks`** and wiring from **`app_base_application_check_submit`** is **BA05a migration PR** scope — BA07 states the required behaviour and verification hooks.
- Frontend impact: **None** in BASE. This slice is **contract-only** for the BASE documentation lane. Portal UI is owned by the portal token-approval slice.

## 2. Overview

This slice defines **backend contracts** for guardian and referee **magic-link** approval: resolving an opaque token to a **safe display payload**, submitting an **`approve`** or **`reject`** decision with **decision-only** comments, and enforcing **single-use**, **hashed**, **time-bound** tokens on **`base_application_check`**. The raw token is the **only required auth factor** for resolve and submit — no mandatory portal login for those RPCs.

BASE does **not** ship a token landing page. The **pace-portal** route **`/approvals/:token`** consumes these contracts. This document is the **implementation authority** for RPC behaviour, payloads, errors, and non-leaking field rules; portal visual design sits in the portal slice.

---

## 3. What this slice delivers

### 3.1 Purpose

Deliver trustworthy, backend-enforced token lifecycle semantics so external approvers can act on **one** pending check without gaining access to unrelated application data, and so invalid, expired, reused, or already-finalised tokens fail **explicitly** with stable, documented error messages.

### 3.2 Surfaces

- **BASE application:** none — no routes, no BASE UI for token approval.
- **Supabase RPCs (authoritative):** **`app_base_application_check_resolve_token`**, **`app_base_application_check_submit`**. **`app_base_application_check_reissue_token`** remains organiser-privileged token rotation with normative **14-day** default expiry alignment.
- **Internal helper (architecture, not a consumer API):** **`app_base_advance_application_checks(p_application_id uuid)`** — must run in the **same transaction** as a successful **`submit`** status write, per **`docs/requirements/base/BASE-architecture.md` §4 and BA05a §7.4**. Implementation and deployment of the helper and create-path wiring are **BA05a migration** obligations; **submit** must invoke the helper once the helper exists.

### 3.3 Boundaries

This slice does **not** own:

- Portal page layout, component selection, or copy — portal slice.
- Organiser application review workspace — BA06.
- Participant registration or progress UI — BA05a / BA05b / portal.
- **`app_base_application_check_set_status`** (TEAM logged-in approval path) — referenced only where architecture requires the same chain helper after writes; contract detail lives with TEAM/BA06 documentation.
- Communications templating or send transport — BA17 (notification triggers may reference token issue elsewhere in BA05a).

### 3.4 Architectural posture

- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- Tokens are **never** stored in plain text; only **SHA-256** hashes appear in **`base_application_check.token_hash`**.
- **Trimmed** UTF-8 raw token is hashed for lookup; empty or whitespace-only tokens are rejected.
- **Guardian** and **referee** recipient resolution for **sending** the link is **backend-owned** (parent contact type **`core_contact_type.id = 1`** for guardians; eligible referee member for referees — BA05a). The resolve payload **does not** expose recipient identity inputs from the client.
- Consumers map failures using the **exact** PostgreSQL exception **message** strings in §7.3 (PostgREST returns these in the error payload **`message`** field).
- **`actioned_by`** on the check row **may be null** when **`auth.uid()`** is null — **token-only** path does not require a session.

### 3.5 Portal route — evaluation order (consumer contract)

Architecture registers **`/approvals/:token`** on **pace-portal**. Observable order for QA:

1. **Read raw token** from the route segment (trim for display logic only; RPC receives the value the product defines as canonical — trimming at RPC is server-side per §6).
2. **Call** **`app_base_application_check_resolve_token`** with the raw token string. On success, render using **only** keys in §7.2 plus allowed error handling — **no** supplementary direct table reads for privileged columns.
3. On resolve failure, map **message** per §7.3 to a **single participant-safe terminal state** — **no** wording that reveals whether the token existed, was consumed, or belonged to another check (follow portal denial-copy rules consistent with BASE RPC error convention where applicable).
4. **Before submit:** if outcome is **`reject`**, require **non-empty trimmed** comments in the client — mirror §6.2 so the user cannot reach a useless round-trip.
5. **Call** **`app_base_application_check_submit`** with raw token, outcome, and notes (null or string per §6.3).
6. On submit success, show confirmation from JSON per §7.4. On failure, map **message** per §7.3.

**N/A — BASE shell guards:** no **`PagePermissionGuard`** applies on BASE for this flow.

---

## 4. Functional specification

Prefix **TA-** (token approval contract). Items are verifiable without reading RPC source (black-box RPC calls).

### 4.1 Resolve contract

- **TA-01** — **`app_base_application_check_resolve_token(p_raw_token text)`** exists and returns **`jsonb`** on success.
- **TA-02** — Success requires exactly one **`base_application_check`** row where **`token_hash`** equals the SHA-256 hex digest of the trimmed raw token, **`status = 'pending'`**, and **`token_expires_at` is null or in the future**.
- **TA-03** — Success JSON contains **exactly** the keys listed in §7.2 — no additional keys, no omitted keys.
- **TA-04** — **`expires_at`** in JSON equals the row’s **`token_expires_at`** serialised as a UTC ISO-8601 string (e.g. `2026-05-15T10:30:00Z`) when non-null, or JSON null when `token_expires_at` is null. Use `token_expires_at AT TIME ZONE ‘UTC’` in the RPC — do not rely on the session timezone default.
- **TA-05** — **`applicant_display_name`** is a single display string from applicant **`core_person`** (`base_application.person_id`), using **`first_name || ' ' || last_name`**. Both `first_name` and `last_name` are NOT NULL per dev-db schema constraint (verified against `rkytnffgmwnnmewevqgp` — `is_nullable = 'NO'` for both columns); `preferred_name` is nullable and excluded from this surface. The value must not embed medical data, contact lists, or form payloads.

### 4.2 Submit contract

- **TA-06** — **`app_base_application_check_submit(p_raw_token text, p_outcome text, p_notes text DEFAULT NULL)`** returns **`jsonb`** on success.
- **TA-07** — **`p_outcome`** must be exactly **`approve`** or **`reject`** (lowercase).
- **TA-08** — When **`p_outcome = 'reject'`**, **`p_notes`** must be non-null and **`btrim(p_notes) <> ''`** at the database — otherwise the call errors with **`Comments are required for reject`**.
- **TA-09** — When **`p_outcome = 'approve'`**, **`p_notes`** may be null or omitted — **`base_application_check.notes`** becomes **null** after successful submit if no comment text is supplied (**decision-only** path — §6.2).
- **TA-10** — Successful submit sets all of the following columns on the matching **`base_application_check`** row: **`status`** to **`satisfied`** (approve) or **`failed`** (reject); **`token_hash`** to **null**; **`token_expires_at`** to **null**; **`actioned_at`** to transaction timestamp; **`actioned_by`** to **`auth.uid()`** (may be null); **`notes`** per §6.2 — **null** when `p_outcome = 'approve'` and `p_notes` is null or blank after trim; trimmed `p_notes` when `p_outcome = 'reject'`.
- **TA-11** — Successful submit returns JSON object with keys **`check_id`**, **`previous_status`**, **`new_status`** only — values match §7.4.
- **TA-12** — After the UPDATE that finalises the check, **`app_base_advance_application_checks(application_id)`** runs in the **same transaction** — **once the helper exists** (BA05a migration). If the helper is absent on an environment, token submit is **not** backend-complete for that environment. If the helper is present but raises an exception, the entire submit transaction rolls back — `base_application_check.status` remains **`pending`**, `token_hash` is not cleared, and the token remains live (see §6.6).

### 4.3 Token consumption and invalidation

- **TA-13** — A second **submit** or **resolve** with the same raw token after success fails with **`Invalid, expired, or already used token`** on submit lookup or **`Invalid or expired token`** on resolve — matching §7.3.
- **TA-14** — **`app_base_application_check_reissue_token`** overwrites **`token_hash`** and **`token_expires_at`**; any **prior** raw token string no longer resolves.

### 4.4 Client-side obligations (portal)

- **TA-15** — Portal blocks **`reject`** submit unless trimmed comment is non-empty (mirrors TA-08).
- **TA-16** — Portal does not send privileged identity fields on resolve or submit — **token string and decision fields only**.

### 4.5 Categories N/A (BASE lane)

- **Page entry / BASE shell:** N/A — no BASE route.
- **Loading / empty / error UI (BASE):** N/A — portal responsibility; §5 states minimum obligations.

---

## 5. Portal consumer obligations

- This section captures portal consumer obligations only; BASE route visuals are out of scope.
- Keep obligations limited to token-resolution and action states required by RPC contracts.
- Approval/reject/reissue semantics remain contract-owned by §4/§7.

## 6. Business rules

### 6.1 Token digest

- **Input:** `p_raw_token text`.
- **Normalisation:** `trim(p_raw_token)` for digest computation.
- **Digest:** `encode(digest(convert_to(trimmed_token, 'UTF8'), 'sha256'), 'hex')`.
- **Rejection:** null, empty, or whitespace-only token → exception **`Token is required`** (resolve and submit).

### 6.2 Outcome and notes (submit)

| `p_outcome` | `p_notes` requirement | `base_application_check.notes` after success |
|-------------|----------------------|-----------------------------------------------|
| `reject` | Non-null and `btrim(p_notes) <> ''` | **`p_notes`** (trimmed / stored as supplied per RPC implementation — must be non-empty) |
| `approve` | Optional | **`null`** when `p_notes` is null or blank after trim; otherwise **decision comment text only** |

**Rule:** On the token path, **`notes` after submit must reflect only this decision** — **no** `coalesce(p_notes, bac.notes)` and no other merge with prior row commentary.

### 6.3 Row lookup predicate (resolve and submit)

Matching row must satisfy:

- `token_hash` equals digest of trimmed raw token.
- `status = 'pending'`.
- `token_expires_at is null OR token_expires_at > now()`.

Otherwise:

- **Resolve** raises **`Invalid or expired token`**.
- **Submit** raises **`Invalid, expired, or already used token`**.

### 6.4 Status transitions on successful submit

| `p_outcome` | New `status` | `new_status` in return JSON |
|-------------|--------------|----------------------------|
| `approve` | `satisfied` | `satisfied` |
| `reject` | `failed` | `failed` |

### 6.5 Token lifetime

- **Issue / rotation:** new tokens receive expiry **`now() + interval '14 days'`** at creation and **reissue** when the default argument is used — **`app_base_application_check_reissue_token`** default **`p_expiry_interval`** and internal **`coalesce` fallback** must both treat **14 days** as the baseline (BA05a migration aligns implementation; BA05a FS-16 / parity resolutions).
- **Single-use:** successful submit clears **`token_hash`** and **`token_expires_at`**.

### 6.6 Chain progression

After successful check row update via **`app_base_application_check_submit`**, **`app_base_advance_application_checks(p_application_id)`** executes in the **same transaction**. Semantics: **`docs/requirements/base/BASE-architecture.md` §4 — Check chain state machine** (cross-slice contract; restated here only as: **downstream checks may activate or application status may advance according to that state machine — behaviour is defined in full in the architecture document**).

**Rollback on helper failure:** if **`app_base_advance_application_checks`** raises an exception, the entire submit transaction rolls back — `base_application_check.status` remains **`pending`**, `token_hash` is not cleared, and the token remains live for retry. Do not catch or swallow helper exceptions; the rollback is intentional to ensure atomicity between the check satisfaction and chain advancement.

### 6.7 Resolve payload non-leakage

The JSON from **`app_base_application_check_resolve_token`** must **never** include:

- Raw token, **`token_hash`**, or other secrets.
- **`notes`** or historical organiser commentary.
- Other **`base_application_check`** rows for the same application.
- Form answers, medical fields, payment artefacts, eligibility internals, or full **`core_contact`** lists.
- **`carer_person_id`**, **`referee_person_id`**, or other linkage UUIDs not listed in §7.2.

### 6.8 Guardian and referee (messaging backend)

- **Guardian approval** emails use **backend-resolved** guardian from linked parent contacts — **`core_contact_type.id = 1`** — not user-supplied free-text guardian identity on this flow.
- **Referee** uses **backend-resolved** eligible member selection from registration submission — BA05a **`referee_person_id`** validation path.

### 6.9 Submit parameter evaluation order

**`app_base_application_check_submit`** validates in this fixed sequence. **All parameter checks precede any DB read.** This order prevents an external caller from probing token validity by sending a crafted bad-outcome request and observing which error fires.

1. **Token present:** `p_raw_token` is non-null and `btrim(p_raw_token) <> ''` — else raise **`Token is required`**.
2. **Outcome valid:** `p_outcome` is exactly `approve` or `reject` (case-sensitive; no normalisation) — else raise **`Outcome must be approve or reject`**.
3. **Notes required (reject path):** when `p_outcome = 'reject'`, `p_notes` is non-null and `btrim(p_notes) <> ''` — else raise **`Comments are required for reject`**.
4. **Token lookup:** match row per §6.3 predicate — else raise **`Invalid, expired, or already used token`**.

---

## 7. API / Contract

### 7.1 RPC identifiers

| Name | Arguments | Returns |
|------|-----------|---------|
| `app_base_application_check_resolve_token` | `p_raw_token text` | `jsonb` |
| `app_base_application_check_submit` | `p_raw_token text`, `p_outcome text`, `p_notes text` (default null) | `jsonb` |

Both are **`SECURITY DEFINER`** with hardened **`search_path`** to **`public`** per existing dev-db pattern. **Neither** requires **`auth.uid()`** to be non-null for success.

| Name | Arguments | Returns | Caller |
|------|-----------|---------|--------|
| `app_base_application_check_reissue_token` | `p_check_id uuid`, `p_actor uuid` default null, `p_expiry_interval interval` default **14 days** | `jsonb` | Organiser / privileged — **not** anonymous token holder |

### 7.2 Resolve success payload (exact keys)

| Key | Type | Semantics |
|-----|------|-----------|
| `check_id` | uuid | `base_application_check.id` |
| `application_id` | uuid | `base_application_check.application_id` |
| `requirement_id` | uuid | `base_application_check.requirement_id` |
| `expires_at` | string (ISO-8601 UTC, e.g. `2026-05-15T10:30:00Z`) \| null | `base_application_check.token_expires_at` cast to UTC — use `token_expires_at AT TIME ZONE 'UTC'` in RPC serialisation |
| `check_type` | string | `base_registration_type_requirement.check_type` joined via `requirement_id` |
| `event_title` | string | `core_events.title` via `base_application.event_id` |
| `registration_type_name` | string | `base_registration_type.name` via `base_application.registration_type_id` |
| `applicant_display_name` | string | Applicant `core_person`: `first_name \|\| ' ' \|\| last_name` — both columns are NOT NULL per schema constraint (verified on dev-db) |

### 7.3 Exception messages (authoritative)

**Resolve and submit path** — consumed by portal token-approval route:

| Message | Typical cause |
|---------|----------------|
| `Token is required` | Null or blank raw token after trim |
| `Invalid or expired token` | Resolve: no matching pending non-expired row |
| `Invalid, expired, or already used token` | Submit: lookup failed (includes consumed token) |
| `Outcome must be approve or reject` | Bad `p_outcome` value |
| `Comments are required for reject` | Reject without usable notes |

**Reissue path** — consumed by organiser-facing surfaces (BA06):

| Message | Typical cause |
|---------|----------------|
| `Check id is required` | `p_check_id` is null |
| `Pending check not found` | No `base_application_check` row with given `id` and `status = 'pending'` |
| `Token reissue is only supported for guardian_approval and referee checks` | `check_type` is not `guardian_approval` or `referee` |
| `Not allowed to reissue token for this event` | Caller is not a super admin and does not pass `check_user_event_access` for the application's event |

### 7.4 Submit success payload (exact keys)

| Key | Type |
|-----|------|
| `check_id` | uuid |
| `previous_status` | string (always `pending` for successful token path) |
| `new_status` | string (`satisfied` or `failed`) |

### 7.5 Reissue return payload (exact keys)

**`app_base_application_check_reissue_token`** returns a `jsonb` object with the following keys on success. Verified against dev-db function definition on `rkytnffgmwnnmewevqgp`.

| Key | Type | Semantics |
|-----|------|-----------|
| `check_id` | uuid | `base_application_check.id` — the reissued check |
| `token` | text | Raw token string — used by the organiser backend or Edge Function to construct the magic link for dispatch to the guardian or referee. **Never expose this value in UI.** |
| `token_expires_at` | string (ISO-8601 UTC, e.g. `2026-05-15T10:30:00Z`) | New expiry — `now() + p_expiry_interval` (default **14 days** once BA05a migration lands; currently **7 days** on dev-db pending that migration). |

> **Migration note:** the current dev-db implementation defaults to `'7 days'` in both the parameter default and the internal `coalesce` fallback. BA05a FS-16 changes both to `'14 days'`. The return key name `token_expires_at` is stable across that change.

### 7.6 Cross-slice handoff

- **BA04:** defines **`base_registration_type_requirement`** rows including **`check_type`** and order — drives which checks exist.
- **BA05a:** creates **`base_application_check`** rows, issues first-token rows for **`guardian_approval`** / **`referee`**, modifies **`app_base_application_check_reissue_token`** (default interval and coalesce fallback to 14 days; UTC serialisation of `token_expires_at`), implements **`app_base_advance_application_checks`**, and ensures **`app_base_application_check_submit`** calls the helper after writes once migrated.
- **pace-portal:** implements **`/approvals/:token`** using §7 RPCs only for data.

### 7.7 Fixture policy

Shipping portal route must not substitute hardcoded application rows for production — use RPC responses or approved seed data (BA18).

---

## 8. Data and schema references

| Artefact | Role |
|----------|------|
| `base_application_check` | Token hash, expiry, status, notes, action metadata |
| `base_application` | `event_id`, `person_id`, `registration_type_id` |
| `base_registration_type_requirement` | `check_type` for `requirement_id` |
| `base_registration_type` | Registration type name |
| `core_events` | Event title |
| `core_person` | Applicant display name fields |

### 8.1 MCP verification (dev-db `rkytnffgmwnnmewevqgp`)

1. Inspect **`app_base_application_check_resolve_token`** — verify joins to event, registration type, person, and requirement; verify `expires_at` is cast to UTC; verify returned keys match §7.2 exactly:
   ```sql
   SELECT pg_get_functiondef(p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'app_base_application_check_resolve_token';
   ```
2. Inspect **`app_base_application_check_submit`** — verify `notes` assignment matches §6.2 (no prior-notes merge or coalesce); verify `app_base_advance_application_checks` is invoked after the UPDATE when the helper exists:
   ```sql
   SELECT pg_get_functiondef(p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'app_base_application_check_submit';
   ```
3. Inspect **`app_base_application_check_reissue_token`** — verify parameter default and internal coalesce fallback are both **14 days** (post BA05a migration); verify `token_expires_at` is cast to UTC in the return:
   ```sql
   SELECT pg_get_functiondef(p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'app_base_application_check_reissue_token';
   ```
4. Negative: resolve with garbage token → message **`Invalid or expired token`**. Submit after successful consumption → **`Invalid, expired, or already used token`**.
5. Success path: resolve JSON key set exactly matches §7.2 — no forbidden keys from §6.7 present in serialised output.
6. Reissue return shape: call **`app_base_application_check_reissue_token`** with a valid organiser session and confirm response contains exactly **`check_id`**, **`token`**, **`token_expires_at`** per §7.5 — no extra keys, no missing keys.

Domain/decision references cited elsewhere in rebuild docs: **`DB-303`** pattern (reject requires notes) — behaviour restated in §6–§7.

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA07 |
|---|---|---|
| _None in BASE app_ | Root-first policy applies; no pace-core import required in this slice | BA07 defines token-action RPC contracts and portal obligations |

### 9.2 Slice-specific caveats only

- Resolve payload is allow-listed and must not leak secret/check internals.
- Submit supports token-only actors; `auth.uid()` may be null.
- Submit success must chain `app_base_advance_application_checks` transactionally when available.
- Import style in this slice follows root-first policy even though no pace-core symbols are consumed.

## 10. Permission and access rules

| Actor | `app_base_application_check_resolve_token` | `app_base_application_check_submit` | `app_base_application_check_reissue_token` |
|-------|---------------------------------------------|---------------------------------------|---------------------------------------------|
| Unauthenticated holder of valid raw token | Allow — token proves authority | Allow — token proves authority | Deny — not token-gated; requires privilege path |
| Authenticated user without organiser privilege | Allow for resolve/submit **if** token valid | Same | Deny |
| Organiser / event access per existing RPC checks | Allow when token valid | Allow when token valid | Allow when RPC internal checks pass |

**`actioned_by`:** may be **null** when **`auth.uid()`** is null on submit — **expected** for token-only approvers.

---

## 11. Acceptance criteria

- **AC-01** — Given a pending non-expired check with a known raw token, when **`app_base_application_check_resolve_token`** is called, then the JSON contains **only** keys in §7.2 with non-null **`event_title`**, **`registration_type_name`**, **`applicant_display_name`**, and **`check_type`** matching joined rows.
- **AC-02** — Given the same token after a **successful** submit, when **resolve** is called again, then the call fails with message **`Invalid or expired token`**.
- **AC-03** — Given **`p_outcome = 'reject'`** and **`p_notes`** null or whitespace-only, when **submit** is called, then the call fails with **`Comments are required for reject`**.
- **AC-04** — Given **`p_outcome = 'approve'`** and **`p_notes`** null, when **submit** succeeds, then **`base_application_check.notes`** is **null** and **`status`** is **`satisfied`**.
- **AC-05** — Given **`p_outcome = 'reject'`** with non-empty trimmed notes, when **submit** succeeds, then **`status`** is **`failed`** and returned **`new_status`** is **`failed`**.
- **AC-06** — Given a migrated backend where **`app_base_advance_application_checks`** exists, when **submit** succeeds, then the helper runs in the **same transaction** (verified by migration review or integration test that fails the helper to roll back submit).
- **AC-07** — Given **reissue** called with **`p_expiry_interval` omitted**, when defaults apply, then new expiry is approximately **now + 14 days** (same calendar-day policy as BA05a verification).
- **AC-08** — Given resolve output inspected as text, when a grep runs for forbidden substrings **`token_hash`**, **`notes`** (as a keyed field in resolve payload — **must be absent**), then no forbidden keys from §6.7 appear.
- **AC-09** — Given **`app_base_application_check_reissue_token`** called successfully with an organiser session, when the return JSON is inspected, then it contains exactly the keys **`check_id`**, **`token`**, **`token_expires_at`** with no additional keys, and **`token_expires_at`** is a UTC ISO-8601 string.

Traceability: AC-01→TA-01–05; AC-02→TA-13; AC-03→TA-08; AC-04→TA-09–10; AC-05→TA-06–11; AC-06→TA-12; AC-07→§6.5; AC-08→TA-03, §6.7; AC-09→§7.5.

---

## 12. Verification

- Verify resolve -> submit happy path and token invalidation after submit.
- Verify reject requires non-empty comments while approve permits null notes.
- Verify reissue token rotation and default interval behaviour.
- Verify resolve payload includes only allow-listed keys.
- Verify function parity via MCP checks.

## 13. Testing requirements

- SQL/integration tests for resolve payload shape and forbidden-key exclusions.
- Submit tests for approve/reject note semantics and exact errors.
- Reissue tests for response shape and default expiry policy.
- Chain tests for helper invocation once dependency migration is present.

## 14. Build execution rules

- BA07 is RPC-contract scope; BASE UI implementation is out of scope.
- Coordinate submit/advance-helper semantics with BA05a migration ownership.
- Stop on signature/verification mismatch; do not ship divergent behaviour.
- Do not return entire joined rows where allow-listed payloads are required.

## 15. Done criteria

- Verification evidence confirms resolve/submit/reissue contract behaviour.
- Acceptance criteria for payload, notes, and token lifecycle are satisfied.
- Consumer integrations rely only on documented RPC interfaces.

## 16. Do not

- Do not add resolve payload fields without updating this contract.
- Do not require session auth for token-only resolve/submit path.
- Do not expose token hashes/raw secrets or unrelated check data.
- Do not bypass check-chain advancement after submit once helper exists.
- Do not implement portal UI design in this BASE slice.

## 17. References

- `docs/requirements/base/BASE-project-brief.md`
- `docs/requirements/base/BASE-architecture.md`
- `docs/requirements/base/BA04-registration-setup-and-policy-requirements.md`
- `docs/requirements/base/BA05a-registration-entry-and-application-submission-requirements.md`
- `docs/database/domains/base.md`

## 18. Implementing Agent Instructions

- Implementation persona is migration engineer for token RPC contracts.
- Keep resolve/submit/reissue behaviour and error contracts exact.
- Stop and report when helper dependency or signature parity is missing.
