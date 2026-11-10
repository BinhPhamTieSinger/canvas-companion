import { openDatabase, request, completed } from '../storage/database.js';
import { validateRecord, validScope, preferences, safeLink, text, annotationId, assignmentKeyFromLink } from './model.js';
import { validDate } from './time.js';
import { ORIGIN } from '../background/model.js';
const conflict = () => Object.assign(new Error('This item changed in another tab. Reload before saving your edit.'), {name:'ConflictError'});
const keyFor = record => `${record.scope}|${record.kind}|${record.id}`;
function metadata(scope) { return {scope,revision:0,preferences:preferences(),undo:null}; }
export class AcademicRepository {
  constructor(name='canvas-companion') { this.name=name; this.connection=null; }
  async db() {
    if(!this.connection) this.connection=openDatabase(this.name).then(db=>{db.onversionchange=()=>{db.close();this.connection=null;};return db;}).catch(error=>{this.connection=null;throw error;});
    return this.connection;
  }
  async read(scope) {
    if(!validScope(scope)) throw new Error('Reconnect to your Canvas account.');
    const db=await this.db(),tx=db.transaction(['academicRecords','academicMeta','academicCache'],'readonly');
    const [rows,meta,cache]=await Promise.all([request(tx.objectStore('academicRecords').index('scope').getAll(scope)),request(tx.objectStore('academicMeta').get(scope)),request(tx.objectStore('academicCache').get(scope))]);
    return {...(meta||metadata(scope)),preferences:preferences(meta?.preferences),sources:meta?.sources||[],sourceWarnings:meta?.sourceWarnings||[],records:rows.filter(row=>!row.deleted),cache:cache||null};
  }
  async change(scope,operation) {
    if(!validScope(scope)) throw new Error('Reconnect to your Canvas account.');
    const db=await this.db(),tx=db.transaction(['academicRecords','academicMeta','academicCache'],'readwrite'),done=completed(tx);
    try {
      const meta=(await request(tx.objectStore('academicMeta').get(scope)))||metadata(scope);
      await operation(tx,meta);
      meta.revision++; meta.updatedAt=new Date().toISOString();tx.objectStore('academicMeta').put(meta);
      await done;
      return this.read(scope);
    } catch(error) { try{tx.abort();}catch{} await done.catch(()=>{}); if(error.name==='QuotaExceededError') throw new Error('Local storage is full. Export your academic backup before removing data.'); throw error; }
  }
  async save(input,revision) {
    const clean=validateRecord(input),key=keyFor(clean);
    if(clean.kind==='annotation'&&clean.id!==await annotationId(clean.data.sourceKey))throw new Error('Personal details must use the existing source identity.');
    return this.change(clean.scope,async(tx)=>{
      const store=tx.objectStore('academicRecords'),old=await request(store.get(key));
      if(clean.kind==='assignment'){const source=assignmentKeyFromLink(clean.data.url);if(source)throw new Error('Refresh Canvas and use the assignment’s Personal details instead of making a second assignment.');}
      if((old?.revision||0)!==revision||!Number.isSafeInteger(revision)) throw conflict();
      store.put({...clean,key,revision:revision+1,updatedAt:new Date().toISOString(),deleted:false});
    });
  }
  async remove(scope,kind,id,revision) {
    const key=keyFor({scope,kind,id});
    return this.change(scope,async(tx,meta)=>{
      const store=tx.objectStore('academicRecords'),old=await request(store.get(key));
      if(!old||old.deleted||old.revision!==revision) throw conflict();
      meta.undo=old;
      store.put({...old,deleted:true,revision:old.revision+1,updatedAt:new Date().toISOString()});
    });
  }
  async undo(scope,revision) {
    return this.change(scope,async(tx,meta)=>{
      if(meta.revision!==revision) throw conflict();
      if(!meta.undo) throw new Error('There is no deleted item to restore.');
      const old=meta.undo,store=tx.objectStore('academicRecords'),current=await request(store.get(old.key));
      if(!current?.deleted) throw new Error('That item has already been restored.');
      store.put({...old,deleted:false,revision:current.revision+1,updatedAt:new Date().toISOString()});meta.undo=null;
    });
  }
  async setPreferences(scope,value,revision) {
    const clean=preferences(value);
    return this.change(scope,async(_tx,meta)=>{if(meta.revision!==revision)throw conflict();meta.preferences=clean;});
  }
  async sync(scope,input,leaseToken=null) {
    if(!validDate(input?.from)||!validDate(input?.to)||input.to<input.from||!Array.isArray(input.items)||input.items.length>10000||!Array.isArray(input.courses)||input.courses.length>2000) throw new Error('Canvas returned an unsupported data range.');
    const items=new Map();
    for(const item of input.items) {
      if(typeof item.key!=='string'||!item.key.startsWith(`${ORIGIN}|`)||item.key.length>240||!['assignment','canvas_event'].includes(item.kind)) throw new Error('Canvas returned an invalid source identity.');
      const clean={key:item.key,kind:item.kind,title:text(item.title??'Untitled Canvas item',300),courseId:text(String(item.courseId??''),100),description:text(item.description??'',5000),dueAt:timestamp(item.dueAt),startAt:timestamp(item.startAt),endAt:timestamp(item.endAt),url:safeLink(item.url),submitted:Boolean(item.submitted),graded:Boolean(item.graded),excused:Boolean(item.excused),submissionKnown:Boolean(item.submissionKnown),location:text(item.location??'',300),allDay:Boolean(item.allDay),date:validDate(item.date)?item.date:null};
      if(clean.url&&new URL(clean.url).origin!==ORIGIN) throw new Error('Canvas returned an unsupported source link.');
      items.set(clean.key,{...items.get(clean.key),...clean});
    }
    const courses=input.courses.map(course=>({id:text(String(course.id),100),name:text(course.name??'',300),code:text(course.code??'',100),color:/^#[a-f0-9]{6}$/i.test(course.color??'')?course.color:'#4f7d72',sections:(course.sections||[]).slice(0,100).map(s=>({id:text(String(s.id),100),name:text(s.name||'',200)}))}));
    const incoming=input.sources?.map(source=>{
      if(!/^https:\/\/vinuni\.instructure\.com\//.test(source.url)||!/^([a-f0-9]{64})$/.test(source.digest)||!/^((home|syllabus|announcement):\d+)$/.test(source.key))throw new Error('Invalid course source.');
      return {key:source.key,courseId:text(source.courseId,100),kind:source.kind,title:text(source.title,300),url:safeLink(source.url),digest:source.digest,summary:text(source.summary||'',1200),sections:(source.sections||[]).map(v=>text(v,200))};
    });
    if(incoming?.length>10000)throw new Error('Too many course sources.');
    return this.change(scope,async(tx,meta)=>{
      if(leaseToken&&(meta.refreshLeaseToken!==leaseToken||meta.refreshLeaseUntil<=Date.now()))throw conflict();
      tx.objectStore('academicCache').put({scope,from:input.from,to:input.to,courses,items:[...items.values()],syncedAt:new Date().toISOString()});
      meta.refreshLeaseUntil=0;
      if(incoming){const first=!meta.sources,previous=new Map((meta.sources||[]).map(s=>[s.key,s]));for(const source of incoming){const old=previous.get(source.key);previous.set(source.key,{...source,ackDigest:old?.ackDigest||(first?source.digest:null),observedAt:new Date().toISOString()});}meta.sources=[...previous.values()];meta.sourceWarnings=(input.sourceWarnings||[]).slice(0,200).map(w=>({courseId:text(String(w.courseId||''),100),kind:['home','announcement','syllabus'].includes(w.kind)?w.kind:'home',message:text(w.message||'Course source could not be checked.',300)}));}
    });
  }
  async lease(scope,force=false) {
    if(!validScope(scope))throw new Error('Reconnect to Canvas.');
    const db=await this.db(),tx=db.transaction(['academicMeta','academicCache'],'readwrite'),done=completed(tx),meta=(await request(tx.objectStore('academicMeta').get(scope)))||metadata(scope),cache=await request(tx.objectStore('academicCache').get(scope)),now=Date.now();
    const acquired=!(meta.refreshLeaseUntil>now)&&Boolean(force||!cache||now-Date.parse(cache.syncedAt)>=15*60000);
    if(acquired){meta.refreshLeaseToken=crypto.randomUUID();meta.refreshLeaseUntil=now+5*60000;tx.objectStore('academicMeta').put(meta);}await done;return {acquired,token:acquired?meta.refreshLeaseToken:null};
  }
  async release(scope,token){if(!validScope(scope))return;const db=await this.db(),tx=db.transaction('academicMeta','readwrite'),done=completed(tx),meta=await request(tx.objectStore('academicMeta').get(scope));if(meta&&meta.refreshLeaseToken===token){meta.refreshLeaseUntil=0;tx.objectStore('academicMeta').put(meta);}await done;return {released:true};}
  async acknowledge(scope,key,digest){return this.change(scope,async(_tx,meta)=>{const source=meta.sources?.find(s=>s.key===key);if(!source||source.digest!==digest)throw conflict();source.ackDigest=digest;});}
  async importCatalog(scope,records){
    if(!Array.isArray(records)||records.length>100)throw new Error('Choose up to 100 course sections.');
    const clean=records.map(r=>validateRecord({...r,scope}));if(clean.some(r=>r.kind!=='class'||!r.id.startsWith('catalog:')))throw new Error('Unsupported catalog record.');
    if(new Set(clean.map(r=>r.data.courseId)).size!==clean.length)throw new Error('Choose one registered section per course.');
    return this.change(scope,async(tx)=>{const store=tx.objectStore('academicRecords'),existing=await request(store.index('scope').getAll(scope));for(const r of clean){if(existing.some(old=>!old.deleted&&old.kind==='class'&&old.data.courseId===r.data.courseId))throw new Error('A class for this course already exists. Edit it rather than importing another copy.');const key=keyFor(r),old=await request(store.get(key));if(old&&!old.deleted)throw conflict();store.put({...r,key,revision:(old?.revision||0)+1,deleted:false,updatedAt:new Date().toISOString()});}});
  }
  async export(scope) { const state=await this.read(scope); return {format:'canvas-companion-academic',version:1,scope,preferences:state.preferences,records:state.records.map(({scope,id,kind,data})=>({scope,id,kind,data}))}; }
  async import(scope,backup,revision) {
    if(backup?.format!=='canvas-companion-academic'||backup.version!==1||backup.scope!==scope||!Array.isArray(backup.records)||backup.records.length>10000) throw new Error('Choose a companion academic backup for this Canvas account.');
    const records=backup.records.map(validateRecord);
    if(records.some(record=>record.kind==='assignment'&&assignmentKeyFromLink(record.data.url)))throw new Error('This backup contains a copied Canvas assignment. Refresh Canvas and link its existing record instead.');
    for(const record of records)if(record.kind==='annotation'&&record.id!==await annotationId(record.data.sourceKey))throw new Error('The backup has a noncanonical Canvas annotation identity.');
    if(records.some(record=>record.scope!==scope)||new Set(records.map(keyFor)).size!==records.length) throw new Error('The backup has duplicate or mismatched record identities.');
    const restoredPreferences=preferences(backup.preferences);
    // Merge missing/deleted records only; newer live records and preferences are preserved.
    return this.change(scope,async(tx,meta)=>{
      if(meta.revision!==revision) throw conflict();
      if(meta.revision===0)meta.preferences=restoredPreferences;
      const store=tx.objectStore('academicRecords');
      for(const record of records) {const key=keyFor(record),current=await request(store.get(key));if(!current||current.deleted)store.put({...record,key,revision:(current?.revision||0)+1,deleted:false,updatedAt:new Date().toISOString()});}
    });
  }
}
function timestamp(value) { if(value==null||value==='')return null;if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('Canvas returned an invalid timestamp.');return new Date(value).toISOString(); }
