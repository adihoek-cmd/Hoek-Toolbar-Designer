import {validateReport} from './repair-reports.js';
// Adapt the integrator's dated report without inventing tests or test results.
export async function normalizeIncomingReport(input){
 if(input?.format==='hoek-repair-report')return validateReport(input);
 if(!input||!/^\d{4}-\d{2}-\d{2}$/.test(input.repairedAt||'')||!input.sourcePublish||!Array.isArray(input.items))throw Error('פורמט דוח לא מוכר');
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(input))));
 const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const lines=v=>Array.isArray(v)?v:typeof v==='string'?(v.trim()?[v]:[]):[];
 const report={format:'hoek-repair-report',version:1,reportId:'claude-legacy-'+hash,publishId:input.publishId||'',packageVersion:input.packageVersion,generatedAt:input.repairedAt+'T00:00:00Z',context:{verificationPolicy:input.verificationPolicy||'',alsoChanged:input.alsoChanged||[],notInThisRelease:input.notInThisRelease||[],installation:input.installation||{},artifacts:input.artifacts||{},sourcePublish:input.sourcePublish,buildProvenance:input.buildProvenance||{},normalizationNotes:['הדוח המקורי הכיל תאריך בלבד. שעת חצות היא ערך טכני לצורך מיון, לא שעת התיקון.','לא צורפו הוראות בדיקה נפרדות; אין להסיק שבדיקות המשתמש בוצעו.']},items:input.items.map(i=>({nodeId:i.nodeId,result:i.status,originalNote:i.originalNote??'',originalFix:i.originalFix??'',claimedFix:i.claimedFix?.trim()?i.claimedFix:i.status==='not_fixed'?'לא דווח על תיקון. '+(typeof i.remainingIssues==='string'?i.remainingIssues:'ראו נושאים פתוחים.'):'',testSteps:lines(i.testSteps).length?lines(i.testSteps):['לא צורפו הוראות בדיקה נפרדות בדוח. יש לבדוק ב־Revit מול הבקשה המקורית והתיקון המדווח.'],testsPerformed:lines(i.testsPerformed),remainingIssues:lines(i.remainingIssues),changedFiles:lines(i.filesChanged)}))};
 return validateReport(report);
}
