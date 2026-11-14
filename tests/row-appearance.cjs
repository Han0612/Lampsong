const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');GlobalFonts.registerFromPath('dist/fonts/fz-vdl-jianzhu-sb.ttf','RowTest');
let allocations=0;const b={Intl,document:{createElement(){allocations++;return createCanvas(1,1);}}};vm.createContext(b);vm.runInContext(fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/caster.js','utf8')+';this.p=new LetterProjector();this.opts=floatingDefaults;',b);const p=b.p;p.font='700 96px RowTest';p.tracking=18;
// Scaling the current row preserves the absolute tracking contribution in pixels.
for(const text of ['微光照在心里','HELLO WORLD'])for(const size of [65,100,182,450]){
 const fixed=p.dimensions(text,size,Infinity,100),ordinary=p.dimensions(text,size,Infinity),m=fixed.mask;
 const inkWidth=(m.width-m.totalSpacing)*size/(m.referenceHeight||m.inkHeight)*.48;
 const tracking=fixed.width-inkWidth,reference=m.totalSpacing*100/m.referenceHeight*.48;
 assert(Math.abs(tracking-reference)<1e-8);assert.equal(fixed.mask,ordinary.mask,'one stable outline mask for all sizes');
 const solid=createCanvas(641,38);solid.getContext('2d').fillRect(0,0,641,38);const part={texture:solid};const out=p.trackingTexture(part,m,fixed.spacingRatio);
 const px=out.getContext('2d').getImageData(0,20,out.width,1).data;
 for(let x=0;x<out.width;x++)assert(px[x*4+3]>=254,'spacing remap must not create transparent seams at '+x+': '+px[x*4+3]);
}
const bitmap=createCanvas(100,100);bitmap.getContext('2d').fillRect(0,0,100,100);const mask={bitmap,width:100,height:100,inkHeight:100,pad:0};
function face(mode,brightness,bg,shadow){const c=createCanvas(300,220),g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,300,220);const dimensions={mask,width:100,inkScale:1};const layout={mode,edge:1,tone:0,faceBrightness:brightness,finish:'custom',faceColor:'#eee7da',illumination:1,bodyHeight:100,dimensions,floatPrefs:{...b.opts,floatThickness:0,floatHighlight:0},showShadow:shadow};if(mode==='floating')p.drawFloating(g,[{rootY:50,layout}],150,{x:150,y:0,slope:0,heightScale:1},1);else{const f=p.prepareFace(g,150,50,layout,createCanvas(1,1),1);g.drawImage(f.surface,f.x,f.y,f.width,f.height);}return [...g.getImageData(150,80,1,1).data];}
for(const mode of ['combined','floating']){const rgb=[0,.5,1,1.5,2].map(v=>face(mode,v,'#808080',true));for(let i=1;i<rgb.length;i++)assert(rgb[i][0]>rgb[i-1][0]);assert(rgb.every(v=>v[3]===255),'brightness preserves opaque face');for(const v of [.5,1,1.5])assert.deepEqual(face(mode,v,'#808080',true),face(mode,v,'#808080',false),'own shadow never shows through dimmer material');}
// Transition speed changes only interpolation duration, not the lyric clock.
const app=fs.readFileSync('dist/app.js','utf8'),expr=app.match(/transition=Math\.min\(1,transition\+dt\/1\.2\*rowPrefs.rowTransitionSpeed\/100\)/)[0];
for(const speed of [50,100,200]){const x={transition:0,dt:1/120,rowPrefs:{rowTransitionSpeed:speed}};vm.createContext(x);let frames=0;while(x.transition<1&&frames<1000){vm.runInContext(expr,x);frames++;}assert(Math.abs(frames/120-1.2*100/speed)<.01);}
assert(!app.slice(app.indexOf('lineClock+=lyricTempo.advance'),app.indexOf('const rowDuration=6.2')).includes('rowTransitionSpeed'));
console.log('PASS: fixed absolute tracking across four font sizes, cached outlines, seam-free remap; opaque brightness across three levels and unchanged shadows; 50/100/200% transition durations 2.4/1.2/0.6s, separate lyric clock.');
// Font-size emphasis reuses the same original bake throughout the row switch.
const canvas=createCanvas(900,550),ctx=canvas.getContext('2d');let bakes=0;const bake=p.bake;p.bake=function(...args){bakes++;return bake.apply(this,args);};const text='微光慢慢亮起';
const layout={mode:'pure',bodyHeight:100,dimensions:p.dimensions(text,100,Infinity,100),anchorHeight:50,bakeMaxWidth:Infinity,referenceDistance:200,plateLength:170,anchorRatio:170/370,opacity:.97,edge:1,tone:0,fanReferenceWidth:650,shade:{projection:'parallel',contact:0,fan:100,lean:0,trail:100,density:96,softness:58,blurStart:80,blurSpan:100,fadeStrength:45}};
function draw(size){layout.bodyHeight=size;layout.dimensions=p.dimensions(text,size,Infinity,100);ctx.clearRect(0,0,900,550);p.drawRows(ctx,[{text,rootY:100,layout}],450,{x:450,y:30,heightScale:1},1);}
draw(100);draw(182);const warmBakes=bakes,warmAlloc=allocations;const start=performance.now();for(let i=0;i<120;i++)draw(100+82*i/119);assert.equal(bakes,warmBakes);assert.equal(allocations,warmAlloc);console.log('PASS: 120 size-transition frames, no extra ray tracing or canvas allocation; '+((performance.now()-start)/120).toFixed(1)+' ms/frame native raster measurement.');
const floatMask=p.mask('HELLO');for(let i=0;i<5;i++){p.floatingFrame++;p.floatingFace(floatMask,'#eee7da',1,b.opts,.5+i*.01);}const materialAlloc=allocations;for(let i=0;i<120;i++){p.floatingFrame++;p.floatingFace(floatMask,'#eee7da',1,b.opts,.5+i/240);}assert.equal(allocations,materialAlloc);console.log('PASS: 120 floating brightness frames reuse material surfaces without canvas allocation.');
