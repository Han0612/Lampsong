const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const b={Intl,document:{createElement:()=>createCanvas(1,1)}};vm.createContext(b);
vm.runInContext(fs.readFileSync('dist/caster.js','utf8')+';this.p=new LetterProjector();',b);
const p=b.p;p.font='700 96px sans-serif';p.tracking=6;
let oldError=0,newError=0,samples=0;
for(const width of [641,1365,2048])for(const elapsed of [1.4,2.9,4.6]){
 const bodyHeight=160,layout={mode:'pure',bodyHeight,dimensions:p.dimensions('WAVE',bodyHeight,Infinity),wave:{elapsed,amplitude:18,duration:6.2,range:2,softness:70}};
 const texture=createCanvas(width,220),g=texture.getContext('2d');g.fillStyle='black';g.fillRect(0,100,width,24);
 const sequence=p.projectedWaveSequence(layout),shift=bodyHeight*.18*1.8;
 const result=p.projectedWaveTexture(texture,width,220,layout),ctx=result.texture.getContext('2d'),pixels=ctx.getImageData(0,0,width,result.texture.height).data;
 const count=Math.min(180,width,Math.max(48,sequence.segments.length*6));
 let strip=0;
 for(let x=0;x<width;x++){
  while(x>=Math.round((strip+1)/count*width))strip++;
  let mass=0,weighted=0;for(let y=0;y<result.texture.height;y++){const a=pixels[(y*width+x)*4+3]/255;mass+=a;weighted+=a*(y+.5);}
  assert(Math.abs(mass-24)<.12,'no seams, duplicate alpha or stretching');
  const ideal=112-shift*p.projectedWaveSample(layout,sequence,(x+.5)/width);
  const start=Math.round(strip/count*width),end=Math.round((strip+1)/count*width);
  const old=112-shift*p.projectedWaveSample(layout,sequence,(start+end)/2/width);
  oldError+=(old-ideal)**2;newError+=(weighted/mass+result.offsetY-ideal)**2;samples++;
 }
}
const oldRms=Math.sqrt(oldError/samples),newRms=Math.sqrt(newError/samples);
assert(newRms<oldRms*.3,`continuous edges: ${newRms} versus ${oldRms}`);
assert(newRms<.12,'subpixel profile accuracy');
console.log(`PASS: 9 width/phase cases, edge displacement RMS ${oldRms.toFixed(3)} → ${newRms.toFixed(3)} px, alpha preserved without extra strips.`);
