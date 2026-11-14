const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('dist/fonts/fz-vdl-jianzhu-sb.ttf','FloatingTest');
const box={document:{createElement:()=>createCanvas(1,1)},Intl};vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/caster.js','utf8')+'\nthis.P=LetterProjector;this.opts={...floatingDefaults};',box);
const p=new box.P();p.font='700 96px FloatingTest';p.tracking=3;
const opts={...box.opts},dimensions=p.dimensions('FLOATING',100,Infinity),mask=dimensions.mask;
const layout={dimensions,floatPrefs:opts,bodyHeight:100,edge:1,illumination:.7,faceColor:'#eee7d7'};
const source={x:450,y:50,slope:0,heightScale:1};
const geo=()=>p.floatingGeometry(layout,450,250,source,600);
const base=geo();opts.floatOffsetX=77;opts.floatOffsetY=-32;let g=geo();assert.equal(g.shadowX-base.shadowX,77);assert.equal(g.shadowY-base.shadowY,-32);assert.equal(g.width,base.width);assert.equal(g.h,base.h);
opts.floatScale=200;g=geo();assert.equal(g.shadowWidth,base.shadowWidth*2);assert.equal(g.shadowHeight,base.shadowHeight*2);opts.floatWidth=50;opts.floatHeight=150;g=geo();assert.equal(g.shadowWidth,base.shadowWidth);assert.equal(g.shadowHeight,base.shadowHeight*3);
opts.floatFollow=0;const fixed=geo();Object.assign(source,{x:20,y:140,slope:.8,heightScale:1.5});assert.deepEqual(geo(),fixed,'follow=0 locks geometry despite moving light');
opts.floatFollow=100;assert.notEqual(geo().shadowX,fixed.shadowX);opts.floatLightResponse=0;assert.equal(geo().alpha,.58);opts.floatLightResponse=100;assert.equal(geo().alpha,.58*.7);
Object.assign(opts,box.opts);
const original=p.floatingShadow(mask,opts);for(let i=0;i<120;i++){source.slope=Math.sin(i);geo();assert.equal(p.floatingShadow(mask,opts),original,'sway never rebakes shadow');}
const alpha=surface=>{const d=surface.getContext('2d').getImageData(0,0,surface.width,surface.height).data;let sum=0;for(let i=3;i<d.length;i+=4)sum+=d[i];return sum;};
opts.floatFade=100;opts.floatFadeStart=0;opts.floatFadeSpan=100;const faded=p.floatingShadow(mask,opts);assert(alpha(faded.surface)<alpha(original.surface)*.8,'fade visibly reduces coverage');
Object.assign(opts,box.opts,{floatShadowColor:'#902040',floatSoftness:0});const tinted=p.floatingShadow(mask,opts);const pixels=tinted.surface.getContext('2d').getImageData(0,0,tinted.surface.width,tinted.surface.height).data;let colorChecked=false;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>250){assert(pixels[i]>pixels[i+1]*3);colorChecked=true;break;}assert(colorChecked,'colored shadow rendered');
Object.assign(opts,box.opts,{floatBlurEnd:75,floatBlurStart:0,floatBlurSpan:100,floatFan:100});const soft=p.floatingShadow(mask,opts);assert(alpha(soft.surface)>0);assert.equal(p.floatingShadow(mask,opts),soft);
// The padded texture must retain all blur rather than clip at a rectangular edge.
const data=soft.surface.getContext('2d').getImageData(0,0,soft.surface.width,soft.surface.height).data;for(let x=0;x<soft.surface.width;x++){assert(data[x*4+3]<=1);assert(data[((soft.surface.height-1)*soft.surface.width+x)*4+3]<=1);}
const canvas=createCanvas(1000,700),ctx=canvas.getContext('2d');p.drawFloating(ctx,[{rootY:300,layout}],500,source,1);assert(alpha(canvas)>0);
Object.assign(opts,box.opts,{floatThickness:0,floatOpacity:0,floatHighlight:0});const face=p.floatingFace(mask,'#eee7d7',1,opts);assert(face.front.width===mask.bitmap.width);
const html=fs.readFileSync('dist/index.html','utf8');for(const key of Object.keys(box.opts)){assert(html.includes('id="'+key+'"'));if(typeof opts[key]!=='boolean')assert(html.includes('id="'+key+'Out"'));}
assert(/class="floating-advanced"><summary>高级投影/.test(html),'advanced starts collapsed');
console.log('PASS: 24 controls, fixed glyph geometry, independent position/scale, light-follow zero, opacity response, stable motion cache, fade/color/blur pixels and padding.');
// Regression: verify pixels, not just that a texture exists. Exercise the
// filter-less path too, because a writable `filter` property proves nothing.
const rectangle=createCanvas(160,160),rc=rectangle.getContext('2d');rc.fillRect(60,60,40,40);
for(const native of [true,false]){
  p.floatNativeBlur=native;
  const clear=p.floatingBlur(rectangle,0),soft=p.floatingBlur(rectangle,12);
  const at=(c,x,y)=>c.getContext('2d').getImageData(x,y,1,1).data[3];
  assert.equal(at(clear,50,80),0);assert(at(soft,50,80)>10,'blur expands actual alpha outside the silhouette');
  assert(at(soft,80,80)<at(clear,80,80),'blur softens solid core');
}
const solid=createCanvas(240,100);solid.getContext('2d').fillRect(0,0,240,100);
const flat={bitmap:solid,width:240,height:100,inkHeight:100,pad:0};
const halfMass=(texture)=>{const d=texture.surface.getContext('2d').getImageData(0,0,texture.surface.width,texture.surface.height).data,w=texture.surface.width;let l=0,r=0;for(let i=3;i<d.length;i+=4){if(((i-3)/4)%w<w/2)l+=d[i];else r+=d[i];}return [l,r];};
Object.assign(opts,box.opts,{floatSoftness:0,floatFade:100,floatFadeStart:0,floatFadeSpan:100,floatFadeAngle:90});
let [left,right]=halfMass(p.floatingShadow(flat,opts));assert(left>right*2,'90° fade runs left to right');
opts.floatFadeAngle=270;[left,right]=halfMass(p.floatingShadow(flat,opts));assert(right>left*2,'270° fade reverses');
Object.assign(opts,box.opts,{floatSoftness:0,floatBlurEnd:100,floatBlurStart:0,floatBlurSpan:100,floatBlurAngle:90});
let blur90=p.floatingShadow(flat,opts);opts.floatBlurAngle=270;let blur270=p.floatingShadow(flat,opts);
const sampleAlpha=(texture,x,y)=>texture.surface.getContext('2d').getImageData(Math.round(texture.padX+x),Math.round(texture.padY+y),1,1).data[3];
assert(sampleAlpha(blur90,210,50)<sampleAlpha(blur270,210,50)-20,'blur angle changes the soft side');
Object.assign(opts,box.opts,{floatOpacity:0});assert.equal(geo().alpha,0);opts.floatOpacity=50;assert.equal(geo().alpha,.5);opts.floatOpacity=100;assert.equal(geo().alpha,1);
assert(html.includes('data-mode="pure" aria-pressed="true">投影</button>'));
assert(html.includes('>投影不透明度<'));
console.log('PASS: native + filter-less blur pixels, reversed gradient angles, independent 0/50/100 opacity, new mode names.');

for(const cover of [[255,0,0],[0,255,0],[0,0,255],[210,200,170],[50,90,200]]){
 const channels=p.floatingInkColor(cover,'darkTint').slice(1).match(/../g).map(v=>parseInt(v,16));
 assert(Math.min(...channels)>=232&&Math.max(...channels)<=251,'magic ink stays near white');
 const luma=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];assert(Math.abs(luma-243)<5,'consistent pale luminance');
}
assert.equal(p.floatingInkColor([0,0,0],'light'),'#f3f3f3');
console.log('PASS: near-white cover magic palette, bounded saturation and consistent luminance.');
