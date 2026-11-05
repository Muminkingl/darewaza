import Svg, { G, Path } from 'react-native-svg';
import { partIconPaths, partIconMirror, type PartIcon } from '../../shared/partIcons';
export function PartGlyph({icon,size=25,color='#315C91'}:{icon:PartIcon;size?:number;color?:string}) {
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round">
   <G transform={partIconMirror(icon)?'translate(24 0) scale(-1 1)':undefined}>{partIconPaths[icon].map((d,i)=><Path key={i} d={d}/>)}</G>
 </Svg>;
}
