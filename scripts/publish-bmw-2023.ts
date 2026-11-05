import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {database} from '../server/database.js';
import {storage} from '../server/storage.js';
import type {PartIcon} from '../shared/partIcons.js';

// Archived first publication. Corrections have since been applied to this branch.
// Never silently restore its obsolete meanings or the deleted chrome-trim entry.
assert.ok(process.argv.includes('--initial-publication'), 'Archived script. Use the reviewed correction script; do not republish the initial catalog.');

const YEAR_ID='cedf7211-4016-4eb5-9c90-9eb5a3d485a8';
const MODEL_ID='d011419b-684e-411a-a430-b8db57ed5e88';
const COMPANY_ID='f8e4a369-7124-40fd-be1b-f86f586eee9a';
const icons:Record<string,PartIcon|'disc'>={
 'Front left door':'door-front-left','Front right door':'door-front-right','Rear left door':'door-rear-left','Rear right door':'door-rear-right',
 'Front left fender':'fender-left','Front right fender':'fender-right',Hood:'hood','Trunk lid':'trunk','Front bumper':'bumper-front','Rear bumper':'bumper-rear',
 'Right headlight':'headlight-right','Left headlight':'headlight-left','Right taillight':'taillight-right','Left taillight':'taillight-left',
 'Trunk-mounted rear light':'taillight-left','Front grille':'grille','Fog lamp':'headlight-left','Inner fender liner':'fender-left',
 'Right side mirror':'mirror','Left side mirror':'mirror','Front brake pad set':'brake-pad','Rear brake pad set':'brake-pad',
 'Front brake disc set':'disc','Rear brake disc set':'disc',Differentials:'axle','Door switch set':'window-switch','Door handle':'door-handle',
 'Front bumper support bracket':'bracket','Rear bumper support bracket':'bracket','Front bumper chrome trim':'bumper-front',
};
const photos:Record<string,string>={
 'Front left door':'front-left-door','Front right door':'front-right-door','Rear left door':'rear-left-door','Rear right door':'rear-right-door',
 'Front left fender':'front-left-fender','Front right fender':'front-right-fender',Hood:'hood','Trunk lid':'trunk-lid',
 'Front bumper':'front-bumper','Rear bumper':'rear-bumper','Right headlight':'right-headlight','Left headlight':'left-headlight','Right taillight':'right-taillight','Left taillight':'left-taillight',
};
const db=database();
try {
 const canonical=JSON.parse(await readFile('data/catalog/pdf-parts.json','utf8')).parts;
 const branch=(await db.query(`select y.id,y.name,m.id as model_id,c.id as company_id from public.catalog_sections y
 join public.catalog_sections m on m.id=y.parent_id join public.catalog_sections c on c.id=m.parent_id where y.id=$1 and y.root_key='parts'`,[YEAR_ID])).rows[0];
 assert.equal(branch?.model_id,MODEL_ID);assert.equal(branch.company_id,COMPANY_ID);
 const before=(await db.query('select * from public.catalog_sections where parent_id=$1 order by position,id',[YEAR_ID])).rows;
 assert.equal(before.length,30,'This branch changed; review it before publishing.');
 const children=await db.query('select id from public.catalog_sections where parent_id=any($1::uuid[]) limit 1',[before.map(s=>s.id)]);
 assert.equal(children.rowCount,0,'A category now contains children. Stop rather than delete anything.');
 await mkdir('artifacts/bmw-2023',{recursive:true});
 await writeFile('artifacts/bmw-2023/before-publish.json',JSON.stringify(before,null,2));
 const updates=[];
 for(const row of before) {
  const part=canonical.find((p:{key:string;name:string})=>row.source_key===`pdf:${p.key}`||p.name===row.name);
  assert.ok(part,`Unknown category: ${row.name}`);
  assert.ok(icons[part.name_en],`No icon for: ${part.name_en}`);
  const image=photos[part.name_en];
  let path=row.image_path;
  if(image) {
   const bytes=await readFile(`output/imagegen/bmw-530i-2023/${image}.webp`);
   assert.ok(bytes.length<200*1024,'Product photo exceeds the optimized image budget.');
   path=`${row.id}/${randomUUID()}.webp`;
   const result=await storage().upload(path,bytes,{contentType:'image/webp',cacheControl:'31536000',upsert:false});
   if(result.error)throw result.error;
  }
  updates.push({id:row.id,version:row.version,name_en:row.name_en||part.name_en,name_ar:row.name_ar||part.name_ar,source_key:row.source_key||`pdf:${part.key}`,icon:icons[part.name_en],image_path:path,image_kind:image?'generated':row.image_kind});
 }
 const client=await db.connect();
 try {
  await client.query('begin');await client.query("set local lock_timeout='5s'");
  const result=await client.query(`update public.catalog_sections s set is_terminal=true,icon=u.icon,
   name_en=u.name_en,name_ar=u.name_ar,source_key=u.source_key,image_path=u.image_path,image_kind=u.image_kind
   from jsonb_to_recordset($1::jsonb) as u(id uuid,version integer,name_en text,name_ar text,source_key text,icon text,image_path text,image_kind text)
   where s.id=u.id and s.version=u.version and s.parent_id=$2 returning s.*`,[JSON.stringify(updates),YEAR_ID]);
  assert.equal(result.rowCount,30,'A concurrent edit occurred; database changes rolled back.');
  assert.ok(result.rows.every(s=>s.is_terminal));
  assert.equal(result.rows.filter(s=>s.image_kind==='generated'&&s.image_path).length,14);
  for(const original of before){const item=result.rows.find(s=>s.id===original.id)!;assert.equal(item.price_usd,original.price_usd);assert.equal(item.price_iqd,original.price_iqd);assert.equal(item.name,original.name);}
  await client.query('commit');
  await writeFile('artifacts/bmw-2023/published.json',JSON.stringify({branch,items:result.rows},null,2));
  console.log(JSON.stringify({branch:branch.name,finalItems:result.rowCount,generatedPreviews:14,prices:'unchanged',otherModels:'unchanged'}));
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}finally{await db.end();}
