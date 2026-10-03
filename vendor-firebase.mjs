import fs from 'node:fs/promises';
const version='12.19.0',base=`https://www.gstatic.com/firebasejs/${version}/`;
await fs.mkdir('dist/vendor',{recursive:true});
for(const name of ['firebase-app.js','firebase-auth.js','firebase-firestore.js']){
 const response=await fetch(base+name);if(!response.ok)throw Error(response.status);
 const source=(await response.text()).replaceAll(base,'./').replace(/\/\/# sourceMappingURL=.*$/gm,'');
 await fs.writeFile('dist/vendor/'+name,source);
}
await fs.writeFile('dist/vendor/README.txt',`Firebase Web SDK ${version}. Source: ${base}\nCopyright Google LLC. Apache-2.0 license; original license notices retained in each file. CDN module imports changed to local paths for offline use.\n`);
console.log('Vendored Firebase '+version);
