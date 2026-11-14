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
 const bundle=JSON.parse(fs.readFileSync('dist/defaults/user-presets.json','utf8'));
 const modes=['pure','combined','floating'];
 const stale=new Map([['shadowLyrics.current.v1',JSON.stringify({...bundle.modes.pure,settings:{...bundle.modes.pure.settings,lineGap:999}})]]);
 const app=await boot(stale,{},true);
 function check(actual,mode){for(const [key,value] of Object.entries(bundle.modes[mode].settings))assert.deepEqual(actual[key],value,mode+'.'+key);}
 check(app.get(),'pure');
 // Export before visiting other modes must succeed without the server.
 let exported=await app.exportDoc();assert(exported);for(const mode of modes)check(exported.modes[mode].settings,mode);
 for(const mode of modes){app.control.switchTo(mode);check(app.get(),mode);}
 app.change('lineGap',200);const again=await boot(app.storage,{},true);assert.equal(again.get().mode,'floating');assert.equal(again.get().lineGap,200);
 await again.control.reset();check(again.get(),'floating');
 for(const mode of modes){again.control.switchTo(mode);await again.control.reset();check(again.get(),mode);}
 exported=await again.exportDoc();for(const mode of modes)check(exported.modes[mode].settings,mode);
 const imported=await boot(new Map(),{},true);await imported.importDoc(exported);for(const mode of modes){imported.control.switchTo(mode);check(imported.get(),mode);}
 console.log('PASS: every user setting in all 3 modes; fresh start, stale-cache isolation, offline export before mode visits, reload, reset, JSON roundtrip.');
})().catch(e=>{console.error(e);process.exitCode=1;});
