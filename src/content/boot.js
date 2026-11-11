// Only the isolated extension runtime is used; no Canvas credentials or page state.
(()=>{
 const api=globalThis.chrome;
 const connected=()=>{try{return Boolean(api?.runtime?.id&&api.storage?.onChanged&&typeof api.runtime.getURL==='function');}catch{return false;}};
 if(!connected())return;
 try{void import(api.runtime.getURL('src/content/main.js')).catch(()=>{if(connected())console.error('Canvas Companion could not start. Reload this Canvas tab after updating the extension.');});}
 catch{if(connected())console.error('Canvas Companion could not start. Reload this Canvas tab after updating the extension.');}
})();
