import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const env={...process.env,FIREBASE_EMULATORS_PATH:path.join(root,'.tools/emulators'),XDG_CONFIG_HOME:path.join(root,'.local-config'),FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true'};
if(process.platform==='win32'&&fs.existsSync('.tools/java')){
 const dir=fs.readdirSync('.tools/java').find(d=>fs.existsSync(path.join('.tools/java',d,'bin/java.exe')));
 const pathKey=Object.keys(env).find(k=>k.toLowerCase()==='path')||'PATH';
 if(dir)env[pathKey]=path.join(root,'.tools/java',dir,'bin')+path.delimiter+(env[pathKey]||'');
}
const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--project','demo-hoek-office','--config','firebase.emulators.json','--only','auth,firestore,functions','node tests/emulator.mjs'],{env,stdio:'inherit',windowsHide:true});
child.on('error',e=>{console.error(e.message);process.exitCode=1});child.on('exit',code=>{process.exitCode=code??1});
