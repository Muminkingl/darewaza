import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, imageUrl, normalizePrice, ROOTS, SECTION_ICONS } from '../shared/catalog';
import { PART_ICONS, partIconPaths } from '../shared/partIcons';
import { createSchema } from '../api/sections';

test('automotive silhouettes are selectable and final items can await a real price',()=>{
  for(const icon of PART_ICONS) {
    assert.ok(SECTION_ICONS.includes(icon));assert.ok(partIconPaths[icon].length);
    assert.equal(createSchema.safeParse({root_key:'parts',name:'Front left door',icon,is_terminal:true,price_usd:null,price_iqd:null,image_kind:'generated'}).success,true);
  }
});

test('the parts catalog uses the requested label in both clients', () => assert.equal(ROOTS[0].name, 'پارچەی یەدەگ'));
test('prices accept Arabic/Persian digits and separators without converting currencies', () => {
  assert.equal(normalizePrice('١٢٫٥٠'), '12.50');
  assert.equal(normalizePrice('١٦٬٥٠٠'), '16500');
  assert.equal(normalizePrice('۱۶,۵۰۰'), '16500');
  assert.equal(formatPrice('12.50', 'USD'), '$12.50');
  assert.equal(formatPrice('16500', 'IQD'), '16,500 د.ع');
  assert.equal(formatPrice('0', 'USD'), '$0.00');
});
test('image URLs use the public catalog bucket and preserve unique object names', () => {
  assert.equal(imageUrl('https://example.supabase.co/', 'item/photo.webp'), 'https://example.supabase.co/storage/v1/object/public/catalog-images/item/photo.webp');
  assert.equal(imageUrl('https://example.supabase.co', null), null);
});
