import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {catalog} from './dist/icon-catalog.js';
import {choiceKey, choicesHTML} from './dist/icon-options.js';
const seed=JSON.parse(fs.readFileSync('dist/baseline-original.json','utf8'));
const targets=seed.nodes.filter(n=>['button','dropdown'].includes(n.type));
assert.equal(Object.keys(catalog).length,40);
const js=fs.readFileSync('dist/app.js','utf8');
const safe=js.slice(js.indexOf('safeIcon=')+9,js.indexOf(';\nfunction toast'));
const context=vm.createContext({});vm.runInContext('const safeIcon='+safe,context);
for(const n of targets){const opts=catalog[n.id];assert.equal(opts.length,3);assert.equal(choiceKey(n),'original');assert.equal(new Set(opts.map(o=>o.src)).size,3);for(const o of opts){assert.ok(fs.existsSync('dist/'+o.src));const selected={...n,icon:o.src,iconChoice:o.key};assert.equal(choiceKey(selected),o.key);assert.equal((choicesHTML(selected).match(/aria-pressed="true"/g)||[]).length,1);if(o.src.endsWith('.svg')){const svg=fs.readFileSync('dist/'+o.src,'utf8');assert.ok(svg.startsWith('<svg'));assert.ok(!/<script|https:|href=/.test(svg));const uri='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');context.uri=uri;assert.equal(vm.runInContext('safeIcon(uri)',context),uri);assert.equal(choiceKey({...selected,icon:uri}),o.key);}}assert.notEqual(fs.readFileSync('dist/'+opts[1].src,'utf8'),fs.readFileSync('dist/'+opts[2].src,'utf8'));}
console.log('PASS: 40 sets / 80 new SVG icons; original unchanged; unique alternatives; selected state; portable SVG backup validation.');
