import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mergeWorkspaces,resolveMerge,equal} from './dist/workspace-merge.js';
// Execute the production coordinator with deterministic network, storage and UI adapters.
const source=fs.readFileSync(new URL('./dist/cloud-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function').replace('return {changed:schedule};','return {changed:schedule,sync};')+'\nsetupCloud(adapter)';
const copy=structuredClone;
const initial={state:{schema:1,nodes:[{id:'a',notes:'',status:'testing',icon:'one'}]},history:[]};
let server,commitHook,readHook,commits;
function reset(){server={revision:1,payload:copy(initial)};commitHook=readHook=null;commits=0;}
function client(){
 let payload=copy(initial),meta={uid:'owner',revision:1,base:copy(initial)},auth;
 const el=()=>({textContent:'',innerHTML:'',open:false,prepend(){},append(){},addEventListener(){},querySelector(){return el()},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}});
 const context={structuredClone,mergeWorkspaces,resolveMerge,equal,cloudEnabled:true,console,setTimeout:()=>1,clearTimeout(){},navigator:{onLine:true},document:{createElement:el,body:el(),querySelector:el,addEventListener(){}},window:{addEventListener(){}},
 cloud:{authChanged(fn){auth=fn;fn({uid:'owner'})},watch(){return ()=>{}},async read(){if(readHook)await readHook();return copy(server)},async commit(uid,revision,p){assert.equal(uid,'owner');if(commitHook)await commitHook();if(revision!==(server?.revision||0))throw Object.assign(Error('stale'),{code:'hoek/stale'});commits++;server={revision:revision+1,payload:copy(p)};return copy(server)}},
 adapter:{meta:()=>copy(meta),saved:async()=>{},snapshot:async()=>copy(payload),editing:()=>false,validate(){},recover:async()=>{},apply:async(p,m)=>{payload=copy(p);meta=copy(m)},setMeta:async m=>{meta=copy(m)},toast(){},download(){},backup(){}}};
 const api=vm.runInNewContext(source,context);
 return {api,context,auth:u=>auth(u),get data(){return payload},get meta(){return meta},edit(fn){fn(payload)},detach(){meta=null}};
}
reset();let phone=client(),pc=client();phone.edit(p=>p.state.nodes[0].notes='phone note');pc.edit(p=>p.state.nodes[0].status='ok');await phone.api.sync();await pc.api.sync();await phone.api.sync();assert.equal(server.payload.state.nodes[0].notes,'phone note');assert.equal(server.payload.state.nodes[0].status,'ok');assert.deepEqual(phone.data,pc.data);
reset();phone=client();pc=client();phone.edit(p=>p.state.nodes[0].notes='phone');pc.edit(p=>p.state.nodes[0].notes='pc');await phone.api.sync();await pc.api.sync();assert.equal(commits,1);assert.equal(pc.data.state.nodes[0].notes,'pc');assert.equal(server.payload.state.nodes[0].notes,'phone');
reset();phone=client();phone.context.navigator.onLine=false;phone.edit(p=>p.state.nodes[0].notes='offline');await phone.api.sync();assert.equal(commits,0);phone.context.navigator.onLine=true;await phone.api.sync();assert.equal(server.payload.state.nodes[0].notes,'offline');
reset();phone=client();phone.edit(p=>p.state.nodes[0].notes='first');commitHook=async()=>{phone.edit(p=>p.state.nodes[0].notes='newer');commitHook=null};await phone.api.sync();assert.equal(phone.data.state.nodes[0].notes,'newer');await phone.api.sync();assert.equal(server.payload.state.nodes[0].notes,'newer');
reset();phone=client();phone.edit(p=>p.state.nodes[0].notes='edit');readHook=async()=>phone.auth(null);await phone.api.sync();assert.equal(commits,0);assert.equal(phone.data.state.nodes[0].notes,'edit');
reset();phone=client();phone.detach();server=null;await phone.api.sync();assert.equal(commits,0,'Initial upload must require an explicit choice');
reset();phone=client();phone.edit(p=>p.state.nodes[0].notes='durable');phone.context.adapter.saved=async()=>{throw Error('disk full')};await phone.api.sync();assert.equal(commits,0);
reset();phone=client();phone.edit(p=>p.state.nodes[0].notes='local');commitHook=async()=>{server.revision++;server.payload.state.nodes[0].status='ok';commitHook=null};await phone.api.sync();assert.equal(commits,0);await phone.api.sync();assert.equal(server.payload.state.nodes[0].notes,'local');assert.equal(server.payload.state.nodes[0].status,'ok');
console.log('PASS: two devices, field conflicts, offline resume, in-flight edits, sign-out race, explicit first upload, disk failure, concurrent revision retry.');
