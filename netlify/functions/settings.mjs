import {getStore} from '@netlify/blobs';
import worker from '../../.netlify/generated/worker.mjs';
import seed from '../seed.json' with {type:'json'};
import {createBucket} from '../storage.mjs';
import {verifyPassword} from '../auth.mjs';

export default async (request,context)=>{
  const url=new URL(request.url);
  if(url.pathname!=='/api/system-defaults'&&!/^\/api\/cover-lyrics\/[0-6]$/.test(url.pathname))return new Response('Not found',{status:404});
  // Production and branch previews use separate namespaces; updates to the
  // production deployment keep using the same store across releases.
  const production=context.deploy?.context==='production';
  const store=getStore({name:production?'catlight-defaults-production':'catlight-defaults-preview',consistency:'strong'});
  const headers=new Headers(request.headers);
  headers.set('cf-connecting-ip',context.ip||'unknown');
  headers.delete('oai-authenticated-user-id');
  const forwarded=new Request(request,{headers});
  return worker.fetch(forwarded,{BUCKET:createBucket(store,seed.covers),VERIFY_ADMIN_PASSWORD:async password=>verifyPassword(password,await store.get('admin/password-verifier',{type:'json',consistency:'strong'}))});
};

export const config={path:['/api/system-defaults','/api/cover-lyrics/:cover'],preferStatic:false};
