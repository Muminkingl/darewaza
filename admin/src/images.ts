import { api } from './telegram';
import { MAX_IMAGE_BYTES } from '../../shared/catalog';

export interface PreparedImage { blob: Blob; preview: string }
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('تکایە وێنەی JPG، PNG یان WebP هەڵبژێرە.');
  if (file.size > 15 * 1024 * 1024) throw new Error('تکایە وێنەیەکی بچووکتر لە ١٥ مێگابایت هەڵبژێرە.');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare this image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to prepare this image.')), 'image/webp', 0.82));
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('تکایە وێنەیەکی بچووکتر هەڵبژێرە.');
    return { blob, preview: URL.createObjectURL(blob) };
  } finally { URL.revokeObjectURL(source); }
}

export async function uploadImage(sectionId: string, image: Blob) {
  const signed = await api<{ path: string; signedUrl: string; publicUrl: string }>('images', { method: 'POST', body: JSON.stringify({ section_id: sectionId, type: image.type, size: image.size }) });
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45000);
  try {
    const data = new FormData(); data.append('cacheControl', '31536000'); data.append('', image);
    const result = await fetch(signed.signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: data, signal: controller.signal });
    if (!result.ok) throw new Error('وێنەکە بار نەکرا. تکایە دووبارە هەوڵ بدە.');
    return signed;
  } finally { clearTimeout(timer); }
}
