import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Car, Check, ChevronLeft, Disc3, Folder, FolderPlus, Layers3, LoaderCircle, LockKeyhole, MoreHorizontal, Package, Pencil, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Trash2, Wrench, X, Zap } from 'lucide-react';
import { ROOTS, SECTION_ICONS, type RootKey, type Section, type SectionIcon } from '../../shared/catalog';
import { api, ApiError, telegram } from './telegram';

const glyphs = { folder: Folder, car: Car, settings: Settings, wrench: Wrench, disc: Disc3, sparkles: Sparkles, package: Package, zap: Zap };
const iconNames: Record<SectionIcon, string> = { folder: 'بەش', car: 'ئۆتۆمبێل', settings: 'مەکینە', wrench: 'ئامراز', disc: 'تایە', sparkles: 'جوانکاری', package: 'مەواد', zap: 'کارەبا' };
function Glyph({ icon, size = 23 }: { icon: SectionIcon; size?: number }) { const Icon = glyphs[icon] || Folder; return <Icon size={size} strokeWidth={1.7} />; }
interface Admin { id: number; first_name: string }
type Dialog = { kind: 'create' } | { kind: 'edit'; section: Section } | { kind: 'delete'; section: Section } | null;

export function Studio() {
  const [user, setUser] = useState<Admin | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [root, setRoot] = useState<RootKey>('parts');
  const [trail, setTrail] = useState<Section[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const requestId = useRef(0);
  const items = useRef<Section[]>([]);
  const busy = useRef(false);
  const parent = trail.at(-1);
  const rootInfo = ROOTS.find(item => item.key === root)!;

  useEffect(() => {
    if (!telegram?.initData) { setAuthLoading(false); return; }
    api<{ user: Admin }>('session').then(data => setUser(data.user)).catch(err => setAuthError(err.message)).finally(() => setAuthLoading(false));
  }, []);

  const load = useCallback(async (append = false) => {
    if (!user || (append && busy.current)) return;
    const id = ++requestId.current;
    busy.current = true; setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ root, offset: String(append ? items.current.length : 0), q: search.trim() });
      if (parent) query.set('parent', parent.id);
      const result = await api<{ sections: Section[]; hasMore: boolean }>(`sections?${query}`);
      if (requestId.current !== id) return;
      items.current = append ? [...items.current, ...result.sections] : result.sections;
      setSections(items.current); setHasMore(result.hasMore);
    } catch (err) {
      if (requestId.current !== id) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { setAuthError(err.message); setUser(null); }
      else setError(err instanceof Error ? err.message : 'Unable to load sections.');
    } finally { if (requestId.current === id) { setLoading(false); busy.current = false; } }
  }, [root, parent?.id, search, user]);

  useEffect(() => {
    ++requestId.current; busy.current = false; items.current = []; setSections([]); setLoading(true);
    const timer = setTimeout(() => { void load(); }, 200);
    return () => { clearTimeout(timer); ++requestId.current; };
  }, [load]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!trail.length) { telegram?.BackButton?.hide(); return; }
    const goBack = () => { setTrail(value => value.slice(0, -1)); setSearch(''); setMenu(null); };
    telegram?.BackButton?.show(); telegram?.BackButton?.onClick(goBack);
    return () => telegram?.BackButton?.offClick(goBack);
  }, [trail.length]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close); return () => window.removeEventListener('click', close);
  }, [menu]);

  function navigate(next: Section[]) { setTrail(next); setSearch(''); setMenu(null); telegram?.HapticFeedback?.impactOccurred('light'); }
  function saved(message: string) { setDialog(null); setToast(message); void load(); telegram?.HapticFeedback?.notificationOccurred('success'); }

  if (authLoading) return <main className="gate"><div className="gate-logo"><Car size={32} /></div><LoaderCircle className="spin" size={23} /><p>پشکنینی دەستگەیشتن...</p></main>;
  if (!user) return <main className="gate"><div className="gate-logo"><Car size={34} /></div><span className="overline">SAYARA STUDIO</span><h1>{authError ? 'دەستگەیشتن سنووردارە' : 'ستۆدیۆکەت، لە تێلیگرام'}</h1><p>{authError || 'بۆ بەڕێوەبردنی بەشەکان، ستۆدیۆ لە ناو بۆتی تێلیگرام بکەرەوە.'}</p><div className="gate-note"><LockKeyhole size={16} /><span>تەنها بۆ بەڕێوەبەرە ڕێپێدراوەکان</span></div><span className="gate-foot">Catalog Studio · سەیارە</span></main>;

  return <div className="studio">
    <header className="studio-header"><div className="header-inner"><div className="studio-brand"><span className="brand-symbol"><Car size={23} strokeWidth={1.6} /></span><div><strong>سەیارە <span>ستۆدیۆ</span></strong><small>CATALOG STUDIO</small></div></div><div className="admin-chip"><ShieldCheck size={15} /><span>{user.first_name}</span><i /></div></div><div className="header-caption"><span>کاتەلۆگەکەت، بە شێوەی خۆت.</span><small>ڕێکخستنێکی ئاسان. هەڵبژاردنێکی باشتر.</small></div></header>
    <main className="studio-main">
      <div className="root-tabs" role="tablist" aria-label="بەشە سەرەکییەکان">{ROOTS.map(item => <button key={item.key} role="tab" aria-selected={root === item.key} className={root === item.key ? 'root-tab active' : 'root-tab'} onClick={() => { setRoot(item.key); navigate([]); }}>{item.key === 'parts' ? <Wrench size={17} /> : <Sparkles size={17} />}{item.name}</button>)}</div>
      <nav className="breadcrumbs" aria-label="ڕێڕەوی بەشەکان"><button onClick={() => navigate([])} className={!trail.length ? 'current' : ''}>{rootInfo.name}</button>{trail.map((item, index) => <span key={item.id}><ChevronLeft size={13} /><button className={index === trail.length - 1 ? 'current' : ''} onClick={() => navigate(trail.slice(0, index + 1))}>{item.name}</button></span>)}</nav>
      <div className="page-title-row"><div className="page-title">{trail.length > 0 && <button className="icon-button back" onClick={() => navigate(trail.slice(0, -1))} aria-label="گەڕانەوە"><ArrowRight size={20} /></button>}<div><span className="overline">{trail.length ? 'ژێربەشەکان' : 'بەشەکان'}</span><h1>{parent?.name || rootInfo.name}</h1></div></div><button className="primary-button" onClick={() => setDialog({ kind: 'create' })}><Plus size={19} /><span>بەشی نوێ</span></button></div>
      <p className="page-description">{parent?.description || 'بەشێک دروست بکە، پاشان ژێربەشەکانی لە ناویدا ڕێک بخە.'}</p>
      <div className="list-toolbar"><label className="search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="گەڕان لەم بەشەدا..." maxLength={100} aria-label="گەڕان لەم بەشەدا" />{search && <button onClick={() => setSearch('')} aria-label="سڕینەوە"><X size={16} /></button>}</label><button className="icon-button refresh" onClick={() => void load()} disabled={loading} aria-label="نوێکردنەوە"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></div>
      {error && <div className="error-box" role="alert">{error}<button onClick={() => void load()}>هەوڵدانەوە</button></div>}
      <div className="section-grid" aria-busy={loading}>
        {!sections.length && loading ? [1, 2, 3].map(item => <div className="skeleton" key={item} />) : null}
        {!sections.length && !loading && !error ? <div className="empty-state"><div className="empty-glyph"><FolderPlus size={36} strokeWidth={1.2} /></div><h2>{search ? 'هیچ بەشێک نەدۆزرایەوە' : 'لێرەوە دەست پێ بکە'}</h2><p>{search ? 'ناوێکی دیکە تاقی بکەرەوە.' : `یەکەم ${trail.length ? 'ژێربەش' : 'بەش'} زیاد بکە. هەر بەشێک دەتوانێت ژێربەشی خۆی هەبێت.`}</p>{!search && <button className="subtle-button" onClick={() => setDialog({ kind: 'create' })}><Plus size={17} />زیادکردنی یەکەم بەش</button>}</div> : null}
        {sections.map(section => <article className="section-row" key={section.id}>
          <button className="section-open" onClick={() => navigate([...trail, section])}><span className="section-glyph"><Glyph icon={section.icon} /></span><span className="section-text"><strong dir="auto">{section.name}</strong><small dir="auto">{section.description || 'بینینی ژێربەشەکان'}</small></span><ChevronLeft size={18} className="row-arrow" /></button>
          <div className="row-actions"><button className="icon-button more-button" aria-label={`هەڵبژاردەکانی ${section.name}`} aria-expanded={menu === section.id} onClick={event => { event.stopPropagation(); setMenu(menu === section.id ? null : section.id); }}><MoreHorizontal size={20} /></button>{menu === section.id && <div className="context-menu"><button onClick={() => { setDialog({ kind: 'edit', section }); setMenu(null); }}><Pencil size={15} />دەستکاری</button><button className="danger-text" onClick={() => { setDialog({ kind: 'delete', section }); setMenu(null); }}><Trash2 size={15} />سڕینەوە</button></div>}</div>
        </article>)}
      </div>
      {hasMore && <button className="load-more" disabled={loading} onClick={() => void load(true)}>{loading ? <LoaderCircle size={17} className="spin" /> : 'بینینی زیاتر'}</button>}
      <footer className="studio-footer"><Layers3 size={14} /><span>بەش و ژێربەش، بەبێ سنووری ئاست</span></footer>
    </main>
    {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
    {dialog && <SectionDialog dialog={dialog} root={root} parent={parent?.id || null} onClose={() => setDialog(null)} onSaved={saved} />}
  </div>;
}

function SectionDialog({ dialog, root, parent, onClose, onSaved }: { dialog: NonNullable<Dialog>; root: RootKey; parent: string | null; onClose: () => void; onSaved: (message: string) => void }) {
  const existing = dialog.kind !== 'create' ? dialog.section : null;
  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [icon, setIcon] = useState<SectionIcon>(existing?.icon || 'folder');
  const [position, setPosition] = useState(existing?.position || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleting = dialog.kind === 'delete';

  useEffect(() => {
    const element = dialogRef.current;
    element?.showModal();
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', beforeUnload);
    telegram?.enableClosingConfirmation?.();
    return () => { window.removeEventListener('beforeunload', beforeUnload); telegram?.disableClosingConfirmation?.(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try {
      if (deleting) await api('sections', { method: 'DELETE', body: JSON.stringify({ id: existing!.id }) });
      else await api('sections', { method: existing ? 'PATCH' : 'POST', body: JSON.stringify({ name, description, icon, position, ...(existing ? { id: existing.id } : { root_key: root, parent_id: parent }) }) });
      onSaved(deleting ? 'بەشەکە سڕایەوە' : existing ? 'گۆڕانکارییەکان پاشەکەوت کران' : 'بەشە نوێیەکە زیاد کرا');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save.'); telegram?.HapticFeedback?.notificationOccurred('error'); }
    finally { setSaving(false); }
  }

  return <dialog ref={dialogRef} className="section-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <form onSubmit={submit}><div className="dialog-handle" /><div className="dialog-heading"><div><span className="overline">SAYARA STUDIO</span><h2 id="dialog-title">{deleting ? 'سڕینەوەی بەش' : existing ? 'دەستکاری بەش' : 'بەشێکی نوێ'}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="داخستن"><X size={21} /></button></div>
      {deleting ? <div className="delete-warning"><span className="delete-icon"><Trash2 size={26} /></span><p>دڵنیایت لە سڕینەوەی «{existing?.name}»؟</p><small>هەموو ژێربەشەکانی ناویشی دەسڕێنەوە. ئەم کارە ناگەڕێتەوە.</small></div> : <>
        <label className="field">ناوی بەش <span>*</span><input autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="بۆ نموونە: BMW" dir="auto" /></label>
        <label className="field">وەسف <small>ئارەزوومەندانە</small><textarea maxLength={500} rows={2} value={description} onChange={event => setDescription(event.target.value)} placeholder="وەسفێکی کورت بۆ ئەم بەشە..." dir="auto" /></label>
        <fieldset className="icon-field"><legend>ئایکۆنی بەش</legend><div className="icon-options">{SECTION_ICONS.map(value => <button type="button" key={value} className={icon === value ? 'selected' : ''} onClick={() => setIcon(value)} aria-label={iconNames[value]} aria-pressed={icon === value}><Glyph icon={value} size={21} /></button>)}</div></fieldset>
        <label className="field position-field">ڕیزبەندی <input type="number" min={0} max={2147483647} step={1} required value={position} onChange={event => setPosition(event.target.valueAsNumber)} /><small>ژمارەی بچووکتر لە سەرەوە دەردەکەوێت.</small></label>
      </>}
      {error && <div className="error-box" role="alert">{error}</div>}
      <div className="dialog-actions"><button type="submit" className={deleting ? 'primary-button danger-button' : 'primary-button'} disabled={saving || (!deleting && !name.trim())}>{saving ? <LoaderCircle size={18} className="spin" /> : deleting ? <Trash2 size={17} /> : <Check size={18} />}{deleting ? 'بەڵێ، بیسڕەوە' : saving ? 'پاشەکەوت دەکرێت...' : 'پاشەکەوتکردن'}</button><button type="button" className="cancel-button" onClick={onClose} disabled={saving}>پاشگەزبوونەوە</button></div>
    </form>
  </dialog>;
}
