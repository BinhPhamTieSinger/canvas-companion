export const SIGNALS=Object.freeze({examination:'Possible examination details',schedule:'Possible schedule / cancellation details',location:'Possible room / location details',deadline:'Possible deadline details'});
export function sourceSignals(value){
 const patterns={examination:/\b(midterm|final exam|exam(?:ination)?|quiz|practical test)\b|thi giữa|thi cuối|kiểm tra/iu,schedule:/\b(lectures?|recitations?|labs?|laborator(?:y|ies)|class time|reschedul\w*|cancel\w*|no class|holiday|office hours|make.?up)\b|nghỉ học|lịch học/iu,location:/\b(room|classroom|building|location|venue)\b|phòng học|địa điểm/iu,deadline:/\b(deadline|due date|due on|due by|submission|submit by|extension)\b|hạn nộp/iu};
 return Object.entries(patterns).filter(([,pattern])=>pattern.test(value)).map(([key])=>key);
}
export function pendingSources(sources=[]){return sources.filter(s=>s.digest!==s.ackDigest);}
export function mergeDocument(old,source,first,now=new Date().toISOString()){
 const changed=Boolean(old&&old.digest!==source.digest);
 const posted=Date.parse(source.postedAt),age=Date.parse(now)-posted;
 const initialReview=first&&!old&&source.kind==='announcement'&&source.signals?.length&&(!Number.isFinite(posted)||(age>=0&&age<=14*86400000));
 return {...source,ackDigest:old?.ackDigest||(first&&!initialReview?source.digest:null),changeKind:old?changed?'edited':old.changeKind||'edited':'new',previousSummary:changed?old.summary:old?.previousSummary||'',observedAt:now};
}
export function sourceHealth(state,now=Date.now()){
 const lastCheckedAt=state.sourcesCheckedAt||(state.sources?.length?state.cache?.syncedAt:null)||null,stamp=Date.parse(lastCheckedAt),stale=!Number.isFinite(stamp)||stamp>now+300000||now-stamp>=15*60000;
 return {lastCheckedAt,stale,partial:Boolean(state.sourceWarnings?.length),autoRefresh:Boolean(state.preferences?.autoRefresh)};
}
