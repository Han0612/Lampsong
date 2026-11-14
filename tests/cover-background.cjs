const fs=require('node:fs'),assert=require('node:assert/strict');
const C=new Function(fs.readFileSync('dist/cover-background.js','utf8')+';return CoverBackground')();const b=new C();
function pixels(w,h,fn){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;data.set([...fn(x,y),255],i);}return {data};}
const w=320,h=180;
for(const s of [0,24,60,120]){const p=pixels(w,h,()=>[111,111,111]);b.soften(p,w,h,s);assert(p.data.every((v,i)=>v===(i%4===3?255:111)),'flat color/alpha/edges '+s);}
const source=()=>pixels(w,h,(x,y)=>{const v=x<160?0:255;return[v,v,v];});
let last=-1;const times=[];
for(const s of [0,24,60,120]){const p=source(),start=performance.now();b.soften(p,w,h,s);times.push([s,+(performance.now()-start).toFixed(2)]);const near=p.data[(90*w+120)*4];assert(near>last,'blur must increasingly spread across edge: '+s);last=near;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,j=(y*w+w-x-1)*4;assert(Math.abs(p.data[i]+p.data[j]-255)<=1,'symmetric blur');}}
const narrow=pixels(1,3,()=>[45,45,45]);b.soften(narrow,1,3,120);assert.equal(narrow.data[0],45);
// Compositing stable frames or changing the dimmer must not rebuild the cache.
let builds=0;b.image={};b.to={};b.width=320;b.height=180;b.blur=24;b.cache=()=>{builds++;return {};};const g={save(){},restore(){},drawImage(){}};
b.draw(g,1600,900,.016,true,false,24,86);b.draw(g,1600,900,.016,true,false,24,0);assert.equal(builds,0);b.draw(g,1600,900,.016,true,false,120,86);assert.equal(builds,1);b.draw(g,1600,900,.016,true,false,120,20);assert.equal(builds,1);
assert(!fs.readFileSync('dist/cover-background.js','utf8').includes('g.filter='));
console.log('PASS: blur spread 0/24/60/120, symmetric clamped edges, opaque constant images, tiny images, cache reuse; milliseconds',times);
// Low values must not magnify into a strong blur; fractional kernels must
// distinguish formerly rounded levels while preserving the maximum range.
assert(b.blurSigma(3)<.5);assert.equal(b.blurSigma(0),0);assert.equal(b.blurSigma(120),120);
let previous=Infinity;
for(const value of [1,2,3,4,5,10,24,60,120]){
 const p=pixels(65,1,x=>{const v=x===32?255:0;return[v,v,v];});
 b.soften(p,65,1,b.blurSigma(value));
 const peak=p.data[32*4];assert(peak<previous,'distinct progressive low blur '+value);previous=peak;
}
const fractional=[.8,.9,1,1.1,1.2].map(s=>{const p=pixels(65,1,x=>{const v=x===32?255:0;return[v,v,v];});b.soften(p,65,1,s);return p.data[128];});
assert.equal(new Set(fractional).size,fractional.length,'fractional radii must not round to the same kernel');
console.log('PASS: fine low range, fractional kernels and preserved maximum');
