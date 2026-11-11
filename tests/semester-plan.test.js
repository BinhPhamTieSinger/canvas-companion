import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRecord,scopeFor,preferences} from '../src/academic/model.js';
import {planId,addPlannedCourse,filterCatalog,planConflicts,creditSummary} from '../src/academic/semester-plan.js';
import {projectEvents} from '../src/academic/engine.js';
import {CompanionPanel} from '../src/ui/control-panel.js';
const catalog=JSON.parse(readFileSync(new URL('../src/catalog/vinuni-fall-2026.json',import.meta.url)));
const scope=scopeFor('123');
const course=(code='MATH1010',meetings=[])=>({code,catalogTerm:catalog.term,credits:null,notes:'',meetings});
const plan=(courses=[])=>({scope,id:planId('spring-2027'),kind:'semester_plan',data:{term:'spring-2027',notes:'Personal draft',courses}});
const meeting=(day,start,end,sessionType='lecture')=>({day,start,end,sessionType,room:''});
test('catalog browsing covers every section and combines search, department and schedule filters',()=>{
 assert.equal(filterCatalog(catalog).length,389);
 const math=filterCatalog(catalog,{query:'calculus',department:'MATH'});assert(math.length>0&&math.every(e=>e.code.startsWith('MATH')&&/calculus/i.test(e.title)));
 assert.equal(filterCatalog(catalog,{query:'no-such-course-xyz'}).length,0);
 const missing=filterCatalog(catalog,{schedule:'missing'}),published=filterCatalog(catalog,{schedule:'published'});assert.equal(missing.length,10);assert.equal(missing.length+published.length,389);
});
test('planning references a course once without copying historic sections, dates or times',()=>{
 const initial=plan().data,entry=catalog.entries[0],next=addPlannedCourse(initial,entry,catalog);
 assert.equal(initial.courses.length,0);assert.equal(addPlannedCourse(next,catalog.entries.find(e=>e.code===entry.code),catalog),next);
 assert.deepEqual(Object.keys(next.courses[0]).sort(),['catalogTerm','code','credits','meetings','notes']);assert.deepEqual(next.courses[0].meetings,[]);
 assert.equal(validateRecord({...plan(),data:next}).kind,'semester_plan');
});
test('semester plans have canonical account-bound identities and reject duplicate course choices',()=>{
 assert.throws(()=>validateRecord({...plan(),scope:'unscoped'}));assert.throws(()=>validateRecord({...plan(),id:'random'}),/canonical/);
 assert.throws(()=>validateRecord(plan([course(),course()])),/once/);assert.throws(()=>planId('spring-2100'));
 assert.notEqual(planId('spring-2027'),planId('fall-2027'));
});
test('unknown credits remain unknown; entered fractional credits are summarized separately',()=>{
 const courses=[course(),{...course('COMP1010'),credits:3.5},{...course('ACCT2010'),credits:0}];
 assert.deepEqual(creditSummary(courses),{total:3.5,unknown:1});assert.equal(validateRecord(plan(courses)).data.courses[0].credits,null);
 for(const credits of [-1,61,NaN,Infinity])assert.throws(()=>validateRecord(plan([{...course(),credits}])));
});
test('draft weekly conflicts distinguish weekdays and accept back-to-back classes without changing times',()=>{
 const courses=[course('MATH1010',[meeting(1,'09:00','10:00'),meeting(1,'09:30','10:30','recitation')]),course('COMP1010',[meeting(1,'10:00','11:00','lab'),meeting(2,'09:30','10:30')])];
 const before=structuredClone(courses),conflicts=planConflicts(courses);assert.equal(conflicts.length,2);assert(conflicts[0].includes('recitation'));assert.deepEqual(courses,before);
});
test('proposed meetings reject incomplete times, reversed ranges, unknown types and bad weekdays',()=>{
 for(const m of [meeting(1,'','10:00'),meeting(1,'10:00','09:00'),meeting(8,'09:00','10:00'),meeting(1,'09:00','10:00','tutorial')])assert.throws(()=>validateRecord(plan([course('MATH1010',[m])])));
 const row=validateRecord(plan([course('MATH1010',[meeting(1,'09:00','10:00','recitation')])]));assert.equal(row.data.courses[0].meetings[0].sessionType,'recitation');
});
test('future semester plans never become actual timetable events',()=>{
 const row=validateRecord(plan([course('MATH1010',[meeting(1,'09:00','10:00')])]));
 assert.deepEqual(projectEvents({records:[row],preferences:preferences(),cache:null},'2027-01-01','2027-01-31'),[]);
});
test('planner RPC rechecks account identity and stops writes after an extension reload',async()=>{
 let sent=0;const runtime={runtime:{id:'test',sendMessage:async()=>{sent++;return{ok:true,data:{}};}},storage:{onChanged:{addListener(){}}}};
 const context={runtime,api:{profile:async()=>({scope:scopeFor('456')})}};
 await assert.rejects(CompanionPanel.prototype.request.call(context,'save',{record:plan()},scope),/account changed/);assert.equal(sent,0);
 context.api.profile=async()=>{runtime.storage=undefined;return{scope};};await assert.rejects(CompanionPanel.prototype.request.call(context,'save',{record:plan()},scope),/Reload/);assert.equal(sent,0);
});
