-- =============================================================================
-- Migration 011: Per-org subscription/billing state
--
-- Billing happens in QuickBooks (manual invoicing). The SaaS just tracks
-- whether each org is currently entitled to use it. Super admins flip status
-- via the /admin UI when QBO state changes.
--
-- Statuses:
--   pending   - new signup, NOT yet activated. Blocked from /app/*.
--   active    - paid, full access.
--   past_due  - invoice late. Access still works but a banner nags them.
--   suspended - manually blocked by super admin.
--   cancelled - org has quit.
--
-- Money is stored in CENTS (integer) to avoid floating-point pain. Default
-- monthly rate is $599/rooftop = 59900 cents.
-- =============================================================================

do $$ begin
  create type subscription_status as enum (
    'pending', 'active', 'past_due', 'suspended', 'cancelled'
  );
exception when duplicate_object then null; end $$;

alter table organizations
  add column if not exists subscription_status        subscription_status not null default 'pending',
  add column if not exists monthly_rate_cents         integer not null default 59900,
  add column if not exists annual_contract            boolean not null default false,
  add column if not exists setup_fee_waived           boolean not null default false,
  add column if not exists subscription_started_at    timestamptz,
  add column if not exists current_period_end         date,
  add column if not exists billing_notes              text;

create index if not exists organizations_status_idx on organizations(subscription_status);

-- Auto-activate any org that already has a super admin as a member
-- (= the founder's own org, so Jim doesn't get locked out of his own app
-- after this migration deploys).
update organizations o
set subscription_status     = 'active',
    monthly_rate_cents      = 59900,
    annual_contract         = true,
    setup_fee_waived        = true,
    subscription_started_at = coalesce(subscription_started_at, now()),
    current_period_end      = coalesce(current_period_end, (now() + interval '1 year')::date),
    billing_notes           = coalesce(
      billing_notes,
      'Founder org — auto-activated by migration 011 (annual, setup waived)'
    )
where exists (
  select 1
  from super_admins sa
  join org_members m on m.user_id = sa.user_id
  where m.org_id = o.id
);

insert into _migrations (filename) values ('011_billing.sql')
  on conflict (filename) do nothing;
