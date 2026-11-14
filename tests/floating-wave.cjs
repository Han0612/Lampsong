const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('dist/fonts/fz-vdl-jianzhu-sb.ttf','WaveTest');
let reads=0,allocations=0;
const box={Intl,document:{createElement(){allocations++;return createCanvas(1,1);}}};vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/caster.js','utf8')+';this.p=new LetterProjector();this.opts={...floatingDefaults};',box);
const {p,opts}=box;p.font='700 96px WaveTest';p.tracking=8;
let blurCount=0;const blur=p.floatingBlur.bind(p);p.floatingBlur=(...a)=>{blurCount++;return blur(...a);};
const canvas=createCanvas(1000,600),ctx=canvas.getContext('2d'),source={x:480,y:30,slope:.08,heightScale:1};
for(const text of ['微光里，慢慢唱','WHERE I’M GOING','cafe\u0301']){
 const dimensions=p.dimensions(text,90,Infinity),mask=dimensions.mask,seq=p.waveSegments(mask);
 const assembled=createCanvas(mask.bitmap.width,mask.bitmap.height),g=assembled.getContext('2d');
 for(const item of seq.segments)g.drawImage(item.mask.bitmap,Math.round(item.start*mask.sampleX),0);
 assert.deepEqual(g.getImageData(0,0,assembled.width,assembled.height).data,mask.pixels,'glyph crops preserve all original font pixels');
 const wave={elapsed:0,amplitude:7,duration:6.2};
 const row={text,rootY:200,layout:{dimensions,floatPrefs:opts,bodyHeight:90,edge:1,illumination:1,faceColor:'#eee7d7',wave}};
 const start=p.floatingWaveRows([row],500,source,600),restY=start.map(j=>j.layout.waveGeometry.y);
 let moved=false,last=restY;
 function draw(){ctx.fillStyle='#7b746d';ctx.fillRect(0,0,1000,600);p.drawFloating(ctx,[row],500,source,1);}
 draw();const warm=blurCount,allocated=allocations;
 for(let i=1;i<=400;i++){
  wave.elapsed=i/60;const jobs=p.floatingWaveRows([row],500,source,600);
  jobs.forEach((j,k)=>{const dy=restY[k]-j.layout.waveGeometry.y;assert(dy>=-1e-9&&dy<=6.3+1e-8);assert(Math.abs(j.layout.waveGeometry.y-last[k])<1.2,'no vertical jumps at 60Hz');if(dy>1)moved=true;assert.equal(j.layout.waveGeometry.x,start[k].layout.waveGeometry.x);assert.equal(j.layout.waveGeometry.width,start[k].layout.waveGeometry.width);});
  last=jobs.map(j=>j.layout.waveGeometry.y);draw();
 }
 assert(moved);assert.deepEqual(last,restY,'letters settle back to exact baseline');assert.equal(blurCount,warm,'no shadow re-bake during animation');assert.equal(allocations,allocated,'no canvas allocation after warm-up');
 const at=1.7;wave.elapsed=at;draw();const frozen=ctx.getImageData(0,0,1000,600).data;draw();assert.deepEqual(ctx.getImageData(0,0,1000,600).data,frozen,'frozen clock yields identical scene');
}
assert.equal(p.waveSegments(p.mask('cafe\u0301')).segments.length,4,'combining accent stays with letter');
console.log('PASS: Chinese/English/combining grapheme crops preserve exact typesetting; 1200 frames ease within 7% height, return to baseline, freeze identically; no hot-loop blur bakes or canvas allocation.');
// Adjacent letters must not cast dark silhouettes through a fading wave row.
{
 const text='微光 WAVE',dimensions=p.dimensions(text,90,Infinity),wave={elapsed:1.7,amplitude:7,duration:6.2};
 const row={text,rootY:200,layout:{dimensions,floatPrefs:{...opts,floatGap:0,floatOffsetX:0,floatOffsetY:0,floatSoftness:55,floatOpacity:100,floatThickness:25},bodyHeight:90,edge:1,illumination:1,faceColor:'#eee7d7',wave}};
 const sample=(edge,shadow,bg)=>{ctx.clearRect(0,0,1000,600);if(bg!==null){ctx.fillStyle=`rgb(${bg},${bg},${bg})`;ctx.fillRect(0,0,1000,600);}row.layout.edge=edge;row.layout.showShadow=shadow;p.drawFloating(ctx,[row],500,source,1);return ctx.getImageData(0,0,1000,600).data;};
 for(const elapsed of [.8,1.7,3.4]){wave.elapsed=elapsed;const body=sample(1,false,null),full=sample(1,true,120);for(const edge of [.75,.5,.2]){const faded=sample(edge,true,120);let count=0;for(let i=0;i<body.length;i+=4){if(body[i+3]!==255||body[i]<200||[-4000,4000,-4,4,-8000,8000,-8,8].some(d=>body[i+d+3]!==255))continue;count++;for(let k=0;k<3;k++)assert(Math.abs(faded[i+k]-(full[i+k]*edge+120*(1-edge)))<=3,'neighbor shadows cannot bleed through fading face');}assert(count>100);}}
 console.log('PASS: wave row fade masks adjacent-letter shadows; 9 actual-pixel fade/lift combinations preserve the face color.');
}
// A single crest affects neighbouring letters symmetrically with decreasing lift.
{
 const values=Array.from({length:9},(_,i)=>p.wavePulse(3.1,i,1,9,6.2,3,70));
 assert.equal(values[4],1);assert(values[3]>.65&&values[3]<.85);assert(values[2]>.15&&values[2]<.3);assert.equal(values[1],0);
 for(let i=0;i<4;i++){assert(Math.abs(values[i]-values[8-i])<1e-12);assert(values[i]<=values[i+1]);}
 assert(p.wavePulse(3.1,1,1,9,6.2,5,70)>0,'wider support reaches more letters');
 assert(p.wavePulse(3.1,3,1,9,6.2,3,100)>p.wavePulse(3.1,3,1,9,6.2,3,0),'softer setting spreads the rise and fall');
 for(const range of [1,3,6])for(const softness of [0,70,100])for(const speed of [50,100,180]){
  const duration=6.2*100/speed;let last=0,falling=false,peak=0;
  for(let frame=0;frame<=600;frame++){
   const elapsed=duration*frame/600,value=p.wavePulse(elapsed,4,1,9,duration,range,softness);
   assert(value>=0&&value<=1);if(value<last-1e-9)falling=true;if(falling)assert(value<=last+1e-9,'one smooth crest, no secondary bounces');
   peak=Math.max(peak,value);last=value;
  }
  assert(peak>.999);assert.equal(last,0);assert.equal(p.wavePulse(1e-6,0,1,9,duration,range,softness),0);
  assert.equal(p.wavePulse(duration-1e-6,8,1,9,duration,range,softness),0);
 }
 console.log('PASS: one symmetric wave crest, distance falloff, adjustable reach/softness; 27 range/softness/speed sweeps start and end at rest without rebound.');
}
