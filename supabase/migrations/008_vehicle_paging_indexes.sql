-- Cursor order is indexed as well as the fitment joins/search predicates.
create index catalog_sections_vehicle_page_idx on public.catalog_sections(name,id) include(root_key,is_terminal);
create index vehicle_models_active_page_idx on public.vehicle_models(make,model,id) where active;
