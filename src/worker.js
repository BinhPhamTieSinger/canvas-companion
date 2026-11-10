import { BackgroundRepository } from './background/repository.js';
import { ORIGIN, SCOPE, MAX_IMAGE_BYTES, MIME_TYPES } from './background/model.js';

const repository = new BackgroundRepository();
async function encode(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { type: blob.type, data: btoa(binary) };
}
function decode(upload) {
  if (!upload) return null;
  if (!MIME_TYPES.has(upload.type) || typeof upload.data !== 'string' || upload.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('The selected image is invalid or too large.');
  let binary;
  try { binary = atob(upload.data); } catch { throw new Error('The selected image could not be read.'); }
  return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: upload.type });
}
async function snapshot() {
  const record = await repository.read();
  let asset = null;
  if (record.source?.kind === 'asset') {
    const stored = await repository.asset(record.source.id);
    if (stored) asset = { id: stored.id, ...await encode(stored.blob) };
  }
  return { record, asset, canRestore: Boolean(await repository.recovery()) };
}
async function handle(message, sender) {
  if (sender.id !== chrome.runtime.id) throw new Error('Unsupported sender.');
  const settingsPage = sender.url?.startsWith(chrome.runtime.getURL('options.html'));
  let canvasPage = false;
  try { canvasPage = new URL(sender.url).origin === ORIGIN; } catch { /* no page URL */ }
  if (!settingsPage && !canvasPage) throw new Error('Unsupported page.');
  if (message.action === 'read') return snapshot();
  if (!settingsPage) throw new Error('Open Canvas Companion settings to make changes.');
  if (message.action === 'export') return repository.export();
  let record;
  if (message.action === 'save') record = await repository.save(message.config, message.revision, decode(message.upload));
  else if (message.action === 'restore') record = await repository.restore(message.revision);
  else if (message.action === 'import') record = await repository.import(message.backup, message.revision);
  else throw new Error('Unsupported command.');
  // The config is authoritative in IndexedDB. This is only a wake-up signal for open views.
  let warning = null;
  try { await chrome.storage.local.set({ backgroundRevision: { scope: SCOPE, revision: record.revision, at: Date.now() } }); }
  catch { warning = 'Saved locally. Reload other Canvas tabs if they do not update immediately.'; }
  return { ...await snapshot(), warning };
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.namespace !== 'canvas-companion') return;
  handle(message, sender).then(data => respond({ ok: true, data })).catch(error => {
    // Do not log URLs, uploads, academic data, or extension settings.
    respond({ ok: false, error: error.message || 'The background could not be updated.', conflict: error.name === 'ConflictError' });
  });
  return true;
});
