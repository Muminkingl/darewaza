-- Child edits do not lock their immutable parent, avoiding a lock inversion with cascade deletion.
create or replace function public.guard_catalog_section()
returns trigger language plpgsql set search_path = '' as $$
declare parent_is_terminal boolean;
begin
  if tg_op = 'UPDATE' then
    if new.parent_id is distinct from old.parent_id or new.root_key <> old.root_key then
      raise exception 'A section cannot be moved to a different parent or catalog.' using errcode = '23514';
    end if;
    new.version := old.version + 1;
  else
    new.version := 1;
  end if;
  if tg_op = 'INSERT' and new.parent_id is not null then
    -- Serializes a child insert against a concurrent conversion of its parent.
    select is_terminal into parent_is_terminal from public.catalog_sections
      where id = new.parent_id for no key update;
    if parent_is_terminal then
      raise exception 'A final item cannot contain subsections.' using errcode = 'P0001';
    end if;
  end if;
  if new.is_terminal and exists (select 1 from public.catalog_sections where parent_id = new.id) then
    raise exception 'A section with children cannot become a final item.' using errcode = 'P0001';
  end if;
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end;
$$;
