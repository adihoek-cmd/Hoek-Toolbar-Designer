// Run only after reviewing the UID and obtaining approval for production writes.
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {OWNER,email} from './core.js';
const uid=process.argv[2];if(!uid||process.argv[3]!=='--approve-production-write')throw Error('Usage: node functions/bootstrap-admin.mjs VERIFIED_UID --approve-production-write');
initializeApp({credential:applicationDefault(),projectId:'hoek-ribbon-studio'});
const u=await getAuth().getUser(uid);if(u.disabled||!u.emailVerified||email(u.email)!==OWNER)throw Error('UID must belong to the verified office owner');
const db=getFirestore(),root=db.doc('offices/hoek');await db.runTransaction(async tx=>{const ref=root.collection('members').doc(uid),m=await tx.get(ref);if(m.exists)throw Error('Membership already exists; review manually');tx.create(ref,{email:OWNER,role:'admin',active:true,joinedAt:FieldValue.serverTimestamp()});tx.create(root.collection('audit').doc(),{action:'admin.bootstrap',actor:{uid,email:OWNER},createdAt:FieldValue.serverTimestamp()});});console.log('Admin created');
