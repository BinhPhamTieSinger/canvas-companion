import {parseColor,luminance,contrastRatio,composite,effectiveBackground} from '../../src/background/contrast.js';
export async function run({panel,authored}){
 const results=[],assert=(x,message='Assertion failed')=>{if(!x)throw new Error(message);};
 const test=async(name,fn)=>{try{await fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});}};
 const ink=id=>parseColor(getComputedStyle(document.getElementById(id)).color),ratio=id=>{const e=document.getElementById(id),bg=effectiveBackground(e,window);return contrastRatio(composite(ink(id),bg),bg);};
 authored.scan();await Promise.allSettled([...document.querySelectorAll('#broken-avatar,#broken-course-image,#valid-course-image')].map(img=>img.decode()));authored.scan();
 await test('course CSS images survive glass wrappers',()=>assert(getComputedStyle(document.getElementById('course-css-image')).backgroundImage.includes('course-fallback.svg')));
 await test('failed course image decodes the local course fallback',()=>{const e=document.getElementById('broken-course-image');assert(e.naturalWidth>0&&e.src.endsWith('/src/assets/course-fallback.svg'));});
 await test('failed avatar decodes its separate local fallback',()=>{const e=document.getElementById('broken-avatar');assert(e.naturalWidth>0&&e.src.endsWith('/src/assets/avatar-fallback.svg'));});
 await test('successful configured course image is retained',()=>{const e=document.getElementById('valid-course-image');assert(e.naturalWidth>0&&e.src.endsWith('/src/assets/logo.svg'));});
 await test('light box has dark text with normal-text contrast',()=>assert(luminance(ink('light-box-label'))<.2&&ratio('light-box-label')>=4.5));
 await test('light button has dark text with normal-text contrast',()=>assert(luminance(ink('light-button'))<.2&&ratio('light-button')>=4.5));
 await test('dark surface has light text with normal-text contrast',()=>assert(luminance(ink('dark-label'))>.5&&ratio('dark-label')>=4.5));
 await test('already readable dark text remains readable',()=>assert(luminance(ink('readable-dark'))<.2&&ratio('readable-dark')>=4.5));
 await test('intentionally invisible text is not recolored',()=>assert(ink('hidden-ink')[3]===0&&!document.getElementById('hidden-ink').classList.contains('cc-light-ink')));
 await test('logout styling preserves its form and target',()=>{const e=document.getElementById('sample-logout');assert(e.closest('form').getAttribute('action')==='/logout'&&e.closest('form').method==='post'&&e.getBoundingClientRect().height>=40);});
 await test('dark control panel keeps a readable heading',async()=>{await panel.open();const dialog=panel.root.querySelector('dialog'),heading=panel.root.querySelector('h2'),bg=parseColor(getComputedStyle(dialog).backgroundColor);assert(panel.host.dataset.theme==='dark'&&contrastRatio(parseColor(getComputedStyle(heading).color),composite(bg,[21,26,34]))>=4.5);panel.close();});
 const root=document.documentElement,oldSurface=root.dataset.canvasCompanionSurface,oldInk=root.style.getPropertyValue('--bctext-0');root.dataset.canvasCompanionSurface='original';root.style.setProperty('--bctext-0','#14243b');
 await test('light control panel pairs white surfaces with dark text and settings',async()=>{await panel.open();const dialog=panel.root.querySelector('dialog'),heading=panel.root.querySelector('h2'),bg=parseColor(getComputedStyle(dialog).backgroundColor),color=parseColor(getComputedStyle(heading).color);assert(panel.host.dataset.theme==='light'&&luminance(bg)>.9&&luminance(color)<.2&&contrastRatio(color,bg)>=4.5);assert(new URL(panel.root.querySelector('iframe').src).searchParams.get('theme')==='light');});
 await test('native dialogs never set aria-hidden on the document body',()=>assert(document.body.getAttribute('aria-hidden')!=='true'));
 panel.close();root.dataset.canvasCompanionSurface=oldSurface;if(oldInk)root.style.setProperty('--bctext-0',oldInk);else root.style.removeProperty('--bctext-0');
 const report={results},summary=document.createElement('h2');summary.id='polish-summary';summary.textContent=`${results.filter(r=>r.passed).length}/${results.length} image, contrast and panel checks passed`;document.body.append(summary);
 const list=document.createElement('ol');for(const r of results){const item=document.createElement('li');item.textContent=`${r.passed?'PASS':'FAIL'} · ${r.name}${r.error?' · '+r.error:''}`;list.append(item);}document.body.append(list);
 const download=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));download.href=url;download.download='canvas-companion-polish-checks.json';download.textContent='Download synthetic check results';document.body.append(download);
 const preview=document.createElement('button');preview.textContent='Preview light Companion panel';preview.addEventListener('click',()=>{root.dataset.canvasCompanionSurface='original';root.style.setProperty('--bctext-0','#14243b');void panel.open();});document.body.append(preview);
}
