const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
const messages=[];let worker,now=0;
const ctx={drawImage(){},clearRect(){}};
const canvas=()=>({width:1,height:1,getContext:()=>ctx});
const box={Worker:class{constructor(){worker=this;}postMessage(data){messages.push(data);}terminate(){}},OffscreenCanvas:class{},document:{createElement:canvas},createImageBitmap:async source=>({width:source.width,height:source.height,close(){this.closed=true;}}),performance:{now:()=>now},queueMicrotask,LetterProjector:class{spreadTextureSync(p){return p.texture;}}};
vm.createContext(box);vm.runInContext(fs.readFileSync('dist/projection-surfaces.js','utf8')+';this.Surfaces=ProjectionSurfaces;',box);
const s=new box.Surfaces(),part={texture:{width:1200,height:384}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
s.draw(part,.2);await tick();assert.equal(messages.filter(m=>m.type==='source').length,1);assert.equal(messages.filter(m=>m.type==='draw').length,1);
for(let i=0;i<100;i++)s.draw(part,.2+i*.001);await tick();assert.equal(messages.filter(m=>m.type==='draw').length,1,'one in-flight batch, no per-frame queue');
const texture={width:1536,height:384,close(){this.closed=true;}};
worker.onmessage({data:{results:[{id:1,expansion:.2,texture}]}});await tick();
const jobs=messages.filter(m=>m.type==='draw');assert.equal(jobs.length,2);assert(Math.abs(jobs[1].jobs[0].expansion-.299)<1e-9,'latest request wins');
assert.equal(s.draw(part,.299).texture,texture,'new result is presented immediately, never a two-contour blend');
const second={width:1536,height:384,close(){this.closed=true;}};
worker.onmessage({data:{results:[{id:1,expansion:.299,texture:second}]}});
assert(texture.closed,'release previous bitmap when replaced');
assert.equal(s.draw(part,.299).texture,second,'large geometry change also has exactly one contour');
now=100;assert.equal(s.draw(part,.299).texture,second);

let closed=false;worker.onmessage({data:{results:[{id:999,texture:{close(){closed=true;}}}]}});assert(closed,'discard output for an evicted row');
for(let i=0;i<15;i++)s.draw({texture:{width:300,height:96}},.1);await tick();assert.equal(s.entries.size,12);assert(messages.some(m=>m.type==='drop'));
s.fail();assert(s.failed);assert.equal(s.entries.size,0);assert.equal(s.draw(part,.4),null,'fallback available after worker failure');
console.log('PASS: latest-only background geometry, one in-flight batch, bounded row cache, stale bitmap disposal and failure fallback.');
})();
