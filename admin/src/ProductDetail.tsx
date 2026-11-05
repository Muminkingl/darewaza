import { useRef, useState } from 'react';
import { ImageOff, Maximize2, Pencil, X } from 'lucide-react';
import { formatPrice, sectionName, type CatalogLocale, type Section } from '../../shared/catalog';

export function ProductDetail({ section, onEdit, locale = 'ckb' }: { section: Section; onEdit: () => void; locale?: CatalogLocale }) {
  const name = sectionName(section, locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const url = section.image_url;
  const showImage = url && failedImage !== url;
  return <section className="product-detail">
    <button className="product-hero" disabled={!showImage} onClick={() => dialog.current?.showModal()} aria-label="بینینی وێنە بە گەورەیی">
      {showImage ? <><img src={url} alt={name} decoding="async" onError={() => setFailedImage(url)} /><span className="image-expand"><Maximize2 size={17} /></span></> : <span className="no-product-image"><ImageOff size={36} strokeWidth={1.3} /><span>وێنە بەردەست نییە</span></span>}
    </button>
    {showImage&&section.image_kind==='generated'&&<p className="generated-image-note">وێنەی پێشبینینی دروستکراوە؛ پارچە و گونجانی لەگەڵ فرۆشیار پشتڕاست بکەرەوە.</p>}
    <div className="product-info"><div className="product-label"><span>کاڵای کۆتایی</span><button className="subtle-button" onClick={onEdit}><Pencil size={15} />دەستکاری</button></div><h2 dir="auto">{name}</h2>{section.description && <p dir="auto">{section.description}</p>}
      <div className="product-prices">{section.price_usd != null && <div><span>نرخ بە دۆلار</span><strong dir="ltr">{formatPrice(section.price_usd, 'USD')}</strong></div>}{section.price_iqd != null && <div><span>نرخ بە دینار</span><strong dir="ltr">{formatPrice(section.price_iqd, 'IQD')}</strong></div>}</div>{section.price_usd==null&&section.price_iqd==null&&<p className="field-hint">نرخ هێشتا دیاری نەکراوە.</p>}
    </div>
    <dialog ref={dialog} className="image-dialog" aria-label={name} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="image-dialog-close" onClick={() => dialog.current?.close()} aria-label="داخستن"><X size={24} /></button>{url && <img src={url} alt={name} />}</dialog>
  </section>;
}
