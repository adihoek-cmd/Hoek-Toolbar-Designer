import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {reconcilePackage} from './dist/package-sync.js';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const seed=read('dist/seed.json'),bases=read('dist/package-baselines.json');
const backup=read('../Hoek-Claude-Handoff-Approved-2026-09-29/reviewed-phone-backup.json');
const state=structuredClone(backup.state),before=structuredClone(state);
assert.equal(reconcilePackage(state,seed,bases),true);assert.equal(reconcilePackage(state,seed,bases),false);
assert.equal(state.nodes.filter(n=>n.type==='button').length,49);
assert.equal(state.nodes.filter(n=>n.implementation?.state==='planned').length,1);
assert.equal(state.nodes.filter(n=>n.implementation?.state==='partial').length,2);
for(const n of before.nodes){const after=state.nodes.find(x=>x.id===n.id);for(const k of ['notes','fix','priority','status','icon'])assert.deepEqual(after[k],n[k]);}
assert.equal(state.nodes.find(n=>n.id==='stairs').parent,'source-9');assert.equal(state.nodes.find(n=>n.id==='stairs-check').parent,'stairs');
assert.deepEqual(state.nodes.filter(n=>n.parent==='stairs'&&n.type==='button').map(n=>n.id),['stairs-check','stairs-railings','stairs-numbering','stairs-dimensions']);
const custom=structuredClone(backup.state);custom.nodes.find(n=>n.id==='stairs-check').parent='backlog';custom.nodes.find(n=>n.id==='apt-numbering').tooltip='My newer tooltip';custom.nodes=custom.nodes.filter(n=>n.id!=='lot-line-walls');reconcilePackage(custom,seed,bases);assert.equal(custom.nodes.find(n=>n.id==='stairs-check').parent,'backlog');assert.equal(custom.nodes.find(n=>n.id==='apt-numbering').tooltip,'My newer tooltip');assert(!custom.nodes.some(n=>n.id==='lot-line-walls'));
const js=fs.readFileSync('dist/app.js','utf8'),validation=js.slice(js.indexOf('function validate('),js.indexOf('async function openDB'));
const ctx=vm.createContext({state,statuses:{testing:1,ok:1,fix:1,progress:1,idea:1},priorities:{normal:1,high:1,low:1},safeIcon:s=>s,Error});vm.runInContext(validation+'validate(state)',ctx);ctx.state=seed;vm.runInContext('validate(state)',ctx);ctx.state=custom;vm.runInContext('validate(state)',ctx);
const manifest=read('dist/source-manifest.json');let buttons=0;function walk(items){for(const n of items){if(n.items)walk(n.items);else if(!n.separator){buttons++;const match=seed.nodes.find(x=>x.source?.id===n.id);assert.deepEqual(match.source,n);assert.match(match.icon,/^data:image\/png;base64,/);}}}manifest.panels.forEach(p=>walk(p.buttons));assert.equal(buttons,48);
console.log('PASS: 48 manifest tools + bridge, nested Stairs, 1 planned / 2 partial, source fidelity, idempotent migration, personal edits/deletions preserved.');
