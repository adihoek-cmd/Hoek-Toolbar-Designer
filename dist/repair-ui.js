import {normalizeIncomingReport} from './repair-normalize.js';
import {planReport,applyReport,latestRepair,needsRetest,reviewRepair} from './repair-reports.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const results={fixed:'תוקן לפי דיווח קלוד — יש לבדוק',partial:'תיקון חלקי',not_fixed:'לא תוקן'};
const reviews={pending:'תוקן — יש לבדוק',passed:'בדקתי ותקין',failed:'נבדק — עדיין דורש תיקון',not_ready:'טרם מוכן לאישור'};
const paragraph=(title,value)=>`<section class="repair-section"><h3>${esc(title)}</h3><p dir="auto">${esc(value||'לא צוינה הערה')}</p></section>`;
const list=(title,items)=>`<section class="repair-section"><h3>${esc(title)}</h3>${items.length?`<ol>${items.map(s=>`<li dir="auto">${esc(s)}</li>`).join('')}</ol>`:'<p>לא דווח</p>'}</section>`;
export function setupRepairs(a){
 const dialog=document.createElement('dialog');dialog.id='repair-dialog';dialog.className='cloud-sheet repair-sheet';document.body.append(dialog);
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;input.id='repair-file';document.body.append(input);
 const shell=(title,body)=>{dialog.innerHTML=`<div class="sheet-head"><h2>${esc(title)}</h2><button type="button" data-dismiss aria-label="סגירת דוח התיקונים">✕</button></div>${body}`;dialog.querySelector('[data-dismiss]').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();};
 function contextHTML(context){
  if(!context)return '';
  const strings=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
  const outside=Array.isArray(context.notInThisRelease)?context.notInThisRelease:[];
  return '<details class="repair-context"><summary>סיכום המסירה, מגבלות ומידע נוסף</summary><p>מידע כפי שנמסר בדוח קלוד; אינו אישור בדיקה שלנו.</p>'+paragraph('רמת הבדיקה שדווחה',context.verificationPolicy)+list('שינויים נוספים בחבילה',strings(context.alsoChanged))+outside.map(x=>paragraph(x.label||x.nodeId,x.reason)).join('')+list('הערות על הדוח',strings(context.normalizationNotes))+'<details><summary>התקנה ופרטי החבילה כפי שדווחו</summary><pre dir="auto">'+esc(JSON.stringify({installation:context.installation,artifacts:context.artifacts,sourcePublish:context.sourcePublish,buildProvenance:context.buildProvenance},null,2))+'</pre></details></details>';
 }
 function preview(data){
  const before=JSON.stringify(a.state()),plan=planReport(a.state(),data),active=plan.entries.filter(e=>!e.reason);
  shell('קליטת דוח תיקונים',`<p>גרסת תיקון מדווחת: <b dir="auto">${esc(plan.report.packageVersion)}</b> · ${active.length} כלים לקליטה</p><p>הדוח מתעד את טענות קלוד. הוא אינו מתקין את תוסף Revit ואינו מאשר שהכלים תקינים. ההערות והאייקונים שלך יישמרו.</p>${contextHTML(plan.report.context)}${plan.entries.map(e=>`<article class="repair-preview"><h3 dir="auto">${esc(e.label)}</h3><p>${esc(e.reason||results[e.item.result])}</p>${!e.reason?`${e.verifiedOriginal?'':'<p class="repair-warning">ה־Publish המקורי אינו שמור כאן. ההערה המקורית מוצגת כפי שציטט קלוד; יש להשוות אותה ל־Publish שנשלח.</p>'}${e.changedSincePublish?'<p class="repair-warning">ההערות הנוכחיות שונות מהמקור — הן יישמרו ללא החלפה.</p>':''}${e.quoteMismatch?'<p class="repair-warning">הציטוט של קלוד שונה מה־Publish השמור. יוצג המקור השמור באפליקציה.</p>':''}${paragraph('ההערה המקורית',e.original.notes)}${paragraph('מה התבקש לתקן',e.original.fix)}${paragraph('מה קלוד טוען שתיקן',e.item.claimedFix)}`:''}</article>`).join('')}<div class="repair-actions"><button data-apply class="primary" ${active.length?'':'disabled'}>קליטת ${active.length} כלים</button><button data-cancel>ביטול</button></div>`);
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-apply]').onclick=()=>{try{
   if(JSON.stringify(a.state())!==before){preview(data);a.toast('התכנון השתנה; יש לבדוק שוב את התצוגה לפני הקליטה');return;}
   const result=applyReport(a.state(),data);a.change('קליטת דוח תיקונים: '+plan.report.packageVersion,()=>a.replace(result.state));dialog.close();a.toast(`נקלטו ${result.count} דיווחים. תיקונים ממתינים לבדיקה שלך.`);
  }catch(e){a.toast(e.message)}};
 }
 function detail(id){
  const n=a.state().nodes.find(n=>n.id===id),r=n&&latestRepair(n);if(!r)return;
  shell(n.label,`<p class="repair-status">${esc(r.result==='fixed'?reviews[r.verification]:results[r.result])}</p><p>${r.reportId.startsWith("source-review-")?"לפי בדיקת קוד החבילה · טרם נבדק ב־Revit":"לפי דיווח קלוד"} · גרסה <b dir="auto">${esc(r.packageVersion)}</b><br><small dir="auto">${esc(r.reportId)} · ${esc(r.generatedAt)}</small></p>${!r.verifiedOriginal&&!r.reportId.startsWith('source-review-')?'<p class="repair-warning">המקור מצוטט מדוח קלוד; לא אומת מול Publish שמור.</p>':''}${paragraph('ההערה שהייתה',r.original.notes)}${paragraph('התיקון שהתבקש',r.original.fix)}${paragraph(r.reportId.startsWith('source-review-')?'השינוי שנמצא בקוד':'מה קלוד טוען שתיקן',r.claimedFix)}${n.notes!==r.original.notes||n.fix!==r.original.fix?`<details><summary>ההערות הנוכחיות שלך — נשמרו</summary>${paragraph('הערות',n.notes)}${paragraph('תיקונים',n.fix)}</details>`:''}${list('איך לבדוק ב־Revit',r.testSteps)}${list(r.reportId.startsWith('source-review-')?'מה נבדק בפועל':'בדיקות שקלוד מדווח שביצע',r.testsPerformed)}${list('מה עדיין נותר פתוח',r.remainingIssues)}<details><summary>קבצים ששונו</summary>${list('קבצים',r.changedFiles)}</details>${r.result==='fixed'?`<label class="repair-review-label">תוצאת הבדיקה שלי<textarea id="repair-review-note" maxlength="12000" rows="3" placeholder="מה בדקת ומה קרה בפועל?">${esc(r.reviewNote)}</textarea></label><div class="repair-actions"><button class="primary" data-review="passed">✓ בדקתי ותקין</button><button data-review="failed">! עדיין דורש תיקון</button>${!needsRetest(n)?'<button data-review="pending">החזרה לבדיקה</button>':''}</div>`:''}${n.repairs.length>1?`<details><summary>דיווחים קודמים (${n.repairs.length-1})</summary>${n.repairs.slice(0,-1).reverse().map(old=>`<article class="repair-preview"><b dir="auto">${esc(old.packageVersion)} · ${esc(old.reportId)}</b><p>${esc(results[old.result])} · ${esc(reviews[old.verification])}</p>${paragraph('ההערה המקורית',old.original.notes)}${paragraph('התיקון שהתבקש',old.original.fix)}${paragraph('דיווח קלוד',old.claimedFix)}${paragraph('תוצאת הבדיקה שלך',old.reviewNote)}</article>`).join('')}</details>`:''}`);
  const context=a.state().repairReleases?.find(x=>x.reportId===r.reportId)?.context;if(context)dialog.insertAdjacentHTML('beforeend',contextHTML(context));
  // Keep the underlying unsaved editor intact. Review from the card after saving it.
  if(document.querySelector('#editor[open]')){
   dialog.querySelectorAll('[data-review],#repair-review-note').forEach(el=>el.disabled=true);
   const hint=document.createElement('p');hint.className='repair-warning';hint.textContent='לשמירת תוצאת בדיקה, סגרו את הדוח ושמרו תחילה את כרטיס העריכה. לאחר מכן פתחו את דוח התיקון מהסרגל.';dialog.append(hint);
  }else dialog.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{const note=dialog.querySelector('#repair-review-note').value;a.change('בדיקת תיקון: '+n.label,()=>reviewRepair(a.state().nodes.find(x=>x.id===id),b.dataset.review,note));detail(id);});
 }
 input.onchange=async()=>{try{const f=input.files[0];if(!f)return;if(f.size>2*1024*1024)throw Error('דוח התיקונים גדול מדי (עד 2MB)');preview(await normalizeIncomingReport(JSON.parse(await f.text())));}catch(e){a.toast(e.message)}finally{input.value=''}};
 document.querySelector('#import-repairs').onclick=()=>{document.querySelector('#menu').close();input.click()};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-repair]');if(b)detail(b.dataset.repair)});
 return {detail};
}
