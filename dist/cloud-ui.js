import * as cloud from './cloud-store.js';
import {mergeWorkspaces,resolveMerge,equal} from './workspace-merge.js';
import {cloudEnabled} from './firebase-config.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function setupCloud(a){
 let user,stop,busy=false,timer,blocked=false,lastError='',pending;
 const dialog=document.createElement('dialog');dialog.className='cloud-sheet';document.body.append(dialog);
 const button=document.createElement('button');button.id='cloud-status';button.textContent='☁ סנכרון';document.querySelector('.header-actions').prepend(button);
 if(!cloudEnabled){button.textContent='☁ סנכרון בהכנה';button.onclick=()=>shell('<p>עדכון Ribbon 3.9.5 פעיל. הנתונים נשמרים במכשיר הזה.</p><p>חיבור הענן עדיין בבדיקות ואינו מעביר נתונים. לאחר השלמת הגדרות Firebase תתאפשר כניסה ושיתוף פרטי בין המכשירים.</p><p>אפשר להמשיך לעבוד ולייצא גיבוי כרגיל.</p>');return {changed:()=>{}};}
 function status(s){button.textContent='☁ '+s;}
 function error(e){lastError=e.code==='permission-denied'?'אין הרשאת גישה. יש להשלים את הגדרות Firebase.':e.message;status('נדרשת תשומת לב');}
 function shell(body){dialog.innerHTML=`<div class="sheet-head"><h2>סביבת העבודה בענן</h2><button data-dismiss>✕</button></div>${body}`;dialog.querySelector('[data-dismiss]').onclick=()=>dialog.close();if(!dialog.open)dialog.showModal();}
 function overview(){
  shell(`<p>סנכרון פרטי בין הטלפון למחשב. השינויים נשמרים גם במכשיר כשאין חיבור.</p><p dir="auto">${esc(user?.email||'עדיין לא מחוברים')}</p>${lastError?`<p role="alert">${esc(lastError)}</p>`:''}<div class="cloud-actions">${!user?'<button data-login class="primary">כניסה עם Google</button>':`<button data-sync class="primary">סנכרון עכשיו</button><button data-revisions>גרסאות קודמות בענן</button><button data-logout>ניתוק מהענן</button>`}</div><p><small>ניתוק עוצר את הסנכרון. העותק המקומי נשאר בדפדפן הזה. בצעו ייצוא גיבוי לפני עבודה במחשב משותף.</small></p>`);
  dialog.querySelector('[data-login]')?.addEventListener('click',()=>cloud.login().catch(error));
  dialog.querySelector('[data-sync]')?.addEventListener('click',()=>{blocked=false;lastError='';dialog.close();sync()});
  dialog.querySelector('[data-logout]')?.addEventListener('click',async()=>{if(busy){a.toast('המתינו לסיום הסנכרון');return;}await cloud.logout();overview()});
  dialog.querySelector('[data-revisions]')?.addEventListener('click',async()=>{try{
   const list=await cloud.revisions(user.uid);
   shell(`<p>הורדת גרסה קודמת כגיבוי אינה מחליפה את העבודה הנוכחית.</p>${list.map((v,i)=>`<button data-version="${i}">גרסה ${v.revision} · ${esc(v.createdAt?.toDate().toLocaleString('he-IL')||'')}</button>`).join('')||'<p>אין גרסאות עדיין.</p>'}`);
   dialog.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>{const payload=JSON.parse(list[+b.dataset.version].payload);a.download(`hoek-cloud-revision-${list[+b.dataset.version].revision}.json`,{format:'hoek-backup',version:1,...payload,exportedAt:new Date().toISOString()})});
  }catch(e){error(e);overview()}});
 }
 function first(remote){
  blocked=true;
  shell(`<p>${remote?'קיים תכנון בענן. לפני החיבור, בחרו באיזה עותק להתחיל. העותק הנוכחי יישמר כנקודת שחזור במכשיר.':'עדיין אין תכנון בענן. פתחו את הפעולה הזו בטלפון שבו נמצאת העבודה העדכנית ביותר.'}</p><div class="cloud-actions">${remote?'<button data-join class="primary">פתיחת התכנון מהענן</button>':'<button data-publish class="primary">שיתוף התכנון מהמכשיר הזה לענן הפרטי</button>'}<button data-backup>ייצוא גיבוי מקומי</button></div><p>ייבוא גיבוי רגיל מחליף תכנון; עדכון מקור Ribbon יתבצע בנפרד.</p>`);
  dialog.querySelector('[data-backup]').onclick=()=>a.backup();
  dialog.querySelector('[data-join]')?.addEventListener('click',async()=>{try{a.validate(remote.payload.state);await a.recover();await a.apply(remote.payload,{uid:user.uid,base:remote.payload,revision:remote.revision});blocked=false;dialog.close();schedule();}catch(e){error(e)}});
  dialog.querySelector('[data-publish]')?.addEventListener('click',async()=>{try{await a.recover();await a.setMeta({uid:user.uid,base:null,revision:0});blocked=false;dialog.close();sync();}catch(e){error(e)}});
 }
 function conflicts(merge,remote,local){
  blocked=true;pending={merge,remote,local};status('בחירת שינויים');
  shell(`<p>אותו מידע השתנה בשני מכשירים. בחרו לכל שינוי איזו גרסה לשמור. אפשר לייצא את שתיהן לפני הבחירה.</p><button data-both>הורדת שתי הגרסאות</button><div class="cloud-conflicts">${merge.conflicts.map((c,i)=>`<fieldset><legend dir="auto">${esc(c.path.join(' / '))}</legend><label><input type="radio" name="conflict-${i}" value="local"> במכשיר הזה <pre dir="auto">${esc(JSON.stringify(c.local)??'נמחק')}</pre></label><label><input type="radio" name="conflict-${i}" value="remote"> בענן <pre dir="auto">${esc(JSON.stringify(c.remote)??'נמחק')}</pre></label></fieldset>`).join('')}</div><button data-resolve class="primary">שמירת הבחירות</button>`);
  dialog.querySelector('[data-both]').onclick=()=>a.download('hoek-conflicting-versions.json',{local,remote:remote.payload,base:a.meta().base});
  dialog.querySelector('[data-resolve]').onclick=async()=>{try{
   if(!equal(await a.snapshot(),local)){blocked=false;pending=null;dialog.close();schedule();a.toast('נוספו שינויים מקומיים; בודק שוב לפני המיזוג');return;}
   const choices=merge.conflicts.map((_,i)=>dialog.querySelector(`input[name="conflict-${i}"]:checked`)?.value);
   const state=resolveMerge(merge,choices);a.validate(state);
   await a.recover();await a.apply({state,history:combineHistory(local.history,remote.payload.history)},{uid:user.uid,base:remote.payload,revision:remote.revision});
   blocked=false;pending=null;dialog.close();schedule();
  }catch(e){a.toast(e.message)}};
 }
 async function sync(){
  if(busy||blocked||!user)return;
  if(!navigator.onLine){status('ממתין לחיבור');return;}
  // Do not replace a state being edited in an open bottom sheet.
  if(a.editing()){schedule();return;}
  busy=true;status('מסנכרן…');
  try{
   await a.saved();const remote=await cloud.read(user.uid),meta=a.meta();
   if(meta?.uid!==user.uid){first(remote);return;}
   let local=await a.snapshot(),candidate=local;
   if(remote&&remote.revision!==meta.revision){
    if(!meta.base){first(remote);return;}
    const merge=mergeWorkspaces(meta.base.state,local.state,remote.payload.state);
    if(merge.conflicts.length){conflicts(merge,remote,local);return;}
    a.validate(merge.state);candidate={state:merge.state,history:combineHistory(local.history,remote.payload.history)};
   }else if(!remote&&meta.revision){throw Error('הגרסה בענן חסרה. העותק המקומי נשמר; הסנכרון נעצר.');}
   if(remote&&equal(candidate,remote.payload)){
    if(!equal(local,candidate))await a.recover();
    // An edit can occur while icons load. Never replace a newer local edit.
    if(a.editing()||!equal(await a.snapshot(),local)){schedule();return;}
    await a.apply(candidate,{uid:user.uid,base:remote.payload,revision:remote.revision});status('מסונכרן');return;
   }
   const result=await cloud.commit(user.uid,remote?.revision||0,candidate);
   const now=await a.snapshot();
   if(!a.editing()&&equal(now,local)){await a.apply(candidate,{uid:user.uid,base:candidate,revision:result.revision});}
   else{
    // Preserve edits made during the network request; merge them on the next pass.
    await a.setMeta({uid:user.uid,base:local,revision:remote?.revision||0});schedule();
   }
   status('מסונכרן');lastError='';
  }catch(e){if(e.code==='hoek/stale'){schedule();}else error(e);}
  finally{busy=false;}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(sync,1800);}
 button.onclick=()=>pending?conflicts(pending.merge,pending.remote,pending.local):overview();
 cloud.authChanged(u=>{stop?.();user=u;blocked=false;pending=null;if(u){status('מחובר');stop=cloud.watch(u.uid,()=>schedule(),error);schedule();}else status('כניסה');});
 window.addEventListener('online',schedule);window.addEventListener('offline',()=>status('ממתין לחיבור'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 return {changed:schedule};
}
function combineHistory(a=[],b=[]){return [...new Map([...a,...b].map(h=>[h.time+'|'+h.label,h])).values()].sort((x,y)=>y.time.localeCompare(x.time)).slice(0,120)}
