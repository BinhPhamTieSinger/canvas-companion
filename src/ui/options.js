import {runtimeAvailable,subscribeStorage,RELOAD_MESSAGE} from '../runtime.js';
const embedded=new URLSearchParams(location.search);if(embedded.get('embedded')==='1'){document.documentElement.dataset.embedded=embedded.get('theme')||'auto';}
import { SCOPE, configuration, assetId, visual } from '../background/model.js';
const $ = id => document.getElementById(id);
const fields = ['fit', 'x', 'y', 'scale', 'brightness', 'blur', 'overlay', 'opacity', 'fallback'];
let current, pendingUpload = null, selectedAsset = null, previewUrl = null, savedAssetUrl = null;
let dirty = false, busy = false, selecting = 0, validatingUpload = false;
function status(message, kind = 'info') { $('status').textContent = message; $('status').dataset.kind = kind; }
async function rpc(action, data = {}) {
  if(!runtimeAvailable(globalThis.chrome))throw new Error(RELOAD_MESSAGE);
  const response = await chrome.runtime.sendMessage({ namespace: 'canvas-companion', action, ...data });
  if (!response?.ok) throw new Error(response?.error || 'Canvas Companion is unavailable. Reload this settings page.');
  return response.data;
}
function release() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  if (savedAssetUrl) URL.revokeObjectURL(savedAssetUrl);
  previewUrl = savedAssetUrl = null;
}
async function load() {
  const snapshot = await rpc('read');
  release();
  current = snapshot.record; pendingUpload = selectedAsset = null; dirty = false;
  $('mode').value = current.mode;
  $('pages').value = current.appearance?.pages || 'dashboard';
  $('surface').value = current.appearance?.surface || 'original';
  $('url').value = current.source?.kind === 'url' ? current.source.url : '';
  $('upload').value = '';
  if (snapshot.asset) {
    const blob = new Blob([Uint8Array.from(atob(snapshot.asset.data), c => c.charCodeAt(0))], { type: snapshot.asset.type });
    savedAssetUrl = URL.createObjectURL(blob); selectedAsset = snapshot.asset.id;
  }
  $('asset-label').textContent = selectedAsset ? 'Using your saved local image.' : 'PNG, JPEG, WebP, GIF, or AVIF · up to 8 MB';
  for (const key of fields) $(key).value = current.visual[key];
  $('restore').disabled = !snapshot.canRestore;
  $('settings').hidden = false;
  preview();
  status('Ready. Changes are saved only when you choose Save.');
}
function values() {
  return visual(Object.fromEntries(fields.map(key => [key, ['fit', 'overlay', 'fallback'].includes(key) ? $(key).value : Number($(key).value)])));
}
function config() {
  return configuration({ scope: SCOPE, mode: $('mode').value, appearance:{pages:$('pages').value,surface:$('surface').value}, visual: values(), source: selectedAsset ? { kind: 'asset', id: selectedAsset } : { kind: 'url', url: $('url').value } });
}
function preview() {
  $('custom').hidden = $('mode').value !== 'custom';
  const v = values();
  for (const key of ['x','y','scale','brightness','blur','opacity']) $(`${key}-value`).textContent = `${v[key]}${key === 'blur' ? 'px' : '%'}`;
  $('preview').style.backgroundColor = v.fallback;
  const image = $('preview-image');
  image.style.objectFit = v.fit; image.style.objectPosition = `${v.x}% ${v.y}%`;
  image.style.transform = `scale(${v.scale / 100})`; image.style.filter = `brightness(${v.brightness / 100}) blur(${v.blur}px)`;
  $('preview-overlay').style.backgroundColor = v.overlay; $('preview-overlay').style.opacity = v.opacity / 100;
}
function showSource() {
  const url = previewUrl || savedAssetUrl || $('url').value.trim();
  if (url && (url.startsWith('blob:') || url.startsWith('https://'))) $('preview-image').src = url;
  else $('preview-image').removeAttribute('src');
}
async function withBusy(action) {
  if (busy || validatingUpload) return;
  busy = true;
  const controls = [...document.querySelectorAll('button,input,select')];
  const previous = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  try { await action(); }
  catch (error) { status(error.message, 'error'); }
  finally {
    controls.forEach((control, index) => { control.disabled = previous[index]; });
    busy = false;
    // Refresh recovery availability without overwriting an unsaved draft.
    rpc('read').then(snapshot => { $('restore').disabled = !snapshot.canRestore; }).catch(() => {});
  }
}
$('settings').addEventListener('input', event => {
  dirty = true;
  if (event.target.id === 'url') {
    selecting++; validatingUpload = false; $('save').disabled = busy;
    selectedAsset = pendingUpload = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
    if (savedAssetUrl) URL.revokeObjectURL(savedAssetUrl); savedAssetUrl = null;
    $('upload').value = ''; $('asset-label').textContent = 'Using an image URL.';
  }
  preview();
});
// URL preview starts on field change, avoiding requests on every keystroke.
$('url').addEventListener('change', showSource);
$('mode').addEventListener('change', () => { if ($('mode').value === 'custom') showSource(); });
$('upload').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const token = ++selecting;
  validatingUpload = true; $('save').disabled = true;
  try {
    const id = await assetId(file);
    const url = URL.createObjectURL(file);
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { URL.revokeObjectURL(url); throw new Error('This file could not be decoded as an image.'); }
    if (token !== selecting) { URL.revokeObjectURL(url); return; }
    release(); previewUrl = url; selectedAsset = id; pendingUpload = file;
    $('url').value = ''; $('asset-label').textContent = 'Local image selected. Save to keep it.';
    dirty = true; showSource(); status('Image ready to preview.');
  } catch (error) { if (token === selecting) { status(error.message, 'error'); $('upload').value = ''; } }
  finally { if (token === selecting) { validatingUpload = false; $('save').disabled = busy; } }
});
$('preview-image').addEventListener('error', () => { if ($('preview-image').hasAttribute('src')) status('The preview image could not load. Check the URL; the fallback color remains available.', 'error'); });
$('settings').addEventListener('submit', event => {
  event.preventDefault();
  void withBusy(async () => {
    const next = config();
    let upload = null;
    if (pendingUpload && next.source?.kind === 'asset') {
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('The image could not be read.')); reader.readAsDataURL(pendingUpload); });
      upload = { type: pendingUpload.type, data };
    }
    const saved = await rpc('save', { config: next, revision: current.revision, upload });
    await load(); showSource(); status(saved.warning || 'Background saved. Open Canvas tabs update automatically.', saved.warning ? 'info' : 'success');
  });
});
$('reload').addEventListener('click', () => void withBusy(async () => { selecting++; await load(); showSource(); }));
$('remove').addEventListener('click', () => void withBusy(async () => {
  await rpc('save', { config: { scope: SCOPE, mode: 'off', appearance:current.appearance, visual:current.visual }, revision: current.revision });
  await load(); status('Companion background removed. BetterCampus rendering is restored. Undo is available.', 'success');
}));
$('restore').addEventListener('click', () => void withBusy(async () => {
  await rpc('restore', { revision: current.revision }); await load(); showSource(); status('Previous background restored.', 'success');
}));
$('export').addEventListener('click', () => void withBusy(async () => {
  const backup = await rpc('export');
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'canvas-companion-background.json'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); status('Backup exported. It contains your saved choice, not an unsaved preview.');
}));
$('import').addEventListener('change', event => void withBusy(async () => {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 12 * 1024 * 1024) throw new Error('The backup is too large.');
  let backup;
  try { backup = JSON.parse(await file.text()); } catch { throw new Error('The backup is not valid JSON.'); }
  await rpc('import', { backup, revision: current.revision }); await load(); showSource(); status('Backup restored. Your previous companion choice is available through Undo.', 'success');
}));
const unsubscribe=subscribeStorage(globalThis.chrome,(changes, area) => {
  if (area === 'local' && changes.backgroundRevision && !busy) {
    if (dirty) status('Saved settings changed in another window. Discard changes to reload before saving.', 'error');
    else void load().then(showSource).catch(error => status(error.message, 'error'));
  }
});
window.addEventListener('pagehide',event=>{if(!event.persisted){unsubscribe();release();}});
void load().then(showSource).catch(error => status(error.message, 'error'));
