// Merge source metadata without claiming a Revit test or overwriting personal annotations.
export function reconcilePackage(state,seed,baselines){
 if(state.packageRevision===seed.packageRevision)return false;
 const before=structuredClone(state.nodes),known=new Set(baselines.flat().map(n=>n.id));
 for(const n of state.nodes){const fresh=seed.nodes.find(x=>x.id===n.id);if(!fresh)continue;
  n.source=structuredClone(fresh.source);n.packageIcon=fresh.packageIcon;
  if(fresh.implementation)n.implementation=structuredClone(fresh.implementation);
  for(const field of ['parent','type','label','tooltip'])if(baselines.some(b=>b.some(x=>x.id===n.id&&x[field]===n[field])))n[field]=fresh[field];
 }
 // Only genuinely new package items are added; previously deleted tools stay deleted.
 for(const fresh of seed.nodes)if(!known.has(fresh.id)&&!state.nodes.some(n=>n.id===fresh.id)){
  if(fresh.parent==='ribbon'||state.nodes.some(n=>n.id===fresh.parent))state.nodes.push(structuredClone(fresh));
 }
 // If the Stairs stack was deleted, preserve its surviving tool's old location.
 for(const n of state.nodes)if(!['ribbon','backlog'].includes(n.parent)&&!state.nodes.some(p=>p.id===n.parent))n.parent=before.find(x=>x.id===n.id)?.parent||'backlog';
 // Reorder only siblings whose old relative order matches a known baseline.
 for(const parent of new Set(state.nodes.map(n=>n.parent))){
  const prev=before.filter(n=>n.parent===parent).map(n=>n.id);
  const match=baselines.some(b=>{const ids=b.filter(n=>n.parent===parent).map(n=>n.id),common=new Set(ids.filter(id=>prev.includes(id)));return JSON.stringify(prev.filter(id=>common.has(id)))===JSON.stringify(ids.filter(id=>common.has(id)));});
  if(!match)continue;
  const target=seed.nodes.filter(n=>n.parent===parent).map(n=>n.id),siblings=state.nodes.filter(n=>n.parent===parent);
  siblings.sort((a,b)=>(target.includes(a.id)?target.indexOf(a.id):1e6)-(target.includes(b.id)?target.indexOf(b.id):1e6));
  let i=0;state.nodes=state.nodes.map(n=>n.parent===parent?siblings[i++]:n);
 }
 state.packageRevision=seed.packageRevision;return true;
}
