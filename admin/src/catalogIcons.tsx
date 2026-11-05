import { Car, Disc3, Folder, Package, Settings, Sparkles, Wrench, Zap } from 'lucide-react';
import type { SectionIcon } from '../../shared/catalog';
import { isPartIcon, partIconMirror, partIconPaths, type PartIcon } from '../../shared/partIcons';
const glyphs = { folder: Folder, car: Car, settings: Settings, wrench: Wrench, disc: Disc3, sparkles: Sparkles, package: Package, zap: Zap };
const partNames:Record<PartIcon,string>={
 'door-front-left':'دەرگای پێشەوەی چەپ','door-front-right':'دەرگای پێشەوەی ڕاست','door-rear-left':'دەرگای دواوەی چەپ','door-rear-right':'دەرگای دواوەی ڕاست',
 'fender-left':'چاملخی چەپ','fender-right':'چاملخی ڕاست',hood:'بۆنیت',trunk:'سندووق','bumper-front':'دەحامی پێشەوە','bumper-rear':'دەحامی دواوە',
 'headlight-left':'لایتی پێشەوەی چەپ','headlight-right':'لایتی پێشەوەی ڕاست','taillight-left':'لایتی دواوەی چەپ','taillight-right':'لایتی دواوەی ڕاست',
 grille:'چەمبەر',mirror:'ئاوێنە','brake-pad':'بەنج',axle:'تەوەر','window-switch':'دوگمەی دەرگا','door-handle':'دەسکی دەرگا',bracket:'براکیت',
 'inner-fender':'ناو چامڵغ','fog-lamp':'بلاجکتۆر',reinforcement:'پاڵپشتی دەحامی','fuel-injector':'دەبڵەکان','brake-rotor':'ئەفلەنجە','body-closures':'دەرگا و سندووق','fog-cover':'قەپاخ بلاجیکتۆر','mirror-right':'ئاوێنەی ڕاست',
};
export const iconNames: Record<SectionIcon, string> = { folder: 'بەش', car: 'ئۆتۆمبێل', settings: 'مەکینە', wrench: 'ئامراز', disc: 'تایە', sparkles: 'جوانکاری', package: 'پارچە', zap: 'کارەبا',...partNames };
export function Glyph({ icon, size = 23 }: { icon: SectionIcon; size?: number }) {
 if(isPartIcon(icon))return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><g transform={partIconMirror(icon)?'translate(24 0) scale(-1 1)':undefined}>{partIconPaths[icon].map((d,i)=><path key={i} d={d}/>)}</g></svg>;
 const Icon = glyphs[icon] || Folder; return <Icon size={size} strokeWidth={1.7} />;
}
