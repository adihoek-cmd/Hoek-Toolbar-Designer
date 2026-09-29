import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const seed=JSON.parse(fs.readFileSync('dist/baseline-original.json','utf8'));
const source=seed.manifest;
const nodes=new Map(seed.nodes.map(n=>[n.id,n]));
let commands=0;
function check(items){for(const item of items){if(item.items)check(item.items);else if(!item.separator){commands++;assert.deepEqual(nodes.get(item.id).source,item);assert.ok(fs.existsSync('dist/'+nodes.get(item.id).icon));}}}
source.panels.forEach(p=>check(p.buttons));assert.equal(commands,38);assert.equal(seed.nodes.filter(n=>n.type==='button').length,39);
// Exercise the actual production validation/reordering logic without a browser.
const js=fs.readFileSync('dist/app.js','utf8');
const validation=js.slice(js.indexOf('function validate('),js.indexOf('async function openDB'));
const reorder=js.slice(js.indexOf('function reorder('),js.indexOf("$('#edit-form').onsubmit"));
const context=vm.createContext({state:structuredClone(seed),statuses:{testing:1,ok:1,fix:1,progress:1,idea:1},priorities:{normal:1,high:1,low:1},safeIcon:s=>s,Error});
vm.runInContext('const children=p=>state.nodes.filter(n=>n.parent===p);'+validation+reorder,context);
vm.runInContext('validate(state)',context);
vm.runInContext("const n=state.nodes.find(n=>n.id==='lot-line-walls');reorder(n,'lists',0);validate(state)",context);
assert.equal(context.state.nodes.find(n=>n.id==='lot-line-walls').parent,'lists');
assert.equal(context.state.nodes.filter(n=>n.parent==='lists')[0].id,'lot-line-walls');
const duplicate=structuredClone(seed);duplicate.nodes.push(duplicate.nodes[0]);context.bad=duplicate;assert.throws(()=>vm.runInContext('validate(bad)',context));
const cycle=structuredClone(seed);cycle.nodes.find(n=>n.type==='panel').parent='lists';context.bad=cycle;assert.throws(()=>vm.runInContext('validate(bad)',context));
const badStatus=structuredClone(seed);badStatus.nodes.find(n=>n.type==='button').status='unknown';context.bad=badStatus;assert.throws(()=>vm.runInContext('validate(bad)',context));
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));manifest.icons.forEach(i=>assert.ok(fs.existsSync('dist/'+i.src)));
const sw=fs.readFileSync('dist/sw.js','utf8');const list=JSON.parse(sw.match(/FILES=(\[.*?\]);/)[1]);list.filter(f=>f!=='./').forEach(f=>assert.ok(fs.existsSync('dist/'+f)));
console.log('PASS: 38 manifest commands and metadata match source, bridge button included; all icons and precache entries exist; moves preserve valid structure; duplicate IDs, invalid parents and invalid statuses rejected.');
