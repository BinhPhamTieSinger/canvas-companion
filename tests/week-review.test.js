import test from 'node:test';
import assert from 'node:assert/strict';
import {isoWeek,weekLabel} from '../src/academic/time.js';
import {preferences,scopeFor,validateRecord} from '../src/academic/model.js';
import {sourceSignals,mergeDocument,pendingSources,sourceHealth} from '../src/academic/review.js';
import {documentSource,CanvasReader} from '../src/academic/canvas.js';
import {projectEvents} from '../src/academic/engine.js';
const now=Date.parse('2026-11-16T03:00:00Z');
test('calendar week labels handle ISO year boundaries and Monday/Sunday consistently',()=>{
 assert.deepEqual(isoWeek('2026-11-16'),{year:2026,week:47});assert.deepEqual(isoWeek('2026-11-22'),{year:2026,week:47});assert.deepEqual(isoWeek('2026-11-23'),{year:2026,week:48});
 assert.deepEqual(isoWeek('2027-01-01'),{year:2026,week:53});assert.deepEqual(isoWeek('2027-01-04'),{year:2027,week:1});assert.throws(()=>isoWeek('invalid'));
});
test('teaching weeks use only an explicitly configured Monday without shifting any meetings',()=>{
 assert.equal(weekLabel('2026-11-16','2026-09-21'),'Teaching week 9 · ISO week 47 (2026)');assert.match(weekLabel('2026-09-14','2026-09-21'),/Before teaching week 1/);
 assert.equal(weekLabel('2026-11-16'),'ISO week 47 (2026)');assert.throws(()=>preferences({weekOneDate:'2026-09-22'}));assert.equal(preferences().weekOneDate,'');
});
test('lab abbreviations and plural sessions receive schedule hints without interpreting prose as dates',()=>{
 for(const title of ['Lab 3 Tomorrow (16 Nov)','Labs cancelled','Laboratories on Monday','Recitations moved','Lectures next week'])assert(sourceSignals(title).includes('schedule'));
 assert.deepEqual(sourceSignals('Collaboration in a laboratory report'),['schedule']);assert.deepEqual(sourceSignals('Collaboration welcome'),[]);
});
test('recent relevant announcements are not auto-acknowledged during the first source baseline',()=>{
 const source={key:'announcement:42',kind:'announcement',digest:'a',summary:'Lab tomorrow in Room B201',signals:['schedule','location'],postedAt:'2026-11-15T01:00:00Z'};
 const initial=mergeDocument(null,source,true,new Date(now).toISOString());assert.equal(pendingSources([initial]).length,1);
 const again=mergeDocument(initial,source,false,new Date(now+60000).toISOString());assert.equal(again.ackDigest,null);
 const reviewed=mergeDocument({...again,ackDigest:'a'},source,false,new Date(now+120000).toISOString());assert.equal(pendingSources([reviewed]).length,0);
 assert.equal(pendingSources([mergeDocument(null,{...source,postedAt:'2026-09-01T00:00:00Z'},true,new Date(now).toISOString())]).length,0);
 assert.equal(pendingSources([mergeDocument(null,{...source,kind:'home'},true,new Date(now).toISOString())]).length,0);
});
test('unknown announcement dates remain reviewable and acknowledgements never follow a later edit',()=>{
 const initial=mergeDocument(null,{kind:'announcement',digest:'a',signals:['schedule']},true,new Date(now).toISOString());assert.equal(initial.ackDigest,null);
 const changed=mergeDocument({...initial,ackDigest:'a',summary:'No lab'},{kind:'announcement',digest:'b',summary:'Lab confirmed',signals:['schedule']},false,new Date(now).toISOString());assert.equal(changed.ackDigest,'a');assert.equal(changed.previousSummary,'No lab');assert.equal(pendingSources([changed]).length,1);
});
test('freshness distinguishes stale, unknown, partial and successfully checked sources',()=>{
 assert(sourceHealth({preferences:{autoRefresh:false}},now).stale);
 assert(sourceHealth({sources:[{}],cache:{syncedAt:'2026-11-11T00:00:00Z'}},now).stale);
 assert(!sourceHealth({sourcesCheckedAt:new Date(now-60000).toISOString(),sourceWarnings:[{kind:'announcement'}]},now).stale);
 assert(sourceHealth({sourcesCheckedAt:new Date(now-60000).toISOString(),sourceWarnings:[{}]},now).partial);
 assert(!sourceHealth({sourcesCheckedAt:new Date(now-60000).toISOString()},now).partial);
 assert(sourceHealth({sourcesCheckedAt:new Date(now-15*60000).toISOString()},now).stale);
 assert(sourceHealth({sourcesCheckedAt:new Date(now+86400000).toISOString()},now).stale);
});
test('topic detection scans beyond the saved excerpt and retains announcement provenance',async()=>{
 const source=await documentSource({kind:'announcement',title:'Course update',postedAt:'2026-11-15T00:00:00Z',body:'Welcome '.repeat(1000)+' Lab tomorrow in Room B201'});
 assert(source.signals.includes('schedule'));assert(source.signals.includes('location'));assert(source.summary.length<=900);assert.equal(source.body,undefined);assert.equal(source.postedAt,'2026-11-15T00:00:00Z');
});
test('restoring a verified lab date changes one existing meeting and preserves its cancelled dates',()=>{
 const scope=scopeFor('123'),data={title:'Fixture engineering',timezone:'Asia/Ho_Chi_Minh',startDate:'2026-09-21',endDate:'2026-12-21',meetings:[{id:'lab',day:1,start:'10:30',end:'12:20',sessionType:'lab',room:'B201',activeDates:['2026-11-09','2026-11-16','2026-12-14'],skippedDates:['2026-11-09','2026-11-16']} ]};
 const original=validateRecord({scope,id:'one-class',kind:'class',data});const state={records:[original],preferences:preferences()};assert.equal(projectEvents(state,'2026-11-16','2026-11-22').length,0);
 const restored=validateRecord({...original,data:{...original.data,meetings:original.data.meetings.map(m=>({...m,skippedDates:m.skippedDates.filter(d=>d!=='2026-11-16')}))}});
 const events=projectEvents({...state,records:[restored]},'2026-11-09','2026-11-22');assert.equal(events.length,1);assert.equal(events[0].date,'2026-11-16');assert.equal(events[0].sessionType,'lab');assert.equal(events[0].seriesId,'one-class');assert.deepEqual(original.data.meetings[0].skippedDates,['2026-11-09','2026-11-16']);
});
test('announcement transport preserves posting timestamps using authorized GETs only',async()=>{
 const calls=[],reader=new CanvasReader(async(url,options)=>{calls.push(options);return url.includes('/front_page')?new Response('{}',{status:404}):new Response(JSON.stringify([{id:42,title:'Lab tomorrow',message:'Lab in B201',posted_at:'2026-11-15T01:00:00Z',updated_at:'2026-11-15T02:00:00Z'}]));});
 const result=await reader.sources([{id:7}]);assert.equal(result.sources[0].postedAt,'2026-11-15T01:00:00.000Z');assert.equal(result.sources[0].editedAt,'2026-11-15T02:00:00.000Z');assert(calls.every(c=>c.method==='GET'&&c.credentials==='same-origin'));
});
