import { validateRecord } from './model.js';
export function candidates(course,catalog){
  const code=String(course.code||'').toUpperCase().replace(/[^A-Z0-9_]/g,'');
  const suffix=code.match(/(FAL|SPR|SUM|WIN)(20\d{2}|\d{2})(?:\D|$)/);
  if(suffix){const seasons={FAL:'fall',SPR:'spring',SUM:'summer',WIN:'winter'},year=suffix[2].length===2?'20'+suffix[2]:suffix[2];if(catalog.term!==`${seasons[suffix[1]]}-${year}`)return [];}
  const exact=catalog.entries.filter(e=>code.startsWith(e.code.toUpperCase())&&(code.length===e.code.length||/^(?:FAL|SPR|SUM|WIN|_|\d{2,4})/.test(code.slice(e.code.length))));
  if(exact.length){const longest=Math.max(...exact.map(e=>e.code.length));return exact.filter(e=>e.code.length===longest);}
  const normalize=s=>String(s).toLowerCase().replace(/&/g,'and').replace(/[^\p{L}\p{N}]/gu,'');
  return catalog.entries.filter(e=>normalize(e.title)===normalize(course.name));
}
export function catalogRecord(scope,course,entry,catalog){
  if(entry.complete===false||!entry.meetings?.length||!entry.startDate||!entry.endDate)throw new Error('The catalog has no complete schedule for this section.');
  const id=`catalog:${catalog.term}:${entry.id}`.replace(/[^\w:.-]/g,'_').slice(0,180);
  return validateRecord({scope,id,kind:'class',data:{title:course.name,courseId:course.id,courseCode:entry.code,color:course.color||'#4f7d72',timezone:catalog.timezone,startDate:entry.startDate,endDate:entry.endDate,intervalWeeks:1,skippedDates:[],meetings:entry.meetings.map((m,i)=>({...m,id:`slot-${i}`,sessionType:m.sessionType||'other',room:m.room||'',building:'',campus:'VinUniversity'})),notes:`Catalog section: ${entry.section}\nSnapshot: ${catalog.capturedAt}; term ${catalog.term}.\nSource: ${catalog.source}\nConfirm your registered section and any lecture/lab/recitation groups. Rooms and cancellations require course-source review. No current registration or live seat availability is implied.`}});
}
