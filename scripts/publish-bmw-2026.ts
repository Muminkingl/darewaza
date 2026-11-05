import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {database} from '../server/database.js';
import {storage,removeUnusedImages} from '../server/storage.js';
import {SECTION_ICONS,type Section,type SectionIcon} from '../shared/catalog.js';

interface Item {id:string;source_key:string;name:string;name_en:string;name_ar:string;icon:SectionIcon;image:string;position:number}
interface Config {year_id:string;model_id:string;company_id:string;reference_year_id:string;expected_count:number;items:Item[]}
type Row=Section&{source_key:string|null};
const config=JSON.parse(await readFile('data/catalog/bmw-530i-2026.json','utf8')) as Config;
const apply=process.argv.includes('--apply');
const imagesOnly=process.argv.includes('--images-only');
const replacementSources=new Set(['pdf:sayara-3-11','pdf:sayara-3-12','pdf:sayara-3-26']);
const db=database();
try{
 assert.equal(config.items.length,31);assert.equal(new Set(config.items.map(s=>s.id)).size,31);
 const branch=(await db.query(`select y.id,y.name,m.id model_id,c.id company_id from public.catalog_sections y
 join public.catalog_sections m on m.id=y.parent_id join public.catalog_sections c on c.id=m.parent_id where y.id=$1 and y.root_key='parts'`,[config.year_id])).rows[0];
 assert.equal(branch?.model_id,config.model_id);assert.equal(branch.company_id,config.company_id);
 assert.ok(branch.name.includes('2026'));assert.notEqual(config.year_id,config.reference_year_id);
 const before=(await db.query('select * from public.catalog_sections where parent_id=$1 order by position,id',[config.year_id])).rows as Row[];
 assert.ok(before.length===30||before.length===31,'Branch structure changed. Inspect before publishing.');
 assert.ok(before.every(row=>config.items.some(item=>item.id===row.id&&item.source_key===row.source_key)),'An item identity changed. Stop.');
 assert.equal((await db.query('select 1 from public.catalog_sections where parent_id=any($1::uuid[]) limit 1',[before.map(s=>s.id)])).rowCount,0,'A part now has children. Stop rather than delete them.');
 const oldHashes=new Set<string>();
 for(const file of await readdir('output/imagegen/bmw-530i-2023'))if(file.endsWith('.webp'))oldHashes.add(createHash('sha256').update(await readFile(`output/imagegen/bmw-530i-2023/${file}`)).digest('hex'));
 const images=[];
 for(const item of config.items.filter(s=>!imagesOnly||replacementSources.has(s.source_key))){
  assert.ok(SECTION_ICONS.includes(item.icon));assert.ok(/^[a-z0-9-]+$/.test(item.image));
  for(const name of [item.name,item.name_en,item.name_ar])assert.ok(name.trim()&&name.length<=100);
  const bytes=await readFile(`output/imagegen/bmw-530i-2026/${item.image}.webp`);assert.ok(bytes.length<150*1024,'Image exceeds optimized budget.');
  const hash=createHash('sha256').update(bytes).digest('hex');assert.ok(!oldHashes.has(hash),'Never copy a 2023 image into 2026.');
  const id=hash.slice(0,32);const path=`${item.id}/${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}.webp`;
  images.push({item,path,bytes});
 }
 const updates=images.map(({item,path})=>({...item,image_path:path,version:before.find(s=>s.id===item.id)?.version??null}));
 if(imagesOnly){assert.equal(updates.length,3);assert.ok(updates.every(s=>s.version!=null),'Image replacement requires existing items.');}
 const summary={mode:apply?'apply':'dry-run',operation:imagesOnly?'replace-three-previews':'publish',branch:branch.name,items:updates.length,convert:imagesOnly?0:before.filter(s=>!s.is_terminal).length,newItems:updates.filter(s=>s.version==null).map(s=>s.name),generatedPreviews:images.length,frontBrakeAndChromeEntries:'retained'};
 if(!apply)console.log(JSON.stringify(summary));
 else{
  await mkdir('artifacts/bmw-2026',{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  await writeFile(`artifacts/bmw-2026/before-publish-${stamp}.json`,JSON.stringify(before,null,2));
  const existing=new Set((await db.query("select name from storage.objects where bucket_id='catalog-images' and name=any($1::text[])",[images.map(s=>s.path)])).rows.map(s=>s.name));
  const pending=images.filter(s=>!existing.has(s.path));let cursor=0;
  const uploaded=await Promise.allSettled([0,1,2].map(async()=>{while(cursor<pending.length){const image=pending[cursor++];const result=await storage().upload(image.path,image.bytes,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(result.error)throw result.error;}}));
  const failed=uploaded.find(s=>s.status==='rejected');if(failed?.status==='rejected')throw failed.reason;
  const client=await db.connect();
  try{
   await client.query('begin');await client.query("set local lock_timeout='5s'");
   const allIds=updates.map(s=>s.id);
   const fingerprint=async()=> (await client.query("select md5(coalesce(string_agg(to_jsonb(s)::text,'|' order by id),'')) hash from public.catalog_sections s where not(id=any($1::uuid[]))",[allIds])).rows[0].hash;
   const protectedHash=await fingerprint();
   const result=await client.query(imagesOnly ? `update public.catalog_sections s set image_path=u.image_path,image_kind='generated'
    from jsonb_to_recordset($1::jsonb) as u(id uuid,version integer,image_path text)
    where s.id=u.id and s.version=u.version and s.parent_id=$2 and s.is_terminal returning s.*` : `update public.catalog_sections s set name=u.name,name_en=u.name_en,name_ar=u.name_ar,icon=u.icon,
    is_terminal=true,image_path=u.image_path,image_kind='generated' from jsonb_to_recordset($1::jsonb)
    as u(id uuid,version integer,name text,name_en text,name_ar text,icon text,image_path text)
    where s.id=u.id and s.version=u.version and s.parent_id=$2 returning s.*`,[JSON.stringify(updates.filter(s=>s.version!=null)),config.year_id]);
   assert.equal(result.rowCount,updates.filter(s=>s.version!=null).length,'Concurrent edit; rolled back.');
   const created=updates.filter(s=>s.version==null);
   const inserted=await client.query(`insert into public.catalog_sections(id,parent_id,root_key,name,name_en,name_ar,source_key,icon,position,is_terminal,image_path,image_kind)
    select id,$2,'parts',name,name_en,name_ar,source_key,icon,position,true,image_path,'generated'
    from jsonb_to_recordset($1::jsonb) as u(id uuid,name text,name_en text,name_ar text,source_key text,icon text,position integer,image_path text) returning *`,[JSON.stringify(created),config.year_id]);
   assert.equal(inserted.rowCount,created.length);
   const after=(await client.query('select * from public.catalog_sections where parent_id=$1 order by position,id',[config.year_id])).rows as Row[];
   assert.equal(after.length,config.expected_count);assert.ok(after.every(s=>s.is_terminal&&s.image_kind==='generated'&&s.image_path?.startsWith(`${s.id}/`)));
   for(const old of before){const current=after.find(s=>s.id===old.id)!;for(const key of ['price_usd','price_iqd','position','parent_id','root_key','description','source_key'] as const)assert.equal(current[key],old[key]);}
   if(imagesOnly)for(const old of before){const current=after.find(s=>s.id===old.id)!;for(const key of Object.keys(old) as (keyof Row)[])if(!['image_path','image_kind','version','updated_at'].includes(key))assert.deepEqual(current[key],old[key],`Image replacement changed ${key}`);}
   assert.equal(await fingerprint(),protectedHash,'An unrelated catalog record changed. Rolled back.');
   await client.query('commit');
   await writeFile(`artifacts/bmw-2026/${imagesOnly?'preview-fixes-published':'published'}.json`,JSON.stringify({branch,items:after,protectedHash},null,2));
   console.log(JSON.stringify({...summary,updated:result.rowCount,converted:imagesOnly?0:before.filter(s=>!s.is_terminal).length,created:inserted.rowCount,protectedRowsVerified:true,prices:'preserved'}));
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
  await removeUnusedImages(before.filter(s=>updates.some(u=>u.id===s.id&&u.image_path!==s.image_path)).map(s=>s.image_path).filter((path):path is string=>Boolean(path)));
 }
}finally{await db.end();}
