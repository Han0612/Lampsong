// Restore authored sharp frames without reintroducing interpolation, while the
// separately redrawn upper departure travels continuously under gravity.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const baseline='420f81cb46a71f14907c266ea99584b3e9a7a552';
for(const file of ['dist/cat-paw.js','dist/cat-visit.js']){
 assert.equal(fs.readFileSync(file,'utf8'),cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}),'native rendering/playback is restored exactly');
}
for(const file of fs.readdirSync('dist/cat-motion').filter(f=>f.endsWith('.webp')&&f!=='exit-upper.webp')){
 assert.deepEqual(fs.readFileSync('dist/cat-motion/'+file),cp.execFileSync('git',['show',baseline+':dist/cat-motion/'+file],{maxBuffer:30*1024*1024}),'existing authored texture bytes retained: '+file);
}
const box={Math,catRange:(a,b)=>(a+b)/2};vm.createContext(box);
for(const file of ['cat-visit','cat-exit-meta','cat-exit'])vm.runInContext(fs.readFileSync('dist/'+file+'.js','utf8'),box);
vm.runInContext('this.Dep=CatDeparture;this.art=catExitArt;',box);
for(const flip of [-1,1])for(const size of [.16,.25,.4]){
 const dep=new box.Dep('upper',{x:500,y:210,floor:300,scale:size},35,flip),seen=new Set();let previous=null,takeoff=false,rising=false,falling=false,previousVy=null;
 for(let i=0;i<240&&!dep.done;i++){
  const p=dep.sample(1/60,35,1000,700);seen.add(p.frame);
  assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.pose.anchorY));
  assert(Number.isInteger(p.frame)&&p.frame>=0&&p.frame<16,'only complete native poses are drawn');
  if(dep.age>dep.turn+.44){takeoff=true;assert.equal(p.flip,-flip,'departure faces opposite entry direction');
   if(previous){const dy=p.y-previous.y;rising ||= dy<0;falling ||= dy>0;
    assert((p.x-previous.x)*flip<0,'leaps to the opposite side');
    if(previousVy!==null&&dep.age>dep.turn+.48)assert(dy>=previousVy-1e-8,'constant gravity accelerates downward');previousVy=dy;
   }
  }
  if(previous)assert(Math.abs(p.x-previous.x)<5,'no horizontal teleport on turn/launch');
  previous=p;
 }
 assert(dep.done&&takeoff&&rising&&falling,'ballistic arc rises, crosses apex and clears screen');assert.equal(seen.size,16,'turn, crouch, push and airborne poses are all presented');
 assert(previous.y>700);
}
// Every generated cell has visible body + generous clearance; no clipped fur.
const {loadImage,createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const im=await loadImage('dist/cat-motion/exit-upper.webp');assert.equal(im.width,2304);assert.equal(im.height,1536);
 const c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);
 for(let frame=0;frame<16;frame++){
  const a=g.getImageData(frame%4*576,Math.floor(frame/4)*384,576,384).data;let minX=576,minY=384,maxX=0,maxY=0,soft=0;
  for(let y=0;y<384;y++)for(let x=0;x<576;x++){const alpha=a[(y*576+x)*4+3];if(alpha>30){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(alpha>0&&alpha<200)soft++;}
  assert(minX>25&&maxX<550&&minY>15&&maxY<370,'complete fur/paw/tail fits inside cell '+frame);assert(soft>100,'native soft hair alpha retained');
 }
 console.log('PASS: pre-v106 native renderer/visit byte-identical; 26 source atlases retained; 6 opposite-direction ballistic arc simulations use all 16 crisp poses; full fur alpha and cell padding verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
