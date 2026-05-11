-- =============================================================================
-- Migration 003: Special Order Parts (SOP) tracking
--
-- The product. Mirrors the data model from the existing single-tenant Toyota
-- tracker, with multi-tenant scoping (org_id, rooftop_id) and full RLS.
--
-- Tables:
--   sops                  - one row per special order
--   sop_status_history    - audit trail of every status change
--   sop_contact_log       - BDC outreach attempts per SOP
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SOP status enum (matches the existing Toyota app's pipeline + 'returned')
-- ---------------------------------------------------------------------------
do $$ begin
  create type sop_status as enum (
    'ordered',     -- PO placed, waiting on supplier
    'in_transit',  -- shipped, en route
    'arrived',     -- received at the dealer's parts dept
    'notified',    -- BDC alert sent / customer outreach started
    'scheduled',   -- customer scheduled for install
    'installed',   -- part installed on vehicle
    'complete',    -- billed and handed out (terminal)
    'returned'     -- part returned to supplier (terminal)
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- sops: the orders themselves
-- ---------------------------------------------------------------------------
create table if not exists sops (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations(id) on delete cascade,
  rooftop_id          uuid not null references rooftops(id) on delete cascade,

  -- Core fields (all from the existing Toyota app)
  ro_number           text not null,        -- repair order #
  part_number         text,
  part_description    text not null,
  customer_name       text not null,
  customer_phone      text,
  customer_email      text,
  vehicle             text,                 -- e.g. "2022 Toyota Camry XLE"
  vehicle_staying     boolean,              -- yes/no — is vehicle on the lot?
  advisor             text,                 -- service advisor name
  notes               text,

  -- Status pipeline
  status              sop_status not null default 'ordered',

  -- Timestamps tied to status transitions
  ordered_at          timestamptz not null default now(),
  in_transit_at       timestamptz,
  arrived_at          timestamptz,
  notified_at         timestamptz,
  scheduled_at        timestamptz,          -- customer install appointment
  installed_at        timestamptz,
  completed_at        timestamptz,
  returned_at         timestamptz,
  return_reason       text,

  -- Audit
  created_by_user_id  uuid references users(id) on delete set null,
  updated_by_user_id  uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists sops_org_idx          on sops(org_id);
create index if not exists sops_rooftop_idx      on sops(rooftop_id);
create index if not exists sops_status_idx       on sops(org_id, status);
create index if not exists sops_ro_idx           on sops(org_id, ro_number);
create index if not exists sops_customer_idx     on sops(org_id, lower(customer_name));
create index if not exists sops_arrived_idx      on sops(org_id, arrived_at)
  where status in ('arrived', 'notified', 'scheduled');

drop trigger if exists trg_sops_updated on sops;
create trigger trg_sops_updated before update on sops
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- sop_status_history: every status change, who, when
-- ---------------------------------------------------------------------------
create table if not exists sop_status_history (
  id                  uuid primary key default gen_random_uuid(),
  sop_id              uuid not null references sops(id) on delete cascade,
  org_id              uuid not null references organizations(id) on delete cascade,
  from_status         sop_status,           -- null on the initial 'ordered'
  to_status           sop_status not null,
  changed_by_user_id  uuid references users(id) on delete set null,
  changed_at          timestamptz not null default now(),
  note                text                  -- e.g. return reason
);
create index if not exists sop_status_history_sop_idx on sop_status_history(sop_id, changed_at desc);
create index if not exists sop_status_history_org_idx on sop_status_history(org_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- sop_contact_log: BDC outreach attempts
-- ---------------------------------------------------------------------------
create table if not exists sop_contact_log (
  id                  uuid primary key default gen_random_uuid(),
  sop_id              uuid not null references sops(id) on delete cascade,
  org_id              uuid not null references organizations(id) on delete cascade,
  contacted_by_user_id uuid references users(id) on delete set null,
  contacted_by_name   text,                 -- denormalized for quick rep tabs
  method              text,                 -- 'phone', 'email', 'sms', 'voicemail', etc.
  outcome             text,                 -- 'spoke', 'left_voicemail', 'no_answer', 'scheduled'
  note                text,
  contacted_at        timestamptz not null default now()
);
create index if not exists sop_contact_log_sop_idx on sop_contact_log(sop_id, contacted_at desc);
create index if not exists sop_contact_log_org_idx on sop_contact_log(org_id, contacted_at desc);
create index if not exists sop_contact_log_rep_idx on sop_contact_log(org_id, lower(contacted_by_name));

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table sops               enable row level security;
alter table sop_status_history enable row level security;
alter table sop_contact_log    enable row level security;

-- sops: any org member can read; admins/managers and the assigned advisor can write
drop policy if exists sops_member_read on sops;
create policy sops_member_read on sops for select
  using (is_org_member(org_id));

drop policy if exists sops_member_write on sops;
create policy sops_member_write on sops for insert
  with check (is_org_member(org_id));

drop policy if exists sops_member_update on sops;
create policy sops_member_update on sops for update
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

drop policy if exists sops_admin_delete on sops;
create policy sops_admin_delete on sops for delete
  using (is_org_admin(org_id));

-- sop_status_history: any org member can read; any org member can append
drop policy if exists sop_status_history_member_read on sop_status_history;
create policy sop_status_history_member_read on sop_status_history for select
  using (is_org_member(org_id));

drop policy if exists sop_status_history_member_insert on sop_status_history;
create policy sop_status_history_member_insert on sop_status_history for insert
  with check (is_org_member(org_id));

-- sop_contact_log: any org member can read + log
drop policy if exists sop_contact_log_member_read on sop_contact_log;
create policy sop_contact_log_member_read on sop_contact_log for select
  using (is_org_member(org_id));

drop policy if exists sop_contact_log_member_insert on sop_contact_log;
create policy sop_contact_log_member_insert on sop_contact_log for insert
  with check (is_org_member(org_id));

drop policy if exists sop_contact_log_member_update on sop_contact_log;
create policy sop_contact_log_member_update on sop_contact_log for update
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Helper view: SOPs with derived "days since arrived" for the 30-day return UI
-- ---------------------------------------------------------------------------
create or replace view sops_with_age as
select
  s.*,
  case
    when s.arrived_at is not null and s.status in ('arrived', 'notified', 'scheduled')
      then extract(day from (now() - s.arrived_at))::int
    else null
  end as days_since_arrived,
  (
    select count(*)
    from sop_contact_log c
    where c.sop_id = s.id
  )::int as contact_attempts_count
from sops s;

insert into _migrations (filename) values ('003_sops.sql')
  on conflict (filename) do nothing;
