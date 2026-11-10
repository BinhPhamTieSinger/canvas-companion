import { pendingSources,SIGNALS } from './review.js';
import { el,button } from './dom.js';
import { candidates,catalogRecord } from './catalog.js';
export async function catalogDialog(widget){
  widget.message('Opening the bundled course catalog…');
  try{
    const catalog=await widget.controller.api.catalog();
    if(!catalog.entries?.length)throw new Error('No course catalog snapshot is bundled.');
    const dialog=el('dialog',{class:'editor','aria-label':'Find class times'}),body=el('div',{class:'integration-body',style:'padding:22px'}),selections=[];
    body.append(el('h2',{},'Find class times'),el('p',{class:'hint'},`${catalog.entries.length} catalog sections · ${catalog.term} · snapshot ${catalog.capturedAt}. Portal sign-in is not required. Confirm your registered section; Canvas course membership may cover several sections.`));
    for(const course of widget.state.cache?.courses||[]){
      const matches=candidates(course,catalog),existing=widget.state.records.some(r=>r.kind==='class'&&r.data.courseId===course.id),sectionHints=(course.sections||[]).map(s=>s.name).join(', ');
      const field=el('div',{class:'field'},el('label',{},course.name));
      if(existing){field.append(el('p',{class:'hint'},'A class already exists for this course. Edit it to preserve your rooms, exceptions and notes.'));body.append(field);continue;}
      const select=el('select',{'aria-label':`Registered section: ${course.name}`},el('option',{value:''},matches.length?'Choose your registered section':'No exact course match'));
      for(const e of matches)select.append(el('option',{value:e.id,disabled:e.complete===false||!e.meetings.length||!e.startDate||!e.endDate},`${e.section} · ${e.meetings.map(m=>`${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][m.day-1]} ${m.start}–${m.end}`).join('; ')||'No published schedule'}`));
      field.append(select,el('p',{class:'hint'},sectionHints?`Canvas section names: ${sectionHints}. These are hints, not a verified portal registration.`:'Confirm lecture and recitation/lab group before importing.'));body.append(field);selections.push({course,select,matches});
    }
    const error=el('p',{class:'error',role:'alert'}),save=button('Import selected sections',async()=>{try{const records=selections.filter(s=>s.select.value).map(s=>catalogRecord(widget.state.scope,s.course,s.matches.find(e=>e.id===s.select.value),catalog));if(!records.length)throw new Error('Select at least one registered section.');save.disabled=true;await widget.mutate('catalogImport',{records},'Selected sections imported locally. Review current course sources for exceptions.');dialog.close();}catch(e){error.textContent=e.message;save.disabled=false;}},'primary');
    body.append(error,el('div',{class:'dialog-actions'},button('Download catalog backup',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'})),a=el('a',{href:url,download:`vinuni-${catalog.term}-catalog.json`});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),button('Close',()=>dialog.close()),save));dialog.append(body);widget.root.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();widget.message('Catalog ready. Existing manual schedules are preserved.');
  }catch(e){widget.message(e.message,true);}
}
export function sourceDialog(widget){
 const state=widget.state,sources=state.sources||[],dialog=el('dialog',{class:'editor','aria-label':'Course source updates'}),body=el('div',{class:'source-review',style:'padding:22px'});
 const pending=pendingSources(sources);
 body.append(el('h2',{},'Course source updates'),el('p',{class:'hint'},'A changed document needs your review. Topic labels are keyword hints, not verified changes to an exam, date or room. Structured Canvas deadlines update directly; manual schedules change only when you save an edit. External Simple Syllabus embeds require a supported export.'));
 if(pending.length)body.append(el('div',{class:'review-notice',role:'status'},el('strong',{},`${pending.length} source update${pending.length===1?' needs':'s need'} review`),el('p',{},'Open the original, confirm which section it concerns, then update an existing item or add one. Mark reviewed when finished.')));
 for(const warning of state.sourceWarnings||[])body.append(el('p',{class:'error'},warning.message));
 const search=el('input',{type:'search',placeholder:'Filter by course or source title','aria-label':'Filter course sources'}),only=el('input',{type:'checkbox',checked:pending.length>0,'aria-label':'Only sources needing review'}),list=el('div');
 body.append(search,el('label',{class:'check-field'},only,'Only sources needing review'),list);
 const render=()=>{
  list.replaceChildren();const term=search.value.toLowerCase(),courses=new Map((state.cache?.courses||[]).map(c=>[c.id,c.name]));let count=0;
  for(const s of [...sources].sort((a,b)=>Number(a.digest===a.ackDigest)-Number(b.digest===b.ackDigest))){
   const name=courses.get(s.courseId)||'',changed=s.digest!==s.ackDigest;
   if((only.checked&&!changed)||(term&&!`${name} ${s.title}`.toLowerCase().includes(term)))continue;
   count++;const text=el('div',{class:'event-main'},el('strong',{},`${changed?'Needs review · ':''}${s.title}`),el('p',{class:'hint'},`${name} · ${s.kind}${s.sections?.length?' · '+s.sections.join(', '):''}`));
   if(changed)text.append(el('p',{class:'review-label'},s.changeKind==='new'?'New source since your baseline':'Source edited since your last review'));
   if(s.signals?.length)text.append(el('p',{class:'hint'},s.signals.map(key=>SIGNALS[key]).filter(Boolean).join(' · ')));
   text.append(el('p',{class:'hint'},s.summary),el('a',{href:s.url,target:'_blank',rel:'noopener noreferrer'},'Open original source'));
   if(changed&&s.previousSummary)text.append(el('details',{},el('summary',{},'Previous saved excerpt'),el('p',{class:'hint'},s.previousSummary),el('p',{class:'hint'},s.previousSummary===s.summary?'The digest changed outside the saved excerpt or in formatting. Open the original to review.':'Excerpts provide context; confirm the actual change in the original.')));
   const section=el('article',{class:`event source-event ${changed?'needs-review':''}`},text),actions=el('div',{class:'event-actions'});
   if(changed)actions.append(button('Mark reviewed',async()=>{try{await widget.mutate('acknowledge',{key:s.key,digest:s.digest});dialog.close();sourceDialog(widget);}catch{}}));
   for(const row of state.records.filter(r=>r.data.courseId===s.courseId&&['class','exam','event','office_hours','assignment'].includes(r.kind)))actions.append(button(`Edit ${row.data.title}`,()=>{dialog.close();widget.edit(row.kind,row);}));
   for(const [kind,label] of [['exam','Add examination'],['event','Add event'],['assignment','Add personal deadline']])actions.append(button(label,()=>{dialog.close();widget.edit(kind,null,{courseId:s.courseId,sourceUrl:s.url,title:s.title});}));
   section.append(actions);list.append(section);
  }
  if(!count)list.append(el('p',{class:'hint'},sources.length?'No sources match this filter.':'Refresh Canvas to establish a source baseline. Subsequent new or edited sources will appear here.'));
 };
 search.addEventListener('input',render);only.addEventListener('change',render);render();
 body.append(el('div',{class:'dialog-actions'},button('Close',()=>dialog.close())));dialog.append(body);widget.root.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();
}
