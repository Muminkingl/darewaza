import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ImagePlus, LoaderCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { normalizePrice, SECTION_ICONS, type RootKey, type Section, type SectionIcon } from '../../shared/catalog';
import { api, ApiError, telegram } from './telegram';
import { Glyph, iconNames } from './catalogIcons';
import { prepareImage, uploadImage, type PreparedImage } from './images';

export type Dialog = { kind: 'create' } | { kind: 'edit'; section: Section } | { kind: 'delete'; section: Section };
interface Props { dialog: Dialog; root: RootKey; parent: string | null; onClose: () => void; onSaved: (message: string, section?: Section, deletedId?: string) => void }
export function SectionDialog({ dialog, root, parent, onClose, onSaved }: Props) {
  const initial = dialog.kind !== 'create' ? dialog.section : null;
  const [id] = useState(() => initial?.id || crypto.randomUUID());
  const [existing, setExisting] = useState(initial);
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [icon, setIcon] = useState<SectionIcon>(initial?.icon || 'folder');
  const [position, setPosition] = useState(String(initial?.position || 0));
  const [terminal, setTerminal] = useState(initial?.is_terminal || false);
  const [usd, setUsd] = useState(initial?.price_usd || '');
  const [iqd, setIqd] = useState(initial?.price_iqd || '');
  const [imagePath, setImagePath] = useState(initial?.image_path || null);
  const [imageUrl, setImageUrl] = useState(initial?.image_url || null);
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<Section | null>(null);
  const live = useRef(true);
  const uploadedPaths = useRef(new Set<string>());
  const saveGuard = useRef(false);
  const uploaded = useRef<{ blob: Blob; path: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleting = dialog.kind === 'delete';

  useEffect(() => {
    live.current = true; dialogRef.current?.showModal();
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', beforeUnload); telegram?.enableClosingConfirmation?.();
    return () => {
      window.removeEventListener('beforeunload', beforeUnload); telegram?.disableClosingConfirmation?.();
      live.current = false;
      for (const path of uploadedPaths.current) void api('images', { method: 'DELETE', body: JSON.stringify({ path }) }).catch(() => {});
    };
  }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setPreparing(true); setError('');
    try { const prepared = await prepareImage(file); if (live.current) setPhoto(prepared); else URL.revokeObjectURL(prepared.preview); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to prepare this image.'); }
    finally { setPreparing(false); }
  }
  function reloadConflict() {
    if (!conflict) return;
    setExisting(conflict); setName(conflict.name); setDescription(conflict.description); setIcon(conflict.icon); setPosition(String(conflict.position));
    setTerminal(conflict.is_terminal); setUsd(conflict.price_usd || ''); setIqd(conflict.price_iqd || ''); setImagePath(conflict.image_path); setImageUrl(conflict.image_url || null); setPhoto(null); setError(''); setConflict(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saveGuard.current || preparing) return;
    saveGuard.current = true; setSaving(true); setError(''); setConflict(null);
    try {
      if (deleting) {
        await api('sections', { method: 'DELETE', body: JSON.stringify({ id, version: existing!.version }) });
        onSaved('بەشەکە سڕایەوە', undefined, id); return;
      }
      let path = terminal ? imagePath : null;
      if (terminal && photo) {
        if (uploaded.current?.blob !== photo.blob) {
          setUploading(true);
          const result = await uploadImage(id, photo.blob); uploaded.current = { blob: photo.blob, path: result.path }; uploadedPaths.current.add(result.path);
          setUploading(false);
        }
        path = uploaded.current!.path;
      }
      const result = await api<{ section: Section }>('sections', { method: existing ? 'PATCH' : 'POST', body: JSON.stringify({
        id, name, description, icon, position: Number(position), is_terminal: terminal,
        price_usd: terminal && usd.trim() ? normalizePrice(usd) : null, price_iqd: terminal && iqd.trim() ? normalizePrice(iqd) : null, image_path: path,
        ...(existing ? { version: existing.version } : { root_key: root, parent_id: parent }),
      }) });
      onSaved(existing ? 'گۆڕانکارییەکان پاشەکەوت کران' : 'بەشە نوێیەکە زیاد کرا', result.section);
      telegram?.HapticFeedback?.notificationOccurred('success');
    } catch (error) {
      if (deleting && error instanceof ApiError && error.status === 404) { onSaved('بەشەکە سڕایەوە', undefined, id); return; }
      if (error instanceof ApiError && error.status === 409 && error.data.section) setConflict(error.data.section as Section);
      setError(error instanceof Error ? error.message : 'Unable to save.'); telegram?.HapticFeedback?.notificationOccurred('error');
    } finally { setSaving(false); setUploading(false); saveGuard.current = false; }
  }

  return <dialog ref={dialogRef} className="section-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <form onSubmit={submit}><div className="dialog-handle" /><div className="dialog-heading"><div><span className="overline">DAREWAZA STUDIO</span><h2 id="dialog-title">{deleting ? 'سڕینەوەی بەش' : existing ? 'دەستکاری بەش' : 'بەشێکی نوێ'}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="داخستن"><X size={21} /></button></div>
      {deleting ? <div className="delete-warning"><span className="delete-icon"><Trash2 size={26} /></span><p>دڵنیایت لە سڕینەوەی «{existing?.name}»؟</p><small>هەموو ژێربەشەکانی ناویشی دەسڕێنەوە. ئەم کارە ناگەڕێتەوە.</small></div> : <fieldset className="dialog-fields" disabled={saving}>
        <label className="field">ناوی بەش <span>*</span><input autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="بۆ نموونە: BMW" dir="auto" /></label>
        <label className="field">وەسف <small>ئارەزوومەندانە</small><textarea maxLength={500} rows={2} value={description} onChange={event => setDescription(event.target.value)} placeholder="وەسفێکی کورت بۆ ئەم بەشە..." dir="auto" /></label>
        <label className={`terminal-switch ${terminal ? 'is-on' : ''}`}><span><strong>ئەمە کاڵای کۆتاییە</strong><small>{existing?.has_children ? 'ئەم بەشە ژێربەشی هەیە؛ ناتوانێت کۆتایی بێت.' : 'بێ ژێربەش، لەگەڵ نرخ و وێنە'}</small></span><input type="checkbox" role="switch" checked={terminal} disabled={existing?.has_children} onChange={event => setTerminal(event.target.checked)} /><span className="switch-track" aria-hidden="true" /></label>
        {terminal && <div className="product-fields">
          <div className="price-fields"><label className="field">نرخ بە دۆلار <span className="currency-symbol">$</span><input inputMode="decimal" maxLength={20} value={usd} onChange={event => setUsd(event.target.value)} placeholder="0.00" dir="ltr" aria-label="نرخ بە دۆلار" /></label><label className="field">نرخ بە دینار <span className="currency-symbol">د.ع</span><input inputMode="numeric" maxLength={20} value={iqd} onChange={event => setIqd(event.target.value)} placeholder="0" dir="ltr" aria-label="نرخ بە دینار" /></label></div><p className="field-hint">دەتوانیت یەک نرخ یان هەردووکیان بنووسیت.</p>
          {(photo?.preview || imageUrl) && <div className="upload-preview"><img src={photo?.preview || imageUrl!} alt="پێشبینینی وێنەی کاڵا" /><button type="button" className="remove-photo" onClick={() => { setPhoto(null); setImagePath(null); setImageUrl(null); }} aria-label="سڕینەوەی وێنە"><X size={17} /></button></div>}
          <label className="photo-upload"><input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" aria-label="هەڵبژاردنی وێنە" disabled={preparing} onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />{preparing ? <LoaderCircle size={23} className="spin" /> : <ImagePlus size={24} strokeWidth={1.5} />}<span>{preparing ? 'وێنەکە ئامادە دەکرێت...' : photo || imageUrl ? 'گۆڕینی وێنە' : 'زیادکردنی وێنەی کاڵا'}<small>وێنەکە پێش بارکردن بچووک دەکرێتەوە.</small></span></label>
        </div>}
        <fieldset className="icon-field"><legend>ئایکۆنی بەش</legend><div className="icon-options">{SECTION_ICONS.map(value => <button type="button" key={value} className={icon === value ? 'selected' : ''} onClick={() => setIcon(value)} aria-label={iconNames[value]} aria-pressed={icon === value}><Glyph icon={value} size={21} /></button>)}</div></fieldset>
        <label className="field position-field">ڕیزبەندی <input type="number" min={0} max={2147483647} step={1} required value={position} onChange={event => setPosition(event.target.value)} /><small>ژمارەی بچووکتر لە سەرەوە دەردەکەوێت.</small></label>
      </fieldset>}
      {error && <div className="error-box" role="alert"><span>{error}</span>{conflict && <button type="button" onClick={reloadConflict}><RefreshCw size={14} />بارکردنی وەشانی نوێ</button>}</div>}
      <div className="dialog-actions"><button type="submit" className={deleting ? 'primary-button danger-button' : 'primary-button'} disabled={saving || preparing || (!deleting && (!name.trim() || (terminal && !usd.trim() && !iqd.trim())))}>{saving ? <LoaderCircle size={18} className="spin" /> : deleting ? <Trash2 size={17} /> : <Check size={18} />}{deleting ? 'بەڵێ، بیسڕەوە' : uploading ? 'وێنەکە بار دەکرێت...' : saving ? 'پاشەکەوت دەکرێت...' : 'پاشەکەوتکردن'}</button><button type="button" className="cancel-button" onClick={onClose} disabled={saving}>پاشگەزبوونەوە</button></div>
    </form>
  </dialog>;
}
