import {initializeApp,getApps} from './vendor/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,connectAuthEmulator} from './vendor/firebase-auth.js';
import {firebaseConfig} from './firebase-config.js';
const emulated=['localhost','127.0.0.1','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('officeEmulator')==='1';
const app=getApps()[0]||initializeApp(emulated?{...firebaseConfig,projectId:'demo-hoek-office',apiKey:'demo',authDomain:'localhost'}:firebaseConfig),auth=getAuth(app);
if(emulated)connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
export const scope='office:hoek:';
export const authChanged=fn=>onAuthStateChanged(auth,fn);
export const login=()=>signInWithPopup(auth,new GoogleAuthProvider());
export const logout=()=>signOut(auth);
export async function emailLogin(email,password,register=false){const c=await (register?createUserWithEmailAndPassword:signInWithEmailAndPassword)(auth,email,password);if(!c.user.emailVerified){await sendEmailVerification(c.user);throw Error('נשלח אימייל לאימות. לאחר האימות התנתקו והתחברו שוב.');}return c;}
export const resetPassword=email=>sendPasswordResetEmail(auth,email);
export async function call(name,data={}){
 if(!auth.currentUser)throw Error('Login required');
 const idToken=await auth.currentUser.getIdToken(true);
 const endpoint=emulated?`http://127.0.0.1:5001/demo-hoek-office/us-central1/${name}`:`https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/${name}`;
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},body:JSON.stringify({data}),signal:AbortSignal.timeout(25000)});
 const body=await response.json();if(body.error)throw Object.assign(Error(body.error.message),{code:body.error.status==='ABORTED'?'hoek/stale':body.error.status});if(!response.ok)throw Error('Office server unavailable');return body.result;
}
let membership;
export const canPublish=()=>membership?.role==='admin';
export const read=async()=> {const result=await call('readWorkspace');membership=result.membership;return result.workspace;};
export const commit=async(uid,expected,payload)=>({...await call('commitWorkspace',{expected,payload,migration:expected===0}),payload});
export const revisions=()=>call('listRevisions');
export function watch(uid,fn,error){let stopped=false;const tick=()=>{if(!stopped&&navigator.onLine)fn();};const timer=setInterval(tick,15000);return ()=>{stopped=true;clearInterval(timer)};}
