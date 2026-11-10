import { ORIGIN } from '../background/model.js';
import { validZone, validDate, validTime, zonedInstant, dateIn } from './time.js';
export const DEFAULT_PREFS = Object.freeze({ timezone:'Asia/Ho_Chi_Minh', travelMinutes:15, dueSoonHours:72, clusterDays:3, clusterCount:3, view:'week', showCompleted:false, collapsed:false, courseFilter:'' });
export const KINDS = new Set(['class','exam','assignment','project','annotation','course','event','office_hours']);
export const PRIORITIES = ['low','normal','high'];
export const PREPARATION = ['not_started','preparing','ready'];
export const SUBMISSION = ['not_submitted','submitted','returned'];
export function scopeFor(id) { if (!/^\d{1,30}$/.test(String(id))) throw new Error('Canvas account identity is unavailable.'); return `${ORIGIN}|${id}`; }
export function validScope(scope) { return typeof scope === 'string' && new RegExp(`^${ORIGIN.replaceAll('.','\\.')}\\|\\d{1,30}$`).test(scope); }
export function text(value, limit=5000) { if (typeof value !== 'string' || value.length>limit) throw new Error('A text field is missing or too long.'); return value.trim(); }
function required(value, name, limit=200) { const result=text(value,limit); if(!result) throw new Error(`${name} is required.`); return result; }
function choice(value, values, fallback) { const next=value ?? fallback; if(!values.includes(next)) throw new Error('An option is invalid.'); return next; }
function integer(value,min,max,fallback) { const n=value??fallback; if(!Number.isInteger(n)||n<min||n>max) throw new Error('A numeric value is outside its allowed range.'); return n; }
function color(value) { if(!/^#[a-f0-9]{6}$/i.test(value || '')) throw new Error('Choose a valid subject color.'); return value.toLowerCase(); }
function date(value, name, optional=false) { if(optional&&!value) return null; if(!validDate(value)) throw new Error(`${name} must be a valid date.`); return value; }
function instant(value, name, optional=false) { if(optional&&!value) return null; if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))) throw new Error(`${name} needs an explicit date, time and timezone.`); return new Date(value).toISOString(); }
function id(value) { if(typeof value!=='string'||! /^[\w:.-]{1,180}$/.test(value)) throw new Error('Invalid record identity.'); return value; }
export function safeLink(value) {
  if(!value) return '';
  try { const url=new URL(value,ORIGIN); if(url.protocol!=='https:'||url.username||url.password) throw new Error(); return url.href; } catch { throw new Error('Use a complete HTTPS link without credentials.'); }
}
export function preferences(value={}) {
  const p={...DEFAULT_PREFS,...value}; if(!validZone(p.timezone)) throw new Error('Choose a valid IANA timezone.');
  return { timezone:p.timezone, travelMinutes:integer(p.travelMinutes,0,180), dueSoonHours:integer(p.dueSoonHours,1,336), clusterDays:integer(p.clusterDays,1,14), clusterCount:integer(p.clusterCount,2,20),view:choice(p.view,['day','week','month','exams','deadlines','overview'],'week'),showCompleted:Boolean(p.showCompleted),collapsed:Boolean(p.collapsed),courseFilter:text(p.courseFilter??'',100) };
}
export function validateRecord(input) {
  if(!validScope(input?.scope)||!KINDS.has(input.kind)) throw new Error('Unsupported academic account or record type.');
  const base={ scope:input.scope, id:id(input.id), kind:input.kind };
  const d=input.data || {};
  if(input.kind==='annotation') {
    return {...base,data:{ sourceKey:required(d.sourceKey,'Source identity',250), completed:Boolean(d.completed), priority:choice(d.priority,PRIORITIES,'normal'), estimatedMinutes:integer(d.estimatedMinutes,0,10000,0), notes:text(d.notes??'') }};
  }
  const common={ title:required(d.title,'Title'), courseId:text(d.courseId??'',100), courseCode:text(d.courseCode??'',100), color:color(d.color??'#4f7d72'), notes:text(d.notes??'') };
  if(input.kind==='course') return {...base,data:common};
  if(input.kind==='class') {
    if(!validZone(d.timezone)) throw new Error('Choose a valid class timezone.');
    const startDate=date(d.startDate,'Term start'),endDate=date(d.endDate,'Term end');
    if(endDate<startDate) throw new Error('Term end must follow term start.');
    if(!Array.isArray(d.meetings)||!d.meetings.length||d.meetings.length>35) throw new Error('Add at least one meeting, up to 35 slots.');
    const meetings=d.meetings.map(m=>{
      if(!validTime(m.start)||!validTime(m.end)) throw new Error('Each meeting needs valid start and end times.');
      const day=integer(m.day,1,7),overnight=Boolean(m.overnight);
      if((!overnight&&m.end<=m.start)||(overnight&&m.end>m.start)) throw new Error('Class end must follow start; mark an overnight meeting explicitly.');
      return {id:id(m.id),activeDates:(m.activeDates??[]).map(v=>date(v,'Meeting date')),skippedDates:(m.skippedDates??[]).map(v=>date(v,'Skipped meeting date')),sessionType:choice(m.sessionType,['lecture','lab','tutorial','seminar','other'],'lecture'),day,start:m.start,end:m.end,overnight,room:text(m.room??'',120),building:text(m.building??'',120),campus:text(m.campus??'',160)};
    });
    if(new Set(meetings.map(m=>m.id)).size!==meetings.length) throw new Error('Meeting identities must be unique.');
    const skipped=(d.skippedDates??[]).map(value=>date(value,'Skipped class date'));
    return {...base,data:{...common,startDate,endDate,timezone:d.timezone,intervalWeeks:integer(d.intervalWeeks,1,8,1),instructor:text(d.instructor??'',200),meetings,skippedDates:[...new Set(skipped)]}};
  }
  if(['exam','event','office_hours'].includes(input.kind)) {
    const startAt=instant(d.startAt,'Exam start'),endAt=instant(d.endAt,'Event end',input.kind!=='exam');
    if(endAt&&(endAt<=startAt||Date.parse(endAt)-Date.parse(startAt)>86400000)) throw new Error('Exam duration must be positive and no more than 24 hours.');
    return {...base,data:{...common,startAt,endAt,type:input.kind==='exam'?required(d.type,'Examination type',80):input.kind,room:text(d.room??'',120),building:text(d.building??'',120),campus:text(d.campus??'',160),instructions:text(d.instructions??''),preparation:choice(d.preparation,PREPARATION,'not_started')}};
  }
  if(input.kind==='assignment') return {...base,data:{...common,description:text(d.description??''),dueAt:instant(d.dueAt,'Deadline',true),priority:choice(d.priority,PRIORITIES,'normal'),estimatedMinutes:integer(d.estimatedMinutes,0,10000,0),completed:Boolean(d.completed),submissionStatus:choice(d.submissionStatus,SUBMISSION,'not_submitted'),url:safeLink(d.url)}};
  const startDate=date(d.startDate,'Project start',true),dueAt=instant(d.dueAt,'Project deadline',true),timezone=d.timezone||'Asia/Ho_Chi_Minh';
  if(!validZone(timezone))throw new Error('Choose a valid project timezone.');
  if(startDate&&dueAt&&dateIn(dueAt,timezone)<startDate) throw new Error('Project deadline cannot precede its start.');
  if(!Array.isArray(d.milestones??[])||!Array.isArray(d.tasks??[])||(d.milestones??[]).length>100||(d.tasks??[]).length>100) throw new Error('Use up to 100 milestones and tasks per project.');
  const milestones=(d.milestones??[]).map(m=>({id:id(m.id),title:required(m.title,'Milestone title'),dueAt:instant(m.dueAt,'Milestone deadline',true),completed:Boolean(m.completed)}));
  const tasks=(d.tasks??[]).map(t=>({id:id(t.id),title:required(t.title,'Task title'),completed:Boolean(t.completed)}));
  if(new Set([...milestones,...tasks].map(row=>row.id)).size!==milestones.length+tasks.length) throw new Error('Project item identities must be unique.');
  return {...base,data:{...common,description:text(d.description??''),startDate,dueAt,timezone,priority:choice(d.priority,PRIORITIES,'normal'),members:text(d.members??'',1000),resources:text(d.resources??'',5000),submissionStatus:choice(d.submissionStatus,SUBMISSION,'not_submitted'),milestones,tasks}};
}
export function projectProgress(data) { const all=[...data.milestones,...data.tasks]; return all.length?Math.round(all.filter(item=>item.completed).length/all.length*100):0; }
export function fromLocal(date,time,zone) { return zonedInstant(date,time,zone); }

export async function annotationId(sourceKey) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sourceKey));
  return 'annotation:'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export function assignmentKeyFromLink(value) {
  try {const url=new URL(value,ORIGIN);const match=url.pathname.match(/^\/courses\/(\d+)\/assignments\/(\d+)\/?$/);return url.origin===ORIGIN&&match?`${ORIGIN}|assignment:${match[2]}`:null;}catch{return null;}
}
