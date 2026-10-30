import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useCatalog } from './useCatalog';
import { Glyph } from './catalogIcons';
import { SectionDialog, type Dialog } from './SectionDialog';
import { ProductDetail } from './ProductDetail';
import { ArrowRight, Car, Check, ChevronLeft, FolderPlus, Layers3, LoaderCircle, LockKeyhole, MoreHorizontal, Pencil, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Wrench, X } from 'lucide-react';
import { ROOTS, formatPrice, type RootKey, type Section } from '../../shared/catalog';
import { api, ApiError, telegram } from './telegram';

interface Admin { id: number; first_name: string }

export function Studio() {
  const [user, setUser] = useState<Admin | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [root, setRoot] = useState<RootKey>('parts');
  const [trail, setTrail] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const parent = trail.at(-1);
  const rootInfo = ROOTS.find(item => item.key === root)!;
  const catalog = useCatalog(root, parent, search, Boolean(user));
  const { sections, loading, hasMore } = catalog;
  const detail = useSWR<{ section: Section }, ApiError>(user && parent?.is_terminal ? 'sections?root=' + root + '&id=' + parent.id : null, path => api(path), { errorRetryCount: 1, revalidateOnFocus: true });
  const currentItem = detail.data?.section || parent;
  const error = catalog.error?.message || detail.error?.message || '';
  const load = (append = false) => append ? catalog.loadMore() : catalog.refresh();
  useEffect(() => {
    const failure = catalog.error || detail.error;
    if (failure && (failure.status === 401 || failure.status === 403)) { setAuthError(failure.message); setUser(null); }
  }, [catalog.error, detail.error]);

  useEffect(() => {
    if (!telegram?.initData) { setAuthLoading(false); return; }
    api<{ user: Admin }>('session').then(data => setUser(data.user)).catch(err => setAuthError(err.message)).finally(() => setAuthLoading(false));
  }, []);

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

  function navigate(next: Section[]) { window.scrollTo(0, 0); setTrail(next); setSearch(''); setMenu(null); telegram?.HapticFeedback?.impactOccurred('light'); }
  function saved(message: string, section?: Section, deletedId?: string) {
    setDialog(null); setToast(message);
    if (section) {
      setTrail(value => value.map(item => item.id === section.id ? { ...item, ...section } : item));
      if (parent?.id === section.id) void detail.mutate({ section }, { revalidate: false });
    }
    if (deletedId) { const index = trail.findIndex(item => item.id === deletedId); if (index >= 0) navigate(trail.slice(0, index)); }
    void catalog.refresh(); telegram?.HapticFeedback?.notificationOccurred('success');
  }

  if (authLoading) return <main className="gate"><div className="gate-logo"><Car size={32} /></div><LoaderCircle className="spin" size={23} /><p>پشکنینی دەستگەیشتن...</p></main>;
  if (!user) return <main className="gate"><div className="gate-logo"><Car size={34} /></div><span className="overline">SAYARA STUDIO</span><h1>{authError ? 'دەستگەیشتن سنووردارە' : 'ستۆدیۆکەت، لە تێلیگرام'}</h1><p>{authError || 'بۆ بەڕێوەبردنی بەشەکان، ستۆدیۆ لە ناو بۆتی تێلیگرام بکەرەوە.'}</p><div className="gate-note"><LockKeyhole size={16} /><span>تەنها بۆ بەڕێوەبەرە ڕێپێدراوەکان</span></div><span className="gate-foot">Catalog Studio · سەیارە</span></main>;

  return <div className="studio">
    <header className="studio-header"><div className="header-inner"><div className="studio-brand"><span className="brand-symbol"><Car size={23} strokeWidth={1.6} /></span><div><strong>سەیارە <span>ستۆدیۆ</span></strong><small>CATALOG STUDIO</small></div></div><div className="admin-chip"><ShieldCheck size={15} /><span>{user.first_name}</span><i /></div></div><div className="header-caption"><span>کاتەلۆگەکەت، بە شێوەی خۆت.</span><small>ڕێکخستنێکی ئاسان. هەڵبژاردنێکی باشتر.</small></div></header>
    <main className="studio-main">
      <div className="root-tabs" role="tablist" aria-label="بەشە سەرەکییەکان">{ROOTS.map(item => <button key={item.key} role="tab" aria-selected={root === item.key} className={root === item.key ? 'root-tab active' : 'root-tab'} onClick={() => { setRoot(item.key); navigate([]); }}>{item.key === 'parts' ? <Wrench size={17} /> : <Sparkles size={17} />}{item.name}</button>)}</div>
      <nav className="breadcrumbs" aria-label="ڕێڕەوی بەشەکان"><button onClick={() => navigate([])} className={!trail.length ? 'current' : ''}>{rootInfo.name}</button>{trail.map((item, index) => <span key={item.id}><ChevronLeft size={13} /><button className={index === trail.length - 1 ? 'current' : ''} onClick={() => navigate(trail.slice(0, index + 1))}>{item.name}</button></span>)}</nav>
      <div className="page-title-row"><div className="page-title">{trail.length > 0 && <button className="icon-button back" onClick={() => navigate(trail.slice(0, -1))} aria-label="گەڕانەوە"><ArrowRight size={20} /></button>}<div><span className="overline">{trail.length ? 'ژێربەشەکان' : 'بەشەکان'}</span><h1>{currentItem?.name || rootInfo.name}</h1></div></div>{!parent?.is_terminal && <button className="primary-button" onClick={() => setDialog({ kind: 'create' })}><Plus size={19} /><span>بەشی نوێ</span></button>}</div>
      <p className="page-description">{parent?.is_terminal ? 'کاڵای کۆتایی' : parent?.description || 'بەشێک دروست بکە، پاشان ژێربەشەکانی لە ناویدا ڕێک بخە.'}</p>
      {parent?.is_terminal && currentItem ? <>
        {error && <div className="error-box" role="alert">{error}</div>}
        <ProductDetail section={currentItem} onEdit={() => setDialog({ kind: 'edit', section: currentItem })} />
      </> : <>
      <div className="list-toolbar"><label className="search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="گەڕان لەم بەشەدا..." maxLength={100} aria-label="گەڕان لەم بەشەدا" />{search && <button onClick={() => setSearch('')} aria-label="سڕینەوە"><X size={16} /></button>}</label><button className="icon-button refresh" onClick={() => void load()} disabled={loading} aria-label="نوێکردنەوە"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></div>
      {error && <div className="error-box" role="alert">{error}<button onClick={() => void load()}>هەوڵدانەوە</button></div>}
      <div className="section-grid" aria-busy={loading}>
        {!sections.length && loading ? [1, 2, 3].map(item => <div className="skeleton" key={item} />) : null}
        {!sections.length && !loading && !error ? <div className="empty-state"><div className="empty-glyph"><FolderPlus size={36} strokeWidth={1.2} /></div><h2>{search ? 'هیچ بەشێک نەدۆزرایەوە' : 'لێرەوە دەست پێ بکە'}</h2><p>{search ? 'ناوێکی دیکە تاقی بکەرەوە.' : `یەکەم ${trail.length ? 'ژێربەش' : 'بەش'} زیاد بکە. هەر بەشێک دەتوانێت ژێربەشی خۆی هەبێت.`}</p>{!search && <button className="subtle-button" onClick={() => setDialog({ kind: 'create' })}><Plus size={17} />زیادکردنی یەکەم بەش</button>}</div> : null}
        {sections.map(section => <article className="section-row" key={section.id}>
          <button className="section-open" onClick={() => navigate([...trail, section])}><span className="section-glyph">{section.is_terminal && section.image_url ? <img src={section.image_url} alt="" loading="lazy" decoding="async" /> : <Glyph icon={section.icon} />}</span><span className="section-text"><strong dir="auto">{section.name}</strong><small dir={section.is_terminal ? "ltr" : "auto"}>{section.is_terminal ? [formatPrice(section.price_usd, "USD"), formatPrice(section.price_iqd, "IQD")].filter(Boolean).join(" · ") : section.description || 'بینینی ژێربەشەکان'}</small></span><ChevronLeft size={18} className="row-arrow" /></button>
          <div className="row-actions"><button className="icon-button more-button" aria-label={`هەڵبژاردەکانی ${section.name}`} aria-expanded={menu === section.id} onClick={event => { event.stopPropagation(); setMenu(menu === section.id ? null : section.id); }}><MoreHorizontal size={20} /></button>{menu === section.id && <div className="context-menu"><button onClick={() => { setDialog({ kind: 'edit', section }); setMenu(null); }}><Pencil size={15} />دەستکاری</button><button className="danger-text" onClick={() => { setDialog({ kind: 'delete', section }); setMenu(null); }}><Trash2 size={15} />سڕینەوە</button></div>}</div>
        </article>)}
      </div>
      {hasMore && <button className="load-more" disabled={loading} onClick={() => void load(true)}>{loading ? <LoaderCircle size={17} className="spin" /> : 'بینینی زیاتر'}</button>}
      </>}
      <footer className="studio-footer"><Layers3 size={14} /><span>بەش و ژێربەش، بەبێ سنووری ئاست</span></footer>
    </main>
    {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
    {dialog && <SectionDialog dialog={dialog} root={root} parent={parent?.id || null} onClose={() => setDialog(null)} onSaved={saved} />}
  </div>;
}
