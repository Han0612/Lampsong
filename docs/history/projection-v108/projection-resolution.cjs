const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
function load(code){
 const context={Intl,document:{createElement(){
  const canvas={width:0,height:0};const paint={font:'',setTransform(...args){canvas.transform=args;},
   measureText:t=>({width:t.length*70,actualBoundingBoxAscent:72,actualBoundingBoxDescent:8,actualBoundingBoxLeft:0,actualBoundingBoxRight:t.length*70}),
   fillText(){},getImageData:()=>({data:new Uint8ClampedArray(canvas.width*canvas.height*4)}),
   createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>canvas.pixels=image.data};
  canvas.getContext=()=>paint;return canvas;
 }}};vm.createContext(context);vm.runInContext(code+';this.Projector=LetterProjector;',context);return new context.Projector();
}
const p=load(fs.readFileSync('dist/caster.js','utf8'));p.font='400 96px serif';
const low=p.dimensions('高清歌词',100,Infinity,1),high=p.dimensions('高清歌词',100,Infinity,4);
assert.equal(low.width,high.width);assert.equal(low.inkScale,high.inkScale);
assert.equal(high.mask.pixelWidth,low.mask.pixelWidth*4);assert.equal(high.mask.pixelHeight,low.mask.pixelHeight*4);
assert.equal(high.mask.bitmap.transform[0],4,'rasterize font outlines at higher scale');
const small=p.rasterSize(800,300,1),retina=p.rasterSize(800,300,2);
assert(retina.width>small.width&&retina.height===small.height);assert(retina.height>212);
const huge=p.rasterSize(15000,9000,3);assert(huge.width<=2048&&huge.height<=384&&huge.width*huge.height<=512000);
// The unsized bake still preserves the established blur/fade math.
const old=load(cp.execFileSync('git',['show','b21e5f7a810b9fe969adfb5bd0cdb9c96526b586:dist/caster.js'],{encoding:'utf8'}));
const mask={width:48,height:48,inkHeight:24,pad:12,pixels:new Uint8ClampedArray(48*48*4)};
for(let y=12;y<36;y++)for(let x=10;x<38;x++)if((x+y)%11<7)mask.pixels[(y*48+x)*4+3]=255;
for(const softness of [0,.6,1]){
 const a=old.bake(mask,80,.2,true,.14,.74,softness,45).texture;
 const b=p.bake(mask,80,.2,true,.14,.74,softness,45).texture;
 assert.deepEqual(Buffer.from(b.pixels),Buffer.from(a.pixels),'solid-mode shadow appearance unchanged');
}
const result=p.bake(mask,80,.2,false,.14,.74,.6,45,{width:512,height:512});
assert.equal(result.texture.width,512);assert.equal(result.texture.height,512);assert(result.highResolution);
assert(result.texture.pixels.some((value,i)=>i%4===3&&value>0));
const cache=new Map([['a',5],['b',6],['c',7]]);p.trimCache(cache,14,v=>v,5);assert.deepEqual([...cache.keys()],['b','c']);
const scaled={...high.mask,pixels:new Uint8ClampedArray(high.mask.pixels.length).fill(255)};
const contacts=p.contactMasks(scaled,[{x:12,foot:10},{x:100,foot:22}],30);
assert(contacts?.length===2);
assert(contacts.every(m=>m.sampleX===4&&m.pixelWidth===scaled.pixelWidth&&m.pixels.some(v=>v)));
console.log('PASS: original glyph geometry, true outline supersampling, DPR-dependent projection pixels, bounded allocations, unchanged solid-mode shadow pixels and cache limits.');
