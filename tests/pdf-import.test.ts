import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planPdfImport, isYearBranch, type PdfPart, importSourceKey } from '../shared/pdfImport';
import { sectionName, type Section } from '../shared/catalog';
import { createSchema, updateSchema } from '../api/sections';
const parts = JSON.parse(readFileSync(new URL('../data/catalog/pdf-parts.json',import.meta.url),'utf8')).parts as PdfPart[];
const row = (id:string,name:string,parent_id:string|null=null,root_key:'parts'|'accessories'='parts') => ({id,name,parent_id,root_key,position:0,is_terminal:false,version:1} as Section);

test('every numbered PDF row is retained exactly once in the source mapping',()=>{
  for(const [document,total] of [['SAYARA 2.pdf',43],['SAYARA 3.pdf',30]] as const) {
    const rows=parts.flatMap(p=>p.sources.filter(s=>s.document===document).map(s=>s.row)).sort((a,b)=>a-b);
    assert.deepEqual(rows,Array.from({length:total},(_,i)=>i+1));
  }
  assert.equal(parts.filter(p=>p.scope==='all').length,30);
  assert.ok(parts.every(p=>p.name.length<=100&&p.name_en.trim()&&p.name_ar.trim()));
});
test('restricted PDF parts reach only its four company ancestors and never Accessories',()=>{
  const s=[row('t','TOYOTA'),row('tm','Camry','t'),row('b','BMW'),row('bm','X1','b'),row('a','TOYOTA',null,'accessories'),row('am','Camry','a','accessories')];
  const plan=planPdfImport(s,parts);
  assert.equal(plan.filter(e=>e.parent.id==='bm').length,30);
  assert.equal(plan.filter(e=>e.parent.id==='tm').length,parts.length);
  assert.ok(plan.every(e=>e.parent.id!=='am'));
  for(const p of parts.filter(p=>p.scope!=='all')) assert.deepEqual(p.scope,['TOYOTA','NISSAN','HYUNDAI','KIA']);
});
test('all existing year branches receive categories without descending into custom part trees',()=>{
  const s=[row('t','TOYOTA'),row('tm','Camry','t'),row('y1','Camry model 18-24','tm'),row('y2','Camry 2026','tm'),row('group','Custom lights','y1'),row('custom','Special light','group')];
  const plan=planPdfImport(s,parts);
  assert.deepEqual([...new Set(plan.map(e=>e.parent.id))].sort(),['y1','y2']);
  assert.equal(plan.length,parts.length*2);
  assert.equal(isYearBranch('model 16-21'),true);
});
test('existing categories are reused and tagged categories remain stable after administrator renaming',()=>{
  const part=parts.find(p=>p.name==='چەمبەر')!;
  const s=[row('t','TOYOTA'),row('tm','Camry','t'),row('grille',part.name,'tm')];
  const first=planPdfImport(s,[part]);
  assert.equal(first[0].action,'adopt');
  const renamed={...s[2],name:'Edited by admin',source_key:importSourceKey(part)};
  const next=planPdfImport([...s.slice(0,2),renamed],[part]);
  assert.equal(next[0].action,'skip');
  assert.equal(next[0].existing?.id,'grille');
});
test('a deleted part stays excluded only in its selected year branch',()=>{
 const s=[row('b','BMW'),row('m','530i','b'),row('y','2023','m'),row('other','2022','m')];
 const excluded=['sayara-3-21','sayara-3-23','sayara-3-30'];
 const selected=parts.filter(p=>excluded.includes(p.key));
 const plan=planPdfImport(s,selected,{y:excluded});
 assert.deepEqual(plan.map(e=>e.parent.id),['other','other','other']);
});
test('ambiguous matches and terminal destinations stop an import instead of duplicating or corrupting data',()=>{
  const s=[row('t','TOYOTA'),row('tm','Camry','t')];
  assert.throws(()=>planPdfImport([...s,{...s[1],id:'unused',parent_id:'t',is_terminal:true}],parts));
  const part=parts[0];
  assert.throws(()=>planPdfImport([...s,row('one',part.name,'tm'),row('two',part.name,'tm')],[part]));
});
test('all clients use translations with a safe fallback for existing company and model names',()=>{
  const part=parts[0];
  assert.equal(sectionName(part,'ckb'),part.name);
  assert.equal(sectionName(part,'ar'),part.name_ar);
  assert.equal(sectionName(part,'en'),part.name_en);
  assert.equal(sectionName({name:'BMW',name_en:'  '},'en'),'BMW');
});
test('Studio validates translations, preserves omitted older-client fields, and rejects client source keys',()=>{
  const input={root_key:'parts',name:'چەمبەر',name_en:'Front grille',name_ar:'الشبك الأمامي'};
  assert.equal(createSchema.safeParse(input).success,true);
  assert.equal(createSchema.safeParse({...input,name_en:'a'.repeat(101)}).success,false);
  assert.equal(createSchema.safeParse({...input,source_key:'spoof'}).success,false);
  const parsed=updateSchema.parse({id:'477ee61a-3d77-4944-922c-cbde9427b95f',version:1,name:'BMW'});
  assert.equal(parsed.name_en,undefined);
  assert.equal(parsed.name_ar,undefined);
});
