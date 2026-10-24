import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../functions/service.js';
import {hash,validatePayload,diff} from '../functions/core.js';
const clone=structuredClone;
function setup(){
 const records=new Map(),users=new Map();let id=0,queue=Promise.resolve();
 class Ref{constructor(path){this.path=path}collection(name){return new Collection(this.path+'/'+name)} }
 class Collection{constructor(path){this.path=path}doc(idValue='generated-'+(++id)){return new Ref(this.path+'/'+idValue)}limit(){return this}orderBy(){return this}startAfter(){return this}}
 const snap=ref=>({exists:records.has(ref.path),data:()=>clone(records.get(ref.path)),id:ref.path.split('/').at(-1)});
 const db={doc:path=>new Ref(path),runTransaction:fn=>{const run=queue.then(async()=>{const pending=[];const result=await fn({get:async ref=>ref instanceof Collection?{docs:[...records.keys()].filter(p=>p.startsWith(ref.path+'/')&&!p.slice(ref.path.length+1).includes('/')).map(p=>snap(new Ref(p)))}:snap(ref),create:(r,v)=>pending.push(()=>{assert.ok(!records.has(r.path));records.set(r.path,clone(v))}),set:(r,v)=>pending.push(()=>records.set(r.path,clone(v))),update:(r,v)=>pending.push(()=>records.set(r.path,{...records.get(r.path),...clone(v)}))});pending.forEach(f=>f());return result;});queue=run.catch(()=>{});return run;}};
 const svc=createService(db,{getUser:async uid=>users.get(uid)},()=>1234);
 const request=(uid,data={})=>({auth:{uid,token:{email:users.get(uid)?.email,email_verified:users.get(uid)?.emailVerified,firebase:{sign_in_provider:'google.com'}}},data});
 const add=(uid,email,role)=>{users.set(uid,{email,emailVerified:true});if(role)records.set('offices/hoek/members/'+uid,{email,role,active:true});};
 add('admin','adih@hoek.co.il','admin');add('member','member@example.com','member');add('outsider','other@example.com');
 return {svc,records,users,request,add};
}
const payload=(note='hello')=>({state:{schema:1,nodes:[{id:'one',notes:note}]},history:[]});
test('uninvited and unverified accounts cannot read or commit; client role ignored',async()=>{
 const {svc,request,users}=setup();await assert.rejects(svc.readWorkspace(request('outsider',{role:'admin'})),{code:'permission-denied'});
 users.get('member').emailVerified=false;await assert.rejects(svc.readWorkspace(request('member')),{code:'unauthenticated'});
});
test('invite hash only, exact email, expiry, atomic single use and admin boundary',async()=>{
 const {svc,request,records,add}=setup();add('invitee','target@example.com');
 await assert.rejects(svc.createInvite(request('member',{email:'target@example.com'})),{code:'permission-denied'});
 const before=Date.now(),invite=await svc.createInvite(request('admin',{email:' TARGET@example.com '}));
 assert.ok(invite.expiresAt>=before+86400000);assert.ok(records.has('offices/hoek/invites/'+hash(invite.token)));assert.ok(!JSON.stringify([...records]).includes(invite.token));
 await assert.rejects(svc.redeemInvite(request('outsider',invite)),{code:'permission-denied'});
 const result=await Promise.allSettled([svc.redeemInvite(request('invitee',invite)),svc.redeemInvite(request('invitee',invite))]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 const expired=await svc.createInvite(request('admin',{email:'target@example.com'}));records.get('offices/hoek/invites/'+hash(expired.token)).expiresAt=Date.now()-1;
 await assert.rejects(svc.redeemInvite(request('invitee',expired)),{code:'permission-denied'});
});
test('admin migration only; revisions compare atomically and failed commits leave no audit',async()=>{
 const {svc,request,records}=setup();
 await assert.rejects(svc.commitWorkspace(request('member',{expected:0,payload:payload(),migration:true})),{code:'permission-denied'});
 await assert.rejects(svc.commitWorkspace(request('admin',{expected:0,payload:payload()})),{code:'permission-denied'});
 await svc.commitWorkspace(request('admin',{expected:0,payload:payload(),migration:true}));
 const result=await Promise.allSettled(['A','B'].map(note=>svc.commitWorkspace(request('member',{expected:1,payload:payload(note),actor:{uid:'fake'}}))));
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.find(r=>r.status==='rejected').reason.code,'aborted');
 const logs=[...records].filter(([p])=>p.includes('/audit/')).map(([,v])=>v);assert.equal(logs.length,2);assert.equal(logs[1].actor.uid,'member');assert.equal(logs[1].createdAt,1234);assert.equal(logs[1].details.revision,2);assert.deepEqual(logs[1].details.nodeIds,['one']);
 assert.equal((await svc.readWorkspace(request('member'))).workspace.revision,2);
});
test('revocation blocks reads, writes, history and audit; disabled account blocked',async()=>{
 const {svc,request,users}=setup();await svc.revokeMember(request('admin',{uid:'member'}));
 for(const name of ['readWorkspace','listAudit','listRevisions'])await assert.rejects(svc[name](request('member')),{code:'permission-denied'});
 await assert.rejects(svc.commitWorkspace(request('member',{expected:0,payload:payload(),migration:true})),{code:'permission-denied'});
 await assert.rejects(svc.revokeMember(request('admin',{uid:'admin'})),{code:'failed-precondition'});
 users.get('admin').disabled=true;await assert.rejects(svc.readWorkspace(request('admin')),{code:'permission-denied'});
});
test('payload limits, duplicate IDs, and before/after audit values',()=>{
 assert.throws(()=>validatePayload(payload('x'.repeat(700000))),{code:'resource-exhausted'});
 const p=payload();p.state.nodes.push({id:'one'});assert.throws(()=>validatePayload(p),{code:'invalid-argument'});
 assert.deepEqual(diff({title:'before'},{title:'after'}),[{path:['title'],before:'before',after:'after'}]);
});
test('revocation invalidates unused older invitations and audit includes deleted node IDs',async()=>{
 const {svc,request,records}=setup();const invite=await svc.createInvite(request('admin',{email:'member@example.com'}));
 await svc.revokeMember(request('admin',{uid:'member'}));
 await assert.rejects(svc.redeemInvite(request('member',invite)),{code:'permission-denied'});
 await svc.commitWorkspace(request('admin',{expected:0,payload:payload(),migration:true}));
 const deleted=payload();deleted.state.nodes=[];
 await svc.commitWorkspace(request('admin',{expected:1,payload:deleted}));
 const audit=[...records].filter(([p,v])=>p.includes('/audit/')&&v.action==='workspace.commit')[0][1];assert.deepEqual(audit.details.nodeIds,['one']);
});
