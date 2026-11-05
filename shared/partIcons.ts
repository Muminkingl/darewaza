// Lightweight 24 x 24 automotive outlines shared by native and Telegram Studio.
// Each side has its own silhouette; photos remain reserved for item details.
import type {PartIcon} from './catalog';
export type {PartIcon} from './catalog';
const frontDoor=['M3 20V9l4-5h12a2 2 0 0 1 2 2v14H3Z','M5 10l3-4h10v4H5Z','M16 13h3','M3 17h18'];
const rearDoor=['M3 20V6a2 2 0 0 1 2-2h10l6 6v10H3Z','M6 6h8l4 4H6V6Z','M5 13h3','M3 17h18'];
const fender=['M3 18V7l4-3h12l2 4v10h-3a6 6 0 0 0-12 0H3Z','M5 8h6','M17 7h3'];
const headlight=['M11 5c-5 0-8 3-8 7s3 7 8 7V5Z','M14 6l7-2','M14 10h7','M14 14h7','M14 18l7 2'];
const taillight=['M4 6h11l6 5v7H9l-5-5V6Z','M7 9h7l4 4H9L7 9Z','M9 16h9'];
export const partIconPaths: Record<PartIcon, readonly string[]> = {
 'door-front-left':frontDoor,'door-front-right':frontDoor,'door-rear-left':rearDoor,'door-rear-right':rearDoor,
 'fender-left':fender,'fender-right':fender,
 hood:['M6 3h12l3 17H3L6 3Z','M8 6 6 17','M16 6l2 11','M10 4h4'],
 trunk:['M4 7l3-3h10l3 3v13H4V7Z','M4 9h16','M10 13h4','M7 17h10'],
 'bumper-front':['M3 8l3-3h12l3 3v11H3V8Z','M3 10h18','M8 10v6h8v-6','M5 14v2','M19 14v2'],
 'bumper-rear':['M3 8l3-3h12l3 3v11H3V8Z','M3 10h18','M9 12h6v4H9v-4Z','M5 16h1','M18 16h1'],
 'headlight-left':headlight,'headlight-right':headlight,
 'taillight-left':taillight,'taillight-right':taillight,
 grille:['M3 6h7v13H3V6Z','M14 6h7v13h-7V6Z','M6 6v13','M17 6v13'],
 mirror:['M4 5h11a5 5 0 0 1 5 5v6H4V5Z','M4 16v4h5v-4','M7 8h7'],
 'brake-pad':['M4 8a10 10 0 0 1 16 0v10H4V8Z','M7 10a6 6 0 0 1 10 0','M7 14h10','M8 18v2','M16 18v2'],
 axle:['M3 8v8','M21 8v8','M3 12h5l2-4h4l2 4h5','M8 12l2 4h4l2-4','M12 8V4'],
 'window-switch':['M4 4h16v16H4V4Z','M7 7h3v3H7V7Z','M14 7h3v3h-3V7Z','M7 14h3v3H7v-3Z','M14 14h3v3h-3v-3Z'],
 'door-handle':['M4 9h16v7H4V9Z','M7 9V7h9v2','M7 12h9','M18 12h.1'],
 bracket:['M5 3h5v12h11v5H5V3Z','M7.5 7h.1','M7.5 17.5h.1','M17 17.5h.1'],
 'inner-fender':['M3 20V13a9 9 0 0 1 18 0v7h-4v-7a5 5 0 0 0-10 0v7H3Z','M5 13v-1','M10 6l.5 1','M17 8l-1 1','M19 15v1'],
 'fog-lamp':['M5 8h11l3 3v6H5V8Z','M8 10v5','M11 10v5','M14 10l2 2v3','M6 8V5h3v3','M6 17v3h3v-3','M19 11h2'],
 reinforcement:['M2 10q10-4 20 0v5q-10-3-20 0v-5Z','M5 9V5h3v3','M16 8V5h3v4','M6 13h.1','M18 13h.1','M5 16v3h3v-3','M16 16v3h3v-3'],
 'fuel-injector':['M10 3h4v4h-4V3Z','M9 7h6v9H9V7Z','M11 16v4l1 2 1-2v-4','M15 8h4v4h-4','M7 10h2','M7 14h2','M10 10h4'],
 'brake-rotor':['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z','M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z','M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z','M12 9h.1','M9 12h.1','M15 12h.1','M12 15h.1','M6 7l1 1','M17 16l1 1'],
 'body-closures':['M2 20V9l4-6h8v17H2Z','M4 9l3-4h5v4H4Z','M9 13h3','M17 10h3l2 3v7h-5V10Z','M17 14h5','M18 17h2'],
};
export function isPartIcon(icon: string): icon is PartIcon { return Object.hasOwn(partIconPaths,icon); }
export function partIconMirror(icon: PartIcon) { return icon.endsWith('-right'); }
