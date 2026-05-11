-- =============================================================================
-- Migration 006: Fix ambiguous column reference in accept_invitation()
--
-- The OUT parameter `org_id` (and `role`) collided with table columns in
-- `on conflict (org_id, user_id)`, causing 42702 ERROR: column reference
-- "org_id" is ambiguous. Rename the OUT parameters so they don't collide.
-- =============================================================================

drop function if exists accept_invitation(text, text);

create or replace function accept_invitation(p_token text, p_clerk_user_id text)
returns table (
  is_ok           boolean,
  joined_org_id   uuid,
  assigned_role   user_role,
  result_message  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_user_id uuid;
begin
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

  select id into v_user_id from users where clerk_user_id = p_clerk_user_id;
  if v_user_id is null then
    return query select false, v_inv.org_id, v_inv.role, 'User not found - please sign in first'::text;
    return;
  end if;

  insert into org_members (org_id, user_id, role)
  values (v_inv.org_id, v_user_id, v_inv.role)
  on conflict (org_id, user_id) do nothing;

  update invitations set accepted_at = now() where id = v_inv.id;

  return query select true, v_inv.org_id, v_inv.role, 'Joined organization'::text;
end;
$$;

revoke all on function accept_invitation(text, text) from public;
grant execute on function accept_invitation(text, text) to public;

insert into _migrations (filename) values ('006_fix_accept_invitation.sql')
  on conflict (filename) do nothing;
