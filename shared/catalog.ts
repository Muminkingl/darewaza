export const ROOTS = [
  { key: 'parts', name: 'مەوادەکان', subtitle: 'پارچە و پێداویستی ئۆتۆمبێل' },
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
  created_at: string;
  updated_at: string;
}
export const PAGE_SIZE = 40;
