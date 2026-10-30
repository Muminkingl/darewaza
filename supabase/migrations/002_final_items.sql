alter table public.catalog_sections
  add column if not exists version integer not null default 1,
  add column if not exists is_terminal boolean not null default false,
  add column if not exists price_usd numeric(12,2),
  add column if not exists price_iqd numeric(14,0),
  add column if not exists image_path text;

alter table public.catalog_sections
  add constraint catalog_positive_version check (version > 0),
  add constraint catalog_valid_usd check (price_usd is null or price_usd >= 0),
  add constraint catalog_valid_iqd check (price_iqd is null or price_iqd >= 0),
  add constraint catalog_item_has_price check (not is_terminal or price_usd is not null or price_iqd is not null),
  add constraint catalog_folder_has_no_product_fields check (is_terminal or (price_usd is null and price_iqd is null and image_path is null)),
  add constraint catalog_valid_image_path check (image_path is null or image_path ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$');

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
  if new.parent_id is not null then
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

-- Rename existing display text if an administrator stored the previous label.
update public.catalog_sections set
  name = replace(name, 'مەوادەکان', 'پارچەی یەدەگ'),
  description = replace(description, 'مەوادەکان', 'پارچەی یەدەگ')
where strpos(name, 'مەوادەکان') > 0 or strpos(description, 'مەوادەکان') > 0;
notify pgrst, 'reload schema';
