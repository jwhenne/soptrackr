-- =============================================================================
-- Migration 008: Force RLS + grant tenant-table access to `authenticated`
--
-- The DATABASE_URL connects as the `postgres` role which has BYPASSRLS — this
-- means RLS policies are silently ignored, and any cross-tenant query returns
-- everything. The application is supposed to switch to a non-bypass role
-- (`authenticated`) for tenant queries (see lib/db.ts withTenantClient).
--
-- This migration:
--   1. FORCEs RLS on every tenant table so the table owner is also subject to
--      policies (defense-in-depth).
--   2. Grants the necessary DML rights on tenant tables to `authenticated`
--      so the application's tenant queries work after `SET LOCAL ROLE
--      authenticated`.
--   3. Grants EXECUTE on our helper functions to `authenticated`.
--
-- Tested via /api/admin/isolation-test — all 7 checks should pass.
-- =============================================================================

-- 1. Force RLS so even table owners are subject to policies
alter table users               force row level security;
alter table organizations       force row level security;
alter table rooftops            force row level security;
alter table org_members         force row level security;
alter table invitations         force row level security;
alter table sops                force row level security;
alter table sop_status_history  force row level security;
alter table sop_contact_log     force row level security;

-- 2. Grant DML privileges to `authenticated` on tenant tables.
-- (The role itself doesn't bypass RLS, so each query is still scoped by the
-- policies in 001/002/003.)
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  users, organizations, rooftops, org_members, invitations,
  sops, sop_status_history, sop_contact_log
to authenticated;

-- The view sops_with_age inherits permissions from the underlying tables
grant select on sops_with_age to authenticated;

-- 3. Helper functions used by RLS policies need to be callable
grant execute on function current_clerk_user_id() to authenticated;
grant execute on function current_user_id()       to authenticated;
grant execute on function is_org_member(uuid)     to authenticated;
grant execute on function is_org_admin(uuid)      to authenticated;
grant execute on function set_updated_at()        to authenticated;

-- Sequences for any serial columns (we mostly use uuid, but _migrations uses serial)
grant usage, select on all sequences in schema public to authenticated;

insert into _migrations (filename) values ('008_force_rls.sql')
  on conflict (filename) do nothing;
