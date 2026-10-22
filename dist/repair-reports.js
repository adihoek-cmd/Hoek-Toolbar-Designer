// Reports are claims about a release, never proof that a Revit test passed.
const text=(v,name,max=12000)=>{if(typeof v!=='string'||v.length>max)throw Error('שדה לא תקין בדוח: '+name);return v;};
const required=(v,name,max=12000)=>{text(v,name,max);if(!v.trim())throw Error('שדה חסר בדוח: '+name);return v;};
const list=(v,name)=>{if(!Array.isArray(v)||v.length>100)throw Error('רשימה לא תקינה: '+name);return v.map(x=>required(x,name,2000));};
export const latestRepair=n=>n.repairs?.at(-1);
export const needsRetest=n=>latestRepair(n)?.result==='fixed'&&latestRepair(n)?.verification==='pending';
export const repairStatus=n=>needsRetest(n)?'retest':n.status;
export function validateReport(input){
 if(!input||input.format!=='hoek-repair-report'||input.version!==1)throw Error('נדרש קובץ hoek-repair-report בגרסה 1');
 const report={format:input.format,version:1,reportId:required(input.reportId,'reportId',160),publishId:text(input.publishId??'','publishId',160),packageVersion:required(input.packageVersion,'packageVersion',80),generatedAt:required(input.generatedAt,'generatedAt',40)};
 if(!/^\d{4}-\d\d-\d\dT/.test(report.generatedAt)||!Number.isFinite(Date.parse(report.generatedAt)))throw Error('תאריך הדוח אינו תקין');
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>500)throw Error('הדוח חייב להכיל 1–500 כלים');
 const ids=new Set();report.items=input.items.map(i=>{
  if(!i||!['fixed','partial','not_fixed'].includes(i.result))throw Error('תוצאת תיקון לא תקינה');
  const nodeId=required(i.nodeId,'nodeId',160);if(ids.has(nodeId))throw Error('כלי מופיע פעמיים בדוח: '+nodeId);ids.add(nodeId);
  const item={nodeId,result:i.result,originalNote:text(i.originalNote,'originalNote'),originalFix:text(i.originalFix,'originalFix'),claimedFix:required(i.claimedFix,'claimedFix'),testSteps:list(i.testSteps,'testSteps'),testsPerformed:list(i.testsPerformed,'testsPerformed'),remainingIssues:list(i.remainingIssues,'remainingIssues'),changedFiles:list(i.changedFiles,'changedFiles')};
  if(item.result==='fixed'&&!item.testSteps.length)throw Error('נדרשות הוראות בדיקה לתיקון: '+nodeId);
  return item;
 });return report;
}
export function planReport(state,input){
 const report=validateReport(input),entries=[];
 for(const item of report.items){
  const node=state.nodes.find(n=>n.id===item.nodeId&&n.type==='button');
  let reason='';
  if(!node)reason='מזהה כלי לא נמצא — לא ייובא';
  else if(node.repairs?.some(r=>r.reportId===report.reportId)){
   const old=node.repairs.find(r=>r.reportId===report.reportId);
   if(JSON.stringify(old.reportItem)!==JSON.stringify(item)||old.packageVersion!==report.packageVersion||old.generatedAt!==report.generatedAt||old.publishId!==report.publishId)throw Error('דוח באותו מזהה כבר יובא עם תוכן אחר. בקשו מקלוד מזהה דוח חדש.');
   reason='כבר יובא — תוצאת הבדיקה נשמרת';
  }else if(latestRepair(node)&&Date.parse(latestRepair(node).generatedAt)>=Date.parse(report.generatedAt))reason='דוח ישן יותר או באותו מועד — לא יחליף את הדוח האחרון';
  const snapshot=report.publishId&&state.publishSnapshot?.id===report.publishId?state.publishSnapshot.nodes.find(n=>n.id===item.nodeId):null;
  const original={notes:snapshot?.notes??item.originalNote,fix:snapshot?.fix??item.originalFix};
  entries.push({item,nodeId:item.nodeId,label:node?.label||item.nodeId,reason,original,verifiedOriginal:!!snapshot,changedSincePublish:!!node&&(node.notes!==original.notes||node.fix!==original.fix),quoteMismatch:!!snapshot&&(item.originalNote!==original.notes||item.originalFix!==original.fix)});
 }
 return {report,entries};
}
export function applyReport(state,input,now=new Date().toISOString()){
 const plan=planReport(state,input),next=structuredClone(state);let count=0;
 for(const entry of plan.entries){if(entry.reason)continue;const n=next.nodes.find(n=>n.id===entry.nodeId),item=entry.item;
  const repair={reportId:plan.report.reportId,publishId:plan.report.publishId,packageVersion:plan.report.packageVersion,generatedAt:plan.report.generatedAt,importedAt:now,reportItem:structuredClone(item),result:item.result,claimedFix:item.claimedFix,testSteps:item.testSteps,testsPerformed:item.testsPerformed,remainingIssues:item.remainingIssues,changedFiles:item.changedFiles,original:entry.original,verifiedOriginal:entry.verifiedOriginal,localAtImport:{notes:n.notes||'',fix:n.fix||'',status:n.status},verification:item.result==='fixed'?'pending':'not_ready',reviewNote:''};
  n.repairs=[...(n.repairs||[]),repair];if(item.result==='fixed')n.status='testing';count++;
 }
 return {state:next,count};
}
export function reviewRepair(node,outcome,note='',now=new Date().toISOString()){
 const repair=latestRepair(node);if(!repair||repair.result!=='fixed'||!['passed','failed','pending'].includes(outcome))throw Error('אין תיקון מתאים לבדיקה');
 repair.verification=outcome;repair.reviewNote=text(note,'reviewNote');repair.reviewedAt=now;
 node.status=outcome==='passed'?'ok':outcome==='failed'?'fix':'testing';
 if(outcome==='passed')node.fixedVersion=repair.packageVersion;
}
export function validateRepairHistory(node){
 if(node.repairs===undefined)return;
 if(!Array.isArray(node.repairs)||node.repairs.length>500)throw Error('היסטוריית תיקונים לא תקינה');
 for(const r of node.repairs){
  if(!r||!['fixed','partial','not_fixed'].includes(r.result)||!['pending','passed','failed','not_ready'].includes(r.verification))throw Error('רשומת תיקון לא תקינה');
  required(r.reportId,'reportId',160);required(r.packageVersion,'packageVersion',80);required(r.generatedAt,'generatedAt',40);required(r.claimedFix,'claimedFix');
  if(!Number.isFinite(Date.parse(r.generatedAt)))throw Error('תאריך תיקון לא תקין');
  text(r.original?.notes,'original.notes');text(r.original?.fix,'original.fix');
  for(const k of ['testSteps','testsPerformed','remainingIssues','changedFiles'])list(r[k],k);
 }
}
