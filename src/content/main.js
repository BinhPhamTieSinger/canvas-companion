import { BackgroundRenderer } from '../background/renderer.js';
import { AcademicController } from '../academic/widget.js';
import { isDashboard, backgroundApplies } from '../background/model.js';

const marker = '__canvasCompanionBackgroundV1';
if (!globalThis[marker]) {
  globalThis[marker] = true;
  const academic = new AcademicController(document);
  void academic.route();
  let snapshot, objectUrl, assetKey, busy = false, queued = false;
  const renderer = new BackgroundRenderer(document, { onStatus(status) {
    document.documentElement.dataset.canvasCompanionStatus = status.kind;
  } });
  function releaseAsset() { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = assetKey = null; }
  async function refresh() {
    if (busy) { queued = true; return; }
    busy = true;
    try {
      const reply = await chrome.runtime.sendMessage({ namespace: 'canvas-companion', action: 'read' });
      if (!reply?.ok) throw new Error('Background settings are unavailable.');
      snapshot = reply.data;
      if (!backgroundApplies(location,snapshot.record)) { renderer.clear(); releaseAsset(); return; }
      if (snapshot.asset?.id !== assetKey) {
        releaseAsset();
        if (snapshot.asset) {
          const bytes = Uint8Array.from(atob(snapshot.asset.data), c => c.charCodeAt(0));
          objectUrl = URL.createObjectURL(new Blob([bytes], { type: snapshot.asset.type }));
          assetKey = snapshot.asset.id;
        }
      }
      await renderer.render(snapshot.record, objectUrl);
    } catch { renderer.clear(); document.documentElement.dataset.canvasCompanionStatus = 'error'; }
    finally { busy = false; if (queued) { queued = false; void refresh(); } }
  }
  let scheduled;
  const schedule = () => { clearTimeout(scheduled); scheduled = setTimeout(refresh, 120); };
  const changed = (changes, area) => { if (area === 'local' && changes.backgroundRevision) schedule(); };
  chrome.storage.onChanged.addListener(changed);
  window.addEventListener('focus', () => { schedule(); void academic.focus(); });
  window.addEventListener('popstate', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { schedule(); void academic.focus(); } });
  // Observe theme sheet changes and shell replacement, not the entire academic DOM subtree.
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const target = record.target.nodeType === 3 ? record.target.parentElement : record.target;
      return target?.id !== 'canvas-companion-background-style' && !target?.closest?.('#canvas-companion-background-layer');
    })) schedule();
  });
  observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  observer.observe(document.body, { childList: true });
  let path = location.pathname;
  const navigationTimer = setInterval(() => {
    if (!chrome.runtime?.id) { observer.disconnect(); clearInterval(navigationTimer); clearTimeout(scheduled); renderer.destroy(); academic.destroy();document.getElementById('canvas-companion-timetable-link')?.remove(); releaseAsset(); return; }
    void academic.route();
    if(!document.getElementById('canvas-companion-timetable-link')){const link=document.createElement('a');link.id='canvas-companion-timetable-link';link.href='/#canvas-companion-academic';link.textContent='Timetable';link.style.cssText='position:fixed;right:22px;bottom:18px;z-index:90;background:#162235df;color:#9cdcfe;border:1px solid #9cdcfe66;border-radius:20px;padding:9px 16px;font:600 13px system-ui;text-decoration:none;box-shadow:0 4px 18px #0004';document.body.append(link);}
    if (path !== location.pathname) { path = location.pathname; schedule(); }
    else if (backgroundApplies(location,snapshot?.record) && snapshot?.record.mode !== 'off' && renderer.layer && !renderer.layer.isConnected) schedule();
  }, 1000);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    observer.disconnect(); clearInterval(navigationTimer); clearTimeout(scheduled);
    chrome.storage?.onChanged?.removeListener(changed); renderer.destroy(); academic.destroy();document.getElementById('canvas-companion-timetable-link')?.remove(); releaseAsset();
  }, { once: true });
  void refresh();
}
