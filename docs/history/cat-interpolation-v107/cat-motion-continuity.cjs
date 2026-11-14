const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=process.cwd();const c={console,Math,catRange:(a,b)=>(a+b)/2};vm.createContext(c);
vm.runInContext(fs.readFileSync('dist/cat-visit.js','utf8')+fs.readFileSync('dist/cat-exit-meta.js','utf8')+fs.readFileSync('dist/cat-exit.js','utf8')+';globalThis.Dep=CatDeparture;globalThis.Jump=CatJump;',c);
for(const flip of [-1,1]){
 const d=new c.Dep('upper',{x:500,y:250,floor:300,scale:.2},35,flip);let previous,airStarted=false,frames=new Set();
 for(let i=0;i<240&&!d.done;i++){const p=d.sample(1/60,35,1000,700);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));frames.add(Math.round(p.frame*6));if(d.age>d.turn+.27){airStarted=true;if(previous)assert.ok(p.y>previous.y,'downward departure must descend after takeoff');}previous=p;}
 assert.ok(d.done,'upper jump must clear viewport');assert.ok(airStarted);assert.ok(previous.y>700);assert.ok(frames.size>30,'turn and jump must expose sub-frame poses');assert.ok(previous.frame<=15);
}
for(const group of ['low','sit']){
 const d=new c.Dep(group,{x:500,y:250,floor:300,scale:.2},35,1);let sub=0;for(let i=0;i<200;i++){const p=d.sample(1/60,35,1000,700);if(p.frame%1)sub++;assert.ok(p.frame<16);assert.ok(Math.abs(p.y+p.foot*p.scale-300)<1e-6,'support paw remains on floor');}assert.ok(sub>150);
}
const files=fs.readdirSync('dist/cat-motion-flow').filter(f=>f.endsWith('.bin'));assert.equal(files.length,27);
for(const f of files){const data=fs.readFileSync('dist/cat-motion-flow/'+f);assert.equal(data.toString('ascii',0,4),'CMF2');const gw=data.readUInt16LE(4),gh=data.readUInt16LE(6),n=data.readUInt16LE(8);assert.equal(data.length,12+n+n%2+n*4+n*gw*gh*4*2);for(let i=0;i<n;i++)assert.ok(data[12+i]<n);}
// Production preloads use blob URLs. A stable clip key must survive that path.
assert.match(fs.readFileSync('dist/cat-paw.js','utf8'),/image\.catMotionKey=file\.startsWith/);
assert.match(fs.readFileSync('dist/cat-motion-smooth.js','utf8'),/image\.catMotionKey\|\|image\.src/);
assert.doesNotMatch(fs.readFileSync('dist/cat-motion-worker.js','utf8'),/globalAlpha|globalCompositeOperation/);
console.log('PASS: downward full-body exit, 60 Hz sub-frame turn/gait, planted support paw, 27 bounded vector atlases, blob keys, single reconstructed contour.');
