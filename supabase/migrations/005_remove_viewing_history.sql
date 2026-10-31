-- Viewing history has been removed from the product. Remove its recording API
-- and stored activity, keeping customer profiles and saved sections intact.
drop function if exists public.record_recent(uuid);
drop table if exists public.recent_sections;
notify pgrst, 'reload schema';
