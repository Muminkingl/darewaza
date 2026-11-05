-- Additional display glyphs for the corrected BMW parts. Permissions unchanged.
alter table public.catalog_sections drop constraint catalog_sections_icon_check;
alter table public.catalog_sections add constraint catalog_sections_icon_check check (
 icon in ('folder','car','settings','wrench','disc','sparkles','package','zap',
 'door-front-left','door-front-right','door-rear-left','door-rear-right',
 'fender-left','fender-right','hood','trunk','bumper-front','bumper-rear',
 'headlight-left','headlight-right','taillight-left','taillight-right',
 'grille','mirror','brake-pad','axle','window-switch','door-handle','bracket',
 'inner-fender','fog-lamp','reinforcement','fuel-injector','brake-rotor','body-closures')
);
notify pgrst,'reload schema';
