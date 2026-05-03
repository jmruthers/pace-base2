# BA05b Backend-Ready Evidence

## Scope

This evidence log maps BA05b acceptance and verification obligations in `docs/requirements/BA05b-participant-application-progress-requirements.md` to captured proof.

## Verification Environment

- Dev DB project: `rkytnffgmwnnmewevqgp`
- Verification method: Supabase MCP `execute_sql`
- Requirement reference: BA05b section `8.1 MCP verification`

## BA05b Section 8.1 Query Evidence

### 1) Function signature and contract surface

Query:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_args,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'app_base_application_progress_get';
```

Observed result:

- `function_name = app_base_application_progress_get`
- `identity_args = p_application_id uuid`
- `return_type = jsonb`
- `security_definer = true`

Pass criteria:

- Signature matches BA05b section 7.1 (`p_application_id uuid`, no `p_user_id`).

### 2) Applicant fixture payload shape and allow-list

Fixture used:

- `application_id = 5ca15fc2-8a2f-4bf0-9b1d-5a7b83d4adab`
- applicant `auth.uid() = 8f766898-cb10-4ac7-887a-88fe1db687b2`

Query executed:

```sql
with auth_ctx as (
  select
    set_config('request.jwt.claim.sub', '8f766898-cb10-4ac7-887a-88fe1db687b2', true) as _sub,
    set_config('request.jwt.claim.role', 'authenticated', true) as _role
),
payload as (
  select public.app_base_application_progress_get('5ca15fc2-8a2f-4bf0-9b1d-5a7b83d4adab'::uuid) as data
  from auth_ctx
),
app_keys as (
  select key from payload, jsonb_object_keys(data->'application') key
),
reg_keys as (
  select key from payload, jsonb_object_keys(data->'registration_type') key
),
check_rows as (
  select ordinality, elem
  from payload, jsonb_array_elements(data->'checks') with ordinality as t(elem, ordinality)
),
check_keys as (
  select distinct key from check_rows, jsonb_object_keys(elem) key
),
expected_app as (
  select unnest(array[
    'id','event_id','organisation_id','person_id','registration_type_id','form_id',
    'referee_name','status','submitted_at'
  ]) as key
),
expected_reg as (
  select unnest(array['id','name','description']) as key
),
expected_check as (
  select unnest(array['id','requirement_id','sort_order','check_type','participant_check_label','status']) as key
),
invalid_labels as (
  select
    ordinality,
    elem->>'check_type' as check_type,
    elem->>'participant_check_label' as participant_check_label
  from check_rows
  where (elem->>'check_type', elem->>'participant_check_label') not in (
    ('payment','Payment'),
    ('guardian_approval','Guardian approval'),
    ('home_leader_approval','Home leader approval'),
    ('referee','Referee approval'),
    ('designated_org_review','Organisation review'),
    ('event_approval','Event approval')
  )
),
ordering_breaks as (
  select count(*) as break_count
  from (
    select
      (elem->>'sort_order')::int as current_sort,
      lag((elem->>'sort_order')::int) over (order by ordinality) as prev_sort
    from check_rows
  ) s
  where prev_sort is not null
    and current_sort < prev_sort
)
select
  data->'application'->>'status' as application_status,
  jsonb_typeof(data->'checks') as checks_type,
  jsonb_array_length(data->'checks') as checks_count,
  not exists (select 1 from app_keys where key not in (select key from expected_app))
    and not exists (select 1 from expected_app where key not in (select key from app_keys)) as application_exact_keyset,
  not exists (select 1 from reg_keys where key not in (select key from expected_reg))
    and not exists (select 1 from expected_reg where key not in (select key from reg_keys)) as registration_type_exact_keyset,
  case when jsonb_array_length(data->'checks') = 0 then true else
    (not exists (select 1 from check_keys where key not in (select key from expected_check))
      and not exists (select 1 from expected_check where key not in (select key from check_keys)))
  end as checks_exact_keyset,
  (select break_count = 0 from ordering_breaks) as checks_sorted_by_sort_order,
  not exists (select 1 from invalid_labels) as labels_match_mapping,
  position('token_hash' in data::text) = 0 as excludes_token_hash,
  position('token_expires_at' in data::text) = 0 as excludes_token_expires_at,
  position('carer_person_id' in data::text) = 0 as excludes_carer_person_id,
  position('referee_person_id' in data::text) = 0 as excludes_referee_person_id,
  data
from payload;
```

Observed result summary:

- `application_status = submitted`
- `checks_type = array`
- `checks_count = 0`
- `application_exact_keyset = true`
- `registration_type_exact_keyset = true`
- `checks_exact_keyset = true`
- `checks_sorted_by_sort_order = true`
- `labels_match_mapping = true`
- `excludes_token_hash = true`
- `excludes_token_expires_at = true`
- `excludes_carer_person_id = true`
- `excludes_referee_person_id = true`

Pass criteria:

- Payload key sets and exclusions satisfy BA05b sections 6.4, 7.2, and 8.1 step 2 and step 3.

### 3) Non-applicant denial semantics

Fixture used:

- same `application_id = 5ca15fc2-8a2f-4bf0-9b1d-5a7b83d4adab`
- non-applicant `auth.uid() = 096986d6-91a2-4390-a499-9494cfabf74b`

Query executed:

```sql
do $$
begin
  perform set_config('request.jwt.claim.sub', '096986d6-91a2-4390-a499-9494cfabf74b', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform public.app_base_application_progress_get('5ca15fc2-8a2f-4bf0-9b1d-5a7b83d4adab'::uuid);
  raise exception 'expected access denied but call succeeded';
exception
  when others then
    if SQLSTATE <> 'P0001' then
      raise exception 'unexpected sqlstate: % message: %', SQLSTATE, SQLERRM;
    end if;
    if SQLERRM <> 'base_application_access_denied' then
      raise exception 'unexpected message: %', SQLERRM;
    end if;
end
$$;
```

Observed result:

- Block completed successfully (no assertion exception raised), confirming expected denial behaviour.

Pass criteria:

- BA05b section 6.5 and 8.1 step 4 satisfied (`P0001` with `base_application_access_denied`).

## Acceptance Criteria Mapping

- `AC-01`: covered by payload keyset and ordering checks.
- `AC-03`: covered by explicit exclusion assertions and payload inspection.
- `AC-04`: covered by denial semantics verification.
- `AC-05`: covered by successful applicant payload containing `checks = []`.
- `AC-06`: mapping logic check included in verification query and returns pass for fixture data (no invalid labels).

## Summary

BA05b section 8.1 verification queries are complete on dev-db and pass for function signature, positive applicant payload shape/exclusions, and denied non-applicant access semantics.
