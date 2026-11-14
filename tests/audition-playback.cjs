const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function boot({blocked=false}={}){
 const nodes={},handlers={};const $=id=>nodes[id]??=( {dataset:{},add(){},setAttribute(k,v){this[k]=v}} );
 let plays=0,pauses=0;const audio={preload:'',paused:true,ended:false,currentTime:0,error:null,_src:'',get src(){return this._src},set src(v){this._src=v;this.ended=false;},play(){plays++;if(blocked)return Promise.reject(Object.assign(Error('blocked'),{name:'NotAllowedError'}));this.paused=false;this.onplaying?.();return Promise.resolve();},pause(){pauses++;this.paused=true},removeAttribute(){this._src=''},load(){this.ended=false}};
 const box={document:{getElementById:$,addEventListener:(k,fn)=>handlers[k]=fn},siteAsset:x=>x,Option:class{},URL:{revokeObjectURL(){}}};vm.createContext(box);vm.runInContext(fs.readFileSync('dist/audition.js','utf8'),box);
 const control=box.installAudition(audio,()=>Promise.resolve(),()=>{});return {audio,$,handlers,control,get plays(){return plays},allow(){blocked=false}};
}
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve()};
(async()=>{
 const a=boot();assert.equal(a.plays,0,'initial render never waits for audio');a.control.start();await flush();assert.equal(a.audio.src,'audio/dream.m4a');
 const expected=['snitch','rock','casa','cipher','dream'];for(const name of expected){a.audio.ended=true;a.audio.onended();await flush();assert.equal(a.audio.src,'audio/'+name+'.m4a');const plays=a.plays;a.audio.onended();assert.equal(a.plays,plays,'duplicate completion does not skip a second track');}
 a.$('auditionPlay').onclick();const plays=a.plays;a.control.start();await flush();assert(a.audio.paused);assert.equal(a.plays,plays,'startup cannot undo an explicit pause');
 const b=boot({blocked:true});b.control.start();await flush();assert.equal(b.$('auditionArtist').textContent,'点击页面开始播放');assert(b.audio.paused);b.allow();b.handlers.click({target:{closest:()=>null}});await flush();assert(!b.audio.paused);assert.equal(b.plays,2);
 const c=boot();c.$('auditionPlay').onclick();c.control.start();await flush();assert.equal(c.plays,1,'manual play before startup is not duplicated');
 console.log('PASS: UI-first autoplay, rejection and first-gesture retry, five-track wraparound, duplicate-ended guard, manual pause protection.');
})().catch(e=>{console.error(e);process.exit(1)});
