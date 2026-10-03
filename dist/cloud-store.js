import {initializeApp} from './vendor/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from './vendor/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp,collection,query,orderBy,limit,getDocsFromServer} from './vendor/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
export const authChanged=fn=>onAuthStateChanged(auth,fn);
export const login=()=>signInWithPopup(auth,new GoogleAuthProvider());
export const logout=()=>signOut(auth);
const head=uid=>doc(db,'users',uid,'workspaces','main');
const version=(uid,id)=>doc(db,'users',uid,'workspaces','main','versions',id);
export function watch(uid,fn,error){return onSnapshot(head(uid),{includeMetadataChanges:true},s=>{if(!s.metadata.fromCache&&!s.metadata.hasPendingWrites)fn(s.exists()?s.data():null)},error)}
export async function read(uid){
 const h=await getDocFromServer(head(uid));if(!h.exists())return null;
 const meta=h.data(),v=await getDocFromServer(version(uid,meta.head));
 if(!v.exists())throw Error('Missing cloud revision');
 return {...meta,payload:JSON.parse(v.data().payload)};
}
export async function commit(uid,expected,payload){
 const body=JSON.stringify(payload);
 if(new TextEncoder().encode(body).length>800000)throw Error('הגיבוי גדול מדי לסנכרון בגרסה זו (800KB). ייצאו גיבוי; הנתונים נשארים במכשיר.');
 const id=crypto.randomUUID();
 await runTransaction(db,async tx=>{
  const h=await tx.get(head(uid)),revision=h.exists()?h.data().revision:0;
  if(revision!==expected){const error=Error('Cloud changed');error.code='hoek/stale';throw error;}
  tx.set(version(uid,id),{payload:body,revision:revision+1,createdAt:serverTimestamp()});
  tx.set(head(uid),{head:id,revision:revision+1,updatedAt:serverTimestamp(),schema:1});
 });
 return {revision:expected+1,head:id,payload};
}
export async function revisions(uid){
 const q=query(collection(head(uid),'versions'),orderBy('revision','desc'),limit(20));
 return (await getDocsFromServer(q)).docs.map(d=>({id:d.id,...d.data()}));
}
