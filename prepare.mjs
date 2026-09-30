import fs from 'node:fs';
import crypto from 'node:crypto';
const files=fs.readdirSync('dist',{recursive:true}).filter(f=>fs.statSync('dist/'+f).isFile()&&f!=='sw.js').map(f=>f.replaceAll('\\','/'));
const version=crypto.createHash('sha256');for(const f of files)version.update(fs.readFileSync('dist/'+f));
const name='hoek-'+version.digest('hex').slice(0,12);
fs.writeFileSync('dist/sw.js',`const PREFIX='hoek-scope-'+encodeURIComponent(self.registration.scope)+'-',CACHE=PREFIX+${JSON.stringify(name)},FILES=${JSON.stringify(['./',...files.map(f=>'./'+f)])};
async function install(){const cache=await caches.open(CACHE);let next=0;await Promise.all(Array.from({length:6},async()=>{while(next<FILES.length){const file=FILES[next++],url=new URL(file,self.registration.scope);let done=false;for(let attempt=0;attempt<3&&!done;attempt++){try{const request=new URL(url);request.searchParams.set('build',${JSON.stringify(name)});const response=await fetch(request,{cache:'reload'});if(!response.ok)throw Error(file+': '+response.status);await cache.put(url,response);done=true;}catch(error){if(attempt===2)throw error;}}}}));await self.skipWaiting();}
self.addEventListener('install',e=>e.waitUntil(install()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data?.type==='VERSION')e.ports[0]?.postMessage({version:${JSON.stringify(name)}})});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin)return;if(url.pathname.endsWith('/update.html')){e.respondWith(fetch(e.request,{cache:'reload'}));return;}e.respondWith(caches.open(CACHE).then(async cache=>{const hit=await cache.match(e.request,{ignoreSearch:e.request.mode==='navigate'});return hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?cache.match(new URL('index.html',self.registration.scope)):Response.error())}))});
`);console.log('Prepared '+name+' with '+files.length+' files');
