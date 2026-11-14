const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const b={};vm.createContext(b);vm.runInContext(fs.readFileSync('dist/disco-light.js','utf8')+';this.D=DiscoLight;',b);
function coast(hz){
 const d=Object.assign(Object.create(b.D.prototype),{phase:0,velocity:1});let old=1,total=0;
 for(let i=0;i<hz*12;i++){
  const before=d.phase;d.coast(1/hz);total+=(d.phase-before+Math.PI*2)%(Math.PI*2);
  assert(d.velocity<=old);if(i===0)assert(d.velocity>.95,'no instant stop');old=d.velocity;
 }
 assert.equal(d.velocity,0);const stopped=d.phase;d.coast(1/hz);assert.equal(d.phase,stopped);
 d.advance(1/hz,true,70);assert(d.velocity>0);assert(d.phase>stopped&&d.phase-stopped<.01,'resume from stopped angle without phase reset');
 return total;
}
const amounts=[30,60,120].map(coast);assert(Math.max(...amounts)-Math.min(...amounts)<.001);
const d=Object.assign(Object.create(b.D.prototype),{phase:2,velocity:.8});d.coast(0);assert.equal(d.phase,2);assert.equal(d.velocity,.8);d.coast(.1,{reduced:true});assert.equal(d.velocity,0);
console.log('PASS: off rotation decays monotonically to zero, retains phase on resume, 30/60/120 Hz travel matches, hidden/reduced motion respected.');
