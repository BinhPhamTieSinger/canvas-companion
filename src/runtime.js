export const RELOAD_MESSAGE='Canvas Companion was updated or disconnected. Reload this Canvas tab to reconnect. Your saved settings are unchanged.';
export function runtimeAvailable(runtime){
 try{return Boolean(runtime?.runtime?.id&&typeof runtime.runtime.sendMessage==='function'&&typeof runtime.storage?.onChanged?.addListener==='function');}catch{return false;}
}
export function subscribeStorage(runtime,listener){
 let event,attached=false;try{event=runtime?.storage?.onChanged;if(typeof event?.addListener==='function'){event.addListener(listener);attached=true;}}catch{/* Context may be invalidated between the availability check and registration. */}
 return ()=>{if(!attached)return;attached=false;try{event.removeListener(listener);}catch{/* Revoked Chrome events cannot be unregistered; the context is already dead. */}};
}
export function showReloadNotice(document){
 if(!document.body||document.getElementById('canvas-companion-reload-notice'))return;
 const notice=document.createElement('div');notice.id='canvas-companion-reload-notice';notice.setAttribute('role','status');notice.style.cssText='position:fixed;right:18px;bottom:18px;max-width:350px;z-index:9999;padding:14px 16px;border:1px solid #b8dcff66;border-radius:12px;background:#14243bf5;color:#eef3fa;font:13px/1.5 system-ui;box-shadow:0 5px 25px #0004';
 const text=document.createElement('p');text.textContent=RELOAD_MESSAGE;text.style.margin='0 0 10px';
 const button=document.createElement('button');button.type='button';button.textContent='Reload this tab';button.style.cssText='border:0;border-radius:7px;background:#a5e3ff;color:#14243b;padding:8px 12px;font:600 12px system-ui;cursor:pointer';button.addEventListener('click',()=>document.defaultView.location.reload());notice.append(text,button);document.body.append(notice);
}
