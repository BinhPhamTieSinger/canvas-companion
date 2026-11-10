import { BackgroundRepository } from '../../src/background/repository.js';
import { SCOPE, defaultRecord, assetId } from '../../src/background/model.js';
import { BackgroundRenderer, OWNER } from '../../src/background/renderer.js';
const results = [];
const check = (condition, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
async function test(name, fn) {
  try { await fn(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.message }); }
  const li = document.createElement('li'); const last = results.at(-1);
  li.className = last.passed ? 'pass' : 'fail'; li.textContent = `${last.passed ? 'PASS' : 'FAIL'} · ${name}${last.error ? `: ${last.error}` : ''}`;
  document.getElementById('results').append(li);
}
const repo = new BackgroundRepository(`canvas-companion-test-${crypto.randomUUID()}`);
const pixel = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII='), c => c.charCodeAt(0))], { type: 'image/png' });
const id = await assetId(pixel);
const custom = { ...defaultRecord(), mode: 'custom', source: { kind: 'asset', id } };
await test('default read does not create a saved record', async () => {
  check((await repo.read()).revision === 0);
  const db = await repo.open(); check(await count(db, 'backgrounds') === 0);
});
let record;
await test('uploaded image and canonical configuration commit together', async () => {
  record = await repo.save(custom, 0, pixel);
  check(record.revision === 1 && (await repo.asset(id)).blob.size === pixel.size);
});
await test('repeated upload reuses the same asset and scope record', async () => {
  record = await repo.save({ ...custom, visual: { ...custom.visual, blur: 3 } }, record.revision, pixel);
  const db = await repo.open(); check(await count(db, 'assets') === 1 && await count(db, 'backgrounds') === 1);
});
await test('concurrent windows reject the stale edit instead of overwriting', async () => {
  const second = new BackgroundRepository(repo.name);
  const edits = await Promise.allSettled([repo.save({ ...custom, visual: { ...custom.visual, x: 10 } }, record.revision), second.save({ ...custom, visual: { ...custom.visual, x: 90 } }, record.revision)]);
  check(edits.filter(result => result.status === 'fulfilled').length === 1);
  check(edits.find(result => result.status === 'rejected').reason.name === 'ConflictError');
  record = await repo.read(); (await second.open()).close();
});
await test('a reopened repository preserves the committed configuration', async () => {
  const db = await repo.open(); db.close(); repo.database = null;
  const loaded = await repo.read(); check(loaded.revision === record.revision && loaded.source.id === id);
});
let backup;
await test('backup contains one referenced image and passes restore checks', async () => {
  backup = await repo.export(); check(backup.assets.length === 1 && backup.assets[0].id === id);
  record = await repo.import(backup, record.revision); check(record.source.id === id);
});
await test('corrupt backup leaves the committed configuration untouched', async () => {
  const before = record.revision;
  const broken = structuredClone(backup); broken.assets[0].data = btoa('corrupt');
  let rejected = false; try { await repo.import(broken, before); } catch { rejected = true; }
  check(rejected && (await repo.read()).revision === before);
});
await test('remove drops the active image reference and retains reversible recovery', async () => {
  record = await repo.save({ scope: SCOPE, mode: 'off' }, record.revision);
  check(!record.source && (await repo.recovery()).source.id === id);
});
await test('undo restores the previous image without reuploading', async () => {
  record = await repo.restore(record.revision); check(record.source.id === id && Boolean(await repo.asset(id)));
});
await test('unreferenced assets are removed once they leave the recovery window', async () => {
  record = await repo.save({ scope: SCOPE, mode: 'off' }, record.revision);
  record = await repo.save({ scope: SCOPE, mode: 'inherit' }, record.revision);
  check(await count(await repo.open(), 'assets') === 0);
});
const frame = document.getElementById('dashboard');
await new Promise(resolve => {
  frame.onload = resolve;
  frame.srcdoc = `<!doctype html><html><head><style>:root{--bcbackground-image:none;--bcbackground-0:#e8eadf;--bctext-0:#202c2a}body{font:16px system-ui;background:#e8eadf}#application{min-height:340px;padding:25px}.card{background:#ffffffdd;border:1px solid #becabd;border-radius:16px;padding:20px;max-width:420px}html::before{content:"";position:fixed;inset:0;pointer-events:none}</style></head><body><div id="application" class="ic-app"><h2>Canvas dashboard fixture</h2><div class="card"><h3>Your course card stays intact</h3><p>Synthetic data only. One background layer behind existing content.</p><a href="#fixture">Existing Canvas link</a></div></div></body></html>`;
});
const doc = frame.contentDocument;
let status;
const renderer = new BackgroundRenderer(doc, { onStatus: value => { status = value; } });
const url = URL.createObjectURL(pixel);
await test('real image load creates exactly one accessible-safe background layer', async () => {
  await renderer.render(custom, url);
  check(status.kind === 'ready' && doc.querySelectorAll('#canvas-companion-background-layer').length === 1);
  check(doc.querySelector('#canvas-companion-background-layer').getAttribute('aria-hidden') === 'true');
  check(doc.querySelector('.card a').textContent === 'Existing Canvas link');
});
await test('rerender and visual changes reuse the layer without duplicate image nodes', async () => {
  await renderer.render({ ...custom, visual: { ...custom.visual, fit: 'contain', brightness: 80, blur: 2 } }, url);
  check(doc.querySelectorAll('#canvas-companion-background-layer img').length === 1);
  check(doc.defaultView.getComputedStyle(renderer.image).objectFit === 'contain');
  check(renderer.image.style.filter.includes('brightness(0.8)'));
});
await test('Canvas shell replacement remounts the image rather than leaving an empty layer', async () => {
  renderer.layer.remove();
  await renderer.render(custom, url);
  check(renderer.image.isConnected && renderer.image.complete && renderer.image.naturalWidth > 0);
  check(doc.querySelectorAll('#canvas-companion-background-layer').length === 1);
});
await test('shell backgrounds are suppressed only while this renderer owns them', async () => {
  check(doc.defaultView.getComputedStyle(doc.body).backgroundImage === 'none');
  check(doc.documentElement.hasAttribute(OWNER));
  await renderer.render({ ...defaultRecord(), mode: 'off' });
  check(!doc.documentElement.hasAttribute(OWNER) && !doc.getElementById('canvas-companion-background-layer'));
  check(doc.defaultView.getComputedStyle(doc.body).backgroundColor === 'rgb(232, 234, 223)');
});
const originalLoad = renderer.load.bind(renderer);
await test('inherited unfiltered image and gradient overlay use one image owner', async () => {
  doc.documentElement.style.setProperty('--bcbackground-image', 'linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)), url("https://example.invalid/fixture.png")');
  renderer.load = () => originalLoad(url);
  await renderer.render(defaultRecord());
  check(status.kind === 'ready' && renderer.image.isConnected);
  check(renderer.overlay.style.backgroundImage.includes('linear-gradient'));
  check(doc.querySelectorAll('#canvas-companion-background-layer').length === 1);
});
await test('switching the theme/filter updates the same inherited image layer', async () => {
  doc.documentElement.style.setProperty('--bcbackground-image-layer', 'url("https://example.invalid/fixture.png")');
  doc.documentElement.style.setProperty('--bcbackground-image-filter', 'brightness(0.7)');
  await renderer.render(defaultRecord());
  check(renderer.image.style.filter === 'brightness(0.7)' && doc.querySelectorAll('#canvas-companion-background-layer').length === 1);
});
await test('removing the inherited theme image removes obsolete renderer ownership', async () => {
  doc.documentElement.style.setProperty('--bcbackground-image', 'none');
  doc.documentElement.style.setProperty('--bcbackground-image-layer', 'none');
  await renderer.render(defaultRecord());
  check(status.kind === 'idle' && !doc.documentElement.hasAttribute(OWNER));
});
await test('unavailable custom image shows fallback without changing the saved record', async () => {
  renderer.load = async () => { throw new Error('Synthetic unavailable image'); };
  const input = structuredClone(custom);
  await renderer.render(input, 'blob:invalid');
  check(status.kind === 'error' && !renderer.image.hasAttribute('src'));
  check(input.source.id === id && renderer.layer.style.backgroundColor === 'rgb(245, 245, 245)');
});
await test('late image completion cannot repaint after removing the background', async () => {
  let finish;
  renderer.load = () => new Promise(resolve => { finish = resolve; });
  const painting = renderer.render(custom, url);
  await renderer.render({ ...defaultRecord(), mode: 'off' });
  finish(new doc.defaultView.Image()); await painting;
  check(!doc.documentElement.hasAttribute(OWNER));
});
renderer.destroy(); URL.revokeObjectURL(url);
(await repo.open()).close(); indexedDB.deleteDatabase(repo.name);
const failures = results.filter(result => !result.passed);
document.getElementById('summary').textContent = `${results.length - failures.length}/${results.length} browser checks passed${failures.length ? ` · ${failures.length} failed` : ' · no failures'}`;
document.getElementById('summary').dataset.result = failures.length ? 'failed' : 'passed';
document.getElementById('machine-results').textContent = JSON.stringify({ results }, null, 2);
async function count(db, store) { return new Promise((resolve, reject) => { const req = db.transaction(store).objectStore(store).count(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
