import { ORIGIN } from '../background/model.js';
import { scopeFor } from './model.js';
import { validDate, validZone } from './time.js';
const ALLOWED = new Set(['/api/v1/users/self/profile','/api/v1/users/self/colors','/api/v1/courses','/api/v1/planner/items','/api/v1/calendar_events','/api/v1/announcements']);
export function sourceLink(value) { try {const u=new URL(value,ORIGIN);return u.origin===ORIGIN?`${u.origin}${u.pathname}${u.hash}`:'';}catch{return '';} }
export function plainText(value) {
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  return String(value??'').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_all,key)=>{
    if(key[0]!=='#')return named[key.toLowerCase()]||' ';
    const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
    return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';
  }).replace(/\s+/g,' ').trim().slice(0,5000);
}
function stamp(value) { return typeof value==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null; }
function taskIdentity(course,id) { return `${ORIGIN}|assignment:${id}`; }
export function normalizePlanner(item) {
  const p=item.plannable||{};
  const link=sourceLink(item.html_url||p.linked_object_html_url||'');
  const course=String(p.course_id??item.course_id??link.match(/\/courses\/(\d+)/)?.[1]??'');
  const linkedId=link.match(/\/assignments\/(\d+)/)?.[1];
  const assignment=p.assignment_id??item.assignment_id??linkedId??(item.plannable_type==='assignment'?(p.id??item.plannable_id):null);
  if(assignment==null)return null; // Unknown planner notes/quizzes are not invented assignments.
  return {key:taskIdentity(course,String(assignment)),kind:'assignment',courseId:course,title:plainText(p.title)||'Untitled Canvas item',description:plainText(p.description||p.details),dueAt:stamp(Object.hasOwn(p,'due_at')?p.due_at:item.plannable_date),startAt:null,endAt:null,url:link,submitted:Boolean(item.submissions?.submitted),graded:Boolean(item.submissions?.graded),excused:Boolean(item.submissions?.excused),submissionKnown:Boolean(item.submissions&&typeof item.submissions==='object'),location:''};
}
export function normalizeCalendar(item) {
  if(item.hidden||item.workflow_state==='deleted')return null;
  const assignment=item.assignment||{},course=String(assignment.course_id??String(item.context_code||'').match(/^course_(\d+)$/)?.[1]??'');
  const id=assignment.id??String(item.id).match(/^assignment_(\d+)$/)?.[1];
  if(id!=null)return {key:taskIdentity(course,String(id)),kind:'assignment',courseId:course,title:plainText(item.title||assignment.name)||'Untitled Canvas item',description:plainText(item.description||assignment.description),dueAt:stamp(assignment.due_at||item.start_at),startAt:null,endAt:null,url:sourceLink(item.html_url||assignment.html_url),submitted:Boolean(assignment.submission?.submitted_at||assignment.submission?.excused),graded:Boolean(assignment.submission?.graded_at),excused:Boolean(assignment.submission?.excused),submissionKnown:Boolean(assignment.submission),location:''};
  if(item.id==null)return null;
  return {key:`${ORIGIN}|calendar:${item.id}`,kind:'canvas_event',courseId:course,allDay:Boolean(item.all_day),date:validDate(item.all_day_date)?item.all_day_date:null,title:plainText(item.title)||'Untitled Canvas event',description:plainText(item.description),dueAt:null,startAt:stamp(item.start_at),endAt:stamp(item.end_at),url:sourceLink(item.html_url),location:plainText([item.location_name,item.location_address].filter(Boolean).join(' · ')),submitted:false,graded:false};
}
export function mergeSources(rows) {
  const result=new Map();
  for(const item of rows.filter(Boolean)) {
    const old=result.get(item.key);
    // Planner effective dates/submission flags win when it follows calendar wrappers.
    result.set(item.key,{...old,...item,description:item.description||old?.description||'',url:item.url||old?.url||'',submitted:item.submitted,graded:item.graded,excused:item.excused,submissionKnown:item.submissionKnown});
  }
  return [...result.values()];
}
export class CanvasReader {
  constructor(fetcher=(...args)=>fetch(...args)) { this.fetcher=fetcher; }
  async response(input) {
    const url=new URL(input,ORIGIN);
    if(url.origin!==ORIGIN||!(ALLOWED.has(url.pathname)||/^\/api\/v1\/courses\/\d+\/front_page$/.test(url.pathname)))throw new Error('Unsupported Canvas read endpoint.');
    let response;
    try {response=await this.fetcher(url.href,{method:'GET',credentials:'same-origin',redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});} catch {throw new Error('Canvas could not be reached. Your saved academic records are unchanged.');}
    if(response.status===401||response.status===403)throw new Error('Sign in to Canvas, or check that your account can access this calendar. No saved data was changed.');
    if(!response.ok)throw Object.assign(new Error('Canvas returned an error. The previous successful snapshot is preserved.'),{status:response.status});
    let data;try{data=await response.json();}catch{throw new Error('Canvas returned an unsupported response. Sign in through the official Canvas page and retry.');}
    return {data,response};
  }
  async pages(input) {
    let next=new URL(input,ORIGIN).href;const all=[],seen=new Set();
    for(let page=0;next;page++) {
      if(page>=30||seen.has(next))throw new Error('Canvas pagination did not complete. Choose a smaller date range and retry.');
      seen.add(next);const {data,response}=await this.response(next);
      if(!Array.isArray(data))throw new Error('Canvas returned an unsupported list.');all.push(...data);
      const match=(response.headers.get('link')||'').match(/<([^>]+)>;\s*rel="next"/);next=match?new URL(match[1],ORIGIN).href:null;
    }
    return all;
  }
  async profile() {
    const {data}=await this.response('/api/v1/users/self/profile');
    return {scope:scopeFor(data.id),id:String(data.id),timezone:validZone(data.time_zone)?data.time_zone:null};
  }
  async catalog() {
    const response=await this.fetcher(new URL('../catalog/vinuni-fall-2026.json',import.meta.url).href,{method:'GET',credentials:'omit'});
    if(!response.ok)throw new Error('The bundled course catalog is unavailable.');
    return response.json();
  }
  async sources(courses,_from,_to) {
    const sources=[],sourceWarnings=[];
    const start=new Date(Date.now()-180*86400000).toISOString().slice(0,10),end=new Date(Date.now()+86400000).toISOString().slice(0,10);
    for(const course of courses){
      const id=String(course.id);if(!/^\d+$/.test(id))continue;
      if(course.syllabus_body!=null)sources.push(await documentSource({key:`syllabus:${id}`,courseId:id,kind:'syllabus',title:'Canvas syllabus',url:`${ORIGIN}/courses/${id}/assignments/syllabus`,body:course.syllabus_body}));
      try{const {data}=await this.response(`/api/v1/courses/${id}/front_page`);sources.push(await documentSource({key:`home:${id}`,courseId:id,kind:'home',title:data.title||'Course home',url:sourceLink(data.html_url||`/courses/${id}`),body:data.body||''}));}
      catch(error){if(error.status!==404)sourceWarnings.push({courseId:id,kind:'home',message:'Course home could not be checked; previous source state is preserved.'});}
      try{const rows=await this.pages(`/api/v1/announcements?context_codes[]=course_${id}&start_date=${start}&end_date=${end}&include[]=sections&per_page=100`);for(const a of rows)sources.push(await documentSource({key:`announcement:${a.id}`,courseId:id,kind:'announcement',title:a.title||'Announcement',url:sourceLink(a.html_url||`/courses/${id}/discussion_topics/${a.id}`),body:a.message||'',sections:(a.sections||[]).map(s=>plainText(s.name))}));}
      catch{sourceWarnings.push({courseId:id,kind:'announcement',message:'Announcements could not be checked; previous source state is preserved.'});}
    }
    return {sources,sourceWarnings};
  }
  async snapshot(profile,from,to) {
    if(!validDate(from)||!validDate(to)||to<from)throw new Error('Choose a valid Canvas date range.');
    const [rawCourses,planner]=await Promise.all([this.pages('/api/v1/courses?enrollment_state=active&per_page=100&include[]=syllabus_body&include[]=sections'),this.pages(`/api/v1/planner/items?start_date=${from}&end_date=${to}&per_page=100`)]);
    let colors={};try{colors=(await this.response('/api/v1/users/self/colors')).data.custom_colors||{};}catch{/* Colors are presentation only; no academic source failure is concealed. */}
    const courses=rawCourses.filter(course=>course.id!=null).map(course=>({id:String(course.id),name:plainText(course.name),code:plainText(course.course_code),color:colors[`course_${course.id}`]||'#4f7d72',sections:(course.sections||[]).map(s=>({id:String(s.id),name:plainText(s.name)}))}));
    const contexts=[`user_${profile.id}`,...courses.map(course=>`course_${course.id}`)],calendar=[];
    for(let offset=0;offset<contexts.length;offset+=10) {
      const params=new URLSearchParams({start_date:from,end_date:to,per_page:'100'});
      for(const code of contexts.slice(offset,offset+10))params.append('context_codes[]',code);
      for(const type of ['event','assignment'])calendar.push(...await this.pages(`/api/v1/calendar_events?${params}&type=${type}`));
    }
    const sourceResult=await this.sources(rawCourses,from,to);
    return {from,to,courses,items:mergeSources([...calendar.map(normalizeCalendar),...planner.map(normalizePlanner)]),...sourceResult};
  }
}

export async function documentSource({body,...source}) {
  const bytes=new TextEncoder().encode(`${source.title}\n${body}`);
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const summary=plainText(body).split(/Student Name|Student ID|Room list for each student/i)[0].slice(0,900);
  return {...source,digest,summary};
}
