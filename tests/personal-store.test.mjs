import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('personal reads authorize every head and reuse only the same immutable revision',async()=>{
 const source=fs.readFileSync('dist/cloud-store.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 const docs=new Map(),reads=[];let denied=false;
 const payload={state:{schema:1,nodes:[{id:'one',notes:'original'}]},history:[]};
 const put=(uid,id,revision)=>{docs.set(`users/${uid}/workspaces/main`,{head:id,revision});docs.set(`users/${uid}/workspaces/main/versions/${id}`,{payload:JSON.stringify(payload)});};
 put('owner','v1',1);put('other','v1',1);
 const context={structuredClone,TextEncoder,crypto,setTimeout,clearTimeout,firebaseConfig:{},initializeApp:()=>({}),getAuth:()=>({}),initializeFirestore:()=>({}),doc:(_, ...parts)=>parts.join('/'),
  getDocFromServer:async path=>{reads.push(path);if(denied)throw Object.assign(Error('denied'),{code:'permission-denied'});return {exists:()=>docs.has(path),data:()=>structuredClone(docs.get(path))};}};
 const api=vm.runInNewContext(source+'\n({read})',context);
 const first=await api.read('owner');first.payload.state.nodes[0].notes='mutated outside cache';
 const second=await api.read('owner');assert.equal(second.payload.state.nodes[0].notes,'original');assert.equal(reads.length,3,'Head must be authorized twice, payload fetched once');
 await api.read('other');assert.equal(reads.length,5,'Cache must never cross UID boundaries');
 put('owner','v2',2);await api.read('owner');assert.equal(reads.length,7,'Changed head must fetch the new version');
 denied=true;await assert.rejects(api.read('owner'),{code:'permission-denied'});
 denied=false;docs.delete('users/owner/workspaces/main');assert.equal(await api.read('owner'),null);
});
