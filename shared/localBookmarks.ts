import { IMAGE_PATH_PATTERN, type Section } from './catalog';

export interface BookmarkStorage {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: string[]): Promise<readonly [string, string | null][]>;
  multiRemove(keys: string[]): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
type Entry = { section: Section; savedAt: number };
type Snapshot = { sections: Section[]; ready: boolean; error: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Keep only display/navigation data. Generated search text and other server
// metadata never need to be serialized on each bookmark tap.
export function bookmarkSection(value: Section): Section {
  if (!uuid.test(value.id) || typeof value.name !== 'string' || !['parts','accessories'].includes(value.root_key)) throw new Error('Invalid bookmark.');
  return {
    id:value.id, parent_id:value.parent_id, root_key:value.root_key,
    name:value.name, name_en:value.name_en || '', name_ar:value.name_ar || '',
    description:value.description || '', icon:value.icon, position:value.position,
    version:value.version, is_terminal:value.is_terminal,
    price_usd:value.price_usd == null ? null : String(value.price_usd),
    price_iqd:value.price_iqd == null ? null : String(value.price_iqd),
    image_path:value.image_path && IMAGE_PATH_PATTERN.test(value.image_path) ? value.image_path : null,
    image_kind:value.image_kind || 'photo',
    created_at:value.created_at, updated_at:value.updated_at,
  };
}

export class LocalBookmarks {
  readonly prefix: string;
  private items = new Map<string, Entry>();
  private edits = new Map<string, Entry | null>();
  private revisions = new Map<string, number>();
  private persisted = new Map<string, number>();
  private listeners = new Set<() => void>();
  private itemListeners = new Map<string, Set<() => void>>();
  private snapshot: Snapshot = {sections:[],ready:false,error:false};
  private loading?: Promise<void>;
  private loaded = false;
  private writes: Promise<void> = Promise.resolve();

  constructor(private storage: BookmarkStorage, userId: string, private now = Date.now) {
    this.prefix = `darewaza.bookmarks.v1:${userId}:`;
  }
  getSnapshot = () => this.snapshot;
  getCount = () => this.items.size;
  has = (id: string) => this.items.has(id);
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  subscribeItem(id: string, listener: () => void) {
    const listeners = this.itemListeners.get(id) || new Set();
    listeners.add(listener); this.itemListeners.set(id,listeners);
    return () => { listeners.delete(listener); if (!listeners.size) this.itemListeners.delete(id); };
  }
  private publish(ids: Iterable<string>, sections: Section[] = this.snapshot.sections, error = false) {
    this.snapshot = {sections,ready:this.loaded,error};
    for (const id of ids) for (const listener of this.itemListeners.get(id) || []) listener();
    for (const listener of this.listeners) listener();
  }
  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const keys = (await this.storage.getAllKeys()).filter(key => key.startsWith(`${this.prefix}item:`));
      const stored = new Map<string, Entry>();
      let damaged = false;
      for (let start=0; start<keys.length; start+=100) {
        for (const [key,raw] of await this.storage.multiGet(keys.slice(start,start+100))) {
          if (!raw) continue;
          try {
            const record = JSON.parse(raw);
            const id = key.slice(`${this.prefix}item:`.length);
            if (!uuid.test(id) || record.schema !== 1) throw new Error('Invalid local record.');
            if (record.section !== null) {
              const section = bookmarkSection(record.section);
              if (section.id !== id || !Number.isFinite(record.savedAt)) throw new Error('Invalid local record.');
              stored.set(id,{section,savedAt:record.savedAt});
            }
          } catch { damaged = true; }
        }
      }
      // Taps during disk hydration win over the older stored value.
      for (const [id,entry] of this.edits) { if (entry) stored.set(id,entry); else stored.delete(id); }
      const changed = new Set([...this.items.keys(),...stored.keys()]);
      this.items = stored; this.loaded = true; this.edits.clear();
      const sections = [...stored.values()].sort((a,b)=>b.savedAt-a.savedAt || a.section.id.localeCompare(b.section.id)).map(item=>item.section);
      this.publish(changed,sections,damaged);
    })().catch(error => { this.snapshot = {...this.snapshot,ready:true,error:true}; for (const listener of this.listeners) listener(); throw error; }).finally(()=>{this.loading=undefined;});
    return this.loading;
  }
  private change(id: string, entry: Entry | null) {
    if (!this.loaded) this.edits.set(id,entry);
    if (entry) this.items.set(id,entry); else this.items.delete(id);
    this.revisions.set(id,(this.revisions.get(id) || 0)+1);
    const remaining = this.snapshot.sections.filter(section=>section.id!==id);
    this.publish([id],entry ? [entry.section,...remaining] : remaining);
  }
  private persist(id: string): Promise<void> {
    const target = this.revisions.get(id) || 0;
    const task = this.writes.catch(()=>{}).then(async()=>{
      await this.load();
      if ((this.persisted.get(id) || 0) >= target) return;
      const revision = this.revisions.get(id)!;
      const entry = this.items.get(id);
      const key = `${this.prefix}item:${id}`;
      if (entry) await this.storage.setItem(key,JSON.stringify({schema:1,section:entry.section,savedAt:entry.savedAt}));
      else await this.storage.removeItem(key);
      this.persisted.set(id,revision);
    }).catch(error=>{ this.publish([],this.snapshot.sections,true); throw error; });
    this.writes = task;
    return task;
  }
  toggle(section: Section): Promise<void> {
    const value = bookmarkSection(section);
    this.change(section.id,this.has(section.id) ? null : {section:value,savedAt:this.now()});
    return this.persist(section.id);
  }
  async retry() {
    await this.load();
    await Promise.all([...this.revisions.keys()].filter(id=>(this.persisted.get(id)||0)<this.revisions.get(id)!).map(id=>this.persist(id)));
    this.publish([]);
  }
  async refreshSections(sections: Section[]) {
    const changed: string[]=[];
    for (const section of sections) {
      const existing = this.items.get(section.id);
      if (!existing) continue;
      const updated = bookmarkSection(section);
      if (JSON.stringify(existing.section) === JSON.stringify(updated)) continue;
      existing.section=updated; this.revisions.set(section.id,(this.revisions.get(section.id)||0)+1); changed.push(section.id);
    }
    if (!changed.length) return;
    this.publish([],this.snapshot.sections.map(s=>this.items.get(s.id)!.section));
    await Promise.all(changed.map(id=>this.persist(id)));
  }
  async clear() {
    await this.load().catch(()=>{});
    const changed=[...this.items.keys()];
    this.items.clear(); this.edits.clear(); this.loaded=true; this.publish(changed,[]);
    const task=this.writes.catch(()=>{}).then(async()=>{
      const keys=(await this.storage.getAllKeys()).filter(key=>key.startsWith(this.prefix));
      for(let start=0;start<keys.length;start+=100) await this.storage.multiRemove(keys.slice(start,start+100));
      this.revisions.clear();this.persisted.clear();
    });
    this.writes=task;
    await task;
  }
}
