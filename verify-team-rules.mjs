import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from './.team-tests/node_modules/@firebase/rules-unit-testing/dist/esm/index.esm.js';
import {doc,getDoc,setDoc,updateDoc,collection,getDocs,query,where,serverTimestamp,runTransaction} from './.team-tests/node_modules/firebase/firestore/dist/index.mjs';
const env=await initializeTestEnvironment({projectId:'demo-hoek-team',firestore:{rules:fs.readFileSync('firestore.rules','utf8'),host:'127.0.0.1',port:8089}});
try{
 const owner=env.authenticatedContext('owner',{email:'adi.hoek@gmail.com',email_verified:true}).firestore();
 const member=env.authenticatedContext('member',{email:'worker@example.com',email_verified:true}).firestore();
 const stranger=env.authenticatedContext('stranger',{email:'stranger@example.com',email_verified:true}).firestore();
 const unverified=env.authenticatedContext('unverified',{email:'worker@example.com',email_verified:false}).firestore();
 const root=db=>doc(db,'teams/hoek'),m=db=>doc(db,'teams/hoek/members/worker@example.com'),s=db=>doc(db,'teams/hoek/published/current'),p=(db,id='p')=>doc(db,'teams/hoek/proposals/'+id),h=db=>doc(db,'users/owner/workspaces/main');
 await assertSucceeds(setDoc(root(owner),{ownerUid:'owner',updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(m(owner),{email:'worker@example.com',active:true,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(s(owner),{payload:'{}',revision:1,updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(s(member)));await assertFails(getDoc(s(stranger)));await assertFails(getDoc(s(unverified)));await assertFails(getDoc(s(env.unauthenticatedContext().firestore())));
 await assertFails(getDoc(h(member)));await assertFails(getDocs(collection(member,'users/owner/workspaces/main/versions')));await assertFails(getDocs(collection(member,'teams/hoek/members')));
 await assertFails(setDoc(s(member),{payload:'hacked',revision:2,updatedAt:serverTimestamp()}));await assertFails(setDoc(m(member),{email:'worker@example.com',active:true,updatedAt:serverTimestamp()}));
 const proposal=()=>({authorUid:'member',authorEmail:'worker@example.com',baseRevision:1,payload:'{}',status:'pending',createdAt:serverTimestamp()});
 await assertSucceeds(setDoc(p(member),proposal()));await assertFails(setDoc(p(stranger,'x'),proposal()));await assertFails(setDoc(p(member,'spoof'),{...proposal(),authorUid:'owner'}));await assertFails(setDoc(p(member,'stale'),{...proposal(),baseRevision:0}));await assertFails(setDoc(p(member,'approved'),{...proposal(),status:'approved'}));
 await assertFails(updateDoc(p(member),{status:'approved'}));await assertFails(updateDoc(p(member),{payload:'changed'}));await assertFails(getDoc(p(stranger)));
 await assertSucceeds(getDocs(query(collection(member,'teams/hoek/proposals'),where('authorUid','==','member'))));await assertFails(getDocs(collection(member,'teams/hoek/proposals')));
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();await setDoc(h(db),{head:'00000000-0000-0000-0000-000000000001',revision:1,schema:1});});
 await assertFails(updateDoc(p(owner),{status:'approved',reviewNote:'',reviewerUid:'owner',reviewedAt:serverTimestamp(),appliedRevision:1}));
 await assertSucceeds(runTransaction(owner,async tx=>{await tx.get(h(owner));tx.set(doc(owner,'users/owner/workspaces/main/versions/00000000-0000-0000-0000-000000000002'),{payload:'{}',revision:2,createdAt:serverTimestamp()});tx.set(h(owner),{head:'00000000-0000-0000-0000-000000000002',revision:2,schema:1,updatedAt:serverTimestamp()});tx.update(p(owner),{status:'approved',reviewNote:'ok',reviewerUid:'owner',reviewedAt:serverTimestamp(),appliedRevision:2});}));
 await assertFails(updateDoc(p(owner),{status:'rejected',reviewNote:'again',reviewerUid:'owner',reviewedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(m(owner),{email:'worker@example.com',active:false,updatedAt:serverTimestamp()}));await assertFails(getDoc(s(member)));await assertFails(setDoc(p(member,'revoked'),proposal()));await assertFails(getDoc(p(member)));
 console.log('PASS: invited verified access; stranger/unverified blocked; private workspace isolated; no member canonical writes or self approval; owner atomic approval; replay blocked; revocation.');
}finally{await env.cleanup()}
