const TYPES=['button','panel','stack','dropdown','separator'];
export const deliveredFields=['type','parent','order','label','tooltip','command','iconHash'];
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function planningSnapshot(state){
 const orders=new Map(),nodes=[];
 for(const n of state.nodes){const order=orders.get(n.parent)||0;orders.set(n.parent,order+1);nodes.push({id:n.id,type:n.type,parent:n.parent,order,label:n.label,tooltip:n.tooltip||'',command:n.source?.command||'',iconHash:await digest(n.icon||'')});}
 return {format:'hoek-ribbon-snapshot',version:1,snapshotId:await digest(JSON.stringify(nodes)),nodes};
}
export function validateLayout(nodes){
 if(!Array.isArray(nodes)||!nodes.length||nodes.length>3000)throw Error('actual.nodes must contain 1–3000 items');const ids=new Map(),positions=new Set();
 for(const n of nodes){if(!n||typeof n.id!=='string'||!n.id||n.id.length>160||['ribbon','backlog'].includes(n.id)||ids.has(n.id)||!TYPES.includes(n.type)||typeof n.parent!=='string'||!Number.isInteger(n.order)||n.order<0||typeof n.label!=='string'||n.label.length>500||typeof n.tooltip!=='string'||n.tooltip.length>12000||typeof n.command!=='string'||n.command.length>1000||!/^[a-f0-9]{64}$/.test(n.iconHash))throw Error('Invalid actual node');const pos=n.parent+'|'+n.order;if(positions.has(pos))throw Error('Duplicate sibling order');positions.add(pos);ids.set(n.id,n);}
 for(const n of nodes){const p=ids.get(n.parent);if(n.type==='panel'?n.parent!=='ribbon':!p||!['panel','dropdown','stack'].includes(p.type))throw Error('Invalid parent: '+n.id);if(n.type==='stack'&&p?.type!=='panel'||n.type==='dropdown'&&!['panel','stack'].includes(p?.type)||n.type==='separator'&&p?.type!=='dropdown')throw Error('Invalid nesting');const seen=new Set([n.id]);let up=p;while(up){if(seen.has(up.id))throw Error('Layout cycle');seen.add(up.id);up=ids.get(up.parent);}}
 for(const parent of new Set(nodes.map(n=>n.parent))){const indexes=nodes.filter(n=>n.parent===parent).map(n=>n.order).sort((a,b)=>a-b);if(indexes.some((v,i)=>v!==i))throw Error('Orders must be contiguous and zero-based');}
 for(const n of nodes)if(n.changeSummary!==undefined||n.changedInVersion!==undefined){if(n.type!=='button'||typeof n.changeSummary!=='string'||!n.changeSummary.trim()||n.changeSummary.length>500||!/^\d+\.\d+\.\d+$/.test(n.changedInVersion||''))throw Error('Button changes require changedInVersion and changeSummary');}
 return nodes.map(n=>Object.fromEntries(['id',...deliveredFields,...(n.changeSummary!==undefined?['changedInVersion','changeSummary']:[])].map(k=>[k,n[k]])));
}
export function compareDelivery(current,deployment){
 const actual=new Map(deployment.nodes.map(n=>[n.id,n])),base=new Map(deployment.requested.nodes.map(n=>[n.id,n]));
 return current.nodes.map(n=>{const a=actual.get(n.id),b=base.get(n.id),different=deliveredFields.filter(k=>a?.[k]!==n[k]);return {id:n.id,implemented:!!a&&!different.length,missing:!a,different,changedSincePull:!b||deliveredFields.some(k=>b[k]!==n[k])};});
}
export async function prepareRibbonDelivery(payload,input,source){
 if(input?.format!=='hoek-ribbon-delivery'||input.version!==1)throw Error('Expected hoek-ribbon-delivery v1');
 for(const k of ['deliveryId','packageVersion','generatedAt','sourceSnapshotId','manifestSha256'])if(typeof input[k]!=='string'||!input[k]||input[k].length>160)throw Error('Invalid '+k);
 if(!Number.isInteger(input.sourceRevision)||input.sourceRevision<1||!/^\d+\.\d+\.\d+$/.test(input.packageVersion)||!Number.isFinite(Date.parse(input.generatedAt))||!/^[a-f0-9]{64}$/.test(input.manifestSha256))throw Error('Invalid release metadata');
 const nodes=validateLayout(input.actual?.nodes),snapshot=await planningSnapshot(source.state);if(snapshot.snapshotId!==input.sourceSnapshotId)throw Error('Source snapshot does not match immutable cloud revision');
 for(const n of nodes)if(n.changedInVersion){const a=n.changedInVersion.split('.').map(Number),b=input.packageVersion.split('.').map(Number);let cmp=0;for(let j=0;j<3&&!cmp;j++)cmp=a[j]-b[j];if(cmp>0)throw Error('Change version exceeds release version');}
 const normalized={deliveryId:input.deliveryId,packageVersion:input.packageVersion,generatedAt:input.generatedAt,sourceRevision:input.sourceRevision,sourceSnapshotId:input.sourceSnapshotId,manifestSha256:input.manifestSha256,nodes};const hash=await digest(JSON.stringify(normalized));
 const previous=(payload.state.ribbonDeliveries||[]).find(x=>x.deliveryId===input.deliveryId);if(previous){if(previous.hash!==hash)throw Error('Same deliveryId with different content');return {payload,count:0,deliveryId:input.deliveryId};}
 const last=payload.state.ribbonDeployment;if(last){const version=v=>v.split('.').map(Number);const a=version(input.packageVersion),b=version(last.packageVersion);let cmp=0;for(let i=0;i<3&&!cmp;i++)cmp=a[i]-b[i];if(cmp<0||Date.parse(input.generatedAt)<=Date.parse(last.generatedAt)||input.sourceRevision<last.sourceRevision)throw Error('Outdated delivery');}
 const next=structuredClone(payload);next.state.ribbonDeployment={...normalized,hash,requested:snapshot,receivedAt:new Date().toISOString(),verification:'reported-build-not-runtime-tested'};next.state.ribbonDeliveries=[...(next.state.ribbonDeliveries||[]),{deliveryId:input.deliveryId,packageVersion:input.packageVersion,generatedAt:input.generatedAt,hash}];if(next.state.ribbonDeliveries.length>500)throw Error('Delivery history limit reached');next.history=[{label:'נקלט מבנה סרגל שבוצע: '+input.packageVersion,time:new Date().toISOString()},...(next.history||[])].slice(0,120);
 return {payload:next,count:1,deliveryId:input.deliveryId};
}
