import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../.netlify/generated/worker.mjs';
import {createBucket} from '../netlify/storage.mjs';
const saved=new Map();let sequence=0,fail=false;
const store={async getWithMetadata(key,options){assert.equal(options.consistency,'strong');return saved.get(key)||null;},async set(key,data,condition){if(fail&&key==='system-defaults/v2/all.json')throw Error('storage unavailable');const current=saved.get(key);if(condition.onlyIfNew&&current||condition.onlyIfMatch&&condition.onlyIfMatch!==current?.etag)return {modified:false};const etag='"'+(++sequence)+'"';saved.set(key,{data,etag});return {modified:true,etag};},async delete(key){saved.delete(key);}};
const seed=JSON.parse(fs.readFileSync('netlify/seed.json'));
const env=()=>({BUCKET:createBucket(store,seed.covers),SYSTEM_DEFAULTS_PASSWORD:'test-only-secret'});
const request=(path='/api/system-defaults',body)=>new Request('https://catlight.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://catlight.test','Content-Type':'application/json','cf-connecting-ip':'test-visitor'},...(body?{body:JSON.stringify(body)}:{})});
const read=async(path)=>{const r=await worker.fetch(request(path),env());assert.equal(r.status,200);return r.json();};
const initial=await read();assert.equal(initial.revision,null);for(const mode of ['pure','combined','floating']){assert.equal(initial.defaults[mode].settings.fontChoice,seed.defaults[mode].settings.fontChoice);assert.equal(initial.defaults[mode].settings.lyricRows,seed.defaults[mode].settings.lyricRows);}
for(let i=0;i<7;i++)assert.deepEqual((await read('/api/cover-lyrics/'+i)).lines,seed.covers[String(i)]);
const all=structuredClone(initial);for(const mode of ['pure','combined','floating'])for(const key of ['dust','dustSize','dustDensity','moths','insectKind','butterflies'])all.defaults[mode].settings[key]=all.defaults.pure.settings[key];
all.defaults.pure.settings.projectedWaveAmplitude=18;all.defaults.combined.settings.projectedWaveAmplitude=4;all.defaults.floating.settings.floatWaveAmplitude=7;
let result=await worker.fetch(request(undefined,{...all,password:env().SYSTEM_DEFAULTS_PASSWORD}),env());assert.equal(result.status,200);const persisted=await read();assert(persisted.revision);assert.equal(persisted.defaults.pure.settings.projectedWaveAmplitude,18);assert.equal(persisted.defaults.combined.settings.projectedWaveAmplitude,4);assert.equal(persisted.defaults.floating.settings.floatWaveAmplitude,7);
// New adapter/handler instances represent cold starts and redeploys against the same store.
const reloaded=await read();assert.deepEqual(reloaded.defaults,persisted.defaults);
assert.equal((await worker.fetch(request(undefined,{...all,password:env().SYSTEM_DEFAULTS_PASSWORD}),env())).status,409);
const before=saved.get('system-defaults/v2/all.json').data;fail=true;result=await worker.fetch(request(undefined,{...persisted,password:env().SYSTEM_DEFAULTS_PASSWORD}),env());assert.equal(result.status,503);fail=false;assert.equal(saved.get('system-defaults/v2/all.json').data,before);
const cover='0',oldCover=await read('/api/cover-lyrics/'+cover);result=await worker.fetch(request('/api/cover-lyrics/'+cover,{lines:['test one','test two'],revision:oldCover.revision,password:env().SYSTEM_DEFAULTS_PASSWORD}),env());assert.equal(result.status,200);assert.deepEqual((await read('/api/cover-lyrics/'+cover)).lines,['test one','test two']);
console.log('PASS: migrated defaults/covers, real API through Netlify adapter, all-mode write/read, cold-start persistence, conditional ETags, failure isolation and cover updates.');
