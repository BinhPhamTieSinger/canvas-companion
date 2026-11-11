// Standalone so a mixed on-disk/loaded manifest never imports newly blocked modules.
(()=>{
 const PACKAGE_VERSION='0.5.1',api=globalThis.chrome;
 function notice(){
  if(!document.body||document.getElementById('canvas-companion-reload-notice'))return;
  const box=document.createElement('div');box.id='canvas-companion-reload-notice';box.setAttribute('role','status');box.textContent='Canvas Companion has been updated. Reload Canvas Companion on chrome://extensions, then refresh this Canvas tab. Your saved settings are unchanged.';box.style.cssText='position:fixed;right:18px;bottom:18px;max-width:350px;z-index:9999;padding:14px 16px;border:1px solid #b8dcff66;border-radius:12px;background:#14243bf5;color:#eef3fa;font:13px/1.5 system-ui';document.body.append(box);
 }
 const connected=()=>{try{return Boolean(api?.runtime?.id&&api.storage?.onChanged&&typeof api.runtime.getURL==='function');}catch{return false;}};
 if(!connected())return;
 try{
  if(api.runtime.getManifest().version!==PACKAGE_VERSION){notice();return;}
  void import(api.runtime.getURL('src/content/main.js')).catch(()=>{if(connected())notice();});
 }catch{if(connected())notice();}
})();
