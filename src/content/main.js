import {runtimeAvailable,subscribeStorage,showReloadNotice} from '../runtime.js';
import {CompanionPanel} from '../ui/control-panel.js';
import {AuthoredSurfaces} from '../background/glass.js';
import {BackgroundRenderer} from '../background/renderer.js';
import {AcademicController} from '../academic/widget.js';
import {backgroundApplies} from '../background/model.js';

const marker='__canvasCompanionBackgroundV1',runtime=globalThis.chrome;
if(!globalThis[marker]&&runtimeAvailable(runtime)){
 globalThis[marker]=true;
 let academic,authoredSurfaces,panel,renderer,observer,navigationTimer,scheduled,unsubscribe=()=>{},snapshot,objectUrl,assetKey,busy=false,queued=false,stopped=false;
 const events=new AbortController();
 function releaseAsset(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=assetKey=null;}
 function stop(){
  if(stopped)return;stopped=true;events.abort();unsubscribe();observer?.disconnect();clearInterval(navigationTimer);clearTimeout(scheduled);
  // Cleanup must never call back into a revoked Chrome namespace.
  academic?.destroy();panel?.destroy();renderer?.destroy();authoredSurfaces?.destroy();document.getElementById('canvas-companion-timetable-link')?.remove();releaseAsset();
 }
 function alive(){if(stopped)return false;if(runtimeAvailable(runtime))return true;stop();showReloadNotice(document);return false;}
 async function refresh(){
  if(!alive())return;if(busy){queued=true;return;}busy=true;
  try{
   const reply=await runtime.runtime.sendMessage({namespace:'canvas-companion',action:'read'});if(!alive())return;
   if(!reply?.ok)throw new Error('Background settings are unavailable.');snapshot=reply.data;
   if(!backgroundApplies(location,snapshot.record)){renderer.clear();authoredSurfaces.schedule();releaseAsset();return;}
   if(snapshot.asset?.id!==assetKey){releaseAsset();if(snapshot.asset){const bytes=Uint8Array.from(atob(snapshot.asset.data),c=>c.charCodeAt(0));objectUrl=URL.createObjectURL(new Blob([bytes],{type:snapshot.asset.type}));assetKey=snapshot.asset.id;}}
   await renderer.render(snapshot.record,objectUrl);if(alive())authoredSurfaces.schedule();
  }catch{if(alive()){renderer.clear();document.documentElement.dataset.canvasCompanionStatus='error';}}
  finally{busy=false;if(queued&&!stopped){queued=false;void refresh();}}
 }
 function schedule(){if(!alive())return;clearTimeout(scheduled);scheduled=setTimeout(refresh,120);}
 try{
  academic=new AcademicController(document,{chrome:runtime});
  authoredSurfaces=new AuthoredSurfaces(document,{avatarUrl:runtime.runtime.getURL('src/assets/avatar-fallback.svg'),courseUrl:runtime.runtime.getURL('src/assets/course-fallback.svg')});
  panel=new CompanionPanel(document,{chrome:runtime,academic,snapshot:()=>snapshot});
  renderer=new BackgroundRenderer(document,{onStatus(status){document.documentElement.dataset.canvasCompanionStatus=status.kind;}});
  void academic.route();
  unsubscribe=subscribeStorage(runtime,(changes,area)=>{if(area==='local'&&changes.backgroundRevision)schedule();});
  window.addEventListener('focus',()=>{if(alive()){schedule();void academic.focus();}},{signal:events.signal});
  window.addEventListener('popstate',schedule,{signal:events.signal});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&alive()){schedule();void academic.focus();}},{signal:events.signal});
  observer=new MutationObserver(records=>{if(records.some(record=>{const target=record.target.nodeType===3?record.target.parentElement:record.target;return target?.id!=='canvas-companion-background-style'&&!target?.closest?.('#canvas-companion-background-layer');}))schedule();});
  observer.observe(document.head,{subtree:true,childList:true,characterData:true});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']});observer.observe(document.body,{childList:true});
  let path=location.pathname;
  navigationTimer=setInterval(()=>{
   if(!alive())return;void academic.route();panel.route();
   if(!document.getElementById('canvas-companion-timetable-link')){const link=document.createElement('a');link.id='canvas-companion-timetable-link';link.href='/#canvas-companion-academic';link.textContent='Timetable';link.style.cssText='position:fixed;right:22px;bottom:18px;z-index:90;background:#162235df;color:#9cdcfe;border:1px solid #9cdcfe66;border-radius:20px;padding:9px 16px;font:600 13px system-ui;text-decoration:none;box-shadow:0 4px 18px #0004';document.body.append(link);}
   if(path!==location.pathname){path=location.pathname;schedule();}else if(backgroundApplies(location,snapshot?.record)&&snapshot?.record.mode!=='off'&&renderer.layer&&!renderer.layer.isConnected)schedule();
  },1000);
  window.addEventListener('pagehide',event=>{if(!event.persisted)stop();},{signal:events.signal});
  void refresh();
 }catch{stop();showReloadNotice(document);}
}
