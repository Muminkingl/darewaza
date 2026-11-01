-- Models are managed by the existing Telegram allowlist, never by customers.
create table public.vehicle_models (
 id uuid primary key default gen_random_uuid(),
 make text not null check (make = btrim(make) and char_length(make) between 1 and 60),
 model text not null check (model = btrim(model) and char_length(model) between 1 and 80),
 active boolean not null default true,
 version integer not null default 1 check(version > 0),
 created_at timestamptz not null default now()
);
create unique index vehicle_models_identity_idx on public.vehicle_models(lower(make),lower(model));
create index vehicle_models_page_idx on public.vehicle_models(make,model,id);
create index vehicle_models_search_idx on public.vehicle_models using gin ((make || ' ' || model) extensions.gin_trgm_ops);
create table public.section_vehicle_rules (
 id uuid primary key default gen_random_uuid(),
 section_id uuid not null references public.catalog_sections(id) on delete cascade,
 model_id uuid not null references public.vehicle_models(id) on delete restrict,
 year_from smallint not null check(year_from between 1900 and 2100),
 year_to smallint not null check(year_to between year_from and 2100),
 engine text not null default '' check(engine = btrim(engine) and char_length(engine)<=80),
 trim text not null default '' check(trim = btrim(trim) and char_length(trim)<=80),
 version integer not null default 1 check(version > 0)
);
create index section_vehicle_rules_section_idx on public.section_vehicle_rules(section_id,id);
create index section_vehicle_rules_match_idx on public.section_vehicle_rules(model_id,year_from,year_to,section_id);
create unique index section_vehicle_rules_identity_idx on public.section_vehicle_rules(section_id,model_id,year_from,year_to,lower(engine),lower(trim));
create table public.customer_vehicles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 model_id uuid not null references public.vehicle_models(id) on delete restrict,
 year smallint not null check(year between 1900 and 2100),
 engine text not null default '' check(engine=btrim(engine) and char_length(engine)<=80),
 trim text not null default '' check(trim=btrim(trim) and char_length(trim)<=80),
 nickname text not null default '' check(nickname=btrim(nickname) and char_length(nickname)<=60),
 version integer not null default 1 check(version > 0),
 created_at timestamptz not null default now(),
 unique(user_id,id)
);
create index customer_vehicles_page_idx on public.customer_vehicles(user_id,created_at,id);
create table public.garage_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 selected_vehicle_id uuid,
 constraint garage_selected_vehicle_fk foreign key(user_id,selected_vehicle_id) references public.customer_vehicles(user_id,id) on delete set null (selected_vehicle_id)
);
alter table public.vehicle_models enable row level security;
alter table public.section_vehicle_rules enable row level security;
alter table public.customer_vehicles enable row level security;
alter table public.garage_preferences enable row level security;
revoke all on public.vehicle_models,public.section_vehicle_rules,public.customer_vehicles,public.garage_preferences from public,anon,authenticated;
grant select on public.vehicle_models,public.section_vehicle_rules,public.customer_vehicles,public.garage_preferences to authenticated;
grant delete on public.customer_vehicles to authenticated;
grant all on public.vehicle_models,public.section_vehicle_rules,public.customer_vehicles,public.garage_preferences to service_role;
create policy models_read on public.vehicle_models for select to authenticated using(true);
create policy rules_read on public.section_vehicle_rules for select to authenticated using(true);
create policy own_vehicles_read on public.customer_vehicles for select to authenticated using((select auth.uid())=user_id);
create policy own_vehicles_delete on public.customer_vehicles for delete to authenticated using((select auth.uid())=user_id);
create policy own_garage_read on public.garage_preferences for select to authenticated using((select auth.uid())=user_id);

create function public.select_my_vehicle(vehicle_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();
begin
 if owner_id is null then raise insufficient_privilege; end if;
 if vehicle_id is not null and not exists(select 1 from public.customer_vehicles where id=vehicle_id and user_id=owner_id) then raise insufficient_privilege; end if;
 insert into public.garage_preferences(user_id,selected_vehicle_id) values(owner_id,vehicle_id)
 on conflict(user_id) do update set selected_vehicle_id=excluded.selected_vehicle_id;
end $$;
create function public.save_my_vehicle(vehicle_id uuid, vehicle_model uuid, vehicle_year integer,
 vehicle_engine text default '', vehicle_trim text default '', vehicle_nickname text default '', expected_version integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); current_row public.customer_vehicles;
begin
 if owner_id is null then raise insufficient_privilege; end if;
 -- Serialize only this customer's writes; different customers never block one another.
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,29));
 select * into current_row from public.customer_vehicles where id=vehicle_id and user_id=owner_id for update;
 if exists(select 1 from public.customer_vehicles where id=vehicle_id and user_id<>owner_id) then raise insufficient_privilege; end if;
 if not exists(select 1 from public.vehicle_models where id=vehicle_model and (active or id=current_row.model_id)) then raise check_violation using message='Select an available model.'; end if;
 if expected_version is null then
  if current_row.id is not null then
   if (current_row.model_id,current_row.year,current_row.engine,current_row.trim,current_row.nickname) is distinct from
      (vehicle_model,vehicle_year,btrim(vehicle_engine),btrim(vehicle_trim),btrim(vehicle_nickname)) then raise serialization_failure; end if;
  else
   insert into public.customer_vehicles(id,user_id,model_id,year,engine,trim,nickname)
   values(vehicle_id,owner_id,vehicle_model,vehicle_year,btrim(vehicle_engine),btrim(vehicle_trim),btrim(vehicle_nickname));
  end if;
 else
  if current_row.id is null or current_row.version<>expected_version then raise serialization_failure; end if;
  update public.customer_vehicles set model_id=vehicle_model,year=vehicle_year,engine=btrim(vehicle_engine),trim=btrim(vehicle_trim),nickname=btrim(vehicle_nickname),version=version+1 where id=vehicle_id;
 end if;
 perform public.select_my_vehicle(vehicle_id);
 return vehicle_id;
end $$;

-- A folder link is a shortcut only. Fit claims always require explicit product rules.
-- Missing engine/trim is a candidate, never a confirmed match.
create function public.vehicle_fit_status(section_uuid uuid,vehicle_uuid uuid) returns text
language sql stable security invoker set search_path='' as $$
 select case
 when not exists(select 1 from public.customer_vehicles where id=vehicle_uuid and user_id=(select auth.uid())) then 'unknown'
 when not exists(select 1 from public.section_vehicle_rules where section_id=section_uuid) then 'unknown'
 when exists(select 1 from public.section_vehicle_rules r join public.customer_vehicles v on v.id=vehicle_uuid and v.user_id=(select auth.uid())
   join public.catalog_sections s on s.id=r.section_id and s.is_terminal
   where r.section_id=section_uuid and r.model_id=v.model_id and v.year between r.year_from and r.year_to
   and (r.engine='' or lower(r.engine)=lower(v.engine)) and (r.trim='' or lower(r.trim)=lower(v.trim))) then 'matched'
 when exists(select 1 from public.section_vehicle_rules r join public.customer_vehicles v on v.id=vehicle_uuid and v.user_id=(select auth.uid())
   where r.section_id=section_uuid and r.model_id=v.model_id and v.year between r.year_from and r.year_to
   and (r.engine='' or v.engine='' or lower(r.engine)=lower(v.engine)) and (r.trim='' or v.trim='' or lower(r.trim)=lower(v.trim))) then 'needs_details'
 else 'not_listed' end;
$$;
create function public.vehicle_catalog(vehicle_uuid uuid,query_text text default '',root_filter text default null,folders boolean default false,after_name text default null,after_id uuid default null)
returns setof public.catalog_sections language sql stable security invoker set search_path='' as $$
 select s.* from public.catalog_sections s where s.is_terminal=(not folders)
 and char_length(btrim(query_text))<=100 and (root_filter is null or s.root_key=root_filter)
 and (btrim(query_text)='' or s.name ilike '%' || replace(replace(replace(btrim(query_text),'\','\\'),'%','\%'),'_','\_') || '%')
 and exists(select 1 from public.section_vehicle_rules r join public.customer_vehicles v on v.id=vehicle_uuid and v.user_id=(select auth.uid())
  where r.section_id=s.id and r.model_id=v.model_id and v.year between r.year_from and r.year_to
  and (r.engine='' or v.engine='' or lower(r.engine)=lower(v.engine)) and (r.trim='' or v.trim='' or lower(r.trim)=lower(v.trim)))
 and (after_name is null or (s.name,s.id)>(after_name,after_id))
 order by s.name,s.id limit 41;
$$;
create function public.find_vehicle_models(query_text text default '',after_make text default null,after_model text default null,after_id uuid default null)
returns setof public.vehicle_models language sql stable security invoker set search_path='' as $$
 select m.* from public.vehicle_models m where m.active and char_length(btrim(query_text))<=100
 and (query_text='' or (m.make || ' ' || m.model) ilike '%' || replace(replace(replace(btrim(query_text),'\','\\'),'%','\%'),'_','\_') || '%')
 and (after_make is null or (m.make,m.model,m.id)>(after_make,after_model,after_id))
 order by m.make,m.model,m.id limit 41;
$$;
revoke all on function public.select_my_vehicle(uuid),public.save_my_vehicle(uuid,uuid,integer,text,text,text,integer),public.vehicle_fit_status(uuid,uuid),public.vehicle_catalog(uuid,text,text,boolean,text,uuid),public.find_vehicle_models(text,text,text,uuid) from public,anon;
grant execute on function public.select_my_vehicle(uuid),public.save_my_vehicle(uuid,uuid,integer,text,text,text,integer),public.vehicle_fit_status(uuid,uuid),public.vehicle_catalog(uuid,text,text,boolean,text,uuid),public.find_vehicle_models(text,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
