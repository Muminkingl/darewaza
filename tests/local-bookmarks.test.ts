import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalBookmarks, type BookmarkStorage } from '../shared/localBookmarks';
import type { Section } from '../shared/catalog';

class MemoryStorage implements BookmarkStorage {
  values=new Map<string,string>();
  writes:string[]=[];
  failWrite=false;
  async getAllKeys(){return [...this.values.keys()];}
  async multiGet(keys:string[]){return keys.map(key=>[key,this.values.get(key)??null] as [string,string|null]);}
  async multiRemove(keys:string[]){for(const key of keys)this.values.delete(key);}
  async getItem(key:string){return this.values.get(key)??null;}
  async removeItem(key:string){if(this.failWrite)throw new Error('Storage full');this.values.delete(key);}
  async setItem(key:string,value:string){if(this.failWrite)throw new Error('Storage full');this.writes.push(key);this.values.set(key,value);}
}
const section=(n:number):Section=>({id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,parent_id:null,root_key:'parts',name:`Part ${n}`,name_en:`Part ${n}`,name_ar:`قطعة ${n}`,description:'',icon:'wrench',position:0,version:1,is_terminal:false,price_usd:null,price_iqd:null,image_path:null,created_at:'2026-11-05',updated_at:'2026-11-05'});

test('bookmark taps update immediately, persist offline, and never require fetch',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Bookmarks must not contact the server');};
  try {
    const disk=new MemoryStorage();const store=new LocalBookmarks(disk,'owner');await store.load();
    const saved=store.toggle(section(1));
    assert.equal(store.has(section(1).id),true);
    assert.equal(store.getCount(),1);
    await saved;
    const restarted=new LocalBookmarks(disk,'owner');await restarted.load();
    assert.deepEqual(restarted.getSnapshot().sections,[{...section(1),image_kind:'photo'}]);
    const removed=restarted.toggle(section(1));
    assert.equal(restarted.getSnapshot().sections.length,0);
    await removed;
    const again=new LocalBookmarks(disk,'owner');await again.load();assert.equal(again.getCount(),0);
  } finally {globalThis.fetch=original;}
});
test('rapid taps coalesce disk writes without losing final state or unrelated bookmarks',async()=>{
  const disk=new MemoryStorage();const store=new LocalBookmarks(disk,'owner');await store.load();
  const writes=[];
  for(let i=0;i<21;i++)writes.push(store.toggle(section(1)));
  writes.push(store.toggle(section(2)));
  await Promise.all(writes);
  assert.equal(disk.writes.length,2);
  const restarted=new LocalBookmarks(disk,'owner');await restarted.load();
  assert.equal(restarted.getCount(),2);
  assert.equal(restarted.has(section(1).id),true);
});
test('taps during hydration retain previously stored items',async()=>{
  const disk=new MemoryStorage();const original=new LocalBookmarks(disk,'owner');await original.load();await original.toggle(section(2));
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  disk.getAllKeys=async()=>{await gate;return [...disk.values.keys()];};
  const store=new LocalBookmarks(disk,'owner');const loading=store.load();
  const save=store.toggle(section(1));assert.equal(store.has(section(1).id),true);
  release();await loading;await save;
  assert.equal(store.getCount(),2);
  assert.equal(store.has(section(2).id),true);
});
test('each row is notified only when its own bookmark changes',async()=>{
  const store=new LocalBookmarks(new MemoryStorage(),'owner');await store.load();
  let a=0,b=0;
  const stopA=store.subscribeItem(section(1).id,()=>a++);const stopB=store.subscribeItem(section(2).id,()=>b++);
  await store.toggle(section(1));assert.equal(a,1);assert.equal(b,0);
  stopA();stopB();
});
test('storage failures are reported and retry persists the visible state',async()=>{
  const disk=new MemoryStorage();const store=new LocalBookmarks(disk,'owner');await store.load();
  disk.failWrite=true;await assert.rejects(store.toggle(section(1)));
  assert.equal(store.getSnapshot().error,true);assert.equal(store.has(section(1).id),true);
  disk.failWrite=false;await store.retry();assert.equal(store.getSnapshot().error,false);
  const restarted=new LocalBookmarks(disk,'owner');await restarted.load();assert.equal(restarted.getCount(),1);
});
test('accounts on the same device have separate local bookmarks',async()=>{
  const disk=new MemoryStorage();const a=new LocalBookmarks(disk,'a');await a.load();await a.toggle(section(1));
  const b=new LocalBookmarks(disk,'b');await b.load();assert.equal(b.getCount(),0);
  await b.toggle(section(2));await a.clear();
  const bAgain=new LocalBookmarks(disk,'b');await bAgain.load();assert.equal(bAgain.has(section(2).id),true);
  assert.ok([...disk.values.keys()].every(key=>!key.startsWith(a.prefix)));
});
test('account deletion clears local data after pending writes finish',async()=>{
  const disk=new MemoryStorage();const store=new LocalBookmarks(disk,'owner');await store.load();
  const write=store.toggle(section(1));const clear=store.clear();await Promise.all([write,clear]);
  assert.equal(store.getCount(),0);assert.equal(disk.values.size,0);
});
test('one malformed disk record cannot hide other valid bookmarks',async()=>{
  const disk=new MemoryStorage();const store=new LocalBookmarks(disk,'owner');await store.load();await store.toggle(section(1));
  disk.values.set(`${store.prefix}item:${section(2).id}`,'invalid json');
  const restarted=new LocalBookmarks(disk,'owner');await restarted.load();
  assert.equal(restarted.getCount(),1);assert.equal(restarted.getSnapshot().error,true);
});
