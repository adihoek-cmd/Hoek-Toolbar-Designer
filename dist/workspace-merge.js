// Three-way reconciliation. A conflict never silently discards either version.
export const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=x=>x===undefined?undefined:structuredClone(x);
export function mergeWorkspaces(base,local,remote){
 const conflicts=[];
 function value(b,l,r,path){
  if(equal(l,r)||equal(b,r))return clone(l);
  if(equal(b,l))return clone(r);
  if(b&&l&&r&&[b,l,r].every(x=>typeof x==='object'&&!Array.isArray(x))){
   const out={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){
    const v=value(b[k],l[k],r[k],[...path,k]);if(v!==undefined)out[k]=v;
   }return out;
  }
  conflicts.push({path,base:clone(b),local:clone(l),remote:clone(r)});return clone(l);
 }
 const byId=s=>Object.fromEntries(s.nodes.map(n=>[n.id,n]));
 const b=byId(base),l=byId(local),r=byId(remote),nodes={};
 for(const id of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){
  const n=value(b[id],l[id],r[id],['nodes',id]);if(n!==undefined)nodes[id]=n;
 }
 const meta=s=>Object.fromEntries(Object.entries(s).filter(([k])=>k!=='nodes'));
 const result=value(meta(base),meta(local),meta(remote),[]);
 // Ordering is a separate merge unit; concurrent reorders require review.
 const order=value(base.nodes.map(n=>n.id),local.nodes.map(n=>n.id),remote.nodes.map(n=>n.id),['order']);
 result.nodes=[...new Set([...order,...Object.keys(nodes)])].filter(id=>nodes[id]).map(id=>nodes[id]);
 return {state:result,conflicts};
}
export function resolveMerge(merge,choices){
 const state=structuredClone(merge.state);let order;
 for(let i=0;i<merge.conflicts.length;i++){
  const c=merge.conflicts[i];if(!['local','remote'].includes(choices[i]))throw Error('Choose a version for every conflict');
  const v=clone(c[choices[i]]),p=c.path;
  if(p[0]==='order'){order=v;continue;}
  let target=state,start=0;
  if(p[0]==='nodes'){
   const at=state.nodes.findIndex(n=>n.id===p[1]);
   if(p.length===2){if(at>=0)state.nodes.splice(at,1);if(v!==undefined)state.nodes.push(v);continue;}
   target=state.nodes[at];start=2;
  }
  for(let j=start;j<p.length-1;j++)target=target[p[j]];
  if(v===undefined)delete target[p.at(-1)];else target[p.at(-1)]=v;
 }
 if(order){const nodes=new Map(state.nodes.map(n=>[n.id,n]));state.nodes=[...new Set([...order,...nodes.keys()])].filter(id=>nodes.has(id)).map(id=>nodes.get(id));}
 return state;
}
