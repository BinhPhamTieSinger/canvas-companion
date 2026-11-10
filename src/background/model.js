export const ORIGIN = 'https://vinuni.instructure.com';
export const SCOPE = `${ORIGIN}|dashboard`;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
export const DEFAULT_VISUAL = Object.freeze({
  fit: 'cover', x: 50, y: 50, scale: 100, brightness: 100, blur: 0,
  overlay: '#000000', opacity: 0, fallback: '#f5f5f5',
});
export class ConflictError extends Error {
  constructor() { super('These settings changed in another window. Reload them before saving.'); this.name = 'ConflictError'; }
}
export function imageUrl(value) {
  if (typeof value !== 'string' || value.length > 8192) throw new Error('Enter a valid HTTPS image URL.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a complete HTTPS image URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS URL without embedded credentials.');
  return url.href;
}
function number(value, min, max, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}.`);
  return value;
}
function color(value) {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new Error('Use a six-digit hex color.');
  return value.toLowerCase();
}
export function visual(input = {}) {
  const v = { ...DEFAULT_VISUAL, ...input };
  if (!['cover', 'contain'].includes(v.fit)) throw new Error('Choose cover or contain.');
  return {
    fit: v.fit, x: number(v.x, 0, 100, 'horizontal position'), y: number(v.y, 0, 100, 'vertical position'),
    scale: number(v.scale, 100, 200, 'scale'), brightness: number(v.brightness, 0, 200, 'brightness'),
    blur: number(v.blur, 0, 30, 'blur'), overlay: color(v.overlay),
    opacity: number(v.opacity, 0, 100, 'overlay opacity'), fallback: color(v.fallback),
  };
}
export function configuration(input) {
  if (!input || input.scope !== SCOPE || !['inherit', 'custom', 'off'].includes(input.mode)) throw new Error('Unsupported background scope or mode.');
  const result = { scope: SCOPE, mode: input.mode, visual: visual(input.visual) };
  if (input.mode === 'custom') {
    if (input.source?.kind === 'url') result.source = { kind: 'url', url: imageUrl(input.source.url) };
    else if (input.source?.kind === 'asset' && /^[a-f0-9]{64}$/.test(input.source.id)) result.source = { kind: 'asset', id: input.source.id };
    else throw new Error('Choose an image URL or upload an image.');
  }
  return result;
}
export function defaultRecord() {
  return { ...configuration({ scope: SCOPE, mode: 'inherit' }), revision: 0 };
}
export function cssUrl(url) { return `url(${JSON.stringify(url)})`; }
export function isDashboard(location) { return location.origin === ORIGIN && /^\/(?:dashboard\/?)?$/.test(location.pathname); }
// Accept one CSS url() token. Reject multi-image backgrounds rather than guessing which layer to move.
export function singleCssImage(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^url\((?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^()\s"']+))\)$/);
  if (!match) return null;
  let raw = match[1] ?? match[2] ?? match[3];
  raw = raw.replace(/\\(["'\\()])/g, '$1');
  try { return imageUrl(raw); } catch { return null; }
}
export function backgroundLayers(value) {
  if (typeof value !== 'string') return null;
  const layers = [];
  let depth = 0, quote = null, escaped = false, start = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')') { if (--depth < 0) return null; }
    else if (char === ',' && depth === 0) { layers.push(value.slice(start, i).trim()); start = i + 1; }
  }
  if (quote || depth !== 0) return null;
  layers.push(value.slice(start).trim());
  const images = layers.map(singleCssImage).filter(Boolean);
  if (images.length > 1) return null;
  const overlays = layers.filter(layer => !singleCssImage(layer) && layer !== 'none' && layer !== 'transparent');
  if (overlays.some(layer => !/^(?:repeating-)?(?:linear|radial|conic)-gradient\(/.test(layer))) return null;
  return { url: images[0] || null, overlay: overlays.join(', ') || 'none' };
}
export async function assetId(blob) {
  if (!(blob instanceof Blob) || !MIME_TYPES.has(blob.type) || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) throw new Error('Choose a PNG, JPEG, WebP, GIF, or AVIF image up to 8 MB.');
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
}
