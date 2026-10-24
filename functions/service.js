import {hash,token,email,identity,validatePayload,diff,fail} from "./core.js";
export function createService(db,auth,stamp){
const root=db.doc('offices/hoek'),head=root.collection('workspaces').doc('main');
const member=uid=>root.collection('members').doc(uid);

function audit(tx,actor,action,details){tx.create(root.collection('audit').doc(),{actor,action,details,createdAt:stamp()});}
function callable(fn){return async r=>{const actor=identity(r.auth);let live;try{live=await auth.getUser(actor.uid)}catch{fail('permission-denied','Account unavailable')};if(live.disabled||!live.emailVerified||email(live.email)!==actor.email||(live.tokensValidAfterTime&&r.auth.token.auth_time*1000<Date.parse(live.tokensValidAfterTime)))fail('permission-denied','Account unavailable');return fn(actor,r.data||{});};}
async function authorize(tx,a,admin=false){const m=await tx.get(member(a.uid));if(!m.exists||!m.data().active||m.data().email!==a.email||(admin&&m.data().role!=='admin'))fail('permission-denied','Active office membership required');return m.data();}
const createInvite=callable(async(a,d)=>{
 const address=email(d.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))fail('invalid-argument','Email required');
 const secret=token(),expiresAt=Date.now()+86400000;
 await db.runTransaction(async tx=>{await authorize(tx,a,true);tx.create(root.collection('invites').doc(hash(secret)),{email:address,expiresAt,used:false,createdBy:a.uid,createdAt:stamp()});audit(tx,a,'invite.create',{email:address,expiresAt});});
 return {token:secret,expiresAt};
});
const redeemInvite=callable(async(a,d)=>{
 if(typeof d.token!=='string'||!/^[\w-]{43}$/.test(d.token))fail('invalid-argument','Invalid invitation');
 return db.runTransaction(async tx=>{const ref=root.collection('invites').doc(hash(d.token)),s=await tx.get(ref),m=await tx.get(member(a.uid));
 if(!s.exists||s.data().used||s.data().expiresAt<=Date.now()||s.data().email!==a.email||(m.data()?.revokedInvitesBefore&&s.data().expiresAt-86400000<=m.data().revokedInvitesBefore))fail('permission-denied','Invitation unavailable or email mismatch');
 tx.update(ref,{used:true,usedBy:a.uid,usedAt:stamp()});tx.set(member(a.uid),{email:a.email,active:true,role:m.data()?.role==='admin'?'admin':'member',joinedAt:stamp()});audit(tx,a,'invite.redeem',{email:a.email});return {ok:true};});
});
const revokeMember=callable(async(a,d)=>db.runTransaction(async tx=>{await authorize(tx,a,true);if(typeof d.uid!=='string'||!d.uid||d.uid.includes('/'))fail('invalid-argument','Invalid UID');const ref=member(d.uid),m=await tx.get(ref);if(!m.exists||m.data().role==='admin')fail('failed-precondition','Cannot revoke admin or missing member');tx.update(ref,{active:false,revokedAt:stamp(),revokedInvitesBefore:Date.now()});audit(tx,a,'member.revoke',{uid:d.uid});return {ok:true};}));
const readWorkspace=callable(async a=>db.runTransaction(async tx=>{const membership=await authorize(tx,a),h=await tx.get(head);return {membership,workspace:h.exists?{...h.data(),payload:JSON.parse(h.data().payload)}:null};}));
const commitWorkspace=callable(async(a,d)=>{
 const body=validatePayload(d.payload);if(!Number.isSafeInteger(d.expected)||d.expected<0)fail('invalid-argument','Revision required');
 return db.runTransaction(async tx=>{const m=await authorize(tx,a),h=await tx.get(head),old=h.data();
 if((old?.revision||0)!==d.expected)fail('aborted','Cloud changed');
 if(!h.exists&&(m.role!=='admin'||d.migration!==true))fail('permission-denied','Admin migration required');
 const previous=old?JSON.parse(old.payload):null;
 const revision=d.expected+1,changes=diff(previous,d.payload),v=head.collection('versions').doc(String(revision).padStart(12,'0'));
 const record={payload:body,revision,updatedAt:stamp(),actor:a};tx.create(v,record);tx.set(head,record);
 const before=new Map((previous?.state.nodes||[]).map(n=>[n.id,n])),after=new Map(d.payload.state.nodes.map(n=>[n.id,n]));
 audit(tx,a,h.exists?'workspace.commit':'workspace.migrate',{revision,changes,nodeIds:[...new Set([...before.keys(),...after.keys()])].filter(id=>JSON.stringify(before.get(id))!==JSON.stringify(after.get(id)))});
 return {revision};});
});
const listMembers=callable(async a=>db.runTransaction(async tx=>{await authorize(tx,a,true);const s=await tx.get(root.collection('members').limit(200));return s.docs.map(d=>({uid:d.id,...d.data()}));}));
const listAudit=callable(async(a,d)=>db.runTransaction(async tx=>{await authorize(tx,a);let q=root.collection('audit');if(d.uid){if(typeof d.uid!=='string'||d.uid.length>128)fail('invalid-argument','Invalid UID');q=q.where('actor.uid','==',d.uid);}q=q.orderBy('createdAt','desc').orderBy('__name__','desc');if(d.cursor){if(typeof d.cursor!=='string'||!/^[-\w]{1,128}$/.test(d.cursor))fail('invalid-argument','Invalid cursor');const c=await tx.get(root.collection('audit').doc(d.cursor));if(!c.exists)fail('invalid-argument','Invalid cursor');q=q.startAfter(c);}const s=await tx.get(q.limit(25));return {items:s.docs.map(x=>({id:x.id,...x.data()})),cursor:s.size===25?s.docs.at(-1).id:null};}));
const listRevisions=callable(async a=>db.runTransaction(async tx=>{await authorize(tx,a);const s=await tx.get(head.collection('versions').orderBy('revision','desc').limit(20));return s.docs.map(d=>({id:d.id,...d.data(),createdAtMs:d.data().updatedAt?.toMillis?.()||null}));}));

return {createInvite,redeemInvite,revokeMember,readWorkspace,commitWorkspace,listMembers,listAudit,listRevisions};
}
