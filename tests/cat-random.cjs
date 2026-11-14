const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'../dist');
const context=vm.createContext({Math,document:{createElement:()=>({})}});
for(const f of ['cat-poses','cat-visit','cat-exit-meta','cat-exit','cat-paw'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),context);
const {CatPaw,CatVisit,catPoses}=vm.runInContext('({CatPaw,CatVisit,catPoses})',context);
let placements=0;
for(const width of [800,1440])for(const slope of [-.25,0,.25])for(const key of Object.keys(catPoses)){
 const cat=new CatPaw();cat.poseKey=key;const counts={left:0,right:0};
 const height=900,stage=width*.65,cx=width*.68;
 const beam={x:cx,y:100,width:width*.9,slope,gain:1};
 const sample=(x,y,b)=>Math.exp(-Math.pow((x-b.x-b.slope*(y-b.y))/(width*.3),2));
 for(let i=0;i<40;i++){
  const p=cat.choose(cx,stage,width,height,beam,sample);assert(p,key+' has no placement');
  counts[p.flip>0?'left':'right']++;placements++;
  cat.path=p;
  assert.equal(cat.choose(cx,stage,width+1,height,beam,sample).flip,p.flip,'resize changes direction');cat.path=null;
 }
 assert.equal(counts.left,20,key+' left distribution');assert.equal(counts.right,20,key+' right distribution');
}
const cat=new CatPaw();cat.preloadNext=()=>Promise.resolve();
let last=null;
for(let i=0;i<1000;i++){
 cat.nextPrepared=i%7===0?{key:last,alternate:!!(i%2)}:null;
 cat.select('random');assert(cat.pending);assert.notEqual(cat.poseKey,last,'consecutive action');
 last=cat.poseKey;cat.lastPose=last;cat.pending=false;
}
cat.hasReadyVariant=k=>k===last;cat.queue=[];cat.nextPrepared={key:last,alternate:true};
cat.select('random');assert(cat.awaitingReady);assert(!cat.pending);
cat.select(last);assert(cat.pending,'explicit pose must remain repeatable');
for(const key of ['listen','swat','wash']){
 const visit=new CatVisit(key,.3,.3);let withdrawn=false,previous=0;
 for(let i=0;i<600&&!visit.done;i++){
  const motion=visit.sample(1/60,false,true);assert(!motion.depart,'bottom cat should not turn');
  if(visit.exiting){if(withdrawn)assert(motion.out>=previous-1e-8);withdrawn=true;previous=motion.out;}
 }
 assert(visit.done&&withdrawn&&previous===1,key+' must finish below screen');
}
console.log('PASS: '+placements+' placements across all 12 poses, resize direction, 1000 nonrepeating draws, stale preload/readiness, and 3 bottom retreats.');
