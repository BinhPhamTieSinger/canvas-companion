// Run once in the official signed-in portal's DevTools Console, then use its
// catalog Reload button four times. This reads response bodies, never credentials.
(() => {
  if(window.__ccExporterActive)return console.log('Catalog exporter is already active.');
  window.__ccExporterActive=true;
  const host = 'one-apigw.vinuni.edu.vn';
  const path = '/connect/qldt/dang-ky-tin-chi/sinh-vien/lop-hoc-phan/by-hoc-phan/hoc-ky/20261/loai/tat-ca/page';
  const rows = new Map(); let page = 0;
  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeFetch = window.fetch;
  const adjust = input => {
    const u = new URL(input, location.href);
    if (u.hostname !== host || u.pathname !== path) return {url:input,match:false};
    u.searchParams.set('page',String(++page)); u.searchParams.set('limit','100');
    return {url:u.href,match:true};
  };
  const capture = json => {
    if (!json?.success || !Array.isArray(json.data?.result)) return console.warn('Catalog request failed; no export saved.');
    for (const r of json.data.result) rows.set(r._id, {
      id:r._id,code:r.maHocPhan,title:r.hocPhan?.tenTiengAnh||r.hocPhan?.ten||'',
      section:r.ten,term:r.maHocKy,
      occurrences:(r.thoiKhoaBieuList||[]).map(t=>({date:t.ngay,startAt:t.thoiGianBatDau,endAt:t.thoiGianKetThuc,sourceType:t.loaiHinhHocTap||'',room:typeof t.phongHoc==='string'?t.phongHoc:''}))
    });
    console.log(`Catalog backup: ${rows.size}/${json.data.total} sections`);
    if (rows.size !== json.data.total) return;
    XMLHttpRequest.prototype.open=nativeOpen;window.fetch=nativeFetch;delete window.__ccExporterActive;
    const blob=new Blob([JSON.stringify({format:'vinuni-course-catalog-response',version:1,term:'fall-2026',capturedAt:new Date().toISOString(),total:json.data.total,entries:[...rows.values()]},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vinuni-fall-2026-catalog.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    console.log('Catalog backup exported. Temporary response hooks removed.');
  };
  XMLHttpRequest.prototype.open=function(method,input,...rest){
    const target=String(method).toUpperCase()==='GET'?adjust(input):{url:input,match:false};
    if(target.match)this.addEventListener('load',()=>{try{capture(this.responseType==='json'?this.response:JSON.parse(this.responseText));}catch{console.warn('Catalog response could not be decoded.');}},{once:true});
    return nativeOpen.call(this,method,target.url,...rest);
  };
  window.fetch=async function(input,...rest){
    const target=typeof input==='string'&&(!rest[0]?.method||rest[0].method==='GET')?adjust(input):{url:input,match:false};
    const result=await nativeFetch.call(this,target.url,...rest);if(target.match)result.clone().json().then(capture);return result;
  };
  console.log('Catalog response exporter ready. Click the catalog Reload button four times, waiting for each count. Reload this page to cancel.');
})();
