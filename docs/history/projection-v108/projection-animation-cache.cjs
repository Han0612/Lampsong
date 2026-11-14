const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sent=[];let worker;
class FakeWorker{constructor(){worker=this;}postMessage(data){sent.push(data);}terminate(){}}
const box={Intl,Worker:FakeWorker,OffscreenCanvas:function(){}};
vm.createContext(box);vm.runInContext(fs.readFileSync('dist/caster.js','utf8')+';this.Projector=LetterProjector;',box);
const p=new box.Projector();let bakes=0;
p.bake=(mask,width,ratio,combined,start,span,softness,fade,raster)=>{
  bakes++;return {texture:{...raster},fullWidth:width*1.03,highResolution:true};
};p.spreadTexture=()=>({});
const ctx={save(){},restore(){},translate(){},transform(){},drawImage(){}};
const mask={width:400,height:120,inkHeight:96,referenceHeight:96,pad:12,pixels:new Uint8ClampedArray(400*120*4),sampleX:2};
const base={mode:'pure',dimensions:{mask,width:700,inkScale:1},anchorHeight:130,bakeMaxWidth:Infinity,anchorRatio:.4,
  shade:{softness:58,projection:'perspective',trail:115,lean:0,contact:0,density:90,fan:165,blurStart:14,blurSpan:74,fadeStrength:70},
  opacity:1,bodyHeight:130,referenceDistance:270,plateLength:240,fanReferenceWidth:800,pixelRatio:2,tone:0};
for(let frame=0;frame<180;frame++)for(let row=0;row<4;row++){
  const layout={...base,mode:row<2?'combined':'pure',rasterScale:900/(650+frame),dimensions:{...base.dimensions,width:650+frame}};
  p.drawShadow(ctx,'ROW '+row,700,120+row*160+frame,{x:700+frame,y:0,heightScale:1+frame/200},layout);
}
assert.equal(bakes,0,'no low-quality preview is baked or painted');
assert.equal(p.cache.size,4,'moving rows retain four stable final-field requests');
assert.equal(sent.length,1,'only one background job may run at a time');
assert(sent[0].raster.width>=1200,'use displayed size instead of the small typesetting anchor');
assert.equal(p.pending.size,4);
assert.notEqual(sent[0].masks[0].pixels,mask.pixels,'worker owns a copy, not live face pixels');
const response=(request)=>({data:{id:request.id,parts:[{texture:{width:1200,height:320,close(){}},heightRatio:1,fullWidth:600,highResolution:true}]}});
worker.onmessage(response(sent[0]));
assert.equal(sent.length,2);assert([...p.cache.values()].some(layer=>layer.ready));
let staleClosed=false;const request=sent[1];p.cache.clear();
worker.onmessage({data:{id:request.id,parts:[{texture:{close(){staleClosed=true;}}}]}});
assert(staleClosed,'stale worker output cannot resurrect cleared font or setting caches');
assert.equal(p.pending.size,0,'skip queued work whose cache entry was invalidated');
const beforeResize=p.cache.size;
for(const width of [700,1400,1400])p.drawShadow(ctx,'RESIZE',700,200,{x:700,y:0,heightScale:1},
  {...base,dimensions:{...base.dimensions,width}});
assert.equal(p.cache.size-beforeResize,2,'a deliberate font-size increase requests a sharper final raster once');
console.log('PASS: four moving rows reuse caches for 180 frames, serialized worker jobs, intact face pixels, discarded stale output.');
