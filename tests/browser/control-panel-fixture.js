import {controller} from './timetable-fixture.js';
import {CompanionPanel} from '../../src/ui/control-panel.js';
import {AuthoredSurfaces} from '../../src/background/glass.js';
import {BackgroundRenderer} from '../../src/background/renderer.js';
import {configuration,SCOPE} from '../../src/background/model.js';
const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=800;const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,1000,800);gradient.addColorStop(0,'#204459');gradient.addColorStop(.5,'#473d59');gradient.addColorStop(1,'#235c57');ctx.fillStyle=gradient;ctx.fillRect(0,0,1000,800);
const blob=await new Promise(resolve=>canvas.toBlob(resolve)),url=URL.createObjectURL(blob),renderer=new BackgroundRenderer(document);
await renderer.render(configuration({scope:SCOPE,mode:'custom',source:{kind:'asset',id:'0'.repeat(64)},appearance:{pages:'all',surface:'transparent'},visual:{opacity:35,overlay:'#000000'}}),url);
const authored=new AuthoredSurfaces(document,{avatarUrl:new URL('/src/assets/avatar-fallback.svg',location.origin).href,courseUrl:new URL('/src/assets/course-fallback.svg',location.origin).href});authored.scan();
const panel=new CompanionPanel(document,{chrome,academic:controller,optionsUrl:new URL('/options.html?fixture=1',location.origin).href,snapshot:()=>({record:{mode:'custom',appearance:{pages:'all'}}})});
await controller.connect();
const snapshot={from:'2026-11-01',to:'2026-12-31',courses:[{id:'42',name:'Fixture mathematics',code:'MATH1010FAL26',color:'#80dec4'}],items:[],sources:[{key:'announcement:42',courseId:'42',kind:'announcement',title:'Sample examination room update',url:'https://vinuni.instructure.com/courses/42',digest:'a'.repeat(64),summary:'Sample midterm in Room A101.',signals:['examination','location']}]};
await controller.rpc('sync',{snapshot});await controller.rpc('sync',{snapshot:{...snapshot,sources:[{...snapshot.sources[0],digest:'b'.repeat(64),summary:'Sample midterm moved to Room B204.'}]}});await controller.refresh();
document.querySelector('#result').textContent=JSON.stringify({avatarPreserved:getComputedStyle(document.querySelector('#avatar-image')).backgroundImage.includes('avatar-fallback.svg'),lightText:getComputedStyle(document.querySelector('#dark-label')).color,logoutAction:document.querySelector('#sample-logout').closest('form').getAttribute('action'),logoutHeight:document.querySelector('#sample-logout').getBoundingClientRect().height});

await import('./polish-suite.js').then(m=>m.run({panel,authored}));
