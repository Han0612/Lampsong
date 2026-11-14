const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const b={};vm.createContext(b);vm.runInContext(fs.readFileSync('dist/lyric-tempo.js','utf8')+';this.Clock=LyricTempo',b);
const Clock=b.Clock;
const clock=new Clock();let phase=0,last=0,previousDelta=1/60;
for(let i=0;i<1200;i++){
 const fast=i>=400&&i<800;
 const d=clock.advance(1/60,{speed:fast?180:50,follow:true,playing:i<1000,bpm:fast?140:70,beat:(i%60)/60});
 phase+=d;assert(phase>last);assert(d<.06,'bounded phase advance');assert(Math.abs(d-previousDelta)<.003,'smooth velocity across speed / playback changes');previousDelta=d;last=phase;
}
const a=new Clock(),c=new Clock();let pa=0,pc=0;
for(let i=0;i<600;i++)pa+=a.advance(1/60,{speed:135,playing:true,bpm:110,beat:.5});
for(let i=0;i<300;i++)pc+=c.advance(1/30,{speed:135,playing:true,bpm:110,beat:.5});
assert(Math.abs(pa-pc)<1e-8,'frame-rate independent integration');
const neutral=new Clock();for(let i=0;i<600;i++)neutral.advance(1/60,{speed:130,playing:false});assert(Math.abs(neutral.rate-1.3)<1e-8);
for(let i=0;i<600;i++)neutral.advance(1/60,{speed:130,playing:true,bpm:140,beat:1,follow:false});assert(Math.abs(neutral.rate-1.3)<1e-8);
const fast=new Clock(),slow=new Clock();for(let i=0;i<300;i++){fast.advance(1/60,{playing:true,bpm:140,beat:.8});slow.advance(1/60,{playing:true,bpm:70,beat:.1});}assert(fast.rate>slow.rate*1.6);
const prior=fast.rate;assert.equal(fast.advance(0,{playing:false}),0);assert.equal(fast.rate,prior);
for(let i=0;i<600;i++)fast.advance(1/60,{playing:true,speed:180,bpm:140,beat:1,reduced:true});assert(Math.abs(fast.rate-1)<1e-8);
console.log('PASS: continuous music/manual velocity, 30/60 Hz equivalence, audible tempo contrast, no-music fallback, frozen time, reduced-motion baseline.');
