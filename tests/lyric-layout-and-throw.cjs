const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('dist/app.js','utf8');
const box={Intl,H:900,W:360,pivotY:0,L:100,cx:230,typePrefs:{activeSize:175,regularSize:100,lyricRows:3},
  document:{createElement:()=>({getContext:()=>({})}),querySelector:()=>({}),body:{classList:{contains:()=>true}}},
  $:()=>({checked:true}),projector:{layoutRuns:(_,t)=>({left:0,right:t.length*96,referenceHeight:96})}};
vm.createContext(box);
vm.runInContext(app.slice(app.indexOf("  function lyricArea("),app.indexOf("  const boundaryGuide=")),box);
vm.runInContext(app.slice(app.indexOf('  const wordBreaker='),app.indexOf('  function drawLyrics(')),box);
for(const width of [210,260,330,400,800]){
  box.W=width;
  const source='不然怎么就盛开不了呢';
  const chunks=box.lyricLayout().wrap(source);
  assert.equal(chunks.join(''),source);
  assert(!chunks.includes('呢'));
}
const Projector=new Function(fs.readFileSync('dist/caster.js','utf8')+';return LetterProjector')();
for(const mode of ['combined','pure']){
  const p=new Projector();p.bake=()=>({texture:{width:2048,height:2048},fullWidth:100,qMax:.15});p.spreadTexture=()=>({});
  const lengths=[],blurs=[];
  for(const rootY of [200,300,400]){
    const skews=[];let height;
    const ctx={save(){},restore(){},translate(){},transform(a,b,k){skews.push(k);},drawImage(t,x,y,w,h){height=h;}};
    const layout={mode,dimensions:{mask:{width:100,inkHeight:96,referenceHeight:96},width:100,inkScale:1},anchorHeight:30,bakeMaxWidth:100,anchorRatio:.2,
      shade:{softness:100,projection:'parallel',trail:100,lean:0,contact:0,density:90,fan:90,blurStart:14,blurSpan:74},
      opacity:1,bodyHeight:30,referenceDistance:200,plateLength:50,fanReferenceWidth:400,tone:0};
    p.drawShadow(ctx,'LIGHT',100,rootY,{x:100,y:80,heightScale:1},layout);
    lengths.push(height);blurs.push(Math.max(...skews)*height);
  }
  assert(lengths[0]<lengths[1]&&lengths[1]<lengths[2]);
  assert(blurs[0]<blurs[1]&&blurs[1]<blurs[2]);
  console.log(mode,'near/middle/far lengths',lengths.map(Math.round),'tail spread',blurs.map(v=>v.toFixed(1)));
}
