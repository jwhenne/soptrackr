-- =============================================================================
-- Migration 004: Add the SOP fields the existing Toyota tracker uses
--
--   sop_number       - distinct dealer-issued SOP identifier (separate from RO)
--   eta              - estimated arrival date (set at creation, edited later)
--   backordered      - boolean flag, shown as a badge in the list
--   notified_to_bdc  - boolean: has the BDC GroupMe/email alert been sent?
--                      (separate from status='notified' so we can re-send)
-- =============================================================================

alter table sops add column if not exists sop_number      text;
alter table sops add column if not exists eta             date;
alter table sops add column if not exists backordered     boolean not null default false;
alter table sops add column if not exists notified_to_bdc boolean not null default false;

create index if not exists sops_sop_number_idx on sops(org_id, sop_number);
create index if not exists sops_eta_idx        on sops(org_id, eta);
create index if not exists sops_backordered_idx on sops(org_id) where backordered = true;

-- Update the helper view to include the new fields.
drop view if exists sops_with_age;
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

insert into _migrations (filename) values ('004_sop_extra_fields.sql')
  on conflict (filename) do nothing;
