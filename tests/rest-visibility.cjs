const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {engine}=require('./helpers/light-frame.cjs');
const {GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('dist/fonts/fz-vdl-jianzhu-sb.ttf','RestTest');
(async()=>{
 const app=fs.readFileSync('dist/app.js','utf8'),e=await engine(app),b=e.box;
 vm.runInContext(fs.readFileSync('dist/scene-rest.js','utf8')+fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/caster.js','utf8')+';this.rest=new SceneRest();this.projector=new LetterProjector();this.floatPrefs={...floatingDefaults};this.projectedWavePrefs={...projectedWaveDefaults};this.rowPrefs=lyricRowDefaults("pure");',b);
 b.projector.font='700 96px RestTest';
 Object.assign(b,{W:640,H:420,cx:390,dpr:1,stageWidth:()=>420,state:{brightness:100,protect:true},shade:{projection:'parallel',contact:0,fan:145,lean:0,trail:110,density:88,softness:100,blurStart:14,blurSpan:74,fadeStrength:45},typePrefs:{regularSize:100,activeSize:112,lineGap:100},coverInkRgb:[220,180,160],rgb:[236,231,216],transition:1,easeMotion:n=>n,previousPage:null,current:1,lines:['HELLO','MICROLIGHT'],pageOffset:0,$:id=>({value:id==='faceFinish'?'light':id==='lyricMotion'?'slide':'#eee7da'}),updateBoundaryGuide(){},dustIllumination:()=>.8,lyricLayout:()=>({count:2,baseGap:.2,typeSize:40,area:{center:240}}),lyricRowsAt:()=>[{text:'HELLO',active:1,slot:0,edge:1},{text:'MICROLIGHT',active:0,slot:1,edge:1}],pureLyricPlacement:()=>({first:130})});
 vm.runInContext(app.slice(app.indexOf('  function drawLyrics('),app.indexOf('  function drawCats(')),b);
 const draw=b.projector.drawRows.bind(b.projector);let omitShadow=false,drawn=[];
 b.projector.drawRows=(ctx,jobs,x,source,dpr)=>{drawn=jobs;return draw(ctx,jobs.map(j=>({...j,layout:{...j.layout,...(omitShadow?{showShadow:false}:{})}})),x,source,dpr);};
 const source={x:390,y:45,heightScale:1,slope:0},moved={...source,x:310,slope:.18};
 function pixels(mode,off,beam=source,skip=false){
  e.render('red');b.ctx=e.canvas.getContext('2d');b.mode=mode;omitShadow=skip;b.rest.on=!off;b.drawLyrics(beam,0);
  if(off){b.rest.started=0;b.rest.fromLevel=0;b.rest.present(b.ctx,1000);}
  return b.ctx.getImageData(0,0,640,420).data;
 }
 for(const mode of ['pure','combined','floating']){
  const on=pixels(mode,false),off=pixels(mode,true),without=pixels(mode,true,source,true),motion=pixels(mode,true,moved);
  let peak=0,dark=0,shadowPixels=0,movingPixels=0;
  for(let i=0;i<off.length;i+=4){
   peak=Math.max(peak,off[i]);if(off[i]<4)dark++;
   // Power changes brightness only: glyph shapes, position and proportions stay intact.
   for(let ch=0;ch<3;ch++)assert(Math.abs(off[i+ch]-on[i+ch]*.2)<=1,mode+' keeps on-state geometry');
   if(without[i]>off[i])shadowPixels++;
   if(motion[i]!==off[i])movingPixels++;
  }
  assert(peak>=35&&peak<=52,'faint lamp pool remains visible');assert(dark>30000,'outer room stays dark');
  assert(shadowPixels>100,mode+' retains visible shadow pixels');assert(movingPixels>100,mode+' shadow responds to current light geometry');
  assert(drawn.every(j=>j.layout.mode===mode),'mode stays unchanged while off');
 }
 // Exercise the actual scene call site, including deliberately stale old light state.
 let received=[];
 Object.assign(b,{ctx:e.canvas.getContext('2d'),rest:{on:false,lyricBeam:{x:-999},present(){},level(){return 0;}},lampPose:()=>({x:370,y:30,dx:0,dy:1,wallDistance:1}),previewLamp:null,scene:{lampStyle:'dome',beamRange:100},fixtures:{dome:{lensY:40}},fixtureScale:()=>1,fixtureWeights:{dome:1},theta:0,foreAft:{angle:0},displayedRange:1,beamPaddingX:1,beamPaddingY:1,paintMainBeam(){},DiscoLight:{finishRhythm(){}},drawLyrics:(beam,dt)=>received.push({beam,dt}),drawCats(){},drawDust(){},drawInsects(){},drawForegroundDust(){},drawLamp(){},captureScene(){},surface:{}});
 vm.runInContext(app.slice(app.indexOf('  function renderScene('),app.indexOf('  function frame(')),b);
 b.renderScene(1/60,1000,true);b.lampPose=()=>({x:420,y:35,dx:.2,dy:.98,wallDistance:1});b.renderScene(1/60,1016,true);
 assert.equal(received[0].beam.x,370);assert.equal(received[1].beam.x,428);assert(received.every(r=>r.dt===0),'lyric time remains paused');
 assert(!app.includes('const room=ctx.createRadialGradient'),'fixed environment fill removed');
 console.log('PASS: three modes retain shadow pixels and exact shapes under 20% scene light; live lamp moves shadows; lyric time pauses; faint pool and dark perimeter retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
