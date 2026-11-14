import fs from 'node:fs';import assert from 'node:assert/strict';
const code=fs.readFileSync('dist/server/index.js','utf8');const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
const modes=['pure','combined','floating'],bundleKey='system-defaults/v2/all.json';
const objects=new Map();let serial=0,failBundle=false,writes=0;
const bucket={async delete(key){objects.delete(key);},async get(key){const old=objects.get(key);if(!old)return null;const {text,etag}=old;let used=false;const read=()=>{assert(!used,'R2 response body consumed only once');used=true;return text;};return{etag,json:async()=>JSON.parse(read()),text:async()=>read()};},async put(key,text,options={}){if(key===bundleKey&&failBundle)throw Error('simulated storage failure');const old=objects.get(key);if(options.onlyIf?.etagMatches&&options.onlyIf.etagMatches!==old?.etag)return null;if(options.onlyIf?.etagDoesNotMatch==='*'&&old)return null;const value={text,etag:String(++serial)};objects.set(key,value);if(key===bundleKey)writes++;return {etag:value.etag};}};
const env={BUCKET:bucket,SYSTEM_DEFAULTS_PASSWORD:'test-only-secret'};
const request=(method='GET',body,origin='https://cat.test',ip='visitor-one')=>new Request('https://cat.test/api/system-defaults',{method,headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':ip},...(body?{body:JSON.stringify(body)}:{})});
const read=async()=>{const r=await worker.fetch(request(),env);assert.equal(r.status,200);return r.json();};
const payload=snapshot=>{const p={...structuredClone(snapshot),password:env.SYSTEM_DEFAULTS_PASSWORD};for(const m of modes)for(const key of ['dust','dustSize','dustDensity','moths','insectKind','butterflies'])p.defaults[m].settings[key]=p.defaults.pure.settings[key];return p;};
const post=(body,ip='admin')=>worker.fetch(request('POST',body,'https://cat.test',ip),env);
const first=await read();assert.equal(first.revision,null);assert.equal(objects.size,0);for(const m of modes)assert.equal(first.defaults[m].settings.lampStyle,'modern');
// Legacy files are read without rewriting. Most recent save supplies shared controls.
const legacy=structuredClone(first.defaults.combined);Object.assign(legacy.settings,{brightness:93,lampStyle:'disco',lineGap:219,projectedWave:false,projectedWaveMusic:false,projectedWaveSpeed:155,wrapLyrics:false,lyricMotion:'fade',rowTransitionSpeed:175,beamRange:60,catIdleSleep:true,shadowFade:false});
delete legacy.settings.coverBackground;delete legacy.settings.coverBlur;delete legacy.settings.coverDim;delete legacy.settings.rhythmStrength;delete legacy.settings.lyricWidth;delete legacy.settings.lyricHeight;
await bucket.put('system-defaults/v1/combined.json',JSON.stringify({doc:legacy,updatedAt:'2099-01-01T00:00:00Z'}));
const legacyRaw=objects.get('system-defaults/v1/combined.json').text;
const migrated=await read();for(const m of modes){const s=migrated.defaults[m].settings;assert.equal(s.brightness,93);assert.equal(s.coverBackground,true);assert.equal(s.coverBlur,24);assert.equal(s.coverDim,86);assert.equal(s.lampStyle,'disco');assert.equal(s.beamRange,90);assert.equal(s.projectedWave,false);assert.equal(s.floatWave,false);assert.equal(s.floatWaveSpeed,155);}
assert.equal(migrated.defaults.combined.settings.catIdleSleep,undefined);assert.equal(migrated.defaults.combined.settings.rhythmStrength,50);assert.equal(migrated.defaults.combined.settings.lyricWidth,100);assert.equal(migrated.defaults.combined.settings.lyricHeight,100);assert.equal(migrated.defaults.combined.settings.fadeStrength,0);assert.equal(migrated.defaults.combined.settings.lineGap,219);assert.equal(objects.get('system-defaults/v1/combined.json').text,legacyRaw);
console.log('PASS: nonmutating legacy migration, shared lights/playback and independent visuals.');
// Validation happens for every mode before the one commit.
let p=payload(migrated);for(const mode of modes){p.defaults[mode].settings.coverBackground=false;p.defaults[mode].settings.coverBlur=0;p.defaults[mode].settings.coverDim=100;}Object.assign(p.defaults.pure.settings,{fadeStrength:83,lyricWidth:72,lyricHeight:84,projectedWaveAmplitude:18});Object.assign(p.defaults.combined.settings,{projectedWaveAmplitude:4});Object.assign(p.defaults.floating.settings,{floatWaveAmplitude:7,floatBlurAngle:125,floatFadeAngle:300,floatOffsetX:-87,floatOffsetY:125,floatScale:180,floatFan:-55,floatShadowColor:'#253851',floatFollow:0,floatFade:85});
assert.equal((await post({...p,password:'wrong'})).status,401);
assert.equal((await worker.fetch(request('POST',p,'https://evil.test'),env)).status,403);
const staleResponse=await post({...p,revisions:first.revisions});assert.equal(staleResponse.status,409,'stale legacy revision rejected: '+await staleResponse.text());
assert.equal((await post({password:env.SYSTEM_DEFAULTS_PASSWORD,doc:p.defaults.pure})).status,409,'old tabs must refresh');
for(const [mode,key,value]of [['pure','coverBackground','false'],['pure','coverBlur',121],['pure','coverDim',101],['pure','brightness',200],['combined','rhythmStrength',101],['pure','fadeStrength',101],['floating','floatShadowColor','red'],['floating','floatScale',251],['floating','lyricMotion','invalid'],['floating','wrapLyrics',42],['floating','floatWaveSpeed',999]]){const bad=structuredClone(p);bad.defaults[mode].settings[key]=value;assert.equal((await post(bad)).status,400,mode+'.'+key);assert(!objects.has(bundleKey));}
const missing=structuredClone(p);delete missing.defaults.floating;assert.equal((await post(missing)).status,400);
const mismatched=structuredClone(p);mismatched.defaults.floating.settings.brightness=80;assert.equal((await post(mismatched)).status,400);
const wrongBackground=structuredClone(p);wrongBackground.defaults.floating.settings.coverBackground=true;assert.equal((await post(wrongBackground)).status,400,'background must be shared');
const failedBefore=JSON.stringify([...objects].filter(([k])=>k.startsWith('system-defaults/')));failBundle=true;assert.equal((await post(p)).status,503);failBundle=false;assert.equal(JSON.stringify([...objects].filter(([k])=>k.startsWith('system-defaults/'))),failedBefore);
assert.equal((await post(p)).status,200);assert.equal(writes,1);let saved=await read();assert(saved.revision);
for(const m of modes)for(const key of Object.keys(p.defaults[m].settings).filter(key=>key!=='shadowFade'))assert.equal(saved.defaults[m].settings[key],p.defaults[m].settings[key],m+'.'+key);
assert.equal(objects.get('system-defaults/v1/combined.json').text,legacyRaw,'legacy recovery data preserved');
assert.equal((await post(p)).status,409,'duplicate initial save cannot overwrite');
console.log('PASS: all-mode persistence, auth, bounds, missing-mode rejection, shared-field consistency, one commit, unchanged legacy backups.');
// A failed later write leaves the entire previous bundle readable.
const before=objects.get(bundleKey).text;p=payload(saved);for(const mode of modes)p.defaults[mode].settings.coverBlur=120;p.defaults.pure.settings.lyricWidth=80;p.defaults.combined.settings.lineGap=230;p.defaults.floating.settings.floatWaveAmplitude=9;
failBundle=true;assert.equal((await post(p)).status,503);failBundle=false;assert.equal(objects.get(bundleKey).text,before);assert.equal((await read()).defaults.floating.settings.floatWaveAmplitude,7);
assert.equal((await post(p)).status,200);assert([...objects.keys()].some(k=>k.startsWith('system-defaults/history/all/')));assert.equal((await read()).defaults.floating.settings.floatWaveAmplitude,9);
for(const mode of modes)assert.equal((await read()).defaults[mode].settings.coverBlur,120);
// Two administrators confirming the same revision: precisely one atomic winner.
saved=await read();const a=payload(saved),b=payload(saved);a.defaults.pure.settings.lyricWidth=81;b.defaults.pure.settings.lyricWidth=82;a.defaults.combined.settings.lineGap=240;b.defaults.combined.settings.lineGap=250;
const race=await Promise.all([post(a,'admin-a'),post(b,'admin-b')]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);const won=await read();const winner=race[0].status===200?a:b;assert.equal(won.defaults.pure.settings.lyricWidth,winner.defaults.pure.settings.lyricWidth);assert.equal(won.defaults.combined.settings.lineGap,winner.defaults.combined.settings.lineGap);
for(let i=0;i<6;i++)var limited=await post({...p,password:'wrong'},'brute-force');assert.equal(limited.status,429);assert.equal((await worker.fetch(request(),{})).status,503);
console.log('PASS: storage failures keep all modes intact, history retained, concurrent CAS has one winner, durable rate limiting.');
// Cover lyrics remain a separate, revision-gated operation.
const coverRequest=(cover,body)=>new Request('https://cat.test/api/cover-lyrics/'+cover,{method:body?'POST':'GET',headers:{Origin:'https://cat.test','Content-Type':'application/json','cf-connecting-ip':'cover-admin'},...(body?{body:JSON.stringify(body)}:{})});
const newLyrics={password:env.SYSTEM_DEFAULTS_PASSWORD,lines:['第一句','第二句'],revision:null};
assert.equal((await worker.fetch(coverRequest(1,{...newLyrics,password:'wrong'}),env)).status,401);assert.equal((await worker.fetch(coverRequest(1,newLyrics),env)).status,200);assert.equal((await worker.fetch(coverRequest(1,newLyrics),env)).status,409);assert.deepEqual((await(await worker.fetch(coverRequest(1),env)).json()).lines,newLyrics.lines);assert.equal((await(await worker.fetch(coverRequest(0),env)).json()).lines,null);
console.log('PASS: cover lyrics isolation and password/revision checks unchanged.');
