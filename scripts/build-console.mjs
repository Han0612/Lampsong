import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),dist=path.join(root,'dist');
// Refresh content revisions so changed lamp/cat assets cannot reuse old cached blobs.
const preloadPath=path.join(dist,'preload.json');
const preload=JSON.parse(fs.readFileSync(preloadPath,'utf8'));
preload.files=preload.files.filter(file=>fs.existsSync(path.join(dist,file.path))).map(file=>{
 const bytes=fs.readFileSync(path.join(dist,file.path));
 return {...file,revision:crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12),bytes:bytes.length};
});
fs.writeFileSync(preloadPath,JSON.stringify(preload));
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(dist,'demo-lyrics.js'),'utf8')+'\n'+fs.readFileSync(path.join(dist,'defaults.js'),'utf8')+'\nthis.seed={pure:approvedModeDefaults("pure"),combined:approvedModeDefaults("combined"),floating:approvedModeDefaults("floating")};',box);
const rules={};
vm.runInContext('this.sharedLightKeys=sharedLightKeys;this.sharedPlaybackKeys=sharedPlaybackKeys;this.normalizePlayback=normalizePlaybackSettings.toString();',box);
for(const [key,value] of Object.entries({...box.seed.pure.settings,...box.seed.combined.settings})){
  const rule={type:typeof value};
  if(rule.type==='number'){
    const tag=html.match(new RegExp('<(?:input|select)\\b[^>]*id="'+key+'"[^>]*>'))?.[0];
    if(!tag)throw Error('Missing control '+key);
    rule.min=key==='lyricRows'?2:Number(tag.match(/min="([^"]+)"/)?.[1]);rule.max=key==='lyricRows'?6:Number(tag.match(/max="([^"]+)"/)?.[1]);
    if(!Number.isFinite(rule.min)||!Number.isFinite(rule.max))throw Error('Missing bounds '+key);
  }
  if(rule.type==='string'&&!['lyricColor','floatShadowColor'].includes(key)){
    if(key==='mode')rule.values=['pure','combined','floating'];
    else{const select=html.match(new RegExp('<select[^>]*id="'+key+'"[^>]*>([\\s\\S]*?)</select>'));if(!select)throw Error('Missing select '+key);rule.values=[...select[1].matchAll(/value="([^"]+)"/g)].map(m=>m[1]);}
  }
  rules[key]=rule;
}
const source=fs.readFileSync('worker/index.js','utf8').replace('/*__DEFAULTS__*/null',JSON.stringify(box.seed)).replace('/*__SHARED_LIGHT__*/null',JSON.stringify(box.sharedLightKeys)).replace('/*__SHARED_PLAYBACK__*/null',JSON.stringify(box.sharedPlaybackKeys)).replace('/*__PLAYBACK_NORMALIZE__*/',box.normalizePlayback).replace('/*__RULES__*/null',JSON.stringify(rules)).replace("/*__INDEX__*/''",JSON.stringify(html));
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js',source);
fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.rmSync('dist/client',{recursive:true,force:true});fs.mkdirSync('dist/client');
for(const file of fs.readdirSync(dist)){if(['server','client','.openai','_appgen_meta'].includes(file))continue;fs.cpSync(path.join(dist,file),path.join(dist,'client',file),{recursive:true});}
fs.writeFileSync('dist/server/wrangler.json',JSON.stringify({name:'catlight-console',main:'index.js',compatibility_date:'2025-01-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},r2_buckets:[{binding:'BUCKET',bucket_name:'catlight-defaults'}]},null,2));
console.log('Built Worker + existing client assets; '+Object.keys(rules).length+' server-validated settings.');
