const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('dist/app.js','utf8');
const box=vm.createContext({});
vm.runInContext(fs.readFileSync('dist/pendulum.js','utf8')+';this.B=SuspendedLamp;this.M=MusicSway;this.W=WindowSuspension;',box);
function simulate(tempo,strength,hz=120,energy=.5){
 const bob=new box.B(),hand=new box.M(),dt=1/hz;let max=0,active=0,lastBeat=-1,pos=0,neg=0,largestRun=0,run=0,mean=0;
 for(let i=0;i<60*hz;i++){
  const t=i*dt,beat=Math.floor(t*tempo/60),onset=beat!==lastBeat?.3:0;lastBeat=beat;
  const force=hand.advance(dt,{time:t,tempo,energy,onset,strength},bob);
  if(force){active++;run++;if(force>0)pos++;else neg++;}else run=0;
  largestRun=Math.max(largestRun,run);bob.advance(dt,force);max=Math.max(max,Math.abs(bob.angle));mean+=bob.angle;
  assert(Number.isFinite(bob.angle)&&Math.abs(bob.angle)<1.1,'bounded physical energy without position clamps');
 }
 return {bob,hand,max,active:active/(60*hz),pos,neg,longest:largestRun/hz,mean:mean/(60*hz)};
}
for(const tempo of [60,90,120,160]){
 const weak=simulate(tempo,25),strong=simulate(tempo,100);
 assert(strong.max>weak.max*2.5);assert(strong.max>.45,'strong swing is visible');
 assert(strong.pos>0&&strong.neg>0,'both directions get pushes');
 assert(Math.abs(strong.mean)<.06,'no persistent one-sided pull');
 assert(strong.active<.30&&strong.longest<=.16,'short pushes separated by free motion');
 const before=strong.bob.angle;strong.hand.reset();
 assert.equal(strong.bob.angle,before,'removing music never teleports the lamp');
 for(let i=0;i<30*240;i++)strong.bob.advance(1/240,0);
 assert(Math.abs(strong.bob.angle)+Math.abs(strong.bob.speed)<.01,'free motion settles naturally');
}
assert.equal(simulate(120,0).max,0);
assert.equal(simulate(120,100,120,0).max,0,'silent audio cannot produce fake beats');
assert(Math.abs(simulate(120,100,30).max-simulate(120,100,120).max)<.12,'frame-rate stable');
const win=new box.W(),bob=new box.B();bob.angle=.2;win.ay=5;win.ax=0;
assert.equal(Math.abs(win.torque(bob)),0,'vertical window travel cannot pull sideways');assert(win.torque(bob,'depth')<0);
win.ay=0;win.ax=-5;assert.equal(Math.abs(win.torque(bob,'depth')),0);assert(win.torque(bob)>0);
const body=app.slice(app.indexOf('  function updateRhythm('),app.indexOf('  function lampPose('));
const state={breath:true,rhythmSwing:false};
Object.assign(box,{pendulum:new box.B(),musicSway:new box.M(),state,reduce:{matches:false},musicActive:()=>true,audio:{currentTime:1},auditionTempo:()=>90,analyser:{fftSize:1024,getByteFrequencyData:s=>s.fill(110)},audioContext:{sampleRate:48000},spectrum:new Uint8Array(512),scene:{lightContrast:83,rhythmStrength:100},rhythmLightEnabled:false,rhythmLightElapsed:.45,rhythmLightFrom:1,time:1,beatLevel:0,pulse:0,lastAudioEnergy:0,lightPower:1});
vm.runInContext(body,box);
assert.equal(box.updateRhythm(.016,1),0);assert(box.lightPower<1);
state.rhythmSwing=true;state.breath=false;box.lightPower=1;box.lastAudioEnergy=0;
assert.notEqual(box.updateRhythm(.016,1),0);assert.equal(box.lightPower,1);
box.musicActive=()=>false;assert.equal(box.updateRhythm(.016,1),0);
const nodes=new Map();box.$=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,dispatchEvent(){}});return nodes.get(id);};
box.foreAft=new box.B();box.toast=()=>{};box.Event=class{};
vm.runInContext('let manualLamp=false,lineClock=0;'+app.slice(app.indexOf("  ['protect','dust'"),app.indexOf("  $('reset').onclick")),box);
box.pendulum.speed=.5;box.$('settle').onclick();assert.equal(state.rhythmSwing,false);assert.equal(box.pendulum.calming,true);assert.equal(box.pendulum.speed,.5);
box.$('rhythmSwing').checked=true;box.$('rhythmSwing').onchange();assert.equal(box.pendulum.calming,false);assert.equal(box.pendulum.stopped,false);
console.log('PASS: audible short alternating pushes, strength, silence, free decay, frame-rate stability, independent axes, light independence, stop/restart.');

// Silence restores the exact chosen baseline, even when rhythm remains enabled.
box.musicActive=()=>true;state.breath=true;state.rhythmSwing=false;
box.analyser.getByteFrequencyData=s=>s.fill(0);box.pulse=0;box.lastAudioEnergy=0;box.lightPower=.5;
for(let i=0;i<360;i++){box.audio.currentTime+=1/60;box.updateRhythm(1/60,.83);assert(box.lightPower<=.83+1e-10);}
assert(Math.abs(box.lightPower-.83)<1e-8);
console.log('PASS: enabled rhythm returns to selected baseline during silence without a permanent dim offset or brightness overshoot.');

box.analyser.getByteFrequencyData=s=>s.fill(255);box.lightPower=1;box.pulse=0;box.lastAudioEnergy=0;
for(let i=0;i<180;i++){box.audio.currentTime+=1/60;box.time+=1/60;box.updateRhythm(1/60,1);assert(box.lightPower>=.425&&box.lightPower<=1,'v113 dynamic range and unchanged brightness ceiling');}
console.log('PASS: restored v113 range stays within the selected brightness ceiling.');
