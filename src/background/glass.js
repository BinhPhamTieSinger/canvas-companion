// Scoped surfaces: Canvas portals live outside #content; editors retain their own document styles.
export const glassStyles = `
html[data-canvas-companion-background][data-canvas-companion-surface=transparent]{--cc-dialog-surface:rgba(19,27,40,.96);--cc-panel:rgba(22,31,46,.82)}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] :is(#nav-tray-portal span[class*="-tray "],#nav-tray-portal span[class$="-tray"],[class*="-tray__content"],[class*="-tray__content"] [class*="-view"],.ic-app-header__menu-list-item--active,.ic-app-header__menu-list-item--active a){background:var(--cc-panel)!important;color:#f1f6ff!important;backdrop-filter:blur(22px) saturate(125%);border-color:#c6dcff38!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #nav-tray-portal :is(div,section,nav,ul,li){background-color:transparent!important;color:#eaf2ff!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #nav-tray-portal :is(a,h1,h2,h3,button,span,p){color:#eaf2ff!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #nav-tray-portal a:hover{background:#9cdcfe22!important;color:#bceaff!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content :is([class*="-select"],[class*="-select"] button,[class*="-select"] label,[class*="-formField"] label){color:#eaf2ff!important;border-color:#c6dcff38!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content [class*="-select"] button{background:#182739a8!important}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content .cc-authored-glass{background-color:#14203370!important;background-image:none!important;color:#edf4ff!important;border-color:#c6dcff30!important;box-shadow:0 8px 28px #0002}
html[data-canvas-companion-background][data-canvas-companion-surface=transparent] #content .cc-authored-glass :is(p,span,strong,em,li,td,th){color:inherit!important}
`;
export class AuthoredSurfaces {
  constructor(document){this.document=document;this.nodes=new Set();this.timer=null;this.observer=new MutationObserver(()=>this.schedule());this.observer.observe(document.querySelector('#content')||document.body,{childList:true,subtree:true});this.schedule();}
  schedule(){if(this.timer)return;this.timer=setTimeout(()=>{this.timer=null;this.scan();},250);}
  scan(){
    if(this.document.documentElement.dataset.canvasCompanionSurface!=='transparent')return;
    // Only supported course-authored content; never repaint iframe/editor documents or interactive controls.
    for(const node of this.document.querySelectorAll('#content .user_content div,#content .user_content section,#content .user_content table,#content .user_content td')){
      if(node.closest('.mce-container,.tox,[contenteditable=true]')||this.nodes.has(node))continue;
      const c=this.document.defaultView.getComputedStyle(node).backgroundColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
      if(c&&c.slice(1,4).every(n=>Number(n)>=235)&&(!c[4]||Number(c[4])>.9)){node.classList.add('cc-authored-glass');this.nodes.add(node);}
    }
    for(const node of this.nodes)if(!node.isConnected)this.nodes.delete(node);
  }
  destroy(){clearTimeout(this.timer);this.observer.disconnect();for(const n of this.nodes)n.classList.remove('cc-authored-glass');this.nodes.clear();}
}
