import {validTime} from './time.js';

export const SEASONS=['spring','summer','fall','winter'];
export const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export function termLabel(term){return term.replace(/^(\w+)-(\d{4})$/,(_,season,year)=>`${season[0].toUpperCase()+season.slice(1)} ${year}`);}
export function planId(term){if(!/^(spring|summer|fall|winter)-20\d{2}$/.test(term))throw new Error('Choose a semester between 2000 and 2099.');return `semester-plan:${term}`;}
const cleanText=(value,max)=>{if(typeof value!=='string'||value.length>max)throw new Error('A planning field is too long or invalid.');return value.trim();};
export function validatePlan(input){
 const d=input.data||{};
 if(input.id!==planId(d.term))throw new Error('Use one canonical plan per semester.');
 if(!Array.isArray(d.courses)||d.courses.length>80)throw new Error('Plan up to 80 courses per semester.');
 const courses=d.courses.map(c=>{
  if(!/^[A-Z][A-Z0-9_-]{1,39}$/.test(c.code))throw new Error('Invalid course reference.');
  planId(c.catalogTerm);
  const credits=c.credits==null?null:Number(c.credits);
  if(credits!==null&&(!Number.isFinite(credits)||credits<0||credits>60))throw new Error('Credits must be between 0 and 60, or left unknown.');
  if(!Array.isArray(c.meetings??[])||(c.meetings??[]).length>20)throw new Error('Use up to 20 proposed meetings per course.');
  const meetings=(c.meetings??[]).map(m=>{
   if(!Number.isInteger(m.day)||m.day<1||m.day>7||!validTime(m.start)||!validTime(m.end)||m.end<=m.start)throw new Error('Each proposed meeting needs a weekday and an end after its start.');
   if(!['lecture','lab','recitation','seminar','other'].includes(m.sessionType))throw new Error('Choose a valid meeting type.');
   return {day:m.day,start:m.start,end:m.end,sessionType:m.sessionType,room:cleanText(m.room??'',120)};
  });
  return {code:c.code,catalogTerm:c.catalogTerm,credits,notes:cleanText(c.notes??'',2000),meetings};
 });
 if(new Set(courses.map(c=>c.code)).size!==courses.length)throw new Error('A course can appear only once in a semester plan.');
 return {scope:input.scope,id:input.id,kind:'semester_plan',data:{term:d.term,notes:cleanText(d.notes??'',5000),courses}};
}
export function addPlannedCourse(data,entry,catalog){
 if(data.courses.some(c=>c.code===entry.code))return data;
 return {...data,courses:[...data.courses,{code:entry.code,catalogTerm:catalog.term,credits:null,notes:'',meetings:[]}]};
}
export function creditSummary(courses){return {total:courses.reduce((n,c)=>n+(c.credits??0),0),unknown:courses.filter(c=>c.credits==null).length};}
// Proposed weekly times are independent of historical catalog dates and live enrollment.
export function planConflicts(courses){
 const result=[];
 for(let i=0;i<courses.length;i++)for(let j=i;j<courses.length;j++){
  const a=courses[i],b=courses[j];
  for(let x=0;x<a.meetings.length;x++)for(let y=i===j?x+1:0;y<b.meetings.length;y++){
   const am=a.meetings[x],bm=b.meetings[y];
   if(am.day===bm.day&&am.start<bm.end&&bm.start<am.end)result.push(`${a.code} (${am.sessionType}) overlaps ${b.code} (${bm.sessionType}) on ${DAYS[am.day-1]}.`);
  }
 }
 return result;
}
export function filterCatalog(catalog,{query='',department='',schedule='all'}={}){
 const normalize=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return catalog.entries.filter(e=>(!department||e.code.match(/^[A-Z]+/)?.[0]===department)&&(schedule==='all'||(schedule==='published')===Boolean(e.complete!==false&&e.meetings.length&&e.startDate&&e.endDate))&&words.every(w=>normalize(`${e.code} ${e.title} ${e.section} ${e.meetings.map(m=>m.room||'').join(' ')}`).includes(w)));
}
