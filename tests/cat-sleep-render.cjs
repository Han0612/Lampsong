const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
 const box={document:{createElement:()=>createCanvas(1,1),hidden:false},performance,devicePixelRatio:1.5};vm.createContext(box);
 vm.runInContext(fs.readFileSync('dist/cat-poses.js','utf8')+'\n'+fs.readFileSync('dist/cat-sleep.js','utf8')+'\nthis.Cat=SleepingCat;',box);
 const art=JSON.parse(fs.readFileSync('dist/cat-sleep/metadata.json')).variants,images=new Map();
 for(const file of [...Object.values(art).map(a=>a.file),'cat-motion/sneak.webp','cat-motion/sneak-b.webp'])images.set(file,await loadImage('dist/'+file));
 const scene={catMinSize:35,catMaxSize:45,catFollowLight:false,catDarkness:100,catFar:55,catOpacity:55};
 const view={width:960,height:600,cx:620,stage:600,scene,beam:{x:620,y:90,heightScale:1}};
 const canvas=createCanvas(960,600),ctx=canvas.getContext('2d');let tests=0;
 for(const style of ['curl','side'])for(const flip of [-1,1])for(let kind=0;kind<3;kind++){
  const c=new box.Cat();Object.assign(c,{art,images,ready:true,state:'pet',style,age:2,sleepTime:2,petEnd:5,runVariant:0,entrySide:-flip,flip,handStyle:kind});
  c.layout(960,600,620,600,scene,view.beam);c.x=c.targetX;c.draw(ctx,view);
  const w=c.canvas.width,h=c.canvas.height,render=c.canvas.getContext('2d').getImageData(0,0,w,h).data,cat=c.catMask.getContext('2d').getImageData(0,0,w,h).data;
  assert.equal(c.handMask,undefined,'virtual interaction has no projected hand');
  for(let i=3;i<render.length;i+=4)assert.equal(render[i],cat[i],'single cat alpha retained');
  assert(Math.abs(c.hit.y-view.height)<.01,'actual viewport ground baseline');
  const body=c.rasterBounds,footX=c.x+flip*(body[0]+body[2])*.5;
  assert(c.contains(footX,view.height-8),'sleeping body can be petted');
  assert(!c.contains(c.x,view.height-400),'empty space not interactive');
  c.state='sleep';c.age=1;c.sleepTime=1;c.rasterKey=null;c.draw(ctx,view);
  c.state='enter';c.walkPhase=.25;c.rasterKey=null;c.draw(ctx,view);assert(!c.contains(c.x,view.height-8),'moving cat does not catch pet taps');
  tests++;
 }
 const c=new box.Cat();Object.assign(c,{art,images,ready:true,state:'enter',style:'curl',age:0,sleepTime:0,runVariant:0,entrySide:-1,flip:1,walkPhase:0});
 for(let n=0;n<1200&&c.state!=='sleep';n++)c.update(1/60,view);assert.equal(c.state,'sleep');assert.equal(c.x,c.targetX);
 c.pet();assert.equal(c.petEnd,2.8);for(let i=0;i<30;i++){c.age=.2*i;c.pet();}assert(c.petEnd<=2.8);c.wake();assert(c.petEnd<=c.age+1.001);assert.equal(c.pet(),false,'explicit waking finishes pet response before departure');
 for(let n=0;n<1600&&c.active;n++)c.update(1/60,view);assert.equal(c.state,'idle','pet retract, waking and departure complete');
 console.log('PASS: '+tests+' virtual pet/direction combinations, single silhouette alpha, ground contact and tap hit masks, complete sleep/pet/wake lifecycle.');
})().catch(e=>{console.error(e);process.exit(1)});
