import { glassStyles } from './glass.js';
import { backgroundLayers, DEFAULT_VISUAL } from './model.js';

export const OWNER = 'data-canvas-companion-background';
const STYLE_ID = 'canvas-companion-background-style';
const LAYER_ID = 'canvas-companion-background-layer';
export class BackgroundRenderer {
  constructor(document, { onStatus = () => {} } = {}) {
    this.document = document;
    this.window = document.defaultView;
    this.onStatus = onStatus;
    this.generation = 0;
    this.layer = null;
    this.style = null;
    this.watched = false;
    this.last = null;
  }
  inherited() {
    const root = this.window.getComputedStyle(this.document.documentElement);
    const candidates = [root.getPropertyValue('--bcbackground-image-layer'), root.getPropertyValue('--bcbackground-image'), root.getPropertyValue('--bcbackground-0')];
    const filtered = backgroundLayers(candidates[0])?.url;
    const composite = backgroundLayers(candidates[1]);
    const source = filtered || composite?.url || backgroundLayers(candidates[2])?.url;
    if (!source) return null;
    return { url: source, overlay: composite?.overlay || 'none', filter: filtered ? root.getPropertyValue('--bcbackground-image-filter').trim() || 'none' : 'none' };
  }
  mount() {
    if (this.layer?.isConnected) return;
    this.document.getElementById(LAYER_ID)?.remove();
    this.document.getElementById(STYLE_ID)?.remove();
    this.style = this.document.createElement('style');
    this.style.id = STYLE_ID;
    this.style.textContent = `
      html[${OWNER}] body,
      html[${OWNER}] #application.ic-app { background-image: none !important; background-color: transparent !important; }
      html[${OWNER}]::before { content: none !important; background-image: none !important; }
      html[${OWNER}] { isolation: isolate; }
      #${LAYER_ID} { position: fixed !important; inset: 0 !important; z-index: -1 !important; pointer-events: none !important; overflow: hidden !important; }
      #${LAYER_ID} > div { position: absolute !important; inset: 0 !important; background-repeat: no-repeat !important; }
      html[${OWNER}][data-canvas-companion-surface=transparent] {
        color-scheme: dark; --bctext-0:#eef3fa;--bctext-1:#bdc9dc;--bcborders:#d5e2ff30;--bclinks-ungradient:#9cdcfe;
        --cc-surface:transparent;--cc-raised:#16223555;
        --ic-brand-font-color-dark:#eef3fa;--ic-link-color:#9cdcfe;--ic-brand-primary:#9cdcfe;
      }
      html[${OWNER}][data-canvas-companion-surface=transparent] :is(body,#application,#wrapper,#main,#content,#not_right_side,.ic-Layout-contentMain,.ic-app-main-content,.ic-DashboardCard__header_content,.ic-DashboardCard__action-container,.ic-DashboardCard,.item-group-container,.item-group-condensed,.ig-header,.ig-row,.header-bar,.page-title,.ic-Action-header,.ic-Table,.ic-Table tr,.ic-Table td,.ic-Table th,.course-options,.list-view,.announcements,.discussion-topic,.discussion-header,.entry,.entry-content,.module-sequence-footer,.ic-Layout-contentWrapper,[class*="-view"]) {background-color:transparent!important;background-image:none!important;color:#eef3fa!important;}
      html[${OWNER}][data-canvas-companion-surface=transparent] #content :is(h1,h2,h3,h4,h5,p,li,label,legend,dt,dd,td,th,.ig-title,.item_name,.discussion-title,.ic-DashboardCard__header-title,[class*="-text"],[class*="-heading"]) {color:#eef3fa!important;}
      html[${OWNER}][data-canvas-companion-surface=transparent] #content a:not(.Button):not(.btn) {color:#9cdcfe!important;}
      html[${OWNER}][data-canvas-companion-surface=transparent] :is(.ic-app-header,.ic-app-header__main-navigation,.ic-app-nav-toggle-and-crumbs,.ic-app-crumbs) {background:#10151b66!important;color:#eef3fa!important;}
      html[${OWNER}][data-canvas-companion-surface=transparent] #content :is(input,select,textarea,.Button,.btn,[role=tab]) {background-color:#162235bb!important;color:#eef3fa!important;border-color:#c5daf844!important;}
      html[${OWNER}][data-canvas-companion-surface=transparent] #content :is(.mce-container,.tox,.CodeMirror,.cm-editor) {background:#fff!important;color:#18212b!important;}
      html[${OWNER}][data-canvas-companion-surface=transparent] #content [class*="-pill"] {background-color:#16223588!important;color:#dcdcaa!important;border-color:#d5e2ff30!important;}
      #${LAYER_ID} > img { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; pointer-events: none !important; }
    `;
    this.style.textContent+=glassStyles;
    this.layer = this.document.createElement('div');
    this.layer.id = LAYER_ID;
    this.layer.setAttribute('aria-hidden', 'true');
    this.image = this.document.createElement('img');
    this.image.alt = '';
    this.overlay = this.document.createElement('div');
    this.layer.append(this.image, this.overlay);
    this.document.head.append(this.style);
    this.document.body.prepend(this.layer);
    this.document.documentElement.setAttribute(OWNER, 'true');
  }
  async load(url) {
    return new Promise((resolve, reject) => {
      const image = new this.window.Image();
      image.alt = '';
      image.onload = () => { cleanup(); resolve(image); };
      image.onerror = () => { cleanup(); reject(new Error('This image is unavailable. Your saved choice is preserved; showing the fallback color.')); };
      // Do not send the Canvas URL as the Referer to a remote image host.
      image.referrerPolicy = 'no-referrer';
      const timer = this.window.setTimeout(() => { image.src = ''; cleanup(); reject(new Error('The image took too long to load. Your saved choice is preserved.')); }, 15000);
      const cleanup = () => { this.window.clearTimeout(timer); image.onload = image.onerror = null; };
      image.src = url;
    });
  }
  async render(record, assetUrl = null) {
    const token = ++this.generation;
    this.last = { record, assetUrl };
    if(record.mode!=='off'&&record.appearance?.surface==='transparent')this.document.documentElement.dataset.canvasCompanionSurface='transparent';
    else delete this.document.documentElement.dataset.canvasCompanionSurface;
    if (record.mode === 'off') { this.clear(); this.onStatus({ kind: 'off' }); return; }
    const inherited = record.mode === 'inherit' ? this.inherited() : null;
    const url = inherited?.url || (record.mode === 'custom' ? (record.source?.kind === 'url' ? record.source.url : assetUrl) : null);
    if (!url && record.mode === 'inherit') { this.clear(); this.onStatus({ kind: 'idle' }); return; }
    let loadedImage;
    if (this.loadedUrl !== url || !this.layer?.isConnected) {
      try {
        if (!url) throw new Error('The saved image is unavailable. Select it again in Canvas Companion settings.');
        this.onStatus({ kind: 'loading' });
        loadedImage = await this.load(url);
      } catch (error) {
        if (token !== this.generation) return;
        this.loadedUrl = null;
        if (record.mode === 'inherit') this.clear();
        else { this.mount(); this.layer.style.backgroundColor = record.appearance?.surface==='transparent'?'#151a22':record.visual.fallback; this.image.removeAttribute('src'); this.overlay.style.background = 'none'; }
        this.onStatus({ kind: 'error', message: error.message });
        return;
      }
    }
    if (token !== this.generation) return;
    this.mount();
    if (loadedImage) { this.image.replaceWith(loadedImage); this.image = loadedImage; }
    this.loadedUrl = url;
    const v = record.mode === 'inherit' ? DEFAULT_VISUAL : record.visual;
    this.layer.style.backgroundColor = record.mode === 'custom' ? v.fallback : 'transparent';
    this.image.style.objectFit = v.fit;
    this.image.style.objectPosition = `${v.x}% ${v.y}%`;
    this.image.style.transform = `scale(${v.scale / 100})`;
    this.image.style.filter = inherited?.filter || `brightness(${v.brightness / 100}) blur(${v.blur}px)`;
    this.overlay.style.backgroundColor = v.overlay;
    this.overlay.style.backgroundImage = inherited?.overlay || 'none';
    this.overlay.style.opacity = record.mode === 'inherit' ? '1' : String(v.opacity / 100);
    if (record.mode === 'inherit') this.overlay.style.backgroundColor = 'transparent';
    this.onStatus({ kind: 'ready' });
  }
  clear() {
    this.generation++;
    this.document.documentElement.removeAttribute(OWNER);
    delete this.document.documentElement.dataset.canvasCompanionSurface;
    this.layer?.remove(); this.style?.remove();
    this.layer = this.style = this.image = this.overlay = null;
    this.loadedUrl = null;
  }
  destroy() { this.clear(); this.last = null; }
}
