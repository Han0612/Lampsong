const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const app=fs.readFileSync('dist/app.js','utf8');
const old=cp.execFileSync('git',['show','9d0077cf5896e2863485e190f63e54588781bf69:dist/app.js'],{encoding:'utf8'});
function engine(code,tempo,contrast){
 const box={state:{breath:true,rhythmSwing:false},scene:{lightContrast:contrast},reduce:{matches:false},musicSway:{reset(){}},musicActive:()=>true,audio:{currentTime:0},auditionTempo:()=>tempo,analyser:{fftSize:1024,getByteFrequencyData:s=>s.fill(box.sample)},audioContext:{sampleRate:48000},spectrum:new Uint8Array(512),time:0,beatLevel:0,pulse:0,lastAudioEnergy:0,lightPower:1,discoBeat:0,rhythmLightEnabled:false,rhythmLightElapsed:.45,rhythmLightFrom:1,sample:0};
 vm.createContext(box);vm.runInContext(code.slice(code.indexOf('  function updateRhythm('),code.indexOf('  const fixtureScale=')),box);return box;
}
for(const tempo of [70,108,150])for(const contrast of [45,83,100])for(const hz of [30,60,120]){
 const before=engine(old,tempo,contrast),after=engine(app,tempo,contrast);let min=1,max=0,delta=0;
 for(let i=0;i<8*hz;i++){
  const t=i/hz,sample=Math.round(15+180*Math.exp(-(t%(60/tempo))/.07));
  for(const b of [before,after]){b.time=t;b.audio.currentTime=t;b.sample=sample;b.updateRhythm(1/hz,1);}
  if(t>3){delta=Math.max(delta,Math.abs(before.lightPower-after.lightPower));min=Math.min(min,after.lightPower);max=Math.max(max,after.lightPower);}
 }
 assert(delta<1e-8,'steady rhythm must match actual v113 source, including polarity, depth and response');
 if(hz===60&&contrast===45)console.log(`${tempo} BPM / 45% contrast: ${(min*100).toFixed(1)}–${(max*100).toFixed(1)}% of current ceiling; v113 error ${delta.toExponential(1)}`);
}
const b=engine(app,108,100);b.state.breath=false;b.sample=90;
for(let i=0;i<90;i++){b.audio.currentTime=b.time=i/60;b.updateRhythm(1/60,1);assert.equal(b.lightPower,1,'off retains selected brightness');}
b.state.breath=true;const on=b.lightPower;b.updateRhythm(1/60,1);assert(Math.abs(on-b.lightPower)<.003,'enable cannot suddenly darken');
for(let i=0;i<120;i++){b.audio.currentTime=b.time+=1/60;b.updateRhythm(1/60,1);assert(b.lightPower<=1);}
b.state.breath=false;const off=b.lightPower;b.updateRhythm(1/60,1);assert(Math.abs(off-b.lightPower)<.003,'disable starts from the existing brightness');
for(let i=0;i<90;i++)b.updateRhythm(1/60,1);assert(Math.abs(b.lightPower-1)<1e-8,'off returns to exact chosen ceiling');
b.state.breath=true;b.sample=0;for(let i=0;i<240;i++)b.updateRhythm(1/60,1);assert(Math.abs(b.lightPower-1)<1e-8,'silent playback never stays dim');
assert(app.includes('state.brightness / 80 * 1.20'),'higher light ceiling retained');
assert(app.includes('DiscoLight.finishRhythm(ctx,compositeRhythm,W,H)'),'Disco still applies the common rhythm after compositing');
console.log('PASS: 27 v113 waveform comparisons; smooth on/off, exact off/silent baseline, brighter ceiling and Disco common response.');
