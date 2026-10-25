#!/usr/bin/env node
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
const origin='https://adihoek-cmd.github.io',app=origin+'/Hoek-Toolbar-Designer/dist/',session=path.resolve('.hoek-bridge/session.json');
const [command,...args]=process.argv.slice(2);
if(command==='serve'){
 const key=randomBytes(32).toString('hex');let current,connected=0;const finished=new Map();
 const server=http.createServer(async(req,res)=>{const respond=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.headers.host!==`127.0.0.1:${server.address().port}`)return respond(403,{error:'Invalid host'});
  if(req.headers.origin&&req.headers.origin!==origin)return respond(403,{error:'Invalid origin'});
  if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const auth=req.headers.authorization||'',expected='Bearer '+key;if(auth.length!==expected.length||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return respond(403,{error:'Unauthorized'});
  if(req.method!=='POST')return respond(405,{error:'POST required'});
  try{let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>2e6)throw Error('Request too large');chunks.push(c)}const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   if(req.url==='/hello'){connected=Date.now();return respond(200,{ok:true});}
   if(req.url==='/next'){connected=Date.now();if(current&&Date.now()-current.createdAt>120000){finished.set(current.id,{error:'Timed out. Pull before retrying; a write may already have completed.'});current=null;}const job=current&&!current.delivered?{id:current.id,kind:current.kind,report:current.report}:null;if(job)current.delivered=true;return respond(200,{job});}
   if(req.url==='/result'){if(!current||current.id!==body.id)throw Error('Unknown result');finished.set(body.id,{result:body.result,error:body.error});if(finished.size>30)finished.delete(finished.keys().next().value);current=null;return respond(200,{ok:true});}
   if(req.url==='/submit'){if(Date.now()-connected>15000)throw Error('Open the app link and click Connect first.');if(current)throw Error('Another operation is pending');if(!['pull','push'].includes(body.kind))throw Error('Invalid operation');current={id:randomUUID(),kind:body.kind,report:body.report,createdAt:Date.now()};return respond(200,{id:current.id});}
   if(req.url==='/status'){return respond(200,finished.has(body.id)?{done:true,...finished.get(body.id)}:{done:false});}
   respond(404,{error:'Not found'});
  }catch(e){respond(400,{error:e.message})}
 });server.listen(0,'127.0.0.1',async()=>{const port=server.address().port;await fs.mkdir(path.dirname(session),{recursive:true});await fs.writeFile(session,JSON.stringify({port,key}),{mode:0o600});console.log('Keep this terminal running. Open this link in Chrome/Edge on this computer, sign in and click Connect:');console.log(app+'#claudePort='+port+'&claudeKey='+key);console.log('No Firebase credentials are stored by this bridge.');});
 process.on('SIGINT',async()=>{await fs.rm(session,{force:true});server.close();process.exit(0)});
}else if(command==='pull'||command==='push'){
 const cfg=JSON.parse(await fs.readFile(session,'utf8'));if(!Number.isInteger(cfg.port)||cfg.port<1024||cfg.port>65535||!/^[a-f0-9]{64}$/.test(cfg.key))throw Error('Invalid local session');
 const call=async(route,body)=>{const r=await fetch('http://127.0.0.1:'+cfg.port+route,{method:'POST',headers:{Authorization:'Bearer '+cfg.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;};
 if(!args[0])throw Error(command==='pull'?'Usage: pull OUTPUT_DIRECTORY':'Usage: push REPORT.json');
 const report=command==='push'?JSON.parse(await fs.readFile(args[0],'utf8')):undefined;const {id}=await call('/submit',{kind:command,report});let answer;for(let i=0;i<120;i++){answer=await call('/status',{id});if(answer.done)break;await new Promise(r=>setTimeout(r,1000))}if(!answer?.done)throw Error('Timeout. Pull before retrying a push.');if(answer.error)throw Error(answer.error);
 if(command==='push'){console.log(JSON.stringify(answer.result,null,2));}
 else{const out=path.resolve(args[0]);await fs.mkdir(out,{recursive:true});await fs.mkdir(path.join(out,'icons'),{recursive:true});const data=answer.result;await fs.writeFile(path.join(out,'workspace.json'),JSON.stringify(data,null,2));const icons=[];for(const n of data.state.nodes.filter(n=>n.type==='button')){const m=/^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=\s]+)$/.exec(n.icon||'');const row={nodeId:n.id,label:n.label,iconChoice:n.iconChoice,reference:n.icon};if(m){const filename=randomUUID()+'.'+({'svg+xml':'svg',jpeg:'jpg'}[m[1]]||m[1]);await fs.writeFile(path.join(out,'icons',filename),Buffer.from(m[2],'base64'));row.file='icons/'+filename;delete row.reference;}icons.push(row);}await fs.writeFile(path.join(out,'icons.json'),JSON.stringify(icons,null,2));console.log('Pulled cloud revision '+data.cloudRevision+' into '+out);}
}else console.log('Usage: node tools/claude-bridge.mjs serve | pull OUTPUT_DIRECTORY | push REPORT.json');
