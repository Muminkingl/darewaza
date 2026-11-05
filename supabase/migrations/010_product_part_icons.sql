-- New silhouettes are display-only. Read and write permissions are unchanged.
alter table public.catalog_sections drop constraint catalog_sections_icon_check;
alter table public.catalog_sections add constraint catalog_sections_icon_check check (
  icon in ('folder','car','settings','wrench','disc','sparkles','package','zap',
    'door-front-left','door-front-right','door-rear-left','door-rear-right',
    'fender-left','fender-right','hood','trunk','bumper-front','bumper-rear',
    'headlight-left','headlight-right','taillight-left','taillight-right',
    'grille','mirror','brake-pad','axle','window-switch','door-handle','bracket')
);
-- Final items may be published before the shop provides prices. Never invent 0.
alter table public.catalog_sections drop constraint catalog_item_has_price;
alter table public.catalog_sections add column image_kind text not null default 'photo'
  check(image_kind in ('photo','generated'));
notify pgrst,'reload schema';
