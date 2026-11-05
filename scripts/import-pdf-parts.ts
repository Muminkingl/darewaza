import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { rootCertificates } from 'node:tls';
import { importSourceKey, planPdfImport, PDF_PART_ICON, type PdfPart } from '../shared/pdfImport.js';
import type { Section } from '../shared/catalog.js';

const apply = process.argv.includes('--apply');
const data = JSON.parse(await readFile(new URL('../data/catalog/pdf-parts.json', import.meta.url), 'utf8')) as {parts: PdfPart[]};
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true, ca: [...rootCertificates, await readFile(new URL('../supabase/prod-ca-2021.crt', import.meta.url), 'utf8')] }, statement_timeout: 20000, connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtext('sayara_pdf_parts_import'))");
  await client.query("set local lock_timeout='5s'");
  const before = (await client.query('select * from public.catalog_sections order by position,created_at,id')).rows as (Section & {source_key?: string | null})[];
  const plan = planPdfImport(before, data.parts);
  assert.ok(plan.length, 'No model/year branches found.');
  const companies = [...new Set(plan.map(e => e.company.name))];
  const emptyCompanies = before.filter(s=>s.root_key==='parts'&&!s.parent_id&&!companies.includes(s.name)).map(s=>s.name);
  const summary = { mode: apply ? 'apply' : 'dry-run', companies: companies.length, branches: new Set(plan.map(e => e.parent.id)).size, categories: data.parts.length, insert: plan.filter(e => e.action === 'insert').length, reuse: plan.filter(e => e.action === 'adopt').length, unchanged: plan.filter(e => e.action === 'skip').length,
    emptyCompanies, byCompany: companies.map(company => { const rows = plan.filter(e => e.company.name === company); return { company, branches: new Set(rows.map(e => e.parent.id)).size, categoriesPerBranch: rows.length / new Set(rows.map(e => e.parent.id)).size }; }) };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) await client.query('rollback');
  else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await mkdir('artifacts/catalog-import', {recursive:true});
    await writeFile(`artifacts/catalog-import/before-${timestamp}.json`, JSON.stringify(before, null, 2));
    const inserts = plan.filter(e => e.action === 'insert').map(e => ({id:randomUUID(),parent_id:e.parent.id,name:e.part.name,name_en:e.part.name_en,name_ar:e.part.name_ar,source_key:importSourceKey(e.part),position:e.position}));
    const adopted = [];
    for (const entry of plan.filter(e => e.action === 'adopt')) {
      // Never overwrite administrator text, children, prices, icons or ordering.
      const existing = entry.existing!;
      const result = await client.query(`update public.catalog_sections set source_key=$1,
        name_en=case when name_en='' then $2 else name_en end,
        name_ar=case when name_ar='' then $3 else name_ar end
        where id=$4 and version=$5 and source_key is null returning id`,
      [importSourceKey(entry.part),entry.part.name_en,entry.part.name_ar,existing.id,existing.version]);
      assert.equal(result.rowCount, 1, 'A category changed during import. No changes were saved; run again.');
      adopted.push({id:existing.id,source_key:importSourceKey(entry.part)});
    }
    const started = performance.now();
    const inserted = await client.query(`insert into public.catalog_sections(id,root_key,parent_id,name,name_en,name_ar,source_key,position,icon,is_terminal)
      select id,'parts',parent_id,name,name_en,name_ar,source_key,position,$2,false
      from jsonb_to_recordset($1::jsonb) as r(id uuid,parent_id uuid,name text,name_en text,name_ar text,source_key text,position integer)
      returning id`, [JSON.stringify(inserts), PDF_PART_ICON]);
    assert.equal(inserted.rowCount, inserts.length);
    const after = (await client.query('select * from public.catalog_sections')).rows as typeof before;
    const verified = planPdfImport(after, data.parts);
    assert.equal(verified.length, plan.length);
    assert.ok(verified.every(e => e.action === 'skip'), 'Import coverage incomplete.');
    for (const entry of verified) {
      if (!before.some(s=>s.id===entry.existing!.id)) assert.equal(entry.existing!.is_terminal, false);
      assert.ok(entry.existing!.name_en && entry.existing!.name_ar);
    }
    for (const original of before) {
      const current = after.find(s => s.id === original.id)!;
      for (const field of ['name','description','parent_id','root_key','is_terminal','price_usd','price_iqd','image_path','position','icon'] as const) assert.equal(current[field], original[field], `Existing ${field} changed for ${original.id}`);
    }
    await client.query('commit');
    await writeFile(`artifacts/catalog-import/result-${timestamp}.json`, JSON.stringify({...summary,inserted:inserts,adopted,bulkInsertMs:Math.round(performance.now()-started)}, null, 2));
    console.log(`Committed ${inserted.rowCount} new categories and reused ${adopted.length}. Existing catalog preserved. Full coverage and repeat-run safety verified.`);
  }
} catch(error) {
  await client.query('rollback').catch(()=>{});
  console.error('PDF import failed; transaction rolled back:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode=1;
} finally { await client.end(); }
