import { CanvasReader } from '../../src/academic/canvas.js';
import { AcademicController } from '../../src/academic/widget.js';
import { scopeFor } from '../../src/academic/model.js';
let account='123',failure=false;
const api={catalog:()=>new CanvasReader().catalog(),async profile(){return {id:account,scope:scopeFor(account),timezone:'Asia/Ho_Chi_Minh'};},async snapshot(_profile,from,to){if(failure)throw new Error('Synthetic Canvas read failure. Previous snapshot is preserved.');return {from,to,courses:[{id:'42',name:'Fixture mathematics',code:'MATH1010FAL26',color:'#4f7d72'}],items:[{key:'https://vinuni.instructure.com|assignment:99',kind:'assignment',title:'Synthetic problem set',courseId:'42',description:'Fixture only',dueAt:'2026-11-12T10:00:00Z',url:'https://vinuni.instructure.com/courses/42/assignments/99',submitted:false,submissionKnown:true},{key:'https://vinuni.instructure.com|calendar:123',kind:'canvas_event',title:'Synthetic office hours',courseId:'42',startAt:'2026-11-10T04:00:00Z',endAt:'2026-11-10T05:00:00Z',location:'Room A201',url:'https://vinuni.instructure.com/calendar'}]};}};
export const controller=new AcademicController(document,{chrome,api,clock:()=>Date.parse('2026-11-10T03:00:00Z'),dashboard:()=>true});
void controller.route();

let dark=false;document.querySelector('#theme').addEventListener('click',()=>{dark=!dark;document.documentElement.style.cssText=dark?'--bcbackground-0:#202927;--bcbackground-1:#2c3935;--bctext-0:#edf3f0;--bctext-1:#b6c9bf;--bcborders:#50635a;--bclinks-ungradient:#a6dccb':'';controller.ui.render();});
document.querySelector('#account').addEventListener('click',()=>{account=account==='123'?'456':'123';void controller.focus();});
document.querySelector('#failure').addEventListener('click',()=>{failure=!failure;document.querySelector('#failure').textContent=failure?'Source failure: on':'Toggle source failure';});
