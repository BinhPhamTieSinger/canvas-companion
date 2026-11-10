export const SIGNALS=Object.freeze({examination:'Possible examination details',schedule:'Possible schedule / cancellation details',location:'Possible room / location details',deadline:'Possible deadline details'});
export function sourceSignals(value){
 const patterns={examination:/\b(midterm|final exam|exam(?:ination)?|quiz|practical test)\b|thi giữa|thi cuối|kiểm tra/iu,schedule:/\b(lecture|recitation|laboratory|class time|reschedul\w*|cancel\w*|no class|holiday|office hours|make.?up)\b|nghỉ học|lịch học/iu,location:/\b(room|classroom|building|location|venue)\b|phòng học|địa điểm/iu,deadline:/\b(deadline|due date|due on|due by|submission|submit by|extension)\b|hạn nộp/iu};
 return Object.entries(patterns).filter(([,pattern])=>pattern.test(value)).map(([key])=>key);
}
export function pendingSources(sources=[]){return sources.filter(s=>s.digest!==s.ackDigest);}
export function mergeDocument(old,source,first,now=new Date().toISOString()){
 const changed=Boolean(old&&old.digest!==source.digest);
 return {...source,ackDigest:old?.ackDigest||(first?source.digest:null),changeKind:old?changed?'edited':old.changeKind||'edited':'new',previousSummary:changed?old.summary:old?.previousSummary||'',observedAt:now};
}
