// Pixel-level regression checks. The renderer is executed with a real Canvas
// backend; no source-text assertion can detect a midpoint silhouette jump.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
function makeCanvas(w=1,h=1){const c=createCanvas(w,h);c.close=()=>{};c.transferToImageBitmap=()=>{const out=makeCanvas(w,h);out.getContext('2d').drawImage(c,0,0);return out;};return c;}
const worker=new Function('OffscreenCanvas','postMessage','let onmessage;'+fs.readFileSync('dist/cat-motion-worker.js','utf8')+';return {render:draw,sources,onmessage};')(makeCanvas,()=>{});
function buffer(b){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}
const pixels=c=>c.getContext('2d').getImageData(0,0,288,192).data;
function difference(a,b){let sum=0;for(let i=3;i<a.length;i+=4)sum+=Math.abs(a[i]-b[i]);return sum/(a.length/4*255);}
(async()=>{
 let clips=0,intervals=0,worstMidpoint=0,worstBoundary=0;
 for(const file of fs.readdirSync('dist/cat-motion-flow').filter(f=>f.endsWith('.bin'))){
  const key=file.slice(0,-4),im=await loadImage('dist/cat-motion/'+key+'.webp');im.close=()=>{};
  worker.onmessage({data:{type:'source',key,texture:im,vectors:buffer(fs.readFileSync('dist/cat-motion-flow/'+file))}});
  const src=worker.sources.get(key),render=frame=>pixels(worker.render(src,{key,frame,time:1.25,darkness:100}).texture);
  for(let frame=0;frame<src.count;frame++){
   const mid=difference(render(frame+.499),render(frame+.501));worstMidpoint=Math.max(worstMidpoint,mid);
   assert.ok(mid<.001,`${key} frame ${frame}: midpoint jumped ${mid}`);
   const boundary=difference(render(frame+.999),render(src.next[frame]));worstBoundary=Math.max(worstBoundary,boundary);
   assert.ok(boundary<.001,`${key} frame ${frame}: endpoint jumped ${boundary}`);intervals++;
  }
  worker.sources.clear();clips++;
 }
 const doc={createElement:()=>makeCanvas()};
 const Projection=new Function('document',fs.readFileSync('dist/cat-paw.js','utf8')+';return CatShadowProjection;')(doc);
 const projection=new Projection(),tile=makeCanvas(288,192),t=tile.getContext('2d');t.fillStyle='#000';t.fillRect(95,20,85,140);
 const target=makeCanvas(800,600),g=target.getContext('2d');
 projection.draw(g,tile,{index:1,w:288,h:192,sx:0,sy:0},{anchorX:0,anchorY:0},.35,{vertical:true,stretch:1.1,shear:.10,softness:.02,ax:768,ay:1000},1);
 const shadow=projection.surface,s=shadow.getContext('2d').getImageData(0,0,shadow.width,shadow.height),levels=new Set();
 const y=Math.floor(shadow.height*.38);for(let x=0;x<shadow.width;x++){const a=s.data[(y*shadow.width+x)*4+3];if(a>0&&a<255)levels.add(a);}
 assert.ok(levels.size>20,`penumbra has only ${levels.size} alpha levels`);
 console.log(JSON.stringify({pass:true,clips,intervals,worstMidpointAlphaChange:worstMidpoint,worstEndpointAlphaChange:worstBoundary,penumbraAlphaLevels:levels.size}));
})().catch(e=>{console.error(e);process.exitCode=1;});
