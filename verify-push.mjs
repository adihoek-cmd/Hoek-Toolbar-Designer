import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {prepareClaudeUpdate} from './dist/claude-sync.js';
// Run the production cloud store and bridge push against a Firestore whose getDocFromServer, like the real SDK
// with this tab's watch attached, answers from a listener view that lags a just-committed transaction.
const strip=(file,extra='')=>fs.readFileSync(new URL('./dist/'+file,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'')+extra;
const state=JSON.parse(fs.readFileSync('dist/seed.json','utf8')),node=state.nodes.find(n=>n.type==='button');
const report={format:'hoek-repair-report',version:1,reportId:'test-push-lag',publishId:'',packageVersion:'test',generatedAt:new Date().toISOString(),items:[{nodeId:node.id,result:'fixed',originalNote:'',originalFix:'',claimedFix:'test change',testSteps:['test'],testsPerformed:[],remainingIssues:[],changedFiles:[]}]};
async function push(lag){
 let clock=0;const timers=new Set();let ids=0;const docs=new Map([['users/u/workspaces/main/versions/v1',{payload:JSON.stringify({state,history:[]}),revision:1}],['users/u/workspaces/main',{head:'v1',revision:1}]]);
 let view=structuredClone(docs.get('users/u/workspaces/main')),behind=0;
 const snap=data=>({exists:()=>!!data,data:()=>structuredClone(data)});
 const firestore={initializeApp(){},getAuth(){},GoogleAuthProvider:class{},signInWithPopup(){},onAuthStateChanged(){},signOut(){},initializeFirestore(){},firebaseConfig:{},serverTimestamp:()=>clock,
  doc:(db,...p)=>({path:p.join('/')}),
  async getDocFromServer(ref){if(ref.path!=='users/u/workspaces/main')return snap(docs.get(ref.path));if(behind>0)behind--;else view=structuredClone(docs.get(ref.path));return snap(view);},
  async runTransaction(db,fn){const writes=[];await fn({get:async ref=>snap(docs.get(ref.path)),set:(ref,data)=>writes.push([ref.path,data])});for(const [p,d] of writes)docs.set(p,structuredClone(d));behind=lag;}};
 const store={},names=[];vm.runInNewContext(strip('cloud-store.js').replace(/export (async function|function|const) (\w+)/g,(m,k,n)=>(names.push(n),`${k} ${n}`))+'\n'+names.map(n=>`exports.${n}=${n};`).join(''),{...firestore,exports:store,structuredClone,TextEncoder,JSON,Error,Object,Promise,crypto:{randomUUID:()=>'v'+(docs.size+1)},Date:{now:()=>clock},setTimeout:(f,ms)=>{const id=++ids;timers.add(id);setImmediate(()=>{if(timers.delete(id)){clock+=ms;f()}});return id},clearTimeout:id=>timers.delete(id)});
 const els={},el=s=>els[s]??={innerHTML:'',textContent:'',open:false,before(){},append(){},showModal(){this.open=true},close(){},querySelector:el};
 let sent;const fetch=async(url,o)=>{const p=new URL(url).pathname,data=JSON.parse(o.body);return {ok:true,json:async()=>p==='/next'?{job:{id:'j',kind:'push',report}}:(p==='/result'&&(sent=data),{})};};
 const ctx={cloud:{...store,authChanged:fn=>fn({uid:'u'})},prepareClaudeUpdate,document:{createElement:()=>el('dialog'),body:el('body'),querySelector:el},location:{hash:'#claudePort=4567&claudeKey='+'a'.repeat(64),pathname:'/',search:''},history:{replaceState(){}},sessionStorage:{v:{},setItem(k,v){this.v[k]=v},getItem(k){return this.v[k]??null}},URLSearchParams,JSON,Error,fetch,AbortSignal:{timeout:()=>undefined},setTimeout:()=>1,clearTimeout(){}};
 vm.runInNewContext(strip('claude-bridge-ui.js','\nsetupClaudeBridge()').replace('export function','function'),ctx);
 await el('[data-connect]').onclick();for(let i=0;i<5000&&!sent;i++)await new Promise(r=>setImmediate(r));
 return {sent,head:docs.get('users/u/workspaces/main')};
}
const lagged=await push(3);assert.equal(lagged.head.revision,2);assert.equal(lagged.sent.error,undefined);assert.deepEqual(lagged.sent.result,{revision:2,count:1,verified:true});
const never=await push(1e9);assert.equal(never.head.revision,2);assert.equal(never.sent.result,undefined);assert.match(never.sent.error,/Write verification failed/);
console.log('PASS bridge push: read-back waits for a lagging server view; a view that never shows the commit still fails verification.');
