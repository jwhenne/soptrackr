-- =============================================================================
-- Migration 009: Make RLS helper functions SECURITY DEFINER
--
-- After enabling FORCE ROW LEVEL SECURITY in 008, the RLS policies that call
-- current_user_id() / is_org_member() / is_org_admin() recurse infinitely:
-- those functions query users / org_members, which triggers the same policies
-- that called them.
--
-- Fix: make the helper functions SECURITY DEFINER so they run as their owner
-- (postgres, with BYPASSRLS), short-circuiting the recursion. The functions
-- themselves only do tightly-scoped lookups by id/clerk_user_id, so this is
-- safe — there's no way for a caller to pass arbitrary SQL into them.
-- =============================================================================

create or replace function current_user_id() returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from users where clerk_user_id = current_clerk_user_id();
$$;

create or replace function is_org_member(target_org_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org_id and user_id = current_user_id()
  );
$$;

create or replace function is_org_admin(target_org_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org_id
      and user_id = current_user_id()
      and role in ('admin', 'manager')
  );
$$;

-- Re-grant execute (CREATE OR REPLACE preserves grants but be defensive)
grant execute on function current_clerk_user_id() to authenticated;
grant execute on function current_user_id()       to authenticated;
grant execute on function is_org_member(uuid)     to authenticated;
grant execute on function is_org_admin(uuid)      to authenticated;

insert into _migrations (filename) values ('009_security_definer_helpers.sql')
  on conflict (filename) do nothing;
