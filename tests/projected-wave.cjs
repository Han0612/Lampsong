const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('dist/fonts/fz-vdl-jianzhu-sb.ttf','WaveTest');
let allocations=0;const box={Intl,document:{createElement(){allocations++;return createCanvas(1,1);}}};vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/caster.js','utf8')+';this.p=new LetterProjector();',box);
const p=box.p;p.font='700 96px WaveTest';p.tracking=8;let bakes=0;const bake=p.bake;p.bake=function(...a){bakes++;return bake.apply(this,a);};
const canvas=createCanvas(1000,650),ctx=canvas.getContext('2d'),source={x:480,y:30,heightScale:1};
for(const mode of ['pure','combined'])for(const text of ['微光里，慢慢唱','WHERE I’M GOING']){
 const bodyHeight=90,dimensions=p.dimensions(text,bodyHeight,Infinity),wave={elapsed:0,amplitude:8,duration:6.2,range:3,softness:70};
 const layout={mode,bodyHeight,dimensions,anchorHeight:45,bakeMaxWidth:Infinity,referenceDistance:200,plateLength:170,anchorRatio:170/370,opacity:.97,edge:1,tone:0,fanReferenceWidth:650,finish:'custom',faceColor:'#f2eddd',illumination:1,shade:{projection:'perspective',contact:0,fan:100,lean:0,trail:100,density:96,softness:58,blurStart:80,blurSpan:100,fadeStrength:45},wave};
 const row={text,rootY:200,layout};
 function draw(){ctx.fillStyle='#9da6a0';ctx.fillRect(0,0,1000,650);p.drawRows(ctx,[row],500,source,1);}
 const pixels=()=>Buffer.from(ctx.getImageData(0,0,1000,650).data);
 layout.wave=null;draw();const original=pixels();layout.wave=wave;draw();assert(pixels().equals(original),'start pixels exact');
 wave.elapsed=wave.duration;draw();assert(pixels().equals(original),'finish pixels exact');
 wave.elapsed=3.1;draw();assert(!pixels().equals(original),'wave affects actual rendered pixels');const frozen=pixels();draw();assert(pixels().equals(frozen));
 const warm=bakes,alloc=allocations,start=performance.now();
 for(let i=1;i<=60;i++){wave.elapsed=i*6.2/61;draw();ctx.getImageData(0,0,1,1);}
 assert.equal(bakes,warm,'no per-frame ray tracing');assert.equal(allocations,alloc,'no per-frame canvas allocations');
 const waveMs=(performance.now()-start)/60;layout.wave=null;const staticStart=performance.now();for(let i=0;i<30;i++){draw();ctx.getImageData(0,0,1,1);}const staticMs=(performance.now()-staticStart)/30;layout.wave=wave;
 console.log(`${mode} ${text}: ${waveMs.toFixed(1)} ms wave / ${staticMs.toFixed(1)} ms original/native frame`);
 // The wave texture retains its horizontal scale and a transparent reserve below.
 wave.elapsed=3.1;const waved=p.projectedWaveTexture(canvas,600,220,layout);
 assert.equal(waved.texture.width,canvas.width);assert(waved.height>=220);if(mode==='pure')assert(waved.offsetY<0,'reserve allows upward lift without clipping');
 if(mode==='combined'){
  const calls=[];p.drawProjectedWaveFace({drawImage(...a){calls.push(a);}},{layout,surface:canvas,x:0,y:200,width:600,height:60});
  assert(calls.some(a=>a[6]<199));assert(calls.every(a=>a[8]===60));assert(Math.abs(calls.reduce((s,a)=>s+a[7],0)-600)<1e-6);
 }
}
{
 const dimensions=p.dimensions('LIGHT WAVE',90,Infinity),layout={mode:'pure',dimensions,bodyHeight:90,wave:{elapsed:3.1,amplitude:18,duration:6.2,range:3,softness:70}};
 const solid=createCanvas(641,318),g=solid.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,641,318);
 const output=p.projectedWaveTexture(solid,537.7,220,layout),pixels=output.texture.getContext('2d').getImageData(0,100,641,1).data;
 for(let i=0;i<641;i++)assert.equal(pixels[i*4+3],255,'integer-column composition has no transparent stitch lines');
}
console.log('PASS: seam-free alpha across nondivisible texture widths.');
console.log('PASS: 240 projected/solid wave frames; exact rest endpoints, upward pure wave and fixed face size, no new bakes/canvases after warm-up.');

// Pure projection translates each column upward without changing its height.
{
 const layout={mode:'pure',dimensions:p.dimensions('UPWARD WAVE',90,Infinity),bodyHeight:90,wave:{elapsed:3.1,amplitude:18,duration:6.2,range:3,softness:70}};
 const stripe=createCanvas(641,220),g=stripe.getContext('2d');g.fillStyle='black';g.fillRect(0,90,641,20);
 const result=p.projectedWaveTexture(stripe,641,220,layout),pixels=result.texture.getContext('2d').getImageData(0,0,641,result.texture.height).data;let top=Infinity;
 for(let x=0;x<641;x++){let sum=0,first=-1;for(let y=0;y<result.texture.height;y++){const alpha=pixels[(y*641+x)*4+3];sum+=alpha;if(alpha>128&&first<0)first=y;}assert(Math.abs(sum/255-20)<.1,'no vertical glyph stretch');top=Math.min(top,first+result.offsetY);}
 assert(top<80,'wave raises silhouette by visible amount');
 console.log('PASS: pure wave lifts upward, maintains column height and retains all alpha.');
}
