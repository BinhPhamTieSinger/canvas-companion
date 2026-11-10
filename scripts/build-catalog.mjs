import fs from 'node:fs/promises';
import {dateIn,timeIn,weekday} from '../src/academic/time.js';
const input=process.argv[2];
if(!input)throw new Error('Pass the sanitized portal catalog response export.');
const raw=JSON.parse(await fs.readFile(input,'utf8'));
if(raw.format!=='vinuni-course-catalog-response'||raw.total!==389||raw.entries.length!==389)throw new Error('Expected a complete 389-section Fall 2026 snapshot.');
const zone='Asia/Ho_Chi_Minh',entries=[];
for(const row of raw.entries){
  const groups=new Map(),dates=[];let incomplete=false;
  for(const o of row.occurrences){
    if(!o.startAt||!o.endAt||!Number.isFinite(Date.parse(o.startAt))||Date.parse(o.endAt)<=Date.parse(o.startAt)){incomplete=true;continue;}
    const date=dateIn(o.startAt,zone),endDate=dateIn(o.endAt,zone),day=weekday(date),start=timeIn(o.startAt,zone),end=timeIn(o.endAt,zone);
    if(date!==o.date||date!==endDate){incomplete=true;continue;}
    const key=`${day}|${start}|${end}|${o.room||''}`;
    if(!groups.has(key))groups.set(key,{day,start,end,room:o.room||'',sessionType:'other',activeDates:[]});
    groups.get(key).activeDates.push(date);dates.push(date);
  }
  dates.sort();const meetings=[...groups.values()].map(m=>({...m,activeDates:[...new Set(m.activeDates)].sort()}));
  entries.push({id:row.id,code:row.code,title:row.title,section:row.section,startDate:dates[0]||null,endDate:dates.at(-1)||null,complete:!incomplete&&meetings.length>0&&meetings.length<=35,meetings});
}
if(new Set(entries.map(e=>e.id)).size!==389)throw new Error('Duplicate source section identities.');
const catalog={format:'canvas-companion-course-catalog',version:1,term:'fall-2026',capturedAt:raw.capturedAt,timezone:zone,source:'https://one.vinuni.edu.vn/student/hoc-tap/dang-ky-tin-chi/',sectionCount:entries.length,courseCount:new Set(entries.map(e=>e.code)).size,notes:'Published meeting dates only. Session types and rooms must be confirmed through Canvas Home or the course syllabus. This is a dated snapshot, not live registration data.',entries};
await fs.writeFile(new URL('../src/catalog/vinuni-fall-2026.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({sections:catalog.sectionCount,courses:catalog.courseCount,withSchedule:entries.filter(e=>e.complete).length,withoutSchedule:entries.filter(e=>!e.meetings.length).length,incomplete:entries.filter(e=>e.meetings.length&&!e.complete).length,maxSlots:Math.max(...entries.map(e=>e.meetings.length))}));
