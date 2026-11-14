const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
function load(code){const gradient={addColorStop(){}};const stub={createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,fillRect(){}};const box={document:{createElement:()=>({getContext:()=>stub})}};vm.createContext(box);vm.runInContext(code+';this.Light=DiscoLight',box);return new box.Light();}
const before=load(cp.execFileSync('git',['show','dc03bc0e1e579a25ec386c1c1a1013c48cd68587:dist/disco-light.js'],{encoding:'utf8'})),after=load(fs.readFileSync('dist/disco-light.js','utf8'));
function trace(light,phase,power){const records=[],stack=[];let state={alpha:1,xy:[],angle:0};const ctx={save(){stack.push({...state})},restore(){state=stack.pop()},translate(...xy){state.xy=xy},rotate(angle){state.angle=angle},drawImage(tile,...size){if(light.tiles.includes(tile))records.push({tile:light.tiles.indexOf(tile),size,xy:state.xy,angle:state.angle,alpha:state.alpha})},set globalAlpha(v){state.alpha=v}};light.phase=phase;light.draw(ctx,{active:true,dt:.016,reduce:true,width:1363,height:936,source:{x:850,y:160},power,strength:.7});return records;}
for(const phase of [0,.3,1.8,4,6])for(const power of [.3,.7,1]){
 const a=trace(before,phase,power),b=trace(after,phase,power);assert.equal(b.length,56);
 a.forEach((x,i)=>{const y=b[i];assert.deepEqual(y.xy,x.xy);assert.equal(y.angle,x.angle);assert.equal(y.tile,x.tile);
  const scale=y.size[2]/x.size[2];assert(scale>=1-1e-12&&scale<=1.65+1e-12);
  assert(Math.abs(y.size[3]/x.size[3]-scale)<1e-12);
  assert(y.alpha<=Math.min(1,x.alpha*1.3)+1e-12);
  const distance=Math.hypot((y.xy[0]-850)/1363,(y.xy[1]-160)/936);
  if(distance<=.28){assert(Math.abs(scale-1)<1e-12);assert(Math.abs(y.alpha-Math.min(1,x.alpha*1.3))<1e-12);}
 });
}
// No position or size jumps when rotating across the continuous falloff region.
const a=trace(after,1,.7),b=trace(after,1.00001,.7);
a.forEach((x,i)=>{assert(Math.abs(x.size[2]-b[i].size[2])<.01);assert(Math.abs(x.alpha-b[i].alpha)<.001);});
const app=fs.readFileSync('dist/app.js','utf8');assert(app.indexOf('    discoLight.draw(ctx,')<app.indexOf('    drawLyrics(beam,dt);'));
console.log('PASS: 56 spot paths/colors retained; outer spots enlarge proportionally and fade, inner intensity unchanged; smooth rotation and spots below both lyric modes.');
