import fs from 'node:fs';import assert from 'node:assert/strict';import {planningSnapshot,compareDelivery,adoptBuilt,addBuilt} from './dist/ribbon-delivery.js';
// Owner actions on a delivery: adopt a planned button's built name/tooltip/command; add a built-only button at its built place.
const state=JSON.parse(fs.readFileSync(process.argv[2]||'dist/seed.json','utf8'));const s=state.state||state;
const panel=s.nodes.find(n=>n.type==='panel'),planned=s.nodes.find(n=>n.type==='button'&&n.parent===panel.id);
const snap=await planningSnapshot(s),nodes=structuredClone(snap.nodes),i=nodes.findIndex(n=>n.id===planned.id);
nodes[i]={...nodes[i],label:'Built\nlabel',tooltip:'built tooltip',command:'Built.Command',iconHash:'0'.repeat(64)};
const order=nodes.filter(n=>n.parent===panel.id).length;
nodes.push({id:'new-built',type:'button',parent:panel.id,order:0,label:'New',tooltip:'t',command:'New.Command',iconHash:(await planningSnapshot({nodes:[{id:'x',type:'button',parent:'p',label:'',icon:''}]})).nodes[0].iconHash});
for(const n of nodes)if(n.parent===panel.id&&n.id!=='new-built')n.order++;
const d={deliveryId:'test',packageVersion:'9.9.9',nodes,requested:snap};
adoptBuilt(s,d,planned.id);assert.equal(planned.label,'Built\nlabel');assert.equal(planned.source.command,'Built.Command');
addBuilt(s,d,'new-built');assert.throws(()=>addBuilt(s,d,'new-built'));
const after=compareDelivery(await planningSnapshot(s),d);
assert.deepEqual(after.find(r=>r.id===planned.id).different,['iconHash']);
assert.equal(after.find(r=>r.id==='new-built').implemented,true);
assert.equal(s.nodes.find(n=>n.id==='new-built').status,'testing');
console.log('PASS adopt/add built: name/tooltip/command adopted (icon stays a difference); built-only button added at its built place, pending test.');
