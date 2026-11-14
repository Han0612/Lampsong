const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
const originals={pure:JSON.parse(fs.readFileSync('dist/defaults/pure.json')),combined:JSON.parse(fs.readFileSync('dist/defaults/combined.json'))};
const seeds={};vm.createContext(seeds);vm.runInContext(fs.readFileSync('dist/defaults.js','utf8')+';this.approved={pure:approvedModeDefaults("pure"),combined:approvedModeDefaults("combined")};this.lightKeys=sharedLightKeys;',seeds);
const approved=seeds.approved,lightKeys=Array.from(seeds.lightKeys);
async function boot(storage=new Map(),server={defaults:{},revisions:{}},offline=false,postHandler=null){
 const nodes={};for(const m of html.matchAll(/<(input|select|textarea|button)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  const attrs=m[0],options=m[1]==='select'?[...html.slice(m.index+attrs.length,html.indexOf('</select>',m.index)).matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(x=>({value:x[1]})):[];
  nodes[m[2]]={tagName:m[1].toUpperCase(),min:(attrs.match(/\bmin="([^"]+)"/)||[])[1]||0,max:(attrs.match(/\bmax="([^"]+)"/)||[])[1]||100,value:'',options,replaceChildren(){this.options=[];},add(v){this.options.push(v);},focus(){}};
 }
 const handlers={};let exported=null,messages=[],failWrite=false;let state={...approved.pure.settings,fadeStrength:45,lyricWidth:100,lyricHeight:100,lampHeight:13,lyricPosition:50,faceFinish:'dark',lyricColor:'#0a1419',catFollowLight:true,lampRealistic:true,magicColor:true,rhythmSwing:false,rhythmStrength:50},lyrics={lines:['old one','old two'],current:0},requests=0;
 delete state.lampGap;
 const box={Blob,URL:{createObjectURL:b=>{exported=b;return 'blob:test';},revokeObjectURL(){}},setTimeout:fn=>fn(),document:{createElement:()=>({click(){}}),getElementById:id=>nodes[id],addEventListener:(name,fn)=>{handlers[name]=fn;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failWrite){failWrite=false;throw Error('quota');}storage.set(k,v);},removeItem:k=>storage.delete(k)},Option:function(text,value){this.text=text;this.value=value;},catPlacementDefaults:()=>({}),catOpacityDefaults:()=>({}),lightModeDefaults:()=>({}),AbortSignal,fetch:async(_url,options)=>{requests++;if(offline)throw Error('offline');if(options.method==='POST'&&postHandler)return postHandler(JSON.parse(options.body));assert.notEqual(options.method,'POST','ordinary visitors never write server defaults');return {ok:true,json:async()=>server};}};
 vm.createContext(box);vm.runInContext(fs.readFileSync('dist/demo-lyrics.js','utf8')+fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/presets.js','utf8'),box);
 const control=await box.installPresets(()=>({...state}),s=>{state={...state,...s}},m=>messages.push(m),()=>lyrics,l=>{lyrics=l});
 return{control,messages,failNextWrite:()=>{failWrite=true;},async exportDoc(){exported=null;await nodes.exportPreset.onclick();return exported?JSON.parse(await exported.text()):null;},async importDoc(doc){await nodes.importPreset.onchange({target:{files:[{size:1000,text:async()=>JSON.stringify(doc)}],value:'preset.json'}});},get:()=>state,lyrics:()=>lyrics,storage,requests:()=>requests,change(key,value){state[key]=value;handlers.change({target:{id:key}});}};
}

(async()=>{
 const modes=['pure','combined','floating'];
 const seed=await boot(),server={defaults:{},revision:'retained'};
 for(const mode of modes){seed.control.switchTo(mode);server.defaults[mode]=JSON.parse(JSON.stringify(seed.control.snapshot()));}
 server.defaults.combined.settings.lineGap=211;
 const app=await boot(new Map(),server);
 app.change('lineGap',177);app.change('brightness',87);app.change('coverBackground',false);app.change('coverBlur',0);app.change('coverDim',37);
 let bundle=await app.exportDoc();assert.equal(bundle.version,2);assert.equal(bundle.modes.combined.settings.lineGap,211,'unvisited remote defaults');
 app.control.switchTo('combined');app.change('lineGap',222);app.control.switchTo('floating');app.change('lineGap',244);app.change('floatWaveAmplitude',14);
 bundle=await app.exportDoc();
 assert.deepEqual(Object.keys(bundle.modes),modes);
 for(const mode of modes){assert.equal(bundle.modes[mode].settings.brightness,87);assert.equal(bundle.modes[mode].settings.coverBackground,false);assert.equal(bundle.modes[mode].settings.coverBlur,0);assert.equal(bundle.modes[mode].settings.coverDim,37);}
 const target=await boot(new Map(),server);target.control.switchTo('combined');await target.importDoc(bundle);
 assert.equal(target.get().mode,'combined');assert.equal(target.get().lineGap,222);
 for(const [mode,gap] of [['pure',177],['combined',222],['floating',244]]){target.control.switchTo(mode);assert.equal(target.get().lineGap,gap);}
 assert.equal(target.get().floatWaveAmplitude,14);
 const reloaded=await boot(target.storage,server);
 for(const [mode,gap] of [['pure',177],['combined',222],['floating',244]]){reloaded.control.switchTo(mode);assert.equal(reloaded.get().lineGap,gap);assert.equal(reloaded.get().brightness,87);assert.equal(reloaded.get().coverBackground,false);assert.equal(reloaded.get().coverBlur,0);assert.equal(reloaded.get().coverDim,37);}
 const before=JSON.stringify([...reloaded.storage]),state=JSON.stringify(reloaded.get());
 const corrupt=structuredClone(bundle);corrupt.modes.combined.settings.lineGap=99999;
 await reloaded.importDoc(corrupt);assert.equal(JSON.stringify([...reloaded.storage]),before);assert.equal(JSON.stringify(reloaded.get()),state);assert.match(reloaded.messages.at(-1),/导入失败/);
 const inconsistent=structuredClone(bundle);inconsistent.modes.pure.settings.brightness=90;
 await reloaded.importDoc(inconsistent);assert.equal(JSON.stringify([...reloaded.storage]),before);
 const missing=structuredClone(bundle);delete missing.modes.pure;await reloaded.importDoc(missing);assert.equal(JSON.stringify([...reloaded.storage]),before);
 reloaded.failNextWrite();await reloaded.importDoc(bundle);assert.equal(JSON.stringify([...reloaded.storage]),before);assert.equal(JSON.stringify(reloaded.get()),state);
 const old=structuredClone(bundle.modes.pure);old.settings.lineGap=188;old.settings.brightness=80;delete old.settings.coverBackground;delete old.settings.coverBlur;delete old.settings.coverDim;
 await reloaded.importDoc(old);assert.equal(reloaded.get().mode,'floating');assert.equal(reloaded.get().lineGap,244);assert.equal(reloaded.get().brightness,80);assert.equal(reloaded.get().coverBackground,true,'old imports gain the default background');assert.equal(reloaded.get().coverBlur,24);assert.equal(reloaded.get().coverDim,86);
 reloaded.control.switchTo('pure');assert.equal(reloaded.get().lineGap,188);
 const offline=await boot(new Map(target.storage),server,true);assert.ok(await offline.exportDoc(),'all remembered modes export offline');
 const freshOffline=await boot(new Map(),server,true);assert.equal(await freshOffline.exportDoc(),null,'do not silently export wrong unvisited defaults');
 console.log('PASS: three-mode JSON roundtrip/reload, remote fallback, shared values, mode retention, legacy import, invalid-file isolation, storage failure rollback, offline behavior.');
})().catch(error=>{console.error(error);process.exitCode=1;});
