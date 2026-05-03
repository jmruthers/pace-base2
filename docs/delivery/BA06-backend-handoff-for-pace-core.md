# BA06 Backend Handoff For pace-core

## Scope

This document captures backend follow-up work identified while implementing BA06 (`/applications`) in `pace-base2`.

Frontend delivery in this repo now assumes the current dev database contract and calls only approved RPC boundaries.

## Environment Verified

- Project ref used for verification: `rkytnffgmwnnmewevqgp`
- Verification method: Supabase CLI `db push` + `db query --linked`
- Verification date: 2026-05-03

## Verified Current Contract

### RPCs present

The following functions are present in `public`:

- `app_base_application_set_status(p_application_id uuid, p_target_status text, p_actor uuid, p_notes text)`
- `app_base_application_check_set_status(p_check_id uuid, p_status text, p_notes text)`
- `app_base_application_check_reissue_token(p_check_id uuid, p_actor uuid, p_expiry_interval interval)`

### Security posture

All three functions above are currently `SECURITY DEFINER` with `SET search_path TO 'public'`.

### Notification templates present

The following `pump_system_templates.system_key` values exist:

- `base.application_approved`
- `base.application_rejected`

## Gap Resolution In pace-core

### 1) Application status notification dispatch wiring (Resolved)

Applied in `pace-core2` migration:

- `packages/core/supabase/migrations/20260503203000_ba06_application_status_notification_dispatch.sql`

Implemented contract:

- Added `app_base_queue_application_status_notification(p_application_id uuid, p_target_status text)` to enqueue BA06 status notifications into `base_notification_dispatch_job`.
- Updated `app_base_application_set_status(...)` to invoke the queue helper after successful status mutation.
- Dispatch remains server-side and reuses the existing outbox + Edge dispatch pattern.
- `base_notification_dispatch_job.check_id` was made nullable to support application-level notifications that are not check-anchored.

### 2) Reject-note policy alignment for `app_base_application_set_status` (Resolved)

Current function behavior requires notes for rejected transitions (`validation_error.reject_notes_required`).

Resolved decision:

- Policy is intentional and preserved.
- Canonical contracts retained:
  - reject without notes -> `validation_error.reject_notes_required`
  - invalid source transition -> `validation_error.application_status_transition_invalid`
- Consumer requirement authority updated in `pace-core2/docs/requirements/base/BA06-applications-admin-and-review-requirements.md`.

## BA06 Consumer Expectations (already implemented)

The BA06 frontend in `pace-base2` now:

- Uses `app_base_application_set_status` for approve/reject only.
- Uses `app_base_application_check_set_status` for `event_approval` satisfy/reject.
- Uses `app_base_application_check_reissue_token` for guardian/referee reissue.
- Never performs direct table writes for application/check status mutations.

## Suggested Acceptance Checks For pace-core

1. Trigger an approve transition for a test application and confirm a server-side dispatch event is emitted for `base.application_approved`.
2. Trigger a reject transition and confirm dispatch for `base.application_rejected`.
3. Call `app_base_application_set_status` with `p_target_status='rejected'` and blank `p_notes`; verify expected policy outcome.
4. Call `app_base_application_set_status` on an already-final status and verify the transition conflict error contract.
5. Confirm all three BA06 RPCs remain `SECURITY DEFINER` and enforce event access checks.

## MCP Evidence Snapshot (SQL used)

```sql
select n.nspname as schema_name,
       p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'app_base_application_set_status',
    'app_base_application_check_reissue_token',
    'app_base_application_check_set_status'
  )
order by p.proname;
```

```sql
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_args,
       pg_get_function_arguments(p.oid) as full_args,
       p.prosecdef as security_definer,
       p.provolatile as volatility
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'app_base_application_set_status',
    'app_base_application_check_reissue_token',
    'app_base_application_check_set_status'
  )
order by p.proname;
```

```sql
with fn as (
  select n.nspname as schema_name,
         p.proname as function_name,
         pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public'
)
select 'template_keys' as section, t.system_key as item, null::text as detail
from public.pump_system_templates t
where t.system_key in ('base.application_approved','base.application_rejected')
union all
select 'trigger_on_base_application' as section, tg.tgname as item, pg_get_triggerdef(tg.oid) as detail
from pg_trigger tg
join pg_class c on c.oid=tg.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='base_application' and not tg.tgisinternal
union all
select 'functions_ref_template_keys' as section, fn.function_name as item, null::text as detail
from fn
where fn.definition ilike '%base.application_approved%' or fn.definition ilike '%base.application_rejected%'
order by section, item;
```
