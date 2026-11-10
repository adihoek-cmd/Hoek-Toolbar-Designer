// Team members propose; only the owner applies a proposal to the private workspace.
export const OWNER_EMAIL='adi.hoek@gmail.com';
export const editable=['label','tooltip','priority','icon'];
const clone=x=>structuredClone(x),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function normalizeEmail(s){s=String(s||'').trim().toLowerCase();if(!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(s)||s.length>254)throw Error('כתובת מייל לא תקינה');return s;}
export function safeTeamIcon(s){return typeof s==='string'&&s.length<=140000&&/^(assets\/[A-Za-z0-9_.-]+\.(png|svg)|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$/.test(s);}
export function sharedSnapshot(payload,revision){
 return {revision,packageVersion:payload.state.ribbonDeployment?.packageVersion||payload.state.packageVersion,nodes:payload.state.nodes.map(n=>Object.fromEntries(['id','type','parent','order','label','tooltip','priority','status','icon'].filter(k=>n[k]!==undefined&&(k!=='icon'||safeTeamIcon(n[k]))).map(k=>[k,n[k]])))};
}
export function validateProposal(p){
 if(!p||!['edit','idea','comment'].includes(p.kind)||typeof p.nodeId!=='string'||typeof p.comment!=='string'||p.comment.length>6000)throw Error('הצעה לא תקינה');
 if(!p.base||!p.changes||Object.keys(p.changes).some(k=>![...editable,'parent','order'].includes(k)))throw Error('שדות לא נתמכים בהצעה');
 for(const [k,v]of Object.entries(p.changes)){
  if(k==='order'){if(!Number.isInteger(v)||v<0||v>3000)throw Error('מיקום לא תקין');}
  else if(typeof v!=='string'||v.length>(k==='icon'?140000:6000))throw Error('ערך לא תקין');
  if(k==='icon'&&!safeTeamIcon(v))throw Error('אייקון לא נתמך');
  if(k==='priority'&&!['low','normal','high'].includes(v))throw Error('עדיפות לא תקינה');
  if(k==='label'&&!v.trim())throw Error('נדרש שם לכלי');
 }
 if(('parent'in p.changes)!==('order'in p.changes))throw Error('יש לבחור קבוצה ומיקום יחד');
 if(p.kind==='idea'&&!p.changes.label?.trim())throw Error('נדרש שם לרעיון');
 if(p.kind==='idea'&&('parent'in p.changes||'order'in p.changes))throw Error('רעיון חדש נשמר ברעיונות להמשך');
 if(p.kind==='comment'&&!p.comment.trim())throw Error('נדרשת הערה');
 if(p.kind==='edit'&&!Object.keys(p.changes).length&&!p.comment.trim())throw Error('אין שינוי לשליחה');
 return p;
}
export function applyProposal(payload,proposal,id,author,now=new Date().toISOString()){
 const p=validateProposal(proposal),out=clone(payload),state=out.state;
 let n=state.nodes.find(n=>n.id===p.nodeId);
 if(p.kind==='idea'){
  if(state.nodes.some(n=>n.id==='team-'+id))throw Error('ההצעה כבר הוחלה');
  n={id:'team-'+id,type:'button',parent:'backlog',order:state.nodes.filter(n=>n.parent==='backlog').length,label:p.changes.label,tooltip:p.changes.tooltip||'',icon:p.changes.icon||'',notes:'',fix:'',status:'idea',priority:p.changes.priority||'normal'};state.nodes.push(n);
 }else{
  if(!n||n.type!=='button')throw Error('הכפתור כבר אינו קיים. יש לדחות את ההצעה ולבקש הצעה חדשה.');
  for(const k of Object.keys(p.changes))if(!same(n[k]??'',p.base[k]??''))throw Error('התנגשות: '+k+' השתנה מאז ההצעה. יש לדחות ולבקש הצעה מעודכנת.');
  if('parent'in p.changes){
   const parent=state.nodes.find(n=>n.id===p.changes.parent);
   if(p.changes.parent!=='backlog'&&!['panel','stack','dropdown'].includes(parent?.type))throw Error('קבוצת היעד אינה קיימת');
   const old=n.parent,siblings=state.nodes.filter(x=>x.parent===p.changes.parent&&x.id!==n.id).sort((a,b)=>a.order-b.order);
   n.parent=p.changes.parent;siblings.splice(Math.min(p.changes.order,siblings.length),0,n);siblings.forEach((x,i)=>x.order=i);
   if(old!==n.parent)state.nodes.filter(x=>x.parent===old).sort((a,b)=>a.order-b.order).forEach((x,i)=>x.order=i);
  }
  for(const k of editable)if(k in p.changes)n[k]=p.changes[k];
 }
 if(p.comment.trim())n.notes=[n.notes,`הצעת ${author} (${now.slice(0,10)}): ${p.comment.trim()}`].filter(Boolean).join('\n\n');
 out.history=[{time:now,label:`אישור הצעת צוות: ${n.label} · ${author}`},...(out.history||[])].slice(0,120);
 return out;
}
