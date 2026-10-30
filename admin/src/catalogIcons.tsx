import { Car, Disc3, Folder, Package, Settings, Sparkles, Wrench, Zap } from 'lucide-react';
import type { SectionIcon } from '../../shared/catalog';
const glyphs = { folder: Folder, car: Car, settings: Settings, wrench: Wrench, disc: Disc3, sparkles: Sparkles, package: Package, zap: Zap };
export const iconNames: Record<SectionIcon, string> = { folder: 'بەش', car: 'ئۆتۆمبێل', settings: 'مەکینە', wrench: 'ئامراز', disc: 'تایە', sparkles: 'جوانکاری', package: 'پارچە', zap: 'کارەبا' };
export function Glyph({ icon, size = 23 }: { icon: SectionIcon; size?: number }) { const Icon = glyphs[icon] || Folder; return <Icon size={size} strokeWidth={1.7} />; }
