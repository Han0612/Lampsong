const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const code=fs.readFileSync('dist/caster.js','utf8');
const baseline=cp.execFileSync('git',['show','b21e5f7a810b9fe969adfb5bd0cdb9c96526b586:dist/caster.js'],{encoding:'utf8'});
assert(!code.includes('new Worker')&&!code.includes('presentationRows'),'retain synchronous rollback pipeline');
const box={Intl,Worker:class{constructor(){throw Error('animation must not depend on asynchronous projection');}}};
vm.createContext(box);vm.runInContext(code+';this.P=LetterProjector;',box);
const p=new box.P();let bakes=0,draws=0;const positions=[],fans=[];
p.bake=(_,width)=>{bakes++;return {texture:{},fullWidth:width*1.03};};
p.spreadTexture=(_,expansion)=>{fans.push(expansion);return {};};
const ctx={save(){},restore(){},translate(x,y){positions.push([x,y]);},transform(){},drawImage(){draws++;}};
const mask={width:400,inkHeight:96,referenceHeight:96};
const shade={softness:0,projection:'perspective',trail:115,lean:0,contact:0,density:90,fan:165,blurStart:14,blurSpan:74,fadeStrength:70};
const base={dimensions:{mask,width:700,inkScale:1},anchorHeight:130,bakeMaxWidth:Infinity,anchorRatio:.4,shade,opacity:1,edge:0,bodyHeight:130,referenceDistance:270,plateLength:240,fanReferenceWidth:800,tone:0};
for(let frame=0;frame<180;frame++){
 const rows=Array.from({length:4},(_,row)=>({text:'ROW '+row,rootY:150+row*160+frame,layout:{...base,mode:row<2?'combined':'pure',bodyHeight:130+frame/10,dimensions:{...base.dimensions,width:650+frame}}}));
 const before=draws;p.drawRows(ctx,rows,700,{x:700+frame,y:0,heightScale:1+frame/200},2);
 assert.equal(draws-before,4,'every visible row is drawn in every animation frame, including first use');
 assert.equal(positions.at(-1)[1],rows[3].rootY,'current row position is rendered without a presentation queue');
}
assert.equal(bakes,4,'animation reuses one stable baked field per lyric row');
assert.equal(p.cache.size,4);assert.equal(draws,720);assert(fans[3]!==fans.at(-1),'geometry responds in the current frame');
p.cache.clear();p.drawShadow(ctx,'NEW FONT',700,200,{x:700,y:0,heightScale:1},{...base,mode:'pure'});
assert.equal(draws,721,'cache invalidation synchronously redraws instead of producing an empty frame');
assert.equal(bakes,5);
const app=fs.readFileSync('dist/app.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
assert(!app.includes('const lyricsReady=projector.drawRows')&&!app.includes('interactiveUntil')&&!app.includes('projector.prewarm'));
assert(!html.includes('projection-surfaces.js'));
console.log('PASS: synchronous pre-resolution pipeline with moderate sampling; 180 animated frames in both modes, 720 visible draws, stable caches, synchronous invalidation, no worker/path switching.');
