-- Adjacency-list catalog: any number of children and no application depth limit.
create table if not exists public.catalog_sections (
  id uuid primary key default gen_random_uuid(),
  root_key text not null check (root_key in ('parts', 'accessories')),
  parent_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  icon text not null default 'folder' check (icon in ('folder','car','settings','wrench','disc','sparkles','package','zap')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, root_key),
  foreign key (parent_id, root_key) references public.catalog_sections(id, root_key) on delete cascade,
  check (parent_id is distinct from id)
);

create index if not exists catalog_sections_browse_idx
  on public.catalog_sections (root_key, parent_id, position, created_at, id);

create or replace function public.guard_catalog_section()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    -- Moving is intentionally disallowed: prevents cycles, including concurrent moves.
    if new.parent_id is distinct from old.parent_id or new.root_key <> old.root_key then
      raise exception 'A section cannot be moved to a different parent or catalog.' using errcode = '23514';
    end if;
  end if;
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists guard_catalog_section on public.catalog_sections;
create trigger guard_catalog_section before insert or update on public.catalog_sections
  for each row execute function public.guard_catalog_section();

alter table public.catalog_sections enable row level security;
revoke all on public.catalog_sections from anon, authenticated;
grant select on public.catalog_sections to anon, authenticated;
grant all on public.catalog_sections to service_role;
drop policy if exists "Public catalog is read only" on public.catalog_sections;
create policy "Public catalog is read only" on public.catalog_sections
  for select to anon, authenticated using (true);
revoke all on function public.guard_catalog_section() from public;

-- Notify PostgREST after creating the table; no demo content is inserted.
notify pgrst, 'reload schema';
