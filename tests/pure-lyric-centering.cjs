const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('dist/fonts/fz-vdl-jianzhu-sb.ttf','CenteringTest');
const app=fs.readFileSync('dist/app.js','utf8'),caster=fs.readFileSync('dist/caster.js','utf8');
const document={createElement:()=>createCanvas(1,1),querySelector:()=>({getBoundingClientRect:()=>({right:0})}),body:{classList:{contains:()=>true}}};
function projector(code){const context={document,Intl};vm.createContext(context);vm.runInContext(code+'\nthis.P=LetterProjector;',context);const p=new context.P();p.font='700 96px CenteringTest';p.tracking=0;return p;}
const p=projector(caster),old=projector(cp.execFileSync('git',['show','8949f8d8363a2bb6a3504bf3e4263fa18cef9724:dist/caster.js'],{encoding:'utf8'}));
const box={H:900,W:1360,cx:680,pivotY:-14,L:82.8,mode:'pure',rowPrefs:{rowCurrentOpacity:100,rowOtherOpacity:70,rowCurrentBrightness:100,rowOtherBrightness:130},projectedWavePrefs:{projectedWave:false},floatPrefs:{floatGap:40,floatThickness:25,floatSoftness:35},Intl,document,projector:p,
 scene:{lampStyle:'dome',lampHeight:10},fixtures:{dome:{lensY:40}},fixtureScale:()=>1,state:{protect:false},
 typePrefs:{lyricRows:2,lineGap:150,activeSize:182,regularSize:165,lyricWidth:100,lyricHeight:100,lyricPosition:53},
 shade:{projection:'parallel',contact:0,fan:165,lean:0,trail:115,density:96,softness:58,blurStart:90,blurSpan:120,fadeStrength:45},
 $:id=>id==='faceFinish'?{value:'dark'}:id==='lyricColor'?{value:'#000000'}:id==='lyricMotion'?{value:'slide'}:{checked:true}};
vm.createContext(box);
vm.runInContext(app.slice(app.indexOf('  function lyricArea('),app.indexOf('  const boundaryGuide=')),box);
vm.runInContext(app.slice(app.indexOf('  const wordBreaker='),app.indexOf('  function drawLyrics(')),box);
function base(typeSize){const referenceDistance=box.H*.3,plateLength=typeSize*box.typePrefs.regularSize/100*1.89*(box.state.protect?1:1.22);return {mode:'pure',shade:box.shade,anchorHeight:typeSize,bakeMaxWidth:Infinity,referenceDistance,plateLength,anchorRatio:plateLength/(referenceDistance+plateLength),opacity:.97,edge:1,tone:0,fanReferenceWidth:box.W*.58};}
function render(rows,first,gap,typeSize,project){const canvas=createCanvas(box.W,box.H),g=canvas.getContext('2d');g.fillStyle='white';g.fillRect(0,0,box.W,box.H);const source={x:box.cx,y:box.pivotY+box.H*box.scene.lampHeight/100-Math.min(8,box.H*.008)+40,heightScale:1};for(const row of rows){const bodyHeight=typeSize*box.typePrefs.regularSize/100,layout={...base(typeSize),bodyHeight,dimensions:project.dimensions(row.text,bodyHeight,Infinity)};project.drawShadow(g,row.text,box.cx,first+row.slot*gap,source,layout);}return canvas;}
function inkBounds(canvas){const a=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let top=canvas.height,bottom=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(a[(y*canvas.width+x)*4]<253){top=Math.min(top,y);bottom=y+1;break;}return {top,bottom};}
let largestOldError=0;
for(const spec of [{height:900,trail:60,gap:100,count:2},{height:900,trail:115,gap:150,count:2},{height:600,trail:220,gap:90,count:3}]){
 box.H=spec.height;box.shade.trail=spec.trail;box.typePrefs.lineGap=spec.gap;
 const typeSize=Math.min(44,box.H*.052,box.H*.147*.32),gap=box.H*.147*spec.gap/100;
 const rows=['LIGHT','小猫在光里睡着','quiet gyp'].slice(0,spec.count).map((text,slot)=>({text,slot})),area=box.lyricArea(600);
 const placed=box.pureLyricPlacement(rows,typeSize,gap,area);
 assert(Math.abs((placed.top+placed.bottom)/2-area.center)<.001,'projected ink envelope centers on guide');
 const image=render(rows,placed.first,gap,typeSize,p),visible=inkBounds(image);
 assert(Math.abs((visible.top+visible.bottom)/2-area.center)<2.5,'real rendered pixels center, not just caster anchors');
 const original=render(rows,placed.first,gap,typeSize,old);
 assert.deepEqual(image.getContext('2d').getImageData(0,0,box.W,box.H).data,original.getContext('2d').getImageData(0,0,box.W,box.H).data,'recording bounds does not change any rendering pixels');
 const oldRoot=area.center-gap*(rows.length-1)/2-typeSize*Math.max(box.typePrefs.activeSize,box.typePrefs.regularSize)/100*.61/2;
 const oldVisible=inkBounds(render(rows,oldRoot,gap,typeSize,old));
 largestOldError=Math.max(largestOldError,Math.abs((oldVisible.top+oldVisible.bottom)/2-area.center));
 let bakes=0,originalBake=p.bake;p.bake=function(...args){bakes++;return originalBake.apply(this,args);};
 for(let n=0;n<60;n++){box.theta=n/10;box.movingSource={x:box.cx+100*Math.sin(n),y:50+n,heightScale:.7+n/100};const repeat=box.pureLyricPlacement(rows,typeSize,gap,area);assert.equal(repeat.first,placed.first,'lamp sway does not recenter or jitter the row anchors');}
 p.bake=originalBake;assert.equal(bakes,0,'no new scans or bakes during unchanged layout frames');
}
assert(largestOldError>25,'test catches the original face-height centering error');
box.H=900;box.shade.trail=115;box.typePrefs.lineGap=150;box.typePrefs.lyricRows=3;
const wide=box.lyricLayout();box.typePrefs.lyricHeight=40;const small=box.lyricLayout();
assert(small.count<=wide.count);assert.equal(small.typeSize,wide.typeSize);assert.equal(small.baseGap,wide.baseGap);
assert.equal((small.area.top+small.area.bottom)/2,(wide.area.top+wide.area.bottom)/2);
const fit=box.pureLyricPlacement(Array.from({length:small.count},(_,slot)=>({text:'国Hg',slot})),small.typeSize,box.H*small.baseGap*box.typePrefs.lineGap/100,small.area);
assert(small.count===1||(fit.top>=small.area.top-.01&&fit.bottom<=small.area.bottom+.01),'capacity uses projected row height');

// Endpoints of the same row-push animation use the old/new group centers, so
// changing text geometry cannot pop the anchors at the start or end of a switch.
box.typePrefs.lyricRows=2;box.typePrefs.lyricHeight=100;
Object.assign(box,{current:2,lines:['LIGHT','猫咪','quiet'],pageOffset:0,previousPage:{index:0,offset:0,step:1},transition:0,
 easeMotion:t=>t,updateBoundaryGuide(){},dustIllumination:()=>1,stageWidth:()=>box.W*.7,dpr:1,ctx:{},rgb:[230,230,230]});
box.lyricRowsAt=(layout,index)=>box.lines.slice(index,index+layout.count).map((text,slot)=>({text,index:index+slot,part:0,active:slot===0?1:0,slot,edge:1}));
let jobs=[];p.drawRows=(_ctx,rows)=>{jobs=rows;};
const end=app.indexOf('    projector.drawRows(ctx,jobs,cx,source,dpr);',app.indexOf('  function drawLyrics('));
vm.runInContext(app.slice(app.indexOf('  function drawLyrics('),end)+'    projector.drawRows(ctx,jobs,cx,source,dpr);\n  }',box);
const source={x:box.cx,y:100,heightScale:1};
function roots(t){box.transition=t;box.drawLyrics(source,1/60);return new Map(jobs.filter(j=>j.layout.edge>0).map(j=>[j.text,j.rootY]));}
const start=roots(0),nearStart=roots(.00001),nearEnd=roots(.99999),finish=roots(1);
assert(Math.abs(start.get('猫咪')-nearStart.get('猫咪'))<.01);assert(Math.abs(nearEnd.get('猫咪')-finish.get('猫咪'))<.01);
console.log('PASS: pure projected ink centers within 2.5 px, symmetric capacity keeps glyph/gap unchanged, caster pixels byte-identical, 60 sway frames reuse bakes, slide endpoints continuous. Original center error up to '+largestOldError.toFixed(1)+' px.');
