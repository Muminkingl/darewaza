import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import sections from '../api/sections.js';
import { database } from '../server/database.js';
import type { Section } from '../shared/catalog.js';

const params = new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:5549806778,first_name:'Catalog verification'})});
const check=[...params.entries()].sort(([a],[b])=>a<b?-1:1).map(([k,v])=>`${k}=${v}`).join('\n');
const secret=createHmac('sha256','WebAppData').update(process.env.TELEGRAM_BOT_TOKEN!).digest();
params.set('hash',createHmac('sha256',secret).update(check).digest('hex'));
const remote=process.argv.includes('--remote');
async function call(method:string,body?:unknown,query:Record<string,string>={}) {
  if(remote) {
    const response=await fetch(`${process.env.APP_URL}/api/sections?${new URLSearchParams(query)}`,{method,headers:{Authorization:`tma ${params}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    return {status:response.status,data:await response.json() as {section:Section;sections:Section[];hasMore:boolean}};
  }
  let status=200; let data:any;
  const res={setHeader(){},status(code:number){status=code;return res;},json(value:unknown){data=value;return res;}} as unknown as VercelResponse;
  await sections({method,body,query,headers:{authorization:`tma ${params}`}} as VercelRequest,res);
  return {status,data:data as {section:Section;sections:Section[];hasMore:boolean}};
}
const db=database();
const root=randomUUID();
const report:Record<string,unknown>={remote};
try {
  const created=await call('POST',{id:root,root_key:'accessories',name:`__language_verification_${root}`});
  assert.equal(created.status,201);
  const id=randomUUID();
  const input={id,root_key:'accessories',parent_id:root,name:'چەمبەری تاقیکردنەوە',name_en:'Verification grille',name_ar:'شبك التحقق'};
  const item=await call('POST',input);
  assert.equal(item.status,201);
  for(const q of ['چەمبەری','Verification grille','شبك التحقق']) {
    const result=await call('GET',undefined,{root:'accessories',parent:root,q});
    assert.equal(result.status,200);
    assert.deepEqual(result.data.sections.map(s=>s.id),[id]);
  }
  const wildcard=await call('GET',undefined,{root:'accessories',parent:root,q:'%'});
  assert.equal(wildcard.data.sections.length,0,'LIKE wildcards must remain literal.');
  const oldClient=await call('PATCH',{id,version:item.data.section.version,name:input.name});
  assert.equal(oldClient.status,200);
  assert.equal(oldClient.data.section.name_en,input.name_en);
  assert.equal(oldClient.data.section.name_ar,input.name_ar);
  const six=await Promise.all(Array.from({length:6},(_,n)=>call('PATCH',{id,version:oldClient.data.section.version,name:input.name,name_en:`Grille edit ${n}`,name_ar:input.name_ar})));
  assert.equal(six.filter(r=>r.status===200).length,1);
  assert.equal(six.filter(r=>r.status===409).length,5);
  const retries=await Promise.all(Array.from({length:6},()=>call('POST',{...input,id:randomUUID(),name:'parallel creation'})));
  assert.ok(retries.every(r=>r.status===201));
  report.admin=['Three-language create and search','Literal wildcard escaping','Legacy edits retain translations','Six concurrent edits: one succeeds, five safe conflicts','Six concurrent creates succeed'];

  const parent=(await db.query("select parent_id from public.catalog_sections where source_key is not null group by parent_id having count(*)=57 limit 1")).rows[0].parent_id;
  const page1=await call('GET',undefined,{root:'parts',parent});
  const page2=await call('GET',undefined,{root:'parts',parent,offset:'40'});
  assert.equal(page1.status,200); assert.equal(page1.data.sections.length,40); assert.equal(page1.data.hasMore,true);
  assert.ok(page2.data.sections.length>=17); assert.equal(page2.data.hasMore,false);
  assert.equal(new Set([...page1.data.sections,...page2.data.sections].map(s=>s.id)).size,page1.data.sections.length+page2.data.sections.length);
  report.pagination={firstPage:page1.data.sections.length,secondPage:page2.data.sections.length,overlap:0};

  const client=await db.connect();
  try {
    await client.query('begin');
    await client.query('set local role authenticated');
    const timings=[];
    for(const q of ['Front left door','الباب الأمامي الأيسر','دەرگای پیشەوە لای چەپ']) {
      const result=await client.query('select id from public.search_catalog($1,\'parts\',0)',[q]);
      assert.ok(result.rowCount && result.rowCount<=41);
      const explain=await client.query("explain(analyze,buffers,format json) select id from public.catalog_sections where root_key='parts' and search_name ilike $1 order by name,id limit 41",[`%${q}%`]);
      const plan=explain.rows[0]['QUERY PLAN'][0];
      timings.push({query:q,rows:result.rowCount,executionMs:plan['Execution Time'],plan:plan.Plan});
    }
    await client.query('rollback');
    report.customerSearch=timings;
  } catch(error) {await client.query('rollback');throw error;} finally{client.release();}
  await mkdir('artifacts/catalog-import',{recursive:true});
  await writeFile(`artifacts/catalog-import/${remote?'remote':'local'}-verification.json`,JSON.stringify(report,null,2));
  console.log('Verified multilingual create/edit/search, legacy compatibility, two-page catalog loading, six-user concurrency and authenticated customer search.');
  console.log(JSON.stringify({remote,pagination:report.pagination,searchTimings:(report.customerSearch as {query:string;executionMs:number}[]).map(({query,executionMs})=>({query,executionMs}))}));
} finally {
  await db.query('delete from public.catalog_sections where id=$1',[root]);
  await db.end();
  console.log('Temporary language verification records removed.');
}
