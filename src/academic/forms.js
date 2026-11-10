import { el,button } from './dom.js';
import { DEFAULT_PREFS } from './model.js';
import { dateIn,timeIn,zonedInstant } from './time.js';
const priorities=[['normal','Normal'],['high','High'],['low','Low']];
const statuses=[['not_submitted','Not submitted'],['submitted','Submitted'],['returned','Returned']];
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export function openEditor(root,{record,kind=record?.kind,state,event,onSave,onDelete}) {
  const data=record?.data||(event?.sourceUrl?{title:event.title,courseId:event.courseId,notes:`Source: ${event.sourceUrl}`} : {}),zone=state.preferences.timezone;
  const dialog=el('dialog',{class:'editor'}),form=el('form'),error=el('p',{class:'error',role:'alert'}),fields={};
  const title=kind==='preferences'?'Timetable preferences':`${record?'Edit':'Add'} ${kind==='annotation'?'personal assignment details':({office_hours:'office hours',exam:'examination',event:'event'}[kind]||kind)}`;
  const heading=el('h2',{},title);heading.id=`editor-${crypto.randomUUID()}`;dialog.setAttribute('aria-labelledby',heading.id);
  form.append(el('div',{class:'dialog-heading'},heading,button('Close',()=>dialog.close(),'icon',{'aria-label':'Close editor'})));
  if(kind==='annotation')form.append(el('p',{class:'hint'},event?.title||'Canvas assignment'),el('p',{class:'hint'},'Personal details stay in the companion. The checkbox does not submit coursework or change Canvas status.'));
  function field(key,label,type='text',value='',options={}) {
    const input=type==='textarea'?el('textarea',{rows:3,value,...options}):type==='select'?el('select',options,...value.map(([value,label])=>el('option',{value},label))):el('input',{type,value,...options});
    input.id=`f-${crypto.randomUUID()}`;
    const wrapper=el('div',{class:type==='checkbox'?'check-field':'field'},el('label',{htmlFor:input.id},label),input);
    form.append(wrapper);fields[key]=input;return input;
  }
  function select(key,label,options,value) {const input=field(key,label,'select',options);input.value=value;return input;}
  function check(key,label,value) {const input=field(key,label,'checkbox');input.checked=Boolean(value);return input;}
  function dateTime(key,label,instant) {
    const date=field(`${key}Date`,`${label} date`,'date',instant?dateIn(instant,zone):'');
    const time=field(`${key}Time`,`${label} time (${zone})`,'time',instant?timeIn(instant,zone):'');
    return ()=>{if(!date.value&&!time.value)return null;if(!date.value||!time.value)throw new Error(`${label} needs both a date and time.`);return zonedInstant(date.value,time.value,zone);};
  }
  if(kind==='preferences') {
    const p=state.preferences||DEFAULT_PREFS;
    field('timezone','Campus timezone (IANA)','text',p.timezone,{required:true,placeholder:'Asia/Ho_Chi_Minh'});
    field('travelMinutes','Minimum time between classes (minutes)','number',p.travelMinutes,{min:0,max:180});
    field('dueSoonHours','Due-soon window (hours)','number',p.dueSoonHours,{min:1,max:336});
    field('clusterDays','Concentrated-deadline window (days)','number',p.clusterDays,{min:1,max:14});
    field('clusterCount','High-priority deadlines that trigger a warning','number',p.clusterCount,{min:2,max:20});
  } else if(kind==='annotation') {
    select('priority','Priority',priorities,data.priority||'normal');field('estimatedMinutes','Estimated work (minutes)','number',data.estimatedMinutes||0,{min:0,max:10000});check('completed','Personally completed',data.completed);field('notes','Personal notes','textarea',data.notes||'');
  } else {
    const name=field('title',kind==='class'?'Course / class name':'Title','text',data.title||'',{required:true,maxLength:200});
    if(kind!=='course') {
      const courses=[...(state.cache?.courses||[]),...state.records.filter(r=>r.kind==='course').map(r=>({id:r.id,name:r.data.title,code:r.data.courseCode,color:r.data.color}))];
      const course=select('courseId','Associated course',[['','Personal / no linked course'],...courses.map(c=>[c.id,`${c.code?c.code+' · ':''}${c.name}`])],data.courseId||'');
      course.addEventListener('change',()=>{const selected=courses.find(c=>c.id===course.value);if(selected){if(!name.value&&kind==='class')name.value=selected.name;fields.color.value=selected.color||'#4f7d72';}});
    }
    field('courseCode','Course code / display code','text',data.courseCode||'',{maxLength:100});
    field('color','Subject color','color',data.color||'#4f7d72');
    if(kind==='class') {
      field('timezone','Class timezone (IANA)','text',data.timezone||zone,{required:true});
      field('startDate','Term start','date',data.startDate||'',{required:true});field('endDate','Term end','date',data.endDate||'',{required:true});
      field('intervalWeeks','Repeat every (weeks)','number',data.intervalWeeks||1,{min:1,max:8,required:true});
      field('instructor','Lecturer / instructor','text',data.instructor||'');
      const meetings=el('div',{class:'meeting-list'});form.append(el('h3',{},'Weekly meetings'),meetings);
      const rows=[];
      const addMeeting=(meeting={})=>{
        const row={id:meeting.id||crypto.randomUUID()},box=el('fieldset',{class:'meeting'});
        box.append(el('legend',{},'Meeting'));
        const item=(key,label,type,value,options={})=>{
          const input=type==='select'?el('select',options,...[['','Choose a day'],...days.map((name,index)=>[String(index+1),name])].map(([value,label])=>el('option',{value},label))):el('input',{type,value,...options});
          input.id=`m-${crypto.randomUUID()}`;if(type==='select')input.value=value;
          row[key]=input;box.append(el('label',{htmlFor:input.id},label),input);
        };
        item('sessionType','Session type','select',(meeting.sessionType==='tutorial'?'recitation':meeting.sessionType)||'lecture');row.sessionType.replaceChildren(...[['lecture','Lecture'],['lab','Lab'],['recitation','Recitation'],['seminar','Seminar'],['other','Other']].map(([value,label])=>el('option',{value},label)));row.sessionType.value=(meeting.sessionType==='tutorial'?'recitation':meeting.sessionType)||'lecture';
        item('day','Day','select',String(meeting.day||''),{required:true});item('start','Start','time',meeting.start||'',{required:true});item('end','End','time',meeting.end||'',{required:true});
        item('overnight','Ends on the following day','checkbox','');row.overnight.checked=Boolean(meeting.overnight);
        for(const [key,label] of [['room','Classroom'],['building','Building'],['campus','Campus / location']])item(key,label,'text',meeting[key]||'');
        item('activeDates','Only these dates (optional, comma-separated YYYY-MM-DD)','text',(meeting.activeDates||[]).join(', '));item('skippedDates','Skip meeting dates (comma-separated YYYY-MM-DD)','text',(meeting.skippedDates||[]).join(', '));
        box.append(button('Remove meeting',()=>{rows.splice(rows.indexOf(row),1);box.remove();},'text-button'));rows.push(row);meetings.append(box);
      };
      for(const meeting of data.meetings||[{}])addMeeting(meeting);
      form.append(button('Add another weekday / time',()=>addMeeting()));
      field('skippedDates','Skip dates (comma-separated YYYY-MM-DD)','text',(data.skippedDates||[]).join(', '));
      fields.meetings=()=>rows.map(row=>({id:row.id,activeDates:row.activeDates.value.split(',').map(v=>v.trim()).filter(Boolean),skippedDates:row.skippedDates.value.split(',').map(v=>v.trim()).filter(Boolean),sessionType:row.sessionType.value,day:Number(row.day.value),start:row.start.value,end:row.end.value,overnight:row.overnight.checked,room:row.room.value,building:row.building.value,campus:row.campus.value}));
      form.append(el('p',{class:'hint'},'Editing a class updates its recurring series. Skip dates cancel individual meetings.'));
    } else if(['exam','event','office_hours'].includes(kind)) {
      if(kind==='exam')field('type','Examination type','text',data.type||'',{required:true,placeholder:'Midterm, final, quiz, practical…'});
      fields.startAt=dateTime('startAt',kind==='exam'?'Examination start':'Event start',data.startAt);fields.endAt=dateTime('endAt',kind==='exam'?'Examination end':'Event end',data.endAt);
      for(const [key,label] of [['room','Room'],['building','Building'],['campus','Campus / location']])field(key,label,'text',data[key]||'');
      field('instructions','Special instructions','textarea',data.instructions||'');
      if(kind==='exam')select('preparation','Preparation status',[['not_started','Not started'],['preparing','Preparing'],['ready','Ready']],data.preparation||'not_started');
      form.append(el('p',{class:'hint'},kind==='exam'?'Duration and countdown are calculated from the examination times.':'Leave the end date and time blank when the source does not specify them.'));
    } else if(kind==='assignment'||kind==='project') {
      field('description','Description','textarea',data.description||'');
      fields.dueAt=dateTime('dueAt',kind==='project'?'Final deadline':'Deadline',data.dueAt);
      select('priority','Priority',priorities,data.priority||'normal');select('submissionStatus','Submission status (personal record)',statuses,data.submissionStatus||'not_submitted');
      if(kind==='assignment') {
        field('estimatedMinutes','Estimated work (minutes)','number',data.estimatedMinutes||0,{min:0,max:10000});check('completed','Completed',data.completed);field('url','Related source link','url',data.url||'');form.append(el('p',{class:'hint'},'Canvas assignments should be synced, then edited through Personal details on their existing entry. A Canvas assignment link cannot create a second assignment.'));
      } else {
        field('startDate','Project start','date',data.startDate||'');field('members','Group members','textarea',data.members||'');field('resources','Resources / links','textarea',data.resources||'');
        const collection=(key,title,withDate)=>{
          const section=el('div',{class:'project-items'}),rows=[];form.append(el('h3',{},title),section);
          function add(item={}) {
            const name=el('input',{type:'text',value:item.title||'',placeholder:withDate?'Milestone title':'Smaller task title',required:true,'aria-label':`${title} title`});
            const complete=el('input',{type:'checkbox',checked:Boolean(item.completed),'aria-label':`${title} completed`});
            const row={id:item.id||crypto.randomUUID(),name,complete},box=el('div',{class:'project-item'},complete,name);
            if(withDate){row.date=el('input',{type:'date',value:item.dueAt?dateIn(item.dueAt,zone):'','aria-label':'Milestone date'});row.time=el('input',{type:'time',value:item.dueAt?timeIn(item.dueAt,zone):'','aria-label':'Milestone time'});box.append(row.date,row.time);}
            box.append(button('Remove',()=>{rows.splice(rows.indexOf(row),1);box.remove();},'text-button'));rows.push(row);section.append(box);
          }
          for(const item of data[key]||[])add(item);
          form.append(button(`Add ${withDate?'milestone':'smaller task'}`,()=>add()));
          fields[key]=()=>rows.map(row=>{const result={id:row.id,title:row.name.value,completed:row.complete.checked};if(withDate){if(Boolean(row.date.value)!==Boolean(row.time.value))throw new Error('A milestone deadline needs both date and time.');result.dueAt=row.date.value?zonedInstant(row.date.value,row.time.value,zone):null;}return result;});
        };
        collection('milestones','Milestones',true);collection('tasks','Project tasks',false);
        form.append(el('p',{class:'hint'},'Progress is the percentage of completed milestones and smaller tasks.'));
      }
    }
    field('notes','Additional notes','textarea',data.notes||'');
  }
  const submit=el('button',{type:'submit',class:'primary'},'Save'),actions=el('div',{class:'dialog-actions'},button('Cancel',()=>dialog.close()),submit);
  if(record&&onDelete)actions.prepend(button('Delete (undo available)',async()=>{try{await onDelete(record);dialog.close();}catch(err){error.textContent=err.message;}},'danger'));
  form.append(error,actions);dialog.append(form);root.append(dialog);
  let saving=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(saving)return;saving=true;submit.disabled=true;error.textContent='';
    try {
      const next={};
      for(const [key,input] of Object.entries(fields)) {
        if(key.endsWith('Date')&&['startAtDate','endAtDate','dueAtDate'].includes(key)||key.endsWith('Time'))continue;
        next[key]=typeof input==='function'?input():input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
      }
      if(kind==='project')next.timezone=zone;
      if(kind==='class')next.skippedDates=fields.skippedDates.value.split(',').map(value=>value.trim()).filter(Boolean);
      if(kind==='annotation')next.sourceKey=data.sourceKey||event.key||event.id;
      await onSave(next);dialog.close();
    } catch(err){error.textContent=err.message;}
    finally{saving=false;submit.disabled=false;}
  });
  dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
