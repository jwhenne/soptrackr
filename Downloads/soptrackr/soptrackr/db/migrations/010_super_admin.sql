-- =============================================================================
-- Migration 010: Super-admin foundation
--
-- Super admins are platform operators (Jim, plus anyone he trusts later) who
-- need cross-tenant visibility for support, debugging, and onboarding help.
--
-- Tables:
--   super_admins         - the small set of users with platform-wide access
--   super_admin_actions  - audit log of every privileged action
--
-- Helper:
--   is_super_admin()     - true if the current Clerk user is a super admin
--
-- Seed:
--   Auto-promotes the user who created the first organization (Jim, in
--   our case). New super admins are added via the /admin UI later.
-- =============================================================================

create table if not exists super_admins (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references users(id) on delete cascade,
  added_by        uuid references users(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Audit log of super-admin actions
create table if not exists super_admin_actions (
  id                  uuid primary key default gen_random_uuid(),
  super_admin_user_id uuid not null references users(id) on delete set null,
  action              text not null,                -- e.g. 'view_org', 'edit_groupme', 'reset_invite'
  target_org_id       uuid references organizations(id) on delete set null,
  target_resource     text,                         -- e.g. 'sop:abc-123', 'invitation:...'
  details             jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists super_admin_actions_admin_idx on super_admin_actions(super_admin_user_id, created_at desc);
create index if not exists super_admin_actions_org_idx   on super_admin_actions(target_org_id, created_at desc);

-- Helper function — check membership efficiently from server code
create or replace function is_super_admin(p_clerk_user_id text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from super_admins sa
    join users u on u.id = sa.user_id
    where u.clerk_user_id = p_clerk_user_id
  );
$$;

revoke all on function is_super_admin(text) from public;
grant execute on function is_super_admin(text) to public;

-- Enable RLS on super_admins/super_admin_actions (only super admins can read)
alter table super_admins enable row level security;
alter table super_admins force row level security;
alter table super_admin_actions enable row level security;
alter table super_admin_actions force row level security;

drop policy if exists super_admins_self_read on super_admins;
create policy super_admins_self_read on super_admins for select
  using (is_super_admin(current_clerk_user_id()));

drop policy if exists super_admin_actions_self_read on super_admin_actions;
create policy super_admin_actions_self_read on super_admin_actions for select
  using (is_super_admin(current_clerk_user_id()));

-- All write paths go through server code as the postgres role (bypasses RLS),
-- so no INSERT/UPDATE/DELETE policies are needed.

-- Auto-seed: promote the user who created the first organization (the founder).
-- Idempotent — does nothing if a super_admin already exists.
do $$
declare
  v_founder_user_id uuid;
begin
  if (select count(*) from super_admins) = 0 then
    select created_by into v_founder_user_id
    from organizations
    where created_by is not null
    order by created_at asc
    limit 1;

    if v_founder_user_id is not null then
      insert into super_admins (user_id, notes)
      values (v_founder_user_id, 'Auto-seeded as founder')
      on conflict (user_id) do nothing;
    end if;
  end if;
end $$;

insert into _migrations (filename) values ('010_super_admin.sql')
  on conflict (filename) do nothing;
