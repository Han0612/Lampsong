const fs=require('node:fs'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const {engine,compare}=require('./helpers/light-frame.cjs');
(async()=>{
 const app=fs.readFileSync('dist/app.js','utf8'),e=await engine(app);
 for(const key of ['disco','red','dome'])for(const phase of [0,.7,2.1])for(const strength of [0,70,100]){
  const base=e.render(key,1,{phase,strength});
  for(const gain of [.78,.9,.96]){const dim=e.render(key,gain,{phase,strength}),r=compare(base,dim,gain);assert(r.max<=1.2);assert(Math.abs(r.ratio-gain)<.006,'finished lighting follows the original beat depth');}
 }
 const red=e.render('red');e.render('disco',1,{strength:100});
 assert.equal(compare(red,e.render('red')).max,0,'returning from Disco leaves no spots, secondary cones or blend state');
 for(const mix of [0,.2,.5,.8,1]){
  const opt={weights:{red:1-mix,disco:mix}},base=e.render('disco',1,opt),dim=e.render('disco',.9,opt);
  assert(compare(base,dim,.9).max<=1.2,'fixture transition does not change the rhythm curve');
 }
 function ball(power){const c=createCanvas(160,180),g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,160,180);g.translate(80,30);g.scale(2,2);e.box.ball.draw(g,{phase:.7,power});return g.getImageData(0,0,160,180).data;}
 assert(Math.abs(compare(ball(1),ball(.9)).ratio-.9)<.012);
 assert(app.indexOf('DiscoLight.finishRhythm(ctx,')<app.indexOf('    drawLyrics(beam,'));
 console.log('PASS: 81 actual composite rhythm comparisons; 5 transition weights; no Disco residue on ordinary lamps; sphere response and lyric order.');
})().catch(e=>{console.error(e);process.exitCode=1;});
