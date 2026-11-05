import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {database} from '../server/database.js';
import type {Section} from '../shared/catalog.js';
const BMW='f8e4a369-7124-40fd-be1b-f86f586eee9a';
const ids=JSON.parse(await readFile('data/catalog/pdf-disabled-models.json','utf8')) as string[];
const expected=['740I','X7','X5','XM','X1','330I','X2','X6','X3','X4','440I','228I'].sort();
const apply=process.argv.includes('--apply');
const db=database();const client=await db.connect();
type Row=Section&{source_key:string|null};
try{
 await client.query('begin');await client.query("set local lock_timeout='5s'");
 const models=(await client.query('select * from public.catalog_sections where id=any($1::uuid[]) and parent_id=$2 for update',[ids,BMW])).rows as Row[];
 assert.equal(models.length,expected.length);assert.deepEqual(models.map(s=>s.name.toUpperCase()).sort(),expected);
 const tree=(await client.query(`with recursive t as (select * from public.catalog_sections where id=any($1::uuid[]) union all
 select c.* from public.catalog_sections c join t on c.parent_id=t.id) select * from t order by id`,[ids])).rows as Row[];
 const candidates=tree.filter(s=>s.source_key?.startsWith('pdf:'));
 assert.ok(candidates.length===300||candidates.length===0,'Imported tree changed; inspect before deleting.');
 assert.ok(candidates.every(s=>!s.is_terminal&&!s.image_path&&s.price_usd==null&&s.price_iqd==null),'A folder now has product data; stop.');
 const candidateIds=candidates.map(s=>s.id);
 assert.equal((await client.query('select 1 from public.catalog_sections where parent_id=any($1::uuid[]) limit 1',[candidateIds])).rowCount,0,'A folder contains children; stop rather than cascade.');
 const fingerprint=async()=> (await client.query("select md5(coalesce(string_agg(to_jsonb(s)::text,'|' order by id),'')) hash from public.catalog_sections s where not(id=any($1::uuid[]))",[candidateIds])).rows[0].hash;
 const protectedHash=await fingerprint();
 const summary={mode:apply?'apply':'dry-run',models:models.map(s=>s.name),folders:candidates.length,modelAndYearBranches:'preserved',otherCatalogRows:'preserved'};
 if(!apply){console.log(JSON.stringify(summary));await client.query('rollback');}
 else{
  await mkdir('artifacts/bmw-2026',{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  await writeFile(`artifacts/bmw-2026/before-cleanup-${stamp}.json`,JSON.stringify(tree,null,2));
  const deleted=await client.query(`delete from public.catalog_sections s using jsonb_to_recordset($1::jsonb) r(id uuid,version integer)
   where s.id=r.id and s.version=r.version and s.source_key like 'pdf:%' and not s.is_terminal returning s.id`,[JSON.stringify(candidates.map(s=>({id:s.id,version:s.version})))]);
  assert.equal(deleted.rowCount,candidates.length,'Concurrent edit; rolled back.');
  assert.equal(await fingerprint(),protectedHash,'An unrelated row changed; rolled back.');
  await client.query('commit');
  await writeFile('artifacts/bmw-2026/cleanup-result.json',JSON.stringify({...summary,deleted:deleted.rows,protectedHash},null,2));
  console.log(JSON.stringify({...summary,deleted:deleted.rowCount,protectedRowsVerified:true}));
 }
}catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();await db.end();}
