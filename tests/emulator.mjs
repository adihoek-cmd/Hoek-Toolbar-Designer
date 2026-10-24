import assert from 'node:assert/strict';
import {initializeApp} from '../functions/node_modules/firebase-admin/lib/app/index.js';
import {getAuth} from '../functions/node_modules/firebase-admin/lib/auth/index.js';
import {getFirestore} from '../functions/node_modules/firebase-admin/lib/firestore/index.js';
const project='demo-hoek-office';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.GCLOUD_PROJECT!==project)throw Error('Demo emulators required');
initializeApp({projectId:project});const auth=getAuth(),db=getFirestore();
const tokens={};
async function account(uid,email,verified=true){
 await auth.createUser({uid,email,emailVerified:verified,password:'emulator-test-only-123'});
 const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'emulator-test-only-123',returnSecureToken:true})});tokens[uid]=(await r.json()).idToken;assert.ok(tokens[uid]);
}
async function invoke(uid,name,data={}){const r=await fetch(`http://127.0.0.1:5001/${project}/us-central1/${name}`,{method:'POST',headers:{'Content-Type':'application/json',...(uid?{Authorization:'Bearer '+tokens[uid]}:{})},body:JSON.stringify({data})});const b=await r.json();if(b.error)throw Object.assign(Error(b.error.message),{code:b.error.status});assert.equal(r.status,200);return b.result;}
await account('admin','adih@hoek.co.il');await account('guest','guest@example.com');await account('wrong','wrong@example.com');await account('unverified','unverified@example.com',false);
await account('legacy','adi.hoek@gmail.com');
const legacyRoot=`projects/${project}/databases/(default)/documents/users/legacy/workspaces/main`;
const version=crypto.randomUUID();
const legacyHeaders={Authorization:'Bearer '+tokens.legacy,'Content-Type':'application/json'};
const atomicWrites={writes:[
 {update:{name:legacyRoot,fields:{head:{stringValue:version},revision:{integerValue:'1'},schema:{integerValue:'1'}}},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]},
 {update:{name:legacyRoot+'/versions/'+version,fields:{payload:{stringValue:'{"state":{"schema":1,"nodes":[]},"history":[]}'},revision:{integerValue:'1'}}},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]}
]};
const legacyCommit=await fetch(`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',headers:legacyHeaders,body:JSON.stringify(atomicWrites)});
assert.equal(legacyCommit.status,200,await legacyCommit.text());
assert.equal((await fetch('http://127.0.0.1:8080/v1/'+legacyRoot,{headers:legacyHeaders})).status,200,'Legacy owner must retain access');
assert.equal((await fetch('http://127.0.0.1:8080/v1/'+legacyRoot,{headers:{Authorization:'Bearer '+tokens.guest}})).status,403,'Other members cannot read legacy personal data');
assert.equal((await fetch('http://127.0.0.1:8080/v1/'+legacyRoot+'/versions/'+version,{method:'PATCH',headers:legacyHeaders,body:JSON.stringify({fields:{payload:{stringValue:'tampered'}}})})).status,403,'Legacy revisions remain immutable');
await db.doc('offices/hoek/members/admin').set({email:'adih@hoek.co.il',role:'admin',active:true});
for(const uid of [null,'guest','unverified'])await assert.rejects(invoke(uid,'readWorkspace'));
const invite=await invoke('admin','createInvite',{email:'guest@example.com'});
await assert.rejects(invoke('wrong','redeemInvite',invite),{code:'PERMISSION_DENIED'});
const accepts=await Promise.allSettled([invoke('guest','redeemInvite',invite),invoke('guest','redeemInvite',invite)]);assert.equal(accepts.filter(r=>r.status==='fulfilled').length,1);
const p=note=>({state:{schema:1,nodes:[{id:'one',notes:note}]},history:[]});
await assert.rejects(invoke('guest','commitWorkspace',{expected:0,payload:p('guest'),migration:true}),{code:'PERMISSION_DENIED'});
await invoke('admin','commitWorkspace',{expected:0,payload:p('initial'),migration:true});
const writes=await Promise.allSettled(['A','B'].map(note=>invoke('guest','commitWorkspace',{expected:1,payload:p(note)})));assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);assert.equal(writes.find(r=>r.status==='rejected').reason.code,'ABORTED');
assert.equal((await invoke('guest','readWorkspace')).workspace.revision,2);
const logs=await invoke('guest','listAudit');assert.equal(logs.items.filter(x=>x.action.startsWith('workspace.')).length,2);assert.ok(logs.items.every(x=>x.createdAt&&x.actor.uid));
// Authenticated clients cannot forge head, membership, invitation, revision or audit writes.
for(const path of ['offices/hoek/workspaces/main','offices/hoek/members/guest','offices/hoek/invites/forged','offices/hoek/audit/forged','offices/hoek/workspaces/main/versions/forged']){
 const url=`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/${path}`;
 const headers={Authorization:'Bearer '+tokens.guest,'Content-Type':'application/json'};
 assert.equal((await fetch(url,{method:'PATCH',headers,body:JSON.stringify({fields:{role:{stringValue:'admin'}}})})).status,403);
 assert.equal((await fetch(url,{headers})).status,403);
}
await invoke('admin','revokeMember',{uid:'guest'});
for(const name of ['readWorkspace','listAudit','listRevisions'])await assert.rejects(invoke('guest',name),{code:'PERMISSION_DENIED'});
await assert.rejects(invoke('guest','commitWorkspace',{expected:2,payload:p('revoked')}),{code:'PERMISSION_DENIED'});
console.log('PASS: real Auth/Functions/Firestore emulators: legacy owner atomic sync preserved, cross-user legacy denial, immutable legacy revisions, callable authentication, verified email, invite race, migration, commit race, server audit, rules tampering, revocation.');
