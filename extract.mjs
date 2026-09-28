import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2];
if(!root) throw Error('Pass the extracted HoekAI-Package directory');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'toolbar/toolbar.manifest.json'),'utf8'));
let nodes=[], count=0;
function visit(v,parent,index){const id=v.id||`source-${++count}`;const type=v.separator?'separator':v.kind==='stack'?'stack':v.kind==='pulldown'?'dropdown':'button';nodes.push({id,parent,type,label:v.label|| (type==='stack'?'Stack '+index:type==='separator'?'Separator':id),icon:v.icon?`assets/${v.icon.replace('.png','_64.png')}`:'',status:'testing',priority:'normal',notes:'',fix:'',fixedVersion:'',tooltip:v.tooltip||'',source:structuredClone(v)});(v.items||[]).forEach((x,i)=>visit(x,id,i+1));}
for(const [i,p] of manifest.panels.entries()){const id=`panel-${i}`;nodes.push({id,parent:'ribbon',type:'panel',label:p.name,source:{name:p.name}});p.buttons.forEach((x,j)=>visit(x,id,j+1));}
nodes.unshift({id:'bridge-panel',parent:'ribbon',type:'panel',label:'Hoek AI Tools',source:{file:'build/src/bridge/ClaudeRevitPlugin.cs'}});
nodes.push({id:'HoekAIStatus',parent:'bridge-panel',type:'button',label:'Hoek AI Status',icon:'assets/HoekLogo_32.png',status:'testing',priority:'normal',notes:'',fix:'',fixedVersion:'',tooltip:'Connection server status',source:{command:'ClaudeRevitPlugin.ShowServerStatusCommand',file:'build/src/bridge/ClaudeRevitPlugin.cs',externalToManifest:true}});
const seed={schema:1,packageVersion:'3.9.3',tab:manifest.tab,nodes,manifest};
fs.writeFileSync('dist/seed.json',JSON.stringify(seed,null,2));
console.log(JSON.stringify({panels:nodes.filter(n=>n.type==='panel').length,buttons:nodes.filter(n=>n.type==='button').length,stacks:nodes.filter(n=>n.type==='stack').length,dropdowns:nodes.filter(n=>n.type==='dropdown').length}));
