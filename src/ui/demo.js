import {AcademicController} from '../academic/widget.js';
import {scopeFor,preferences,validateRecord} from '../academic/model.js';
import {CanvasReader} from '../academic/canvas.js';
import {monday,addDays,zonedInstant} from '../academic/time.js';
const scope=scopeFor('0'),week=monday(new Date().toISOString().slice(0,10)),zone='Asia/Ho_Chi_Minh';
const course={id:'100',name:'Mathematics · Sample course',code:'MATH1010FAL26',color:'#80dec4'};
const sourceKey='https://vinuni.instructure.com|assignment:100';
let state={scope,revision:0,preferences:preferences(),undo:null,sourceWarnings:[],sources:[{key:'announcement:100',courseId:'100',kind:'announcement',title:'Sample update: examination room changed',url:'https://vinuni.instructure.com/',digest:'b'.repeat(64),ackDigest:'a'.repeat(64),changeKind:'edited',signals:['examination','location'],summary:'Fictional example: the sample examination on Thursday is now in Room B204. Confirm your section in the original announcement before changing your timetable.',previousSummary:'Fictional example: sample examination in Room A101.'}],cache:{scope,from:addDays(week,-30),to:addDays(week,90),syncedAt:new Date().toISOString(),courses:[course],items:[{key:sourceKey,kind:'assignment',courseId:'100',title:'Sample problem set',dueAt:zonedInstant(addDays(week,4),'23:59',zone),url:'https://vinuni.instructure.com/',submissionKnown:true,submitted:false}]},records:[
 validateRecord({scope,id:'sample-class',kind:'class',data:{title:'Mathematics',courseId:'100',courseCode:'MATH1010',timezone:zone,color:'#80dec4',startDate:week,endDate:addDays(week,60),meetings:[{id:'lecture',day:1,start:'09:00',end:'10:30',sessionType:'lecture',room:'A201'},{id:'recitation',day:3,start:'10:30',end:'12:00',sessionType:'recitation',room:'D304'}]}}),
 validateRecord({scope,id:'sample-exam',kind:'exam',data:{title:'Sample midterm',courseId:'100',type:'Midterm',startAt:zonedInstant(addDays(week,3),'09:00',zone),endAt:zonedInstant(addDays(week,3),'10:30',zone),room:'A101',preparation:'preparing',color:'#ff938e'}}),
 validateRecord({scope,id:'sample-project',kind:'project',data:{title:'Sample research project',courseId:'100',dueAt:zonedInstant(addDays(week,4),'17:00',zone),priority:'high',color:'#c8afff',milestones:[{id:'draft',title:'Draft',completed:true},{id:'final',title:'Final review',completed:false}],tasks:[{id:'research',title:'Read sources',completed:true}]}})
]};
const failure=message=>({ok:false,error:message}),success=()=>({ok:true,data:structuredClone(state)});
const runtime={runtime:{id:'canvas-companion-demo',getURL:path=>new URL('../../'+path,import.meta.url).href,async sendMessage(m){
 const action=m.action.replace('academic.','');
 if(action==='read')return success();if(action==='lease')return {ok:true,data:{acquired:true,token:'sample'}};if(action==='release')return {ok:true,data:{released:true}};
 if(action==='export')return {ok:true,data:{format:'canvas-companion-academic',version:1,scope,preferences:state.preferences,records:state.records}};
 if(action==='preferences'){state.preferences=preferences(m.preferences);state.revision++;return success();}
 if(action==='acknowledge'){const s=state.sources.find(s=>s.key===m.key);if(!s||s.digest!==m.digest)return failure('This source changed. Reopen it.');s.ackDigest=s.digest;}
 else if(action==='save'){const r=validateRecord(m.record),old=state.records.find(r=>r.id===m.record.id);if((old?.revision||0)!==m.revision)return failure('Reload the sample editor before saving.');state.records=state.records.filter(x=>x.id!==r.id);state.records.push({...r,revision:m.revision+1});}
 else if(action==='remove'){state.undo=state.records.find(r=>r.id===m.id);state.records=state.records.filter(r=>r.id!==m.id);}
 else if(action==='undo'){if(state.undo)state.records.push(state.undo);state.undo=null;}
 else if(action==='sync'){state.cache={...state.cache,...m.snapshot,syncedAt:new Date().toISOString()};}
 else if(action==='catalogImport')return failure('This sample already has a class. Use a real Canvas account to match your registered section.');
 else return failure('Backup import is disabled in this temporary sample workspace.');
 state.revision++;return success();
}},storage:{onChanged:{addListener(){},removeListener(){}}}};
const api={profile:async()=>({id:'0',scope,timezone:zone}),snapshot:async(_p,from,to)=>({...structuredClone(state.cache),from,to}),catalog:()=>new CanvasReader().catalog()};
const controller=new AcademicController(document,{chrome:runtime,api,clock:()=>Date.parse(zonedInstant(week,'08:00',zone)),dashboard:()=>true});void controller.route();
window.addEventListener('pagehide',()=>controller.destroy(),{once:true});
