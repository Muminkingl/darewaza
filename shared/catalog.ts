export const ROOTS = [
  { key: 'parts', name: 'پارچەی یەدەگ', subtitle: 'پارچە و پێداویستی ئۆتۆمبێل' },
  { key: 'accessories', name: 'جوانکاریەکان', subtitle: 'وردەکارییەک بۆ جوانی زیاتر' },
] as const;

export type RootKey = (typeof ROOTS)[number]['key'];
export const SECTION_ICONS = ['folder', 'car', 'settings', 'wrench', 'disc', 'sparkles', 'package', 'zap'] as const;
export type SectionIcon = (typeof SECTION_ICONS)[number];
export interface Section {
  id: string;
  parent_id: string | null;
  root_key: RootKey;
  name: string;
  description: string;
  icon: SectionIcon;
  position: number;
  version: number;
  is_terminal: boolean;
  price_usd: string | null;
  price_iqd: string | null;
  image_path: string | null;
  image_url?: string | null;
  has_children?: boolean;
  created_at: string;
  updated_at: string;
}
export const PAGE_SIZE = 40;
export const IMAGE_BUCKET = 'catalog-images';
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_PATH_PATTERN = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|png)$/i;

export function imageUrl(base: string | undefined, path: string | null | undefined) {
  return base && path ? `${base.replace(/\/$/, '')}/storage/v1/object/public/${IMAGE_BUCKET}/${path}` : null;
}

export function normalizePrice(value: string): string {
  return value.trim().replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[٬,\s]/g, '').replace(/٫/g, '.');
}

export function formatPrice(value: string | null | undefined, currency: 'USD' | 'IQD') {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(amount);
  return currency === 'USD' ? `$${formatted}` : `${formatted} د.ع`;
}
