-- =============================================================================
-- Migration 007: Per-org GroupMe configuration
--
-- Each organization can configure ONE GroupMe bot ID. When set, the system
-- posts to that GroupMe group on key SOP events:
--   - status -> 'notified' (part arrived, BDC alerted)
--   - status -> 'returned' (return notice, parts team alerted)
--
-- Future: refactor to per-rooftop or per-event channels via a separate
--         notification_channels table. For now, single column on orgs.
-- =============================================================================

alter table organizations add column if not exists groupme_bot_id text;
alter table organizations add column if not exists groupme_group_name text;

insert into _migrations (filename) values ('007_groupme_settings.sql')
  on conflict (filename) do nothing;
