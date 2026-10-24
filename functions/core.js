import {createHash,randomBytes} from 'node:crypto';
export const OWNER='adih@hoek.co.il';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export const email=s=>typeof s==='string'?s.trim().toLowerCase():'';
export function fail(code,message){throw Object.assign(new Error(message),{code});}
export function identity(auth){
 if(!auth?.uid||auth.token?.email_verified!==true)fail('unauthenticated','Verified login required');
 if(!['google.com','password'].includes(auth.token.firebase?.sign_in_provider))fail('permission-denied','Unsupported login provider');
 return {uid:auth.uid,email:email(auth.token.email)};
}
export function validatePayload(p){
 if(!p||!p.state||p.state.schema!==1||!Array.isArray(p.state.nodes)||!Array.isArray(p.history))fail('invalid-argument','Invalid workspace');
 const body=JSON.stringify(p);if(Buffer.byteLength(body)>700000)fail('resource-exhausted','Workspace exceeds 700KB');
 const ids=new Set();for(const n of p.state.nodes){if(!n||typeof n.id!=='string'||!n.id||ids.has(n.id))fail('invalid-argument','Invalid or duplicate node ID');ids.add(n.id);}
 return body;
}
export function diff(before,after){
 const changes=[];
 function visit(a,b,path,depth=0){
  if(JSON.stringify(a)===JSON.stringify(b))return;
  if(depth>30)fail('invalid-argument','Workspace nesting too deep');
  if(a&&b&&!Array.isArray(a)&&!Array.isArray(b)&&typeof a==='object'&&typeof b==='object'){
   for(const k of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[k],b[k],[...path,k],depth+1);
  }else changes.push({path,before:a??null,after:b??null});
 }
 visit(before,after,[]);
 if(changes.length>2000||Buffer.byteLength(JSON.stringify(changes))>800000)fail('resource-exhausted','Change set too large');
 return changes;
}
