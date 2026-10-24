import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {createService} from './service.js';
initializeApp();
const service=createService(getFirestore(),getAuth(),()=>FieldValue.serverTimestamp());
function wrap(name){return onCall({region:'us-central1',maxInstances:10},async request=>{try{return await service[name](request)}catch(e){const known=['unauthenticated','permission-denied','invalid-argument','resource-exhausted','failed-precondition','aborted','not-found'].includes(e.code);throw new HttpsError(known?e.code:'internal',known?e.message:'Request failed')}});}
export const createInvite=wrap('createInvite'),redeemInvite=wrap('redeemInvite'),revokeMember=wrap('revokeMember'),readWorkspace=wrap('readWorkspace'),commitWorkspace=wrap('commitWorkspace'),listMembers=wrap('listMembers'),listAudit=wrap('listAudit'),listRevisions=wrap('listRevisions');
