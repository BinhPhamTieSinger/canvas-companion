// Scoped surfaces: Canvas portals live outside #content; editors retain their own document styles.
export const glassStyles = `
html[data-canvas-companion-background][data-canvas-companion-surface=transparent]{--cc-dialog-surface:rgba(19,27,40,.96);--cc-panel:rgba(22,31,46,.82)}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] :is(#nav-tray-portal span[class*="-tray "],#nav-tray-portal span[class$="-tray"],[class*="-tray__content"],[class*="-tray__content"] [class*="-view"],.ic-app-header__menu-list-item--active,.ic-app-header__menu-list-item--active a){background:var(--cc-panel)!important;color:#f1f6ff!important;backdrop-filter:blur(22px) saturate(125%);border-color:#c6dcff38!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #nav-tray-portal :is(div,section,nav,ul,li){background-color:transparent!important;color:#eaf2ff!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #nav-tray-portal :is(a,h1,h2,h3,button,span,p){color:#eaf2ff!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #nav-tray-portal a:hover{background:#9cdcfe22!important;color:#bceaff!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content :is([class*="-select"],[class*="-select"] button,[class*="-select"] label,[class*="-formField"] label){color:#eaf2ff!important;border-color:#c6dcff38!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content [class*="-select"] button{background:#182739a8!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content .cc-authored-glass{background-color:#14203370!important;color:#edf4ff!important;border-color:#c6dcff30!important;box-shadow:0 8px 28px #0002}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content .cc-authored-glass :is(p,span,strong,em,li,td,th){color:inherit!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] .cc-light-ink{color:color-mix(in srgb,var(--cc-original-ink) 20%,#ffffff 80%)!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] :is(a[href$="/logout"],form[action$="/logout"] button,#nav-tray-portal a[href*="/logout"]){display:inline-flex!important;align-items:center;justify-content:center;gap:8px;padding:9px 16px!important;min-height:40px;border:1px solid #b8dcff55!important;border-radius:10px!important;background:#a5e3ff!important;color:#14243b!important;font-weight:650!important;line-height:1.4!important;text-decoration:none!important;white-space:nowrap}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] :is(a[href$="/logout"],form[action$="/logout"] button) *{color:inherit!important}
`;
const avatarSelector='img.avatar,img[class*="avatar"],.avatar img,[class*="-avatar"] img,#global_nav_profile_link img';
export class AuthoredSurfaces {
 constructor(document,{avatarUrl=null}={}){
  this.document=document;this.avatarUrl=avatarUrl;this.nodes=new Set();this.inkNodes=new Set();this.avatarOriginals=new Map();this.timer=null;
  this.onImageError=e=>{if(e.target.matches?.(avatarSelector))this.fallback(e.target);};document.addEventListener('error',this.onImageError,true);
  this.observer=new MutationObserver(()=>this.schedule());this.observer.observe(document.body,{childList:true,subtree:true});this.schedule();
 }
 schedule(){if(this.timer)return;this.timer=setTimeout(()=>{this.timer=null;this.scan();},250);}
 fallback(img){
  if(!this.avatarUrl||this.avatarOriginals.has(img))return;
  this.avatarOriginals.set(img,{src:img.getAttribute('src'),srcset:img.getAttribute('srcset')});img.removeAttribute('srcset');img.src=this.avatarUrl;
 }
 scan(){
  if(this.avatarUrl)for(const img of this.document.querySelectorAll(avatarSelector))if(img.complete&&!img.naturalWidth&&img.getAttribute('src'))this.fallback(img);
  for(const img of this.avatarOriginals.keys())if(!img.isConnected)this.avatarOriginals.delete(img);
  if(this.document.documentElement.dataset.canvasCompanionSurface!=='transparent')return;
  for(const node of this.document.querySelectorAll('#content .user_content div,#content .user_content section,#content .user_content table,#content .user_content td')){
   if(node.closest('.mce-container,.tox,[contenteditable=true]')||this.nodes.has(node))continue;
   const c=this.document.defaultView.getComputedStyle(node).backgroundColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
   if(c&&c.slice(1,4).every(n=>Number(n)>=235)&&(!c[4]||Number(c[4])>.9)){node.classList.add('cc-authored-glass');this.nodes.add(node);}
  }
  for(const node of this.document.querySelectorAll('#content *,#nav-tray-portal *,#right-side *')){
   if(this.inkNodes.has(node)||node.closest('.mce-container,.tox,.CodeMirror,.cm-editor,pre,code,[contenteditable=true]')||!Array.from(node.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   const c=this.document.defaultView.getComputedStyle(node).color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);if(!c)continue;
   const rgb=c.slice(1,4).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
   if(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]<.2){node.style.setProperty('--cc-original-ink',`rgb(${c.slice(1,4).join(',')})`);node.classList.add('cc-light-ink');this.inkNodes.add(node);}
  }
  for(const node of this.nodes)if(!node.isConnected)this.nodes.delete(node);
  for(const node of this.inkNodes)if(!node.isConnected)this.inkNodes.delete(node);
 }
 destroy(){
  clearTimeout(this.timer);this.observer.disconnect();this.document.removeEventListener('error',this.onImageError,true);
  for(const n of this.nodes)n.classList.remove('cc-authored-glass');for(const n of this.inkNodes){n.classList.remove('cc-light-ink');n.style.removeProperty('--cc-original-ink');}
  for(const [img,original] of this.avatarOriginals)if(img.getAttribute('src')===this.avatarUrl){if(original.src===null)img.removeAttribute('src');else img.setAttribute('src',original.src);if(original.srcset!==null)img.setAttribute('srcset',original.srcset);}
  this.nodes.clear();this.inkNodes.clear();this.avatarOriginals.clear();
 }
}
