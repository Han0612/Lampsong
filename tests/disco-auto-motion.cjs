const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={};vm.createContext(box);vm.runInContext(fs.readFileSync('dist/disco-light.js','utf8')+';this.D=DiscoLight;',box);
const make=()=>Object.assign(Object.create(box.D.prototype),{phase:0,velocity:0});
function simulate(tempo,hz){
 const lamp=make(),dt=1/hz,period=60/tempo;let min=Infinity,max=0,maxJump=0,angle=0;
 for(let i=0;i<8*hz;i++){
  const time=i/hz,beat=Math.exp(-(time%period)/.16);
  const op=box.D.operatingPoint({automatic:true,playing:true,tempo,beat});
  const old=lamp.velocity,phase=lamp.phase;lamp.advance(dt,true,op.speed,op);
  angle+=(lamp.phase-phase+Math.PI*2)%(Math.PI*2);
  if(time>2){min=Math.min(min,lamp.velocity);max=Math.max(max,lamp.velocity);maxJump=Math.max(maxJump,Math.abs(lamp.velocity-old));}
 }
 assert(max/min>2.3,'obvious fast/slow response even at '+tempo+' BPM');
 assert(max>.60,'strong beats noticeably accelerate');assert(max<=1.35);assert(maxJump<.55,'no speed snap');
 return {lamp,min,max,angle};
}
for(const tempo of [70,108,150]){
 const sixty=simulate(tempo,60),thirty=simulate(tempo,30),high=simulate(tempo,120);
 assert(Math.abs(thirty.angle-high.angle)/high.angle<.13,'consistent travel across frame rates');
 const light=sixty.lamp,before=light.velocity;light.advance(1/60,false,70,{rhythm:true,beat:1});
 assert(light.velocity<before&&light.velocity>0,'rotation off has inertia');
 console.log(`${tempo} BPM: ${sixty.min.toFixed(2)}–${sixty.max.toFixed(2)} rad/s, ${(sixty.max/sixty.min).toFixed(1)}× contrast`);
}
const idle=make();for(let i=0;i<300;i++)idle.advance(1/60,true,box.D.operatingPoint({automatic:true,playing:false}).speed);
assert(Math.abs(idle.velocity-.087)<.001,'idle speed retained');
const app=fs.readFileSync('dist/app.js','utf8');assert.equal((app.match(/discoLight\.advance\(/g)||[]).length,1);assert(app.indexOf('discoLight.advance(')<app.indexOf('renderScene(dt,stamp)',app.indexOf('  function frame(stamp)')),'all geometry uses the new phase in the same frame');
console.log('PASS: clear automatic speed changes, inertial stops, frame-rate stability, common phase, unchanged slow idle.');
