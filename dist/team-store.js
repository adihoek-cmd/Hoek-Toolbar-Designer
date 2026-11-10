import {auth,db,read} from './cloud-store.js';
import {sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink} from './vendor/firebase-auth.js';
import {doc,collection,getDocFromServer,getDocsFromServer,setDoc,query,where,limit,runTransaction,serverTimestamp} from './vendor/firebase-firestore.js';
import {normalizeEmail,sharedSnapshot,validateProposal,applyProposal,OWNER_EMAIL} from './team-model.js';
const team=doc(db,'teams','hoek'),members=collection(team,'members'),proposals=collection(team,'proposals'),snapshot=doc(team,'published','current');
export const owner=u=>u?.email?.toLowerCase()===OWNER_EMAIL&&u.emailVerified;
export async function sendLink(email){email=normalizeEmail(email);await sendSignInLinkToEmail(auth,email,{url:new URL('team.html',location.href).href.split('?')[0],handleCodeInApp:true});sessionStorage.setItem('hoek-team-email',email);}
export const hasEmailLink=()=>isSignInWithEmailLink(auth,location.href);
export async function finishLink(email){await signInWithEmailLink(auth,normalizeEmail(email),location.href);sessionStorage.removeItem('hoek-team-email');history.replaceState(null,'',location.pathname);}
export async function access(){const user=auth.currentUser;if(!user?.emailVerified)throw Error('נדרשת כניסה עם מייל מאומת');if(owner(user))return {owner:true};const m=await getDocFromServer(doc(members,normalizeEmail(user.email)));if(!m.exists()||!m.data().active)throw Error('המייל הזה אינו ברשימת המורשים. בקשו מעדי להוסיף אותו.');return {owner:false};}
export async function publish(){const uid=auth.currentUser?.uid;if(!owner(auth.currentUser))throw Error('רק מנהל יכול לפרסם');return runTransaction(db,async tx=>{const h=doc(db,'users',uid,'workspaces','main'),meta=await tx.get(h);if(!meta.exists())throw Error('אין תכנון בענן');const v=await tx.get(doc(h,'versions',meta.data().head));const payload=JSON.stringify(sharedSnapshot(JSON.parse(v.data().payload),meta.data().revision));if(new TextEncoder().encode(payload).length>800000)throw Error('התצוגה גדולה מדי לשיתוף');tx.set(team,{ownerUid:uid,updatedAt:serverTimestamp()});tx.set(snapshot,{payload,revision:meta.data().revision,updatedAt:serverTimestamp()});return meta.data().revision;});}
export async function loadSnapshot(){const s=await getDocFromServer(snapshot);if(!s.exists())throw Error('המנהל טרם פרסם סרגל לצוות');return JSON.parse(s.data().payload);}
export async function listMembers(){return (await getDocsFromServer(members)).docs.map(d=>({email:d.id,...d.data()}));}
export async function setMember(email,active){email=normalizeEmail(email);await setDoc(doc(members,email),{email,active,updatedAt:serverTimestamp()});}
export async function submitProposal(input,revision,id){validateProposal(input);const u=auth.currentUser;await setDoc(doc(proposals,id),{authorUid:u.uid,authorEmail:normalizeEmail(u.email),baseRevision:revision,payload:JSON.stringify(input),status:'pending',createdAt:serverTimestamp()});}
export async function listProposals(){const u=auth.currentUser;const q=owner(u)?query(proposals,where('status','==','pending'),limit(100)):query(proposals,where('authorUid','==',u.uid),limit(100));return (await getDocsFromServer(q)).docs.map(d=>({id:d.id,...d.data()}));}
export async function decide(id,approve,reviewNote){
 const uid=auth.currentUser?.uid;if(!owner(auth.currentUser))throw Error('רק מנהל יכול להחליט');const ref=doc(proposals,id),head=doc(db,'users',uid,'workspaces','main'),versionId=crypto.randomUUID();
 return runTransaction(db,async tx=>{
  const proposal=await tx.get(ref);if(!proposal.exists()||proposal.data().status!=='pending')throw Error('ההצעה כבר טופלה');const p=proposal.data();
  if(!approve){tx.update(ref,{status:'rejected',reviewNote,reviewedAt:serverTimestamp(),reviewerUid:uid});return;}
  const h=await tx.get(head);if(!h.exists())throw Error('התכנון הראשי חסר');const meta=h.data();const version=await tx.get(doc(head,'versions',meta.head));
  const payload=applyProposal(JSON.parse(version.data().payload),JSON.parse(p.payload),id,p.authorEmail),body=JSON.stringify(payload);if(new TextEncoder().encode(body).length>800000)throw Error('התכנון גדול מדי לסנכרון');
  tx.set(doc(head,'versions',versionId),{payload:body,revision:meta.revision+1,createdAt:serverTimestamp()});
  tx.set(head,{head:versionId,revision:meta.revision+1,updatedAt:serverTimestamp(),schema:1});
  tx.update(ref,{status:'approved',reviewNote,reviewedAt:serverTimestamp(),reviewerUid:uid,appliedRevision:meta.revision+1});
 });
}
