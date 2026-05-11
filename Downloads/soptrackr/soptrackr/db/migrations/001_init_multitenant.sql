-- =============================================================================
-- SOPTrackr Multi-Tenant Foundation
-- Migration 001: organizations, rooftops, users, members, invitations
--
-- Tenancy model:
--   organizations  = one dealer or dealer group (the billing unit)
--   rooftops       = physical store locations under an organization
--   org_members    = which users belong to an organization, with role
--   invitations    = pending email-based invites
--
-- Auth model:
--   users.clerk_user_id is the bridge to Clerk
--   The current request's user is identified via app.current_clerk_user_id session var
--   RLS uses that to scope every query to the user's org memberships
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum (
    'admin',
    'manager',
    'parts_consultant',
    'service_advisor',
    'technician'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Users (mirror of Clerk users; synced via webhook)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  clerk_user_id   text unique not null,
  email           text not null,
  first_name      text,
  last_name       text,
  image_url       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists users_email_idx on users(lower(email));

-- ---------------------------------------------------------------------------
-- Organizations (the dealer or dealer group; the billing unit)
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rooftops (physical store locations under an org)
-- ---------------------------------------------------------------------------
create table if not exists rooftops (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  name            text not null,
  brand           text,        -- 'Toyota', 'Honda', etc.
  address_line1   text,
  city            text,
  state           text,
  postal_code     text,
  phone           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists rooftops_org_idx on rooftops(org_id);

-- ---------------------------------------------------------------------------
-- Org members (link table: which users belong to which orgs, with role)
-- ---------------------------------------------------------------------------
create table if not exists org_members (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  role            user_role not null default 'admin',
  created_at      timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists org_members_user_idx on org_members(user_id);
create index if not exists org_members_org_idx on org_members(org_id);

-- ---------------------------------------------------------------------------
-- Invitations (pending email invites with secure token)
-- ---------------------------------------------------------------------------
create table if not exists invitations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  email           text not null,
  role            user_role not null default 'service_advisor',
  invited_by      uuid references users(id) on delete set null,
  token           text unique not null default encode(gen_random_bytes(24), 'hex'),
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  created_at      timestamptz not null default now()
);
create index if not exists invitations_email_idx on invitations(lower(email));
create index if not exists invitations_org_idx on invitations(org_id);

-- ---------------------------------------------------------------------------
-- Updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_organizations_updated on organizations;
create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();

drop trigger if exists trg_rooftops_updated on rooftops;
create trigger trg_rooftops_updated before update on rooftops
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helper: read the current request's Clerk user ID from a session var
-- The Next.js server sets this with `set local app.current_clerk_user_id = '...'`
-- before running tenant-scoped queries.
-- ---------------------------------------------------------------------------
create or replace function current_clerk_user_id() returns text as $$
  select nullif(current_setting('app.current_clerk_user_id', true), '');
$$ language sql stable;

create or replace function current_user_id() returns uuid as $$
  select id from users where clerk_user_id = current_clerk_user_id();
$$ language sql stable;

create or replace function is_org_member(target_org_id uuid) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = target_org_id and user_id = current_user_id()
  );
$$ language sql stable;

create or replace function is_org_admin(target_org_id uuid) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = target_org_id
      and user_id = current_user_id()
      and role in ('admin', 'manager')
  );
$$ language sql stable;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table organizations enable row level security;
alter table rooftops enable row level security;
alter table org_members enable row level security;
alter table invitations enable row level security;

-- Users: a user can read their own row + any user that shares an org with them.
-- (We need to see teammate names/emails for member lists.)
drop policy if exists users_self_or_teammate on users;
create policy users_self_or_teammate on users for select
  using (
    clerk_user_id = current_clerk_user_id()
    or exists (
      select 1
      from org_members me
      join org_members them on me.org_id = them.org_id
      where me.user_id = current_user_id()
        and them.user_id = users.id
    )
  );

-- Organizations: members can read their own orgs.
drop policy if exists organizations_member_read on organizations;
create policy organizations_member_read on organizations for select
  using (is_org_member(id));

-- Org admins can update their org.
drop policy if exists organizations_admin_update on organizations;
create policy organizations_admin_update on organizations for update
  using (is_org_admin(id));

-- Rooftops: org members can read; admins can write.
drop policy if exists rooftops_member_read on rooftops;
create policy rooftops_member_read on rooftops for select
  using (is_org_member(org_id));

drop policy if exists rooftops_admin_all on rooftops;
create policy rooftops_admin_all on rooftops for all
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- Org members: members can see who else is in their org; admins can manage.
drop policy if exists org_members_member_read on org_members;
create policy org_members_member_read on org_members for select
  using (is_org_member(org_id));

drop policy if exists org_members_admin_all on org_members;
create policy org_members_admin_all on org_members for all
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- Invitations: admins can manage their org's invites.
drop policy if exists invitations_admin_all on invitations;
create policy invitations_admin_all on invitations for all
  using (is_org_admin(org_id))
  with check (is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- Migrations bookkeeping
-- ---------------------------------------------------------------------------
create table if not exists _migrations (
  id              serial primary key,
  filename        text unique not null,
  applied_at      timestamptz not null default now()
);
insert into _migrations (filename) values ('001_init_multitenant.sql')
  on conflict (filename) do nothing;
