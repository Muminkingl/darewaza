import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {database} from '../server/database.js';
import {storage,removeUnusedImages} from '../server/storage.js';
import {isPartIcon,type PartIcon} from '../shared/partIcons.js';

interface Correction {id:string;icon:PartIcon;image:string;name?:string;name_en:string;name_ar:string}
const config=JSON.parse(await readFile('data/catalog/bmw-530i-2023-corrections.json','utf8')) as {
 year_id:string;model_id:string;company_id:string;expected_count:number;remove:{id:string;source_key:string}[];items:Correction[];
};
const apply=process.argv.includes('--apply');
const db=database();
try {
 const branch=(await db.query(`select y.id,y.name,m.id model_id,c.id company_id from public.catalog_sections y
 join public.catalog_sections m on m.id=y.parent_id join public.catalog_sections c on c.id=m.parent_id where y.id=$1 and y.root_key='parts'`,[config.year_id])).rows[0];
 assert.equal(branch?.model_id,config.model_id);assert.equal(branch.company_id,config.company_id);
 const before=(await db.query('select * from public.catalog_sections where parent_id=$1 order by position,id',[config.year_id])).rows;
 assert.ok(before.length>=config.expected_count&&before.length<=config.expected_count+config.remove.length,'Branch structure changed; review before applying.');
 assert.ok(before.every(s=>s.is_terminal),'Expected published final items.');
 assert.equal((await db.query('select 1 from public.catalog_sections where parent_id=any($1::uuid[]) limit 1',[before.map(s=>s.id)])).rowCount,0,'A part has children; stop.');
 const removed=before.filter(s=>config.remove.some(item=>item.id===s.id));
 for(const row of removed)assert.equal(row.source_key,config.remove.find(item=>item.id===row.id)!.source_key);
 const updates:{id:string;version:number;name:string;name_en:string;name_ar:string;icon:PartIcon;image_path:string}[]=[];
 for(const item of config.items){
  const original=before.find(s=>s.id===item.id);assert.ok(original,`Missing ${item.id}`);assert.ok(isPartIcon(item.icon));
  const bytes=await readFile(`output/imagegen/bmw-530i-2023/${item.image}.webp`);assert.ok(bytes.length<150*1024);
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,32);
  const object=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}.webp`;
  const path=`${item.id}/${object}`;
  if(apply){
   const exists=await db.query("select 1 from storage.objects where bucket_id='catalog-images' and name=$1",[path]);
   if(!exists.rowCount){const result=await storage().upload(path,bytes,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(result.error)throw result.error;}
  }
  const update={id:item.id,version:original.version,name:item.name??original.name,name_en:item.name_en,name_ar:item.name_ar,icon:item.icon,image_path:path};
  if(original.image_kind!=='generated'||(['name','name_en','name_ar','icon','image_path'] as const).some(key=>original[key]!==update[key]))updates.push(update);
 }
 if(!apply){console.log(JSON.stringify({mode:'dry-run',branch:branch.name,updates:updates.map(s=>({id:s.id,name:s.name,name_en:s.name_en,icon:s.icon})),delete:removed.map(s=>s.name)}));}
 else {
  await mkdir('artifacts/bmw-2023',{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  await writeFile(`artifacts/bmw-2023/before-corrections-${stamp}.json`,JSON.stringify(before,null,2));
  const client=await db.connect();
  try{
   await client.query('begin');await client.query("set local lock_timeout='5s'");
   // Guard versions and ancestry so simultaneous Studio edits cannot be lost.
   const changed=await client.query(`update public.catalog_sections s set name=u.name,name_en=u.name_en,name_ar=u.name_ar,
    icon=u.icon,image_path=u.image_path,image_kind='generated' from jsonb_to_recordset($1::jsonb)
    as u(id uuid,version integer,name text,name_en text,name_ar text,icon text,image_path text)
    where s.id=u.id and s.version=u.version and s.parent_id=$2 returning s.*`,[JSON.stringify(updates),config.year_id]);
   assert.equal(changed.rowCount,updates.length,'Concurrent edit; rolled back.');
   for(const row of removed){
    const deleted=await client.query('delete from public.catalog_sections where id=$1 and version=$2 and parent_id=$3 returning id',[row.id,row.version,config.year_id]);
    assert.equal(deleted.rowCount,1,'An entry selected for deletion changed; rolled back.');
   }
   const after=(await client.query('select * from public.catalog_sections where parent_id=$1 order by position,id',[config.year_id])).rows;
   assert.equal(after.length,config.expected_count);assert.ok(after.every(s=>s.is_terminal));
   for(const old of before.filter(s=>!removed.some(row=>row.id===s.id))){
    const current=after.find(s=>s.id===old.id)!;
    for(const key of ['price_usd','price_iqd','parent_id','root_key','position','source_key'])assert.equal(current[key],old[key]);
   }
   await client.query('commit');
   await writeFile('artifacts/bmw-2023/corrections-published.json',JSON.stringify({branch,items:after},null,2));
   console.log(JSON.stringify({branch:branch.name,items:after.length,corrected:changed.rowCount,generatedPreviews:after.filter(s=>s.image_path&&s.image_kind==='generated').length,deleted:removed.map(s=>s.name),prices:'unchanged'}));
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
  // Only remove superseded objects which no catalog entry still references.
  await removeUnusedImages(before.filter(s=>updates.some(u=>u.id===s.id&&u.image_path!==s.image_path)||removed.some(row=>row.id===s.id)).map(s=>s.image_path).filter(Boolean));
 }
}finally{await db.end();}
