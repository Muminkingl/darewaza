import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

test('compiled catalog loads in the Node ESM runtime used by Studio functions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'darewaza-esm-'));
 try {
  await writeFile(join(dir,'package.json'),JSON.stringify({type:'module'}));
  for(const file of ['catalog','partIcons']) {
   const source=await readFile(new URL(`../shared/${file}.ts`,import.meta.url),'utf8');
   const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}});
   await writeFile(join(dir,`${file}.js`),compiled.outputText);
  }
  const url=pathToFileURL(join(dir,'catalog.js')).href;
  const result=execFileSync(process.execPath,['--input-type=module','-e',`const c=await import(${JSON.stringify(url)});console.log(c.SECTION_ICONS.includes('fuel-injector'));`],{encoding:'utf8'});
  assert.equal(result.trim(),'true');
 }finally{await rm(dir,{recursive:true,force:true});}
});
