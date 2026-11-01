-- Never confirm a folder: folder links have navigation semantics only.
create or replace function public.vehicle_fit_status(section_uuid uuid,vehicle_uuid uuid) returns text
language sql stable security invoker set search_path='' as $$
 select case
 when not exists(select 1 from public.catalog_sections where id=section_uuid and is_terminal) then 'unknown'
 when not exists(select 1 from public.customer_vehicles where id=vehicle_uuid and user_id=(select auth.uid())) then 'unknown'
 when not exists(select 1 from public.section_vehicle_rules where section_id=section_uuid) then 'unknown'
 when exists(select 1 from public.section_vehicle_rules r join public.customer_vehicles v on v.id=vehicle_uuid and v.user_id=(select auth.uid())
   where r.section_id=section_uuid and r.model_id=v.model_id and v.year between r.year_from and r.year_to
   and (r.engine='' or lower(r.engine)=lower(v.engine)) and (r.trim='' or lower(r.trim)=lower(v.trim))) then 'matched'
 when exists(select 1 from public.section_vehicle_rules r join public.customer_vehicles v on v.id=vehicle_uuid and v.user_id=(select auth.uid())
   where r.section_id=section_uuid and r.model_id=v.model_id and v.year between r.year_from and r.year_to
   and (r.engine='' or v.engine='' or lower(r.engine)=lower(v.engine)) and (r.trim='' or v.trim='' or lower(r.trim)=lower(v.trim))) then 'needs_details'
 else 'not_listed' end;
$$;
-- Bounded suggestions use the same spelling as the store's rules.
create function public.vehicle_detail_options(model_uuid uuid,model_year integer)
returns table(engine text,"trim" text) language sql stable security invoker set search_path='' as $$
 select distinct r.engine,r.trim from public.section_vehicle_rules r
 where r.model_id=model_uuid and model_year between r.year_from and r.year_to
 and (r.engine<>'' or r.trim<>'') order by r.engine,r.trim limit 40;
$$;
revoke all on function public.vehicle_detail_options(uuid,integer) from public,anon;
grant execute on function public.vehicle_detail_options(uuid,integer) to authenticated;
notify pgrst,'reload schema';
