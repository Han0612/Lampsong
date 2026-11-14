const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {engine,compare}=require('./helpers/light-frame.cjs');
(async()=>{
 const app=fs.readFileSync('dist/app.js','utf8'),old=cp.execFileSync('git',['show','2c93452:dist/app.js'],{encoding:'utf8'});
 const now=await engine(app),before=await engine(old);
 const peak=p=>{let m=0;for(let i=0;i<p.length;i+=4)m=Math.max(m,(p[i]+p[i+1]+p[i+2])/3);return m;};
 const colors=[[152,200,193],[236,231,216],[187,171,207]];
 for(const rgb of colors)for(const key of ['dome','red','modern']){
  const a=before.render(key,1,{rgb}),b=now.render(key,1,{rgb});
  assert(peak(b)>peak(a)+20,`${key} core must materially brighten`);
  assert(peak(b)>237,`${key} full brightness cannot remain mid-grey: ${peak(b)}`);
  // Low-energy perimeter has no highlight clipping to recover: don't lift the blacks.
  let error=0,n=0;for(let i=0;i<a.length;i+=4)if(Math.max(a[i],a[i+1],a[i+2])<60){for(let c=0;c<3;c++){error+=Math.abs(a[i+c]-b[i+c]);n++;}}
  assert(error/n<1.8,'dark perimeter and original falloff retained');
  console.log(key,rgb.join(','),'core',peak(a).toFixed(1),'→',peak(b).toFixed(1));
 }
 // At max/min slider, preserve actual control response rather than hard-code a white core.
 assert(peak(now.render('red',1,{brightness:45}))<peak(now.render('red',1,{brightness:100}))-60);
 // Sway changes exposure continuously without rebuilding texture pixels.
 let builds=0;const original=now.box.buildLight;now.box.buildLight=()=>{builds++;original();};
 now.render('red');builds=0;let prev;
 for(let i=0;i<=120;i++){
  const irradiance=.65+i*.35/120,p=now.render('red',1,{irradiance});
  if(prev){const d=compare(prev,p);assert(d.max<=4,'no exposure steps or contour crossfade during sway');}
  prev=p;
 }
 assert.equal(builds,0,'no per-frame light rebaking');
 // Offscreen rays and floor material cannot be the cause of a grey cap.
 assert(peak(now.render('red',1,{floorOn:false}))>245);
 assert(peak(now.render('red'))>245);
 if(process.env.LIGHT_REVIEW_DIR){
  for(const [name,e]of [['v129',before],['v130',now]]){e.render('red',1,{rgb:colors[0]});fs.writeFileSync(process.env.LIGHT_REVIEW_DIR+'/'+name+'.png',e.canvas.toBuffer('image/png'));}
 }
 console.log('PASS: 9 full composite comparisons; dark perimeter, slider response, 121 continuous sway steps, no per-frame rebake.');
})().catch(e=>{console.error(e);process.exitCode=1;});
