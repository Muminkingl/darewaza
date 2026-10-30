import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export function CatalogArt({ accessory = false }: { accessory?: boolean }) {
  const color = accessory ? '#8A7252' : '#38659B';
  return <Svg width={140} height={122} viewBox="0 0 160 140" fill="none">
    <Defs><LinearGradient id="paint" x1="40" y1="32" x2="114" y2="120" gradientUnits="userSpaceOnUse"><Stop stopColor={accessory ? '#EADFCB' : '#C2D7EF'} /><Stop offset="1" stopColor={accessory ? '#D1BE9F' : '#7BA4D1'} /></LinearGradient></Defs>
    <Circle cx="80" cy="73" r="55" fill={accessory ? '#F2EBDD' : '#E8F0FA'} />
    <Circle cx="80" cy="73" r="43" stroke={accessory ? '#E5DAC8' : '#D7E4F4'} strokeDasharray="3 6" />
    <Path d="M30 100h100" stroke={color} strokeWidth="2" strokeLinecap="round" opacity=".2" />
    <Path d="m37 77 10-24c2-5 6-8 12-8h43c6 0 10 3 12 8l10 24v18H37V77Z" fill="url(#paint)" stroke={color} strokeWidth="2" />
    <Path d="m51 71 7-17h43l8 17H51Z" fill="#F8FBFF" stroke={color} strokeWidth="1.8" />
    <Path d="M80 54v17M38 78l18 5m67-5-18 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Rect x="43" y="91" width="14" height="12" rx="4" fill={color} /><Rect x="105" y="91" width="14" height="12" rx="4" fill={color} />
    <Rect x="68" y="83" width="25" height="7" rx="3" fill="#F8FBFF" />
    {accessory ? <><Path d="m124 29 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#C7A56E" /><Path d="m37 33 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#C7A56E" opacity=".6" /></> : <><Circle cx="126" cy="41" r="14" fill="white" stroke="#CFDEEF" /><Path d="m120 35 2 5 5 2 4-2-3 7-5-1-6 7-4-4 7-7-1-7Z" fill={color} /></>}
  </Svg>;
}
