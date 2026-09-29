import assert from 'node:assert/strict';
import fs from 'node:fs';
import {themes,setTheme,themeDialogHTML} from './dist/themes.js';
import {optionsFor} from './dist/icon-options.js';
const initial=JSON.parse(fs.readFileSync('dist/seed.json','utf8'));
assert.equal(themes.length,5);
for(const theme of themes){const state=structuredClone(initial);const tool=state.nodes.find(n=>n.type==='button');tool.notes='Keep this note';tool.status='fix';const parents=state.nodes.map(n=>n.parent);setTheme(state,theme.id);assert.equal(state.theme,theme.id);assert.equal(tool.notes,'Keep this note');assert.equal(tool.status,'fix');assert.deepEqual(state.nodes.map(n=>n.parent),parents);for(const n of state.nodes){const o=optionsFor(n).find(o=>o.key===theme.icon);assert.equal(n.icon,o?o.src:initial.nodes.find(x=>x.id===n.id).icon)};assert.equal((themeDialogHTML(state,initial).match(/data-choose-theme=/g)||[]).length,5);}
console.log('PASS: five themes; correct icon families; notes, statuses and hierarchy preserved.');
