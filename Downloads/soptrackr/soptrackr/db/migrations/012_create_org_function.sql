-- =============================================================================
-- Migration 012: SECURITY DEFINER function for atomic org creation
--
-- The current org-creation flow has the application code run three INSERTs
-- (organizations, org_members, rooftops) inside a single transaction as the
-- `authenticated` role. With FORCE RLS, the `organizations` INSERT policy
-- requires `current_user_id() IS NOT NULL`, which depends on a freshly-synced
-- user row being visible to the policy check across transactions. In practice
-- new-signup flows hit "new row violates row-level security policy" because of
-- timing/visibility nuances at the Supavisor pooler.
--
-- Fix: do the bootstrap atomically inside one SECURITY DEFINER function. The
-- function:
--   1. Validates the calling Clerk user exists in our users table
--   2. Creates the org with created_by = that user
--   3. Inserts the user as the first admin member
--   4. Creates the first rooftop
--   5. Returns all three IDs
-- =============================================================================

create or replace function create_org_with_first_rooftop(
  p_clerk_user_id  text,
  p_org_name       text,
  p_org_slug       text,
  p_rooftop_name   text,
  p_rooftop_brand  text,
  p_rooftop_city   text,
  p_rooftop_state  text
)
returns table (
  new_org_id      uuid,
  new_member_id   uuid,
  new_rooftop_id  uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid;
  v_org_id     uuid;
  v_member_id  uuid;
  v_rooftop_id uuid;
begin
  -- 1. Confirm the calling user exists
  select id into v_user_id from users where clerk_user_id = p_clerk_user_id;
  if v_user_id is null then
    raise exception 'User not found for clerk_user_id %', p_clerk_user_id
      using errcode = '28000';  -- invalid_authorization_specification
  end if;

  -- 2. Create the org
  insert into organizations (name, slug, created_by)
  values (p_org_name, p_org_slug, v_user_id)
  returning id into v_org_id;

  -- 3. Add the user as the first admin member
  insert into org_members (org_id, user_id, role)
  values (v_org_id, v_user_id, 'admin')
  returning id into v_member_id;

  -- 4. Create the first rooftop
  insert into rooftops (org_id, name, brand, city, state)
  values (v_org_id, p_rooftop_name, p_rooftop_brand, p_rooftop_city, p_rooftop_state)
  returning id into v_rooftop_id;

  return query select v_org_id, v_member_id, v_rooftop_id;
end;
$$;

revoke all on function create_org_with_first_rooftop(text, text, text, text, text, text, text) from public;
grant execute on function create_org_with_first_rooftop(text, text, text, text, text, text, text) to public;

insert into _migrations (filename) values ('012_create_org_function.sql')
  on conflict (filename) do nothing;
