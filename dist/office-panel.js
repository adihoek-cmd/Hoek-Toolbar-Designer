import * as office from './office-store.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Keep invitations in the URL fragment (never in a server request or referrer).
let invitation=new URLSearchParams(location.hash.slice(1)).get('officeInvite');
if(invitation)history.replaceState(null,'',location.pathname+location.search);
export const hasPendingInvite=()=>Boolean(invitation);
export function mountOfficePanel(dialog,user,toast,refresh=()=>{}){
 const panel=document.createElement('section');dialog.append(panel);
 const show=html=>{panel.innerHTML=html;};
 const run=fn=>async()=>{try{await fn()}catch(e){toast(e.message)}};
 if(!user){
  show(`<form><label>אימייל <input name="email" type="email" required autocomplete="username"></label><label>סיסמה <input name="password" type="password" required autocomplete="current-password"></label><button>כניסה עם אימייל</button><button type="button" data-register>הרשמה ואימות אימייל</button><button type="button" data-reset>איפוס סיסמה</button></form>`);
  const form=panel.querySelector('form');const credentials=()=>[form.elements.email.value,form.elements.password.value];
  form.onsubmit=e=>{e.preventDefault();run(async()=>{await office.emailLogin(...credentials());refresh()})()};
  panel.querySelector('[data-register]').onclick=run(()=>office.emailLogin(...credentials(),true));
  panel.querySelector('[data-reset]').onclick=run(async()=>{await office.resetPassword(credentials()[0]);toast('בקשת איפוס נשלחה')});return;
 }
 show(`<button data-accept ${invitation?'':'hidden'}>קבלת ההזמנה למשרד</button><label>סינון יומן לפי מזהה משתמש (ריק = כולם) <input data-audit-uid></label><button data-audit>יומן פעולות</button><div data-admin></div><pre data-output dir="auto" style="white-space:pre-wrap;max-height:50vh;overflow:auto"></pre><button data-more hidden>עוד פעולות</button>`);
 const output=panel.querySelector('[data-output]');let cursor;
 panel.querySelector('[data-accept]').onclick=run(async()=>{await office.call('redeemInvite',{token:invitation});invitation=null;toast('ההזמנה התקבלה. בחרו סנכרון עכשיו.');panel.querySelector('[data-accept]').hidden=true;});
 let auditUid='';
 const audit=async(next=false)=>{if(!next)auditUid=panel.querySelector('[data-audit-uid]').value.trim();const r=await office.call('listAudit',{...(next?{cursor}:{}),...(auditUid?{uid:auditUid}:{})});output.textContent=(next?output.textContent+'\n':'')+JSON.stringify(r.items,null,2);cursor=r.cursor;panel.querySelector('[data-more]').hidden=!cursor;};
 panel.querySelector('[data-audit]').onclick=run(()=>audit());panel.querySelector('[data-more]').onclick=run(()=>audit(true));
 run(async()=>{const {membership}=await office.call('readWorkspace');if(membership.role!=='admin')return;
  const admin=panel.querySelector('[data-admin]');admin.innerHTML='<label>הזמנה לאימייל <input type="email" data-email></label><button data-invite>יצירת קישור ל־24 שעות</button><button data-members>חברי המשרד</button><div data-list></div>';
  admin.querySelector('[data-invite]').onclick=run(async()=>{const r=await office.call('createInvite',{email:admin.querySelector('[data-email]').value});const url=new URL(location.href);url.hash=new URLSearchParams({officeInvite:r.token});output.textContent='קישור חד פעמי לשיתוף ב־Slack או WhatsApp:\n'+url.href;});
  admin.querySelector('[data-members]').onclick=run(async()=>{const members=await office.call('listMembers');const list=admin.querySelector('[data-list]');list.innerHTML=members.map((m,i)=>`<p>${esc(m.email)} · ${m.active?'פעיל':'מבוטל'} ${m.role!=='admin'&&m.active?`<button data-revoke="${i}">ביטול גישה</button>`:''}</p>`).join('');list.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=run(async()=>{await office.call('revokeMember',{uid:members[+b.dataset.revoke].uid});b.disabled=true;toast('הגישה בוטלה')}));});
 })();
}
