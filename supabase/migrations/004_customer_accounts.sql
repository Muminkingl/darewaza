-- Customer data is isolated by auth.uid(); the Telegram catalog remains server managed.
create extension if not exists pg_trgm with schema extensions;
create index if not exists catalog_sections_search_idx on public.catalog_sections using gin (name extensions.gin_trgm_ops);

create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  locale text not null default 'ckb' check (locale in ('ckb','en','ar')),
  updated_at timestamptz not null default now()
);
create table public.saved_sections (
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid not null references public.catalog_sections(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, section_id)
);
create index saved_sections_page_idx on public.saved_sections(user_id, saved_at desc, section_id);
create table public.recent_sections (
  user_id uuid not null references auth.users(id) on delete cascade,
  section_id uuid not null references public.catalog_sections(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, section_id)
);
create index recent_sections_page_idx on public.recent_sections(user_id, viewed_at desc, section_id);

alter table public.customer_profiles enable row level security;
alter table public.saved_sections enable row level security;
alter table public.recent_sections enable row level security;
revoke all on public.customer_profiles, public.saved_sections, public.recent_sections from public, anon, authenticated;
grant select, insert on public.customer_profiles to authenticated;
grant update(display_name, locale, updated_at) on public.customer_profiles to authenticated;
grant select, insert, delete on public.saved_sections to authenticated;
grant select, delete on public.recent_sections to authenticated;
grant all on public.customer_profiles, public.saved_sections, public.recent_sections to service_role;
create policy own_profile_select on public.customer_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy own_profile_insert on public.customer_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_profile_update on public.customer_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_saved_select on public.saved_sections for select to authenticated using ((select auth.uid()) = user_id);
create policy own_saved_insert on public.saved_sections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_saved_delete on public.saved_sections for delete to authenticated using ((select auth.uid()) = user_id);
create policy own_recent_select on public.recent_sections for select to authenticated using ((select auth.uid()) = user_id);
create policy own_recent_delete on public.recent_sections for delete to authenticated using ((select auth.uid()) = user_id);

-- Repeated visits update a single row. Serialize per account, then retain at most 100.
create function public.record_recent(section uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 17));
  insert into public.recent_sections(user_id, section_id) values(owner_id, section)
    on conflict(user_id, section_id) do update set viewed_at = clock_timestamp();
  delete from public.recent_sections r where r.user_id = owner_id and r.section_id in (
    select x.section_id from public.recent_sections x where x.user_id = owner_id
    order by x.viewed_at desc, x.section_id offset 100
  );
end;
$$;
revoke all on function public.record_recent(uuid) from public, anon;
grant execute on function public.record_recent(uuid) to authenticated;

-- Bounded global search, backed by a trigram index. No recursive tree download.
create function public.search_catalog(query_text text, root_filter text default null, page_offset integer default 0)
returns setof public.catalog_sections language sql stable security invoker set search_path = '' as $$
  select s.* from public.catalog_sections s
  where char_length(btrim(query_text)) between 2 and 100
    and (root_filter is null or s.root_key = root_filter)
    and s.name ilike '%' || replace(replace(replace(btrim(query_text), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by s.name, s.id limit 41 offset least(greatest(page_offset, 0), 10000);
$$;
revoke all on function public.search_catalog(text, text, integer) from public, anon;
grant execute on function public.search_catalog(text, text, integer) to authenticated;

drop policy "Public catalog is read only" on public.catalog_sections;
revoke select on public.catalog_sections from anon;
create policy "Signed-in catalog is read only" on public.catalog_sections for select to authenticated using (true);
notify pgrst, 'reload schema';
