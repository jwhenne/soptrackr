-- =============================================================================
-- Migration 005: Invite token lookup + acceptance functions
--
-- Two SECURITY DEFINER functions:
--   lookup_invitation_by_token(text)  - returns minimal invite info given a
--                                        token. Lets an unauthenticated visitor
--                                        see what org/role they're being invited
--                                        to before signing in/up.
--   accept_invitation(text, text)     - atomically accepts an invite for a
--                                        given Clerk user ID. Validates token
--                                        is not expired/already-accepted, then
--                                        adds the user to the org with the
--                                        invited role.
--
-- Both bypass RLS via SECURITY DEFINER. Authorization is the token itself.
-- =============================================================================

create or replace function lookup_invitation_by_token(p_token text)
returns table (
  invitation_id   uuid,
  org_id          uuid,
  org_name        text,
  email           text,
  role            user_role,
  expires_at      timestamptz,
  accepted_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.org_id,
    o.name,
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at
  from invitations i
  join organizations o on o.id = i.org_id
  where i.token = p_token
  limit 1;
$$;

revoke all on function lookup_invitation_by_token(text) from public;
grant execute on function lookup_invitation_by_token(text) to public;


create or replace function accept_invitation(p_token text, p_clerk_user_id text)
returns table (
  ok          boolean,
  org_id      uuid,
  role        user_role,
  message     text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_user_id uuid;
begin
  -- Find the invite
  select * into v_inv from invitations where token = p_token;
  if not found then
    return query select false, null::uuid, null::user_role, 'Invitation not found'::text;
    return;
  end if;
  if v_inv.accepted_at is not null then
    return query select false, v_inv.org_id, v_inv.role, 'Invitation already accepted'::text;
    return;
  end if;
  if v_inv.expires_at < now() then
    return query select false, v_inv.org_id, v_inv.role, 'Invitation expired'::text;
    return;
  end if;

  -- Find the user (must already exist via Clerk lazy-sync)
  select id into v_user_id from users where clerk_user_id = p_clerk_user_id;
  if v_user_id is null then
    return query select false, v_inv.org_id, v_inv.role, 'User not found - please sign in first'::text;
    return;
  end if;

  -- Add membership (idempotent: do nothing if already a member)
  insert into org_members (org_id, user_id, role)
  values (v_inv.org_id, v_user_id, v_inv.role)
  on conflict (org_id, user_id) do nothing;

  -- Mark accepted
  update invitations set accepted_at = now() where id = v_inv.id;

  return query select true, v_inv.org_id, v_inv.role, 'Joined organization'::text;
end;
$$;

revoke all on function accept_invitation(text, text) from public;
grant execute on function accept_invitation(text, text) to public;

insert into _migrations (filename) values ('005_invite_functions.sql')
  on conflict (filename) do nothing;
