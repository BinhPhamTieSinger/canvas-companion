import {el,button} from '../academic/dom.js';
import {SEASONS,DAYS,termLabel,planId,addPlannedCourse,creditSummary,planConflicts,filterCatalog} from '../academic/semester-plan.js';
import {subscribeStorage} from '../runtime.js';

export const courseWorkspaceCSS=`.course-tools,.plan-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:12px 0}.course-tools label,.plan-toolbar label,.plan-field{display:grid;gap:5px;font-size:12px;color:var(--cc-control-muted)}.course-tools input{min-width:210px;flex:1}.course-workspace input,.course-workspace select,.course-workspace textarea{font:inherit;color:var(--cc-control-ink);background:var(--cc-control-card);border:1px solid var(--cc-control-line);border-radius:8px;padding:8px;max-width:100%;min-height:38px}.course-workspace option{background:var(--cc-control-bg);color:var(--cc-control-ink)}.course-workspace textarea{width:100%;min-height:64px;resize:vertical}.catalog-list,.plan-list{display:grid;gap:12px;margin:14px 0}.catalog-card,.plan-card{padding:16px;border:1px solid var(--cc-control-line);border-radius:14px;background:var(--cc-control-card);overflow-wrap:anywhere}.course-workspace h3{margin:0 0 8px;font-size:16px}.course-workspace h4{margin:14px 0 7px}.course-workspace p{margin:6px 0}.course-workspace .hint{font-size:12px;color:var(--cc-control-muted)}.course-workspace .pill{display:inline-block;padding:2px 8px;border-radius:20px;background:var(--cc-control-hover);font-size:12px;margin:0 5px 6px 0}.course-workspace .row{display:flex;gap:9px;flex-wrap:wrap;align-items:center}.course-workspace .between{justify-content:space-between}.course-workspace .primary{background:#a5e3ff;color:#14243b}.course-workspace details{margin:10px 0}.course-workspace summary{cursor:pointer;color:var(--cc-control-link)}.course-workspace .meeting-row{display:grid;grid-template-columns:70px 1fr 100px 100px;gap:8px;align-items:end;border-top:1px solid var(--cc-control-line);padding-top:10px;margin:10px 0}.course-workspace .meeting-row .room{grid-column:1/4}.course-workspace .notice{padding:12px;border:1px solid var(--cc-control-line);border-radius:10px;color:var(--cc-control-muted);background:var(--cc-control-card)}.course-workspace .warning{border-color:#e4b45d;color:var(--cc-control-ink)}.course-workspace .draft-week{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:8px;overflow-x:auto;padding-bottom:8px}.course-workspace .draft-day{padding:10px;border:1px solid var(--cc-control-line);border-radius:10px}.course-workspace .draft-slot{border-left:3px solid var(--cc-control-link);padding:6px;margin-top:8px;font-size:12px}.course-workspace .pagination{display:flex;gap:12px;align-items:center;justify-content:center}.course-workspace [aria-live]{white-space:pre-line}.course-workspace button:disabled{opacity:.55;cursor:default}@media(max-width:550px){.course-workspace .meeting-row{grid-template-columns:1fr 1fr}.course-workspace .meeting-row .room{grid-column:auto}.course-tools input{min-width:0;width:100%}.course-tools label{width:100%}}`;

const field=(label,node,className='')=>el('label',{class:`plan-field ${className}`},label,node);
const option=(value,label)=>el('option',{value},label);
export class CourseWorkspace{
 constructor({catalogPane,plannerPane,api,rpc,runtime,onTab}){
  Object.assign(this,{catalogPane,plannerPane,api,rpc,runtime,onTab});this.drafts=new Map();this.page=0;this.query='';this.department='';this.schedule='all';this.disposed=false;this.busy=false;
  const now=new Date(),year=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric'}).format(now)),month=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Ho_Chi_Minh',month:'numeric'}).format(now));
  this.term=month>=8?`spring-${Math.min(year+1,2099)}`:`fall-${year}`;
  catalogPane.classList.add('course-workspace');plannerPane.classList.add('course-workspace');
  this.unsubscribe=subscribeStorage(runtime,(changes,area)=>{const next=changes.academicRevision?.newValue;if(!this.disposed&&area==='local'&&next?.scope===this.state?.scope&&next.revision!==this.state.revision){this.stale=true;this.updateStale();}});
 }
 async load(initialState=null){
  this.catalogPane.replaceChildren(el('p',{role:'status'},'Loading the bundled catalog…'));
  this.plannerPane.replaceChildren(el('p',{role:'status'},'Connecting to your saved semester plans…'));
  const [catalog,state]=await Promise.allSettled([this.api.catalog(),initialState||this.rpc('read')]);if(this.disposed)return;
  if(catalog.status==='fulfilled'&&catalog.value.entries?.length)this.catalog=catalog.value;
  if(state.status==='fulfilled')this.state=state.value;
  this.loadError=state.status==='rejected'?state.reason.message:'';
  if(!this.catalog){const message=catalog.status==='rejected'?catalog.reason.message:'The catalog is empty.';for(const pane of [this.catalogPane,this.plannerPane])pane.replaceChildren(el('p',{class:'error',role:'alert'},message),button('Retry',()=>void this.load()));return;}
  this.renderCatalog();this.renderPlanner();
 }
 draft(){
  if(!this.drafts.has(this.term)){const saved=this.state?.records.find(r=>r.kind==='semester_plan'&&r.id===planId(this.term));this.drafts.set(this.term,{data:structuredClone(saved?.data||{term:this.term,notes:'',courses:[]}),revision:saved?.revision||0,dirty:false});}
  return this.drafts.get(this.term);
 }
 changed(){this.draft().dirty=true;this.deletePending=false;this.discardPending=false;this.updateStatus();this.updatePreview();}
 updateStatus(message='',error=false){const discard=this.plannerPane.querySelector('[data-discard-draft]');if(discard){discard.disabled=!this.draft().dirty;discard.textContent=this.discardPending?'Confirm discard current draft':'Discard current draft';}if(!this.planStatus)return;this.planStatus.className=error?'error':'status';this.planStatus.textContent=message||(this.draft().dirty?'Unsaved draft — choose Save semester plan to keep your changes.':this.draft().revision?'Saved in this Chrome profile.':'New semester — add courses, then save your plan.');}
 updateStale(){if(this.staleNotice)this.staleNotice.hidden=!this.stale;}
 hasUnsaved(){return [...this.drafts.values()].some(d=>d.dirty);}
 termPicker(){
  const select=el('select',{'aria-label':'Semester season'},...SEASONS.map(s=>option(s,s[0].toUpperCase()+s.slice(1)))),year=el('input',{type:'number',min:2000,max:2099,step:1,value:this.term.split('-')[1],'aria-label':'Semester year'});select.value=this.term.split('-')[0];
  const change=()=>{const term=`${select.value}-${year.value}`;try{planId(term);}catch{year.reportValidity();year.value=this.term.split('-')[1];return;}this.term=term;this.deletePending=false;this.discardPending=false;this.renderCatalog();this.renderPlanner();};select.addEventListener('change',change);year.addEventListener('change',change);
  return [field('Semester',select),field('Year',year)];
 }
 renderCatalog(){
  const pane=this.catalogPane;pane.replaceChildren(el('h3',{},'Course catalog'),el('p',{class:'intro'},`${this.catalog.entries.length} sections · ${new Set(this.catalog.entries.map(e=>e.code)).size} course codes · ${termLabel(this.catalog.term)} snapshot`),el('p',{class:'notice'},'Browse without a portal session. This dated catalog does not confirm future offerings, prerequisites, credits, seat availability or your registration. Rooms and session types may need Canvas Home or syllabus confirmation.'));
  const search=el('input',{type:'search',value:this.query,placeholder:'Search name, code or section','aria-label':'Search all catalog sections'}),department=el('select',{'aria-label':'Course department'},option('','All departments'),...[...new Set(this.catalog.entries.map(e=>e.code.match(/^[A-Z]+/)?.[0]).filter(Boolean))].sort().map(d=>option(d,d))),schedule=el('select',{'aria-label':'Published schedule filter'},option('all','All sections'),option('published','Published schedule'),option('missing','Schedule unavailable'));
  department.value=this.department;schedule.value=this.schedule;
  const tools=el('div',{class:'course-tools'},field('Search',search),field('Department',department),field('Schedule',schedule));
  const target=el('div',{class:'plan-toolbar'},...this.termPicker(),el('p',{class:'hint'},'“Plan course” adds a course choice, without copying historical meeting times.'));
  const result=el('p',{class:'status',role:'status'}),list=el('div',{class:'catalog-list'}),pagination=el('div',{class:'pagination'}),message=el('p',{class:'status','aria-live':'polite'});
  const render=()=>{
   const matches=filterCatalog(this.catalog,{query:this.query,department:this.department,schedule:this.schedule}),pages=Math.max(1,Math.ceil(matches.length/20));this.page=Math.min(this.page,pages-1);result.textContent=`${matches.length} sections found · page ${this.page+1} of ${pages}`;list.replaceChildren();
   for(const entry of matches.slice(this.page*20,this.page*20+20)){
    const planned=this.draft().data.courses.some(c=>c.code===entry.code),add=button(planned?'In semester plan':'Plan course',()=>{if(this.busy)return;const draft=this.draft();draft.data=addPlannedCourse(draft.data,entry,this.catalog);draft.dirty=true;this.renderPlanner();this.onTab('planner');},'primary',{disabled:planned||!this.state});
    const card=el('article',{class:'catalog-card'},el('div',{class:'row between'},el('span',{class:'pill'},entry.code),el('span',{class:'hint'},entry.section)),el('h3',{},entry.title),el('p',{class:'hint'},`${entry.startDate||'Unknown start'} → ${entry.endDate||'Unknown end'}`));
    for(const m of entry.meetings)card.append(el('p',{},`${DAYS[m.day-1]} ${m.start}–${m.end}${m.room?' · '+m.room:''} · ${m.sessionType==='other'?'Type unconfirmed':m.sessionType==='tutorial'?'recitation':m.sessionType}`));
    if(entry.complete===false||!entry.meetings.length)card.append(el('p',{class:'hint'},'No complete published schedule.'));
    const dates=[...new Set(entry.meetings.flatMap(m=>m.activeDates||[]))].sort();if(dates.length)card.append(el('details',{},el('summary',{},`${dates.length} published teaching dates`),el('p',{class:'hint'},dates.join(' · '))));
    card.append(add);list.append(card);
   }
   if(!matches.length)list.append(el('p',{class:'notice'},'No sections match. Try a course code or clear the filters.'));
   pagination.replaceChildren(button('Previous',()=>{this.page--;render();},'',{disabled:this.page===0}),el('span',{},`${this.page+1} / ${pages}`),button('Next',()=>{this.page++;render();},'',{disabled:this.page+1>=pages}));
  };
  search.addEventListener('input',()=>{this.query=search.value;this.page=0;render();});department.addEventListener('change',()=>{this.department=department.value;this.page=0;render();});schedule.addEventListener('change',()=>{this.schedule=schedule.value;this.page=0;render();});
  pane.append(tools,target,result,message,list,pagination,el('p',{class:'hint'},`Captured ${new Date(this.catalog.capturedAt).toLocaleDateString()} · ${this.catalog.timezone}`),button('Download catalog backup',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(this.catalog,null,2)],{type:'application/json'}));el('a',{href:url,download:`vinuni-${this.catalog.term}-catalog.json`}).click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));render();
 }
 renderPlanner(){
  const pane=this.plannerPane;pane.replaceChildren(el('h3',{},'Semester planner'),el('p',{class:'intro'},'Build a course shortlist and a proposed week for any semester. This saves a personal plan; it does not register courses or change your active timetable.'));
  if(!this.state){pane.append(el('p',{class:'error',role:'alert'},this.loadError||'Reconnect to Canvas to save semester plans.'),button('Reconnect',()=>void this.load()));return;}
  const draft=this.draft(),data=draft.data;
  const saved=this.state.records.filter(r=>r.kind==='semester_plan').sort((a,b)=>Number(a.data.term.slice(-4))-Number(b.data.term.slice(-4))||SEASONS.indexOf(a.data.term.split('-')[0])-SEASONS.indexOf(b.data.term.split('-')[0]));
  const existing=el('select',{'aria-label':'Open saved semester'},option('','Open a saved semester…'),...saved.map(r=>option(r.data.term,termLabel(r.data.term))));existing.addEventListener('change',()=>{if(existing.value){this.term=existing.value;this.deletePending=false;this.renderPlanner();this.renderCatalog();}});
  pane.append(el('div',{class:'plan-toolbar'},...this.termPicker(),field('Saved plans',existing)));
  this.staleNotice=el('div',{class:'notice warning',hidden:!this.stale},el('p',{},'The workspace changed in another tab. Draft edits are retained; conflicting saves are rejected.'),button('Reload saved plans',()=>{void this.reload();}));pane.append(this.staleNotice);
  this.planStatus=el('p',{class:'status',role:'status','aria-live':'polite'});
  const save=button('Save semester plan',()=>void this.save(),'primary'),browse=button('Browse courses',()=>{this.renderCatalog();this.onTab('courses');});
  pane.append(el('div',{class:'actions'},save,browse,button(this.discardPending?'Confirm discard current draft':'Discard current draft',()=>{if(this.busy)return;if(!this.discardPending){this.discardPending=true;this.renderPlanner();return;}this.drafts.delete(this.term);this.discardPending=false;this.deletePending=false;this.renderPlanner();this.renderCatalog();},'',{disabled:!draft.dirty,'data-discard-draft':'true'})),this.planStatus);
  if(draft.revision)pane.append(button(this.deletePending?'Confirm delete semester plan':'Delete semester plan',()=>{if(this.busy)return;if(!this.deletePending){this.deletePending=true;this.renderPlanner();return;}void this.remove();}));
  const notes=el('textarea',{value:data.notes,'aria-label':'Semester notes',maxLength:5000});notes.addEventListener('input',()=>{data.notes=notes.value;this.changed();});pane.append(field('Semester notes',notes));
  const list=el('div',{class:'plan-list'});
  for(const course of data.courses){
   const match=course.catalogTerm===this.catalog.term?this.catalog.entries.find(e=>e.code===course.code):null;
   const card=el('article',{class:'plan-card'},el('div',{class:'row between'},el('h3',{},`${course.code}${match?' · '+match.title:''}`),button(`Remove ${course.code}`,()=>{if(this.busy)return;data.courses=data.courses.filter(c=>c!==course);this.changed();this.renderPlanner();})),el('p',{class:'hint'},`Course reference: ${termLabel(course.catalogTerm)} catalog. Availability for ${termLabel(this.term)} is unconfirmed.`));
   const credits=el('input',{type:'number',min:0,max:60,step:'any',value:course.credits??'',placeholder:'Unknown','aria-label':`Credits for ${course.code}`}),notes=el('textarea',{value:course.notes,maxLength:2000,'aria-label':`Notes for ${course.code}`});
   credits.addEventListener('input',()=>{course.credits=credits.value===''?null:Number(credits.value);this.changed();});notes.addEventListener('input',()=>{course.notes=notes.value;this.changed();});
   card.append(field('Credits (enter from an official source)',credits),field('Course notes / prerequisite checks',notes),el('h4',{},'Proposed meetings'),el('p',{class:'hint'},'Enter target-semester times yourself. Weekly draft only; holidays, official sections and rooms are unverified.'));
   course.meetings.forEach((meeting,index)=>{
    const day=el('select',{'aria-label':`${course.code} meeting ${index+1} day`},...DAYS.map((d,i)=>option(i+1,d))),type=el('select',{'aria-label':`${course.code} meeting ${index+1} type`},...['lecture','lab','recitation','seminar','other'].map(t=>option(t,t))),start=el('input',{type:'time',value:meeting.start,'aria-label':`${course.code} meeting ${index+1} start`}),end=el('input',{type:'time',value:meeting.end,'aria-label':`${course.code} meeting ${index+1} end`}),room=el('input',{value:meeting.room,maxLength:120,'aria-label':`${course.code} meeting ${index+1} room`,placeholder:'Unconfirmed'});day.value=meeting.day;type.value=meeting.sessionType;
    for(const [node,key]of [[day,'day'],[type,'sessionType'],[start,'start'],[end,'end'],[room,'room']])node.addEventListener('input',()=>{meeting[key]=key==='day'?Number(node.value):node.value;this.changed();});
    card.append(el('div',{class:'meeting-row'},field('Day',day),field('Type',type),field('Start',start),field('End',end),field('Room (optional)',room,'room'),button('Remove meeting',()=>{if(this.busy)return;course.meetings.splice(index,1);this.changed();this.renderPlanner();})));
   });
   card.append(button('Add proposed meeting',()=>{if(this.busy)return;course.meetings.push({day:1,start:'',end:'',sessionType:'lecture',room:''});this.changed();this.renderPlanner();},'',{disabled:course.meetings.length>=20}));list.append(card);
  }
  if(!data.courses.length)list.append(el('p',{class:'notice'},'No courses yet. Browse all 389 catalog sections and choose Plan course.'));
  pane.append(list);this.preview=el('section',{'aria-label':'Proposed weekly schedule'});pane.append(this.preview,el('p',{class:'hint'},'Plans are included in Export academic backup on the timetable. They are separate from enrolled classes, assignments and deadlines.'));this.updateStatus();this.updatePreview();
 }
 updatePreview(){
  if(!this.preview)return;const courses=this.draft().data.courses,credits=creditSummary(courses),complete=courses.map(c=>({...c,meetings:c.meetings.filter(m=>m.start&&m.end&&m.end>m.start)})),conflicts=planConflicts(complete),week=el('div',{class:'draft-week'});
  for(let day=1;day<=7;day++){const column=el('div',{class:'draft-day'},el('strong',{},DAYS[day-1]));let count=0;for(const c of complete)for(const m of c.meetings.filter(m=>m.day===day).sort((a,b)=>a.start.localeCompare(b.start))){column.append(el('div',{class:'draft-slot'},el('strong',{},c.code),el('p',{},`${m.start}–${m.end}`),el('p',{},`${m.sessionType}${m.room?' · '+m.room:''}`)));count++;}if(!count)column.append(el('p',{class:'hint'},'No proposed times'));week.append(column);}
  this.preview.replaceChildren(el('h4',{},`${courses.length} planned courses · ${credits.total} entered credits${credits.unknown?` · ${credits.unknown} course${credits.unknown===1?'':'s'} with unknown credits`:''}`),el('p',{class:'hint'},'Draft weekly preview — not an official timetable.'),week);
  if(conflicts.length)this.preview.append(el('div',{class:'notice warning',role:'status'},el('strong',{},`${conflicts.length} proposed time conflict${conflicts.length===1?'':'s'}`),...conflicts.map(c=>el('p',{},c))));
 }
 async save(){
  if(this.busy||!this.state)return;this.busy=true;this.setBusy(true);const term=this.term,draft=this.draft();
  try{const state=await this.rpc('save',{record:{scope:this.state.scope,id:planId(term),kind:'semester_plan',data:structuredClone(draft.data)},revision:draft.revision},this.state.scope);if(this.disposed)return;this.state=state;const saved=state.records.find(r=>r.id===planId(term)&&r.kind==='semester_plan');this.drafts.set(term,{data:structuredClone(saved.data),revision:saved.revision,dirty:false});this.stale=false;this.renderCatalog();this.renderPlanner();this.updateStatus('Semester plan saved locally. Your active timetable is unchanged.');}
  catch(e){if(!this.disposed)this.updateStatus(`${e.message}\nYour unsaved draft is retained.`,true);}finally{this.busy=false;this.setBusy(false);}
 }
 async remove(){
  if(this.busy)return;this.busy=true;this.setBusy(true);const term=this.term,draft=this.draft();
  try{const state=await this.rpc('remove',{kind:'semester_plan',id:planId(term),revision:draft.revision},this.state.scope);if(this.disposed)return;this.state=state;this.drafts.delete(term);this.deletePending=false;this.stale=false;this.renderCatalog();this.renderPlanner();this.updateStatus('Semester plan deleted. Existing timetable records are unchanged.');}
  catch(e){if(!this.disposed)this.updateStatus(e.message,true);}finally{this.busy=false;this.setBusy(false);}
 }
 async reload(){
  if(this.busy)return;this.busy=true;this.setBusy(true);
  try{const state=await this.rpc('read',{},this.state.scope);if(this.disposed)return;this.state=state;for(const [term,draft]of this.drafts)if(!draft.dirty)this.drafts.delete(term);this.stale=false;this.renderPlanner();this.updateStatus('Saved plans reloaded. Unsaved drafts were retained; reopen the panel to discard a conflicting draft.');}catch(e){if(!this.disposed)this.updateStatus(e.message,true);}finally{this.busy=false;this.setBusy(false);}
 }
 setBusy(busy){if(this.disposed)return;for(const pane of [this.catalogPane,this.plannerPane]){pane.inert=busy;pane.setAttribute('aria-busy',String(busy));}}
 destroy(){this.disposed=true;this.unsubscribe();}
}
