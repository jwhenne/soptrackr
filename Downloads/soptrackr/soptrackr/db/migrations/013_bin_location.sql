-- =============================================================================
-- Migration 013: Bin location for special-order parts
--
-- When a special-ordered part physically arrives, parts staff shelve it and
-- record where (the "bin location", e.g. "A1-05"). This is sensitive inventory
-- data: only admin / manager / parts_consultant roles may see or edit it.
-- service_advisor and technician roles never receive the value (enforced
-- server-side in the API layer — see canManageBinLocation()).
--
-- Stored as free text (bins are dealer-specific strings, not a fixed format).
-- =============================================================================

alter table sops add column if not exists bin_location text;

create index if not exists sops_bin_location_idx
  on sops(org_id, bin_location)
  where bin_location is not null;

-- Recreate the helper view so `s.*` picks up the new column. (CREATE OR REPLACE
-- can't reorder an existing view's columns, so we drop first.)
drop view if exists sops_with_age;
create view sops_with_age as
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

insert into _migrations (filename) values ('013_bin_location.sql')
  on conflict (filename) do nothing;
