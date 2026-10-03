import fs from 'node:fs';import assert from 'node:assert/strict';
import {reconcilePackage} from './dist/package-sync.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const seed=read('dist/seed.json'),bases=read('dist/package-baselines.json');
const before=read('C:/Users/adih/Downloads/hoek-backup-2026-10-02.json').state,state=structuredClone(before);
reconcilePackage(state,seed,bases);
assert.equal(state.packageVersion,'3.9.5');assert.equal(state.nodes.filter(n=>n.type==='button').length,50);
for(const n of before.nodes){const after=state.nodes.find(x=>x.id===n.id);assert(after,`Lost ${n.id}`);for(const k of ['notes','fix','status','priority','icon','iconChoice','fixedVersion'])assert.deepEqual(after[k],n[k],n.id+' '+k);}
assert(state.nodes.some(n=>n.label.toLowerCase().includes('pipe')));
assert.equal(state.nodes.filter(n=>n.implementation?.state==='planned').length,1);
assert.equal(reconcilePackage(state,seed,bases),false);
const deleted=structuredClone(before);deleted.nodes=deleted.nodes.filter(n=>n.id!=='stairs-railings');reconcilePackage(deleted,seed,bases);assert(!deleted.nodes.some(n=>n.id==='stairs-railings'));
const future=structuredClone(seed);future.packageVersion='3.9.6';future.packageRevision='future';assert.equal(reconcilePackage(future,seed,bases),false);
console.log('PASS: Oct 2 phone backup retains all 50 tools, notes, fixes, statuses and chosen icons; deleted tools stay deleted; newer source never downgraded.');
