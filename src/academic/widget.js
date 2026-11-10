import { ORIGIN,isDashboard } from '../background/model.js';
import { CanvasReader } from './canvas.js';
import { validateRecord,annotationId } from './model.js';
import { projectEvents,visibleEvents,warnings,deadlineStatus,countdown } from './engine.js';
import { dateIn,timeIn,addDays,windowFor,labelDate,minuteOfDay } from './time.js';
import { el,button } from './dom.js';
import { openEditor } from './forms.js';
import { styles } from './styles.js';
const TITLES={class:'Class',exam:'Examination',assignment:'Assignment',project:'Project',milestone:'Milestone',canvas_event:'Canvas event',event:'Event',office_hours:'Office hours'};
const STATUS={today:'Due today',soon:'Due soon',overdue:'Overdue',upcoming:'Upcoming',completed:'Completed',undated:'No deadline'};
const VIEWS=[['day','Day'],['week','Week'],['month','Month'],['exams','Exams'],['deadlines','Deadlines'],['overview','Overview']];
export class AcademicController {
  constructor(document,{chrome:runtime=chrome,api=new CanvasReader(),clock=()=>Date.now(),dashboard=()=>isDashboard(location)}={}) {
    this.document=document;this.chrome=runtime;this.api=api;this.clock=clock;this.dashboard=dashboard;this.profile=null;this.ui=null;this.connecting=null;this.destroyed=false;
    this.listener=(changes,area)=>{if(area==='local'&&changes.academicRevision?.newValue?.scope===this.profile?.scope)void this.refresh();};
    runtime.storage.onChanged.addListener(this.listener);
    this.timer=setInterval(()=>{if(this.ui&&!this.ui.hasEditor())this.ui.render();},60000);
  }
  async rpc(action,data={}) {
    if(action!=='read'){const current=await this.api.profile();if(current.scope!==this.profile?.scope){await this.connect();throw new Error('Your Canvas account changed. Reopen the timetable before changing data.');}}
    const response=await this.chrome.runtime.sendMessage({namespace:'canvas-companion',action:`academic.${action}`,scope:this.profile?.scope,...data});
    if(!response?.ok)throw new Error(response?.error||'The timetable is unavailable. Reload Canvas and try again.');return response.data;
  }
  async route() {
    if(this.destroyed)return;
    if(!this.dashboard()){this.ui?.destroy();this.ui=null;this.profile=null;return;}
    const anchor=this.document.querySelector('#content')||this.document.querySelector('main');if(!anchor)return;
    if(!this.ui)this.ui=new AcademicWidget(anchor,this);
    else if(!this.ui.host.isConnected)anchor.prepend(this.ui.host);
    if(!this.profile&&!this.connecting)await this.connect();
  }
  async connect() {
    if(this.connecting)return this.connecting;
    this.ui?.message('Connecting to your Canvas account…');
    if(this.ui)this.ui.host.style.visibility='hidden';
    this.connecting=(async()=>{
      try {
        const profile=await this.api.profile();
        if(this.destroyed||!this.dashboard())return;
        if(this.profile?.scope!==profile.scope){this.ui?.reset();this.profile=profile;}
        await this.refresh();
      }catch(error){this.profile=null;this.ui?.reset();this.ui?.message(error.message,true);}
      finally{this.connecting=null;if(this.ui)this.ui.host.style.visibility='';}
    })();return this.connecting;
  }
  async focus() { if(!this.dashboard())return; await this.connect(); }
  async refresh() {
    if(!this.profile||!this.ui)return;
    try {const state=await this.rpc('read');if(state.scope!==this.profile?.scope)return;this.ui.setState(state);}catch(error){this.ui.message(error.message,true);}
  }
  destroy(){this.destroyed=true;this.chrome.storage?.onChanged?.removeListener(this.listener);clearInterval(this.timer);this.ui?.destroy();}
}
export class AcademicWidget {
  constructor(anchor,controller) {
    this.controller=controller;this.state=null;this.busy=false;this.filter='';this.view='week';this.showCompleted=false;this.collapsed=false;this.date=dateIn(controller.clock(),'Asia/Ho_Chi_Minh');
    this.host=el('section',{id:'canvas-companion-academic','aria-label':'Academic timetable'});this.root=this.host.attachShadow({mode:'open'});
    this.panel=el('div',{class:'shell'});this.root.append(el('style',{},styles),this.panel);anchor.prepend(this.host);this.render();
  }
  hasEditor(){return Boolean(this.root.querySelector('dialog[open]'));}
  reset(){for(const dialog of this.root.querySelectorAll('dialog'))dialog.close();this.state=null;this.panel.replaceChildren();}
  destroy(){for(const d of this.root.querySelectorAll('dialog'))d.close();this.host.remove();}
  setState(state){const first=!this.state;this.state=state;const p=state.preferences;this.view=p.view;this.filter=p.courseFilter;this.showCompleted=p.showCompleted;this.collapsed=p.collapsed;if(first)this.date=dateIn(this.controller.clock(),p.timezone);this.notice=state.warning||'';this.error=false;this.render();}
  message(message,error=false){this.notice=message;this.error=error;this.render();}
  async mutate(action,data,success) {
    if(this.busy){const error=new Error('Another timetable update is running. Wait for it to finish, then save again.');this.message(error.message,true);throw error;}this.busy=true;
    try {const state=await this.controller.rpc(action,data);this.setState(state);if(success)this.message(success);return state;}
    catch(error){this.message(error.message,true);throw error;}
    finally{this.busy=false;this.render();}
  }
  async savePreferences(changes) {try{await this.mutate('preferences',{preferences:{...this.state.preferences,...changes},revision:this.state.revision});}catch{} }
  edit(kind,record=null,event=null) {
    if(!this.state)return;
    if(kind==='annotation'&&!record)record=this.state.records.find(row=>row.kind==='annotation'&&row.data.sourceKey===event.id)||null;
    openEditor(this.root,{kind,record,state:this.state,event,onSave:async data=>{
      if(kind==='preferences'){await this.mutate('preferences',{preferences:{...this.state.preferences,...data},revision:this.state.revision},'Timetable preferences saved.');return;}
      const input=validateRecord({scope:this.state.scope,id:record?.id||(kind==='annotation'?await annotationId(event.id):crypto.randomUUID()),kind,data});
      await this.mutate('save',{record:input,revision:record?.revision||0},'Saved locally.');
    },onDelete:record?async row=>this.mutate('remove',{kind:row.kind,id:row.id,revision:row.revision},'Deleted locally. Undo is available.'):null});
  }
  async toggle(event) {
    try {
      if(event.source==='canvas') {
        const record=this.state.records.find(row=>row.kind==='annotation'&&row.data.sourceKey===event.id);
        await this.mutate('save',{record:{scope:this.state.scope,id:record?.id||await annotationId(event.id),kind:'annotation',data:{...record?.data,sourceKey:event.id,completed:!Boolean(record?.data.completed)}},revision:record?.revision||0});
      } else {
        const row=event.record,data=structuredClone(row.data);
        if(event.kind==='milestone'){const item=data.milestones.find(item=>`${row.id}:milestone:${item.id}`===event.id);item.completed=!item.completed;}
        else data.completed=!data.completed;
        await this.mutate('save',{record:{...row,data},revision:row.revision});
      }
    }catch{}
  }
  async sync() {
    if(this.busy||!this.state)return;this.busy=true;this.message('Reading authorized Canvas courses, planner items and calendars…');
    try {
      const profile=await this.controller.api.profile();
      if(profile.scope!==this.state.scope){await this.controller.connect();throw new Error('Your Canvas account changed. Reopen the timetable before syncing.');}
      const range=windowFor(this.view,this.date),snapshot=await this.controller.api.snapshot(profile,addDays(range.from,-30),addDays(range.to,90));
      const state=await this.controller.rpc('sync',{snapshot});this.setState(state);this.message('Canvas source data refreshed. Personal records are unchanged.');
    }catch(error){this.message(error.message,true);}finally{this.busy=false;this.render();}
  }
  eventCard(event,{compact=false}={}) {
    const p=this.state.preferences,zone=p.timezone,now=this.controller.clock(),status=['assignment','project','milestone'].includes(event.kind)?deadlineStatus(event,now,zone,p.dueSoonHours):null;
    const timing=event.allDay?'All day':event.startAt?`${timeIn(event.startAt,zone)}${event.endAt?'–'+timeIn(event.endAt,zone):''}`:event.dueAt?`${labelDate(dateIn(event.dueAt,zone))} · ${timeIn(event.dueAt,zone)}`:'Time not available';
    if(compact){const chip=button(`${TITLES[event.kind]||'Event'} · ${event.title}`,()=>this.details(event),'deadline-chip');chip.style.setProperty('--course',event.color);return chip;}
    const title=el('div',{class:'event-title'},el('span',{class:`tag ${status||''}`},TITLES[event.kind]||'Event'),event.title),meta=[event.courseCode||event.courseName,timing];
    if(status)meta.push(STATUS[status]);
    if(event.source==='canvas'&&event.kind==='assignment')meta.push(event.excused?'Canvas: excused':event.submitted?'Canvas: submitted':event.graded?'Canvas: graded':event.submissionKnown?'Canvas: not submitted':'Canvas: status unavailable');
    if(event.room||event.building||event.campus)meta.push([event.room,event.building,event.campus].filter(Boolean).join(' · '));
    if(event.location)meta.push(event.location);
    if(event.kind==='exam')meta.push(countdown(event.startAt,now),`Preparation: ${event.preparation.replaceAll('_',' ')}`);
    if(event.kind==='project')meta.push(`${event.progress}% complete`);
    const main=el('div',{class:'event-main'},title,el('div',{class:'event-meta'},meta.filter(Boolean).join(' · ')));
    if(event.kind==='project')main.append(el('div',{class:'project-progress'},el('span',{style:`width:${event.progress}%`}))); // validated numeric derived value
    const actions=el('div',{class:'event-actions'},button('Details',()=>this.details(event)));
    if((event.kind==='assignment'&&!event.submitted&&!event.graded&&!event.excused)||event.kind==='milestone')actions.append(button(event.completed?'Reopen':'Complete',()=>this.toggle(event),'secondary',{'aria-label':`${event.completed?'Reopen':'Complete personally'}: ${event.title}`}));
    const card=el('article',{class:`event ${event.kind}`},main,actions);card.style.setProperty('--course',event.color);return card;
  }
  details(event) {
    const dialog=el('dialog',{class:'editor'}),body=el('div',{class:'details-list',style:'padding:22px'});
    body.append(el('h2',{},event.title),el('p',{class:'hint'},`${TITLES[event.kind]||'Event'} · ${event.source==='canvas'?'Canvas source':'Manual record'}`));
    const lines=[];const d={...event.record?.data,...event};
    for(const [key,label] of [['description','Description'],['courseCode','Course code'],['instructor','Instructor'],['room','Room'],['building','Building'],['campus','Campus'],['location','Location'],['instructions','Special instructions'],['preparation','Preparation'],['members','Group members'],['resources','Resources'],['notes','Notes'],['submissionStatus','Personal submission status']])if(d[key])lines.push(`${label}: ${d[key]}`);
    if(event.startAt&&event.endAt)lines.unshift(`Duration: ${Math.round((Date.parse(event.endAt)-Date.parse(event.startAt))/60000)} minutes`);
    if(event.kind==='exam')lines.unshift(countdown(event.startAt,this.controller.clock()));
    if(d.estimatedMinutes)lines.push(`Estimated work: ${d.estimatedMinutes} minutes`);
    if(d.milestones?.length)lines.push('Milestones:\n'+d.milestones.map(m=>`${m.completed?'✓':'○'} ${m.title}${m.dueAt?' — '+labelDate(dateIn(m.dueAt,this.state.preferences.timezone)):''}`).join('\n'));
    if(d.tasks?.length)lines.push('Smaller tasks:\n'+d.tasks.map(t=>`${t.completed?'✓':'○'} ${t.title}`).join('\n'));
    body.append(el('p',{},lines.join('\n\n')||'No additional details.'));
    if(event.url)body.append(el('p',{},el('a',{href:event.url,target:'_blank',rel:'noopener noreferrer'},'Open source in Canvas')));
    const actions=el('div',{class:'dialog-actions'},button('Close',()=>dialog.close()));
    if(event.source==='manual')actions.append(button(event.kind==='class'?'Edit recurring class':'Edit',()=>{dialog.close();this.edit(event.record.kind,event.record,event);},'primary'));
    else if(event.kind==='assignment')actions.append(button('Personal details',()=>{dialog.close();this.edit('annotation',null,event);},'primary'));
    body.append(actions);dialog.append(body);this.root.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
  }
  agenda(events,from,to) {
    const container=el('div');let any=false;
    for(let date=from;date<=to;date=addDays(date,1)) {
      const day=events.filter(event=>event.date===date||(event.startAt&&event.date<date&&event.endDate>=date));
      if(!day.length)continue;any=true;
      container.append(el('section',{class:'agenda-day'},el('h3',{},labelDate(date,{weekday:'long'})),...day.map(event=>this.eventCard(event))));
    }
    if(!any)container.append(this.empty('Nothing scheduled in this range.','Add a class, examination, assignment or project. Canvas data is imported only when you choose Refresh Canvas.'));
    return container;
  }
  empty(title,text){return el('div',{class:'empty'},el('strong',{},title),el('p',{},text));}
  week(events,from,to) {
    const zone=this.state.preferences.timezone,dates=Array.from({length:7},(_,i)=>addDays(from,i));
    const timed=events.filter(e=>e.startAt&&e.endAt&&e.endAt>e.startAt&&!e.invalidTime&&!e.allDay);
    if(!timed.length)return this.agenda(events,from,to);
    let min=7*60,max=22*60;
    for(const e of timed){min=Math.min(min,Math.floor(minuteOfDay(timeIn(e.startAt,zone))/60)*60);max=Math.max(max,Math.ceil((minuteOfDay(timeIn(e.endAt,zone))||1440)/60)*60);if(e.endDate!==e.date){min=0;max=1440;}}
    max=Math.max(max,min+120);const span=max-min,hours=span/60;
    const grid=el('div',{class:'week'});grid.append(el('div'),...dates.map(date=>el('div',{class:`week-head ${date===dateIn(this.controller.clock(),zone)?'today':''}`},labelDate(date,{weekday:'short'}))));
    const axis=el('div',{class:'time-axis'});for(let time=min;time<=max;time+=60)axis.append(el('span',{style:`top:${(time-min)/span*100}%`},`${String(Math.floor(time/60)).padStart(2,'0')}:00`));grid.append(axis);
    for(const date of dates) {
      const track=el('div',{class:'day-track',style:`--hours:${hours}`}),day=timed.filter(e=>e.date<=date&&e.endDate>=date).map(event=>({...event,start:event.date<date?0:minuteOfDay(timeIn(event.startAt,zone)),end:event.endDate>date?1440:minuteOfDay(timeIn(event.endAt,zone))||1440})).sort((a,b)=>a.start-b.start||b.end-a.end);
      const lanes=[];for(const event of day){let lane=lanes.findIndex(end=>end<=event.start);if(lane<0)lane=lanes.length;lanes[lane]=event.end;event.lane=lane;}
      const count=Math.max(1,lanes.length);
      for(const e of day){const block=button('',()=>this.details(e),`time-event ${e.kind}`,{'aria-label':`${e.title}, ${timeIn(e.startAt,zone)} to ${timeIn(e.endAt,zone)}`});block.style.cssText=`top:${Math.max(0,(e.start-min)/span*100)}%;height:${Math.max(3,(e.end-e.start)/span*100)}%;left:${e.lane/count*100}%;width:${100/count}%;--course:${e.color}`;block.append(el('strong',{},e.title),el('small',{},`${timeIn(e.startAt,zone)}–${timeIn(e.endAt,zone)}`),el('small',{},[e.room,e.building].filter(Boolean).join(' · ')));track.append(block);}grid.append(track);
    }
    grid.append(el('div',{}));for(const date of dates)grid.append(el('div',{class:'week-deadlines'},...events.filter(e=>e.date===date&&(!e.startAt||!e.endAt||e.endAt<=e.startAt||e.invalidTime||e.allDay)).map(e=>this.eventCard(e,{compact:true}))));
    return el('div',{},el('div',{class:'week-scroll'},grid),el('div',{class:'narrow-agenda'},this.agenda(events,from,to)));
  }
  month(events,from,to) {
    const grid=el('div',{class:'month'});for(const day of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])grid.append(el('div',{class:'weekday'},day));
    for(let date=from;date<=to;date=addDays(date,1)){
      const target=date,day=events.filter(e=>e.date===date),cell=el('section',{class:`month-cell ${date.slice(0,7)!==this.date.slice(0,7)?'outside':''} ${date===dateIn(this.controller.clock(),this.state.preferences.timezone)?'today':''}`});
      cell.append(button(labelDate(date),()=>{this.date=target;this.view='day';this.render();},'date-button'));
      for(const event of day.slice(0,4))cell.append(this.eventCard(event,{compact:true}));
      if(day.length>4)cell.append(button(`+${day.length-4} more`,()=>{this.date=target;this.view='day';this.render();},'text-button'));grid.append(cell);
    }return grid;
  }
  navigate(direction) {
    if(['month','exams','deadlines'].includes(this.view)){const date=new Date(`${this.date.slice(0,7)}-01T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+direction);this.date=date.toISOString().slice(0,10);}
    else this.date=addDays(this.date,direction*(this.view==='day'?1:7));this.render();
  }
  render() {
    const top=el('div',{class:'top'},el('div',{},el('p',{class:'eyebrow'},'CANVAS COMPANION'),el('h2',{},'Academic timetable')));
    if(!this.state){top.append(button('Retry connection',()=>this.controller.connect()));this.panel.replaceChildren(top,el('p',{class:`status ${this.error?'error':''}`,role:'status'},this.notice||'Connecting to Canvas…'));return;}
    const state=this.state,p=state.preferences,range=windowFor(this.view,this.date),now=this.controller.clock();
    const addKind=el('select',{'aria-label':'Record type'},...['class','exam','assignment','project','event','office_hours','course'].map(kind=>el('option',{value:kind},kind==='course'?'Manual course':TITLES[kind])));
    top.append(el('div',{class:'top-actions'},addKind,button('Add',()=>this.edit(addKind.value),'primary',{disabled:this.busy}),button('Refresh Canvas',()=>this.sync(),'secondary',{disabled:this.busy}),button(this.collapsed?'Expand':'Collapse',()=>this.savePreferences({collapsed:!this.collapsed}),'icon',{'aria-expanded':!this.collapsed})));
    if(this.collapsed){this.panel.replaceChildren(top);return;}
    const toolbar=el('div',{class:'toolbar'},el('nav',{class:'views','aria-label':'Timetable views'},...VIEWS.map(([id,label])=>button(label,()=>this.savePreferences({view:id}),'secondary',{'aria-pressed':this.view===id}))),el('div',{class:'nav'},button('‹',()=>this.navigate(-1),'secondary',{'aria-label':'Previous period'}),el('span',{class:'period'},`${labelDate(range.from)}${range.from===range.to?'':' – '+labelDate(range.to)}`),button('Today',()=>{this.date=dateIn(now,p.timezone);this.render();}),button('›',()=>this.navigate(1),'secondary',{'aria-label':'Next period'})));
    const courses=[...(state.cache?.courses||[]),...state.records.filter(r=>r.kind==='course').map(r=>({id:r.id,name:r.data.title}))];
    const course=el('select',{'aria-label':'Filter course'},el('option',{value:''},'All courses'),...courses.map(c=>el('option',{value:c.id},c.name)));course.value=this.filter;course.addEventListener('change',()=>this.savePreferences({courseFilter:course.value}));
    const completed=el('input',{type:'checkbox',checked:this.showCompleted});completed.addEventListener('change',()=>this.savePreferences({showCompleted:completed.checked}));
    const filters=el('div',{class:'filters'},course,el('label',{},completed,'Show completed'),el('span',{class:'hint'},p.timezone));
    const legend=el('div',{class:'legend'},...['class','exam','assignment','project'].map(kind=>el('span',{},el('i',{class:'type-dot',style:`--kind-color:${{class:'#4f7d72',exam:'#c46d46',assignment:'#557eb2',project:'#8e6db0'}[kind]}`}),TITLES[kind])));
    let events=projectEvents(state,range.from,range.to);if(this.filter)events=events.filter(e=>e.courseId===this.filter);if(!this.showCompleted)events=events.filter(e=>!e.completed);
    const visible=visibleEvents(events,range.from,range.to),alerts=warnings(visible,p,now),content=el('div',{class:'content'});
    if(alerts.length)content.append(el('details',{class:'warnings'},el('summary',{},`${alerts.length} schedule / deadline warning${alerts.length===1?'':'s'}`),el('ul',{},...alerts.map(a=>el('li',{},a.text)))));
    if(this.view==='week')content.append(visible.length?this.week(visible,range.from,range.to):this.empty('Build your academic week.','Add a recurring class, examination, assignment or project. Refresh Canvas to link existing assignments.'));
    else if(this.view==='month')content.append(this.month(visible,range.from,range.to));
    else if(this.view==='exams'){const exams=visible.filter(e=>e.kind==='exam');content.append(this.month(exams,range.from,range.to),this.agenda(exams,range.from,range.to));}
    else if(this.view==='deadlines') {
      const deadlines=events.filter(e=>['assignment','project','milestone'].includes(e.kind));
      content.append(this.month(visible.filter(e=>['assignment','project','milestone'].includes(e.kind)),range.from,range.to));
      for(const status of ['overdue','today','soon','upcoming','undated','completed']){const group=deadlines.filter(e=>deadlineStatus(e,now,p.timezone,p.dueSoonHours)===status&&(status!=='upcoming'||!e.date||e.date<=range.to));if(group.length)content.append(el('h3',{class:'group-title'},`${STATUS[status]} · ${group.length}`),...group.map(e=>this.eventCard(e)));}
      if(!deadlines.length)content.append(this.empty('No deadlines yet.','Refresh Canvas or add a personal assignment or project.'));
    } else {
      if(this.view==='overview'){const overdue=events.filter(e=>e.dueAt&&deadlineStatus(e,now,p.timezone,p.dueSoonHours)==='overdue');if(overdue.length)content.append(el('h3',{class:'group-title'},'Overdue'),...overdue.map(e=>this.eventCard(e)));}
      content.append(this.agenda(visible,range.from,range.to));
    }
    const syncInfo=state.cache?`Canvas snapshot: ${state.cache.from} to ${state.cache.to}. Refreshed ${new Date(state.cache.syncedAt).toLocaleString()}.`:'Canvas assignments are not imported yet. Refresh Canvas when you are ready.';
    const outside=state.cache&&(range.from<state.cache.from||range.to>state.cache.to)?' This period is outside the last Canvas snapshot; refresh to check it.':'';
    const status=el('p',{class:`status ${this.error?'error':''}`,role:'status'},this.notice||syncInfo+outside);
    const importInput=el('input',{type:'file',accept:'.json,application/json',hidden:true});
    importInput.addEventListener('change',async()=>{try{const file=importInput.files[0];if(!file)return;if(file.size>12*1024*1024)throw new Error('Choose a backup smaller than 12 MB.');await this.mutate('import',{backup:JSON.parse(await file.text()),revision:this.state.revision},'Missing academic records restored. Existing records and preferences were preserved.');}catch(error){this.message(error.message,true);}});
    const bottom=el('div',{class:'bottom'},button('Preferences',()=>this.edit('preferences'),'text-button'),button('Export academic backup',async()=>{try{const backup=await this.controller.rpc('export');const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));const link=el('a',{href:url,download:'canvas-companion-academic.json'});link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){this.message(error.message,true);}},'text-button'),button('Import missing records',()=>importInput.click(),'text-button'),button('Undo delete',async()=>{try{await this.mutate('undo',{revision:this.state.revision},'Deleted item restored.');}catch{}},'text-button',{disabled:!state.undo}),importInput,el('span',{},'Manual changes stay local. Canvas sources are read only.'));
    this.panel.replaceChildren(top,toolbar,filters,legend,status,content,bottom);
    const probe=el('span',{style:'position:absolute;visibility:hidden;color:var(--accent)'},'');this.root.append(probe);
    const match=getComputedStyle(probe).color.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);probe.remove();
    if(match){const rgb=match.slice(1).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];this.host.style.setProperty('--accent-ink',luminance>.179?'#111111':'#ffffff');}

  }
}
