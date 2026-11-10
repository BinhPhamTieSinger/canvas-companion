import { addDays, weekday, monday, daysBetween, zonedInstant, dateIn } from './time.js';
import { projectProgress } from './model.js';

export function projectEvents(state,from,to) {
  if(daysBetween(from,to)>93) throw new Error('Choose a calendar range of no more than 94 days.');
  const zone=state.preferences.timezone,events=[],courses=new Map((state.cache?.courses||[]).map(c=>[c.id,c]));
  const annotations=new Map(state.records.filter(r=>r.kind==='annotation').map(r=>[r.data.sourceKey,r]));
  for(const record of state.records.filter(r=>r.kind==='course')) courses.set(record.id,{id:record.id,name:record.data.title,code:record.data.courseCode,color:record.data.color});
  const add=event=>{
    const course=courses.get(event.courseId),date=event.allDay&&event.date?event.date:event.startAt?dateIn(event.startAt,zone):event.dueAt?dateIn(event.dueAt,zone):event.date||null;
    const endDate=event.allDay&&event.date?event.date:event.endAt?dateIn(Date.parse(event.endAt)-1,zone):date;
    if(event.kind==='class'&&(date>to||endDate<from))return;
    events.push({...event,date,endDate,courseName:course?.name||'',courseCode:course?.code||event.courseCode||'',color:event.color||course?.color||'#4f7d72'});
  };
  for(const row of state.cache?.items||[]) {
    const annotation=annotations.get(row.key);
    add({...row,id:row.key,source:'canvas',annotation,priority:annotation?.data.priority||'normal',estimatedMinutes:annotation?.data.estimatedMinutes||0,completed:row.submitted||row.graded||row.excused||Boolean(annotation?.data.completed),notes:annotation?.data.notes||''});
  }
  for(const record of state.records) {
    const d=record.data,base={...d,id:record.id,record,source:'manual',kind:record.kind};
    if(record.kind==='class') {
      // Include adjacent local days for overnight and cross-timezone meetings.
      if(d.endDate<addDays(from,-2)||d.startDate>addDays(to,2))continue;
      for(let date=addDays(from,-2);date<=addDays(to,2);date=addDays(date,1)) {
        if(date<d.startDate||date>d.endDate||d.skippedDates.includes(date)||Math.floor(daysBetween(monday(d.startDate),monday(date))/7)%d.intervalWeeks!==0) continue;
        for(const meeting of d.meetings.filter(m=>m.day===weekday(date)&&(!m.activeDates?.length||m.activeDates.includes(date))&&!m.skippedDates?.includes(date))) {
          try {add({...base,...meeting,id:`${record.id}@${date}@${meeting.id}`,seriesId:record.id,title:`${d.title}${meeting.sessionType&&meeting.sessionType!=='lecture'?' · '+(meeting.sessionType==='tutorial'?'recitation':meeting.sessionType):''}`,startAt:zonedInstant(date,meeting.start,d.timezone),endAt:zonedInstant(meeting.overnight?addDays(date,1):date,meeting.end,d.timezone),date});}
          catch {add({...base,id:`${record.id}@${date}@${meeting.id}`,date,invalidTime:true});}
        }
      }
    } else if(['exam','assignment','event','office_hours'].includes(record.kind)) add(base);
    else if(record.kind==='project') {
      add({...base,progress:projectProgress(d),completed:d.submissionStatus==='submitted'});
      for(const milestone of d.milestones) add({...base,...milestone,id:`${record.id}:milestone:${milestone.id}`,kind:'milestone',projectTitle:d.title,record,priority:d.priority});
    }
  }
  return events.sort((a,b)=>(a.startAt||a.dueAt||'9999').localeCompare(b.startAt||b.dueAt||'9999')||a.title.localeCompare(b.title));
}
export function deadlineStatus(event,now,zone,soonHours=72) {
  if(event.completed||event.submitted||event.graded) return 'completed';
  if(!event.dueAt) return 'undated';
  const delta=Date.parse(event.dueAt)-now;
  if(delta<0)return 'overdue';
  if(dateIn(event.dueAt,zone)===dateIn(now,zone))return 'today';
  if(delta<=soonHours*3600000)return 'soon';
  return 'upcoming';
}
export function warnings(events,prefs,now=Date.now()) {
  const result=[],timed=events.filter(e=>e.startAt&&e.endAt&&e.endAt>e.startAt&&!e.allDay).sort((a,b)=>a.startAt.localeCompare(b.startAt));
  for(let i=0;i<timed.length;i++) {
    const a=timed[i];
    for(let j=i+1;j<timed.length;j++) {
      const b=timed[j];if(Date.parse(b.startAt)>=Date.parse(a.endAt))break;
      if(a.id===b.id)continue;
      result.push({id:`overlap:${a.id}:${b.id}`,type:'overlap',text:`${a.title} overlaps ${b.title}.`,eventIds:[a.id,b.id]});
    }
    const next=timed[i+1];
    if(next&&a.kind==='class'&&next.kind==='class') {
      const gap=(Date.parse(next.startAt)-Date.parse(a.endAt))/60000;
      if(gap>=0&&gap<prefs.travelMinutes)result.push({id:`travel:${a.id}:${next.id}`,type:'travel',text:`${Math.round(gap)} minutes between ${a.title} and ${next.title}; your buffer is ${prefs.travelMinutes} minutes.`,eventIds:[a.id,next.id]});
    }
  }
  const examDays=new Map();
  for(const e of events.filter(e=>e.kind==='exam'&&e.startAt)) {const date=dateIn(e.startAt,prefs.timezone);examDays.set(date,[...(examDays.get(date)||[]),e]);}
  for(const [date,exams] of examDays)if(exams.length>1)result.push({id:`exams:${date}`,type:'exams',text:`${exams.length} examinations on ${date}.`,eventIds:exams.map(e=>e.id)});
  const due=events.filter(e=>e.dueAt&&!e.completed&&Date.parse(e.dueAt)>=now&&Date.parse(e.dueAt)-now<=prefs.dueSoonHours*3600000);
  if(due.length)result.push({id:'due-soon',type:'deadline',text:`${due.length} incomplete deadline${due.length===1?'':'s'} within ${prefs.dueSoonHours} hours.`,eventIds:due.map(e=>e.id)});
  const major=events.filter(e=>e.dueAt&&e.priority==='high'&&!e.completed&&Date.parse(e.dueAt)>=now).sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
  let lastEnd=-1;
  for(let i=0;i<major.length;i++) {
    let end=i;while(end+1<major.length&&Date.parse(major[end+1].dueAt)-Date.parse(major[i].dueAt)<=prefs.clusterDays*86400000)end++;
    if(end-i+1>=prefs.clusterCount&&end>lastEnd){const group=major.slice(i,end+1);result.push({id:`cluster:${group[0].id}`,type:'cluster',text:`${group.length} high-priority deadlines within ${prefs.clusterDays} days.`,eventIds:group.map(e=>e.id)});lastEnd=end;}
  }
  for(const event of events.filter(e=>e.invalidTime))result.push({id:`invalid:${event.id}`,type:'invalid',text:`${event.title}: a meeting falls in a timezone clock change. Edit the class time.`,eventIds:[event.id]});
  return result;
}
export function visibleEvents(events,from,to,{includeUndated=false}={}) {
  return events.filter(event=>{
    if(!event.date)return includeUndated;
    if(event.startAt&&event.endAt){return event.date<=to&&(event.endDate||event.date)>=from;}
    return event.date>=from&&event.date<=to;
  });
}
export function countdown(instant,now=Date.now()) {
  const minutes=Math.ceil((Date.parse(instant)-now)/60000);
  if(minutes<=0)return 'Started / past';
  if(minutes<60)return `In ${minutes}m`;
  if(minutes<1440)return `In ${Math.floor(minutes/60)}h ${minutes%60}m`;
  return `In ${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h`;
}
