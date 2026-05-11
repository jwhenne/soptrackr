-- =============================================================================
-- Migration 002: INSERT/DELETE policies for tenant tables
--
-- Migration 001 enabled RLS and added SELECT/UPDATE policies but not INSERT.
-- Without INSERT policies, the org creation flow gets blocked by default-deny.
--
-- The flow we need to allow:
--   1. Any authenticated user can INSERT into organizations (= create their own org)
--   2. Any authenticated user can INSERT themselves into org_members
--      (bootstrapping the first admin row), OR an admin can add anyone
--   3. Org admins can INSERT into rooftops for orgs they admin
--   4. Org admins can INSERT into invitations
--   5. Org admins can DELETE rooftops/members/invitations
-- =============================================================================

-- organizations: any authenticated user (one with a synced users row) can create
drop policy if exists organizations_insert_authenticated on organizations;
create policy organizations_insert_authenticated on organizations for insert
  with check (current_user_id() is not null);

-- org_members: insert yourself OR be an admin already
drop policy if exists org_members_insert on org_members;
create policy org_members_insert on org_members for insert
  with check (
    user_id = current_user_id()
    or is_org_admin(org_id)
  );

drop policy if exists org_members_delete_admin on org_members;
create policy org_members_delete_admin on org_members for delete
  using (is_org_admin(org_id));

-- rooftops: admin-only insert/delete
drop policy if exists rooftops_insert_admin on rooftops;
create policy rooftops_insert_admin on rooftops for insert
  with check (is_org_admin(org_id));

drop policy if exists rooftops_delete_admin on rooftops;
create policy rooftops_delete_admin on rooftops for delete
  using (is_org_admin(org_id));

-- invitations: admin-only insert/delete
drop policy if exists invitations_insert_admin on invitations;
create policy invitations_insert_admin on invitations for insert
  with check (is_org_admin(org_id));

drop policy if exists invitations_delete_admin on invitations;
create policy invitations_delete_admin on invitations for delete
  using (is_org_admin(org_id));

-- users: lazy-sync insert/update for the current Clerk user only
drop policy if exists users_self_insert on users;
create policy users_self_insert on users for insert
  with check (clerk_user_id = current_clerk_user_id());

drop policy if exists users_self_update on users;
create policy users_self_update on users for update
  using (clerk_user_id = current_clerk_user_id())
  with check (clerk_user_id = current_clerk_user_id());

insert into _migrations (filename) values ('002_insert_policies.sql')
  on conflict (filename) do nothing;
