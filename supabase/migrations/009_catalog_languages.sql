-- Kurdish remains the canonical name for existing installed clients.
-- Empty translations fall back to that name; older Studio edits preserve them.
alter table public.catalog_sections
  add column name_en text not null default '' check (char_length(name_en) <= 100),
  add column name_ar text not null default '' check (char_length(name_ar) <= 100),
  add column source_key text check (source_key is null or char_length(source_key) between 1 and 100),
  add column search_name text generated always as (name || ' ' || name_en || ' ' || name_ar) stored;

-- Imports can be safely repeated, even after an administrator renames a category.
create unique index catalog_sections_source_idx on public.catalog_sections(parent_id,source_key)
  where source_key is not null;
create index catalog_sections_languages_search_idx on public.catalog_sections
  using gin (search_name extensions.gin_trgm_ops);

create or replace function public.search_catalog(query_text text, root_filter text default null, page_offset integer default 0)
returns setof public.catalog_sections language sql stable security invoker set search_path = '' as $$
  select s.* from public.catalog_sections s
  where char_length(btrim(query_text)) between 2 and 100
    and (root_filter is null or s.root_key = root_filter)
    and s.search_name ilike '%' || replace(replace(replace(btrim(query_text), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by s.name, s.id limit 41 offset least(greatest(page_offset, 0), 10000);
$$;

create or replace function public.vehicle_catalog(vehicle_uuid uuid,query_text text default '',root_filter text default null,folders boolean default false,after_name text default null,after_id uuid default null)
returns setof public.catalog_sections language sql stable security invoker set search_path='' as $$
 select s.* from public.catalog_sections s where s.is_terminal=(not folders)
 and char_length(btrim(query_text))<=100 and (root_filter is null or s.root_key=root_filter)
 and (btrim(query_text)='' or s.search_name ilike '%' || replace(replace(replace(btrim(query_text),'\','\\'),'%','\%'),'_','\_') || '%')
 and exists(select 1 from public.section_vehicle_rules r join public.customer_vehicles v on v.id=vehicle_uuid and v.user_id=(select auth.uid())
  where r.section_id=s.id and r.model_id=v.model_id and v.year between r.year_from and r.year_to
  and (r.engine='' or v.engine='' or lower(r.engine)=lower(v.engine)) and (r.trim='' or v.trim='' or lower(r.trim)=lower(v.trim)))
 and (after_name is null or (s.name,s.id)>(after_name,after_id))
 order by s.name,s.id limit 41;
$$;
notify pgrst,'reload schema';
