const fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
async function engine(app){
 const floor=await loadImage('dist/materials/receiver-grit.png');
 const document={createElement:()=>{const c=createCanvas(1,1),get=c.getContext.bind(c);c.getContext=k=>k==='webgl'?null:get(k);return c;}};
 const box={document,console};vm.createContext(box);
 for(const file of ['light-profiles','disco-light','disco-ball'])vm.runInContext(fs.readFileSync(`dist/${file}.js`,'utf8'),box);
 vm.runInContext('this.profile=LampBeam;this.Light=DiscoLight;this.ball=DiscoBall;',box);
 const light=createCanvas(480,640),lc=light.getContext('2d'),radiance=createCanvas(480,640),rc=radiance.getContext('2d');
 Object.assign(box,{light,lc,radiance,rc,lightPixels:lc.createImageData(480,640),radiancePixels:rc.createImageData(480,640),quantizationNoise:new Float32Array(480*640),state:{brightness:100},rgb:[236,231,216]});
 vm.runInContext(app.slice(app.indexOf('  function buildLight()'),app.indexOf('  const particles=')),box);
 const W=640,H=420,c=createCanvas(W,H),ctx=c.getContext('2d'),discoLight=new box.Light();discoLight.opacity=1;
 const paint=new vm.Script('(()=>{'+app.slice(app.indexOf('    const fixtureGain='),app.indexOf('    const stillBeam=')>=0?app.indexOf('    const stillBeam='):app.indexOf('    drawLyrics(beam,'))+'})()');
 let cacheKey='';
 function render(key,power=1,{phase=.7,strength=70,irradiance=.85,brightness=100,rgb=[236,231,216],weights={[key]:1},floorOn=true,level=1,slope=.05,readPixels=true}={}){
  const next=JSON.stringify([key,brightness,rgb]);if(next!==cacheKey){cacheKey=next;Object.assign(box,{envelopes:box.profile.buffer(key),state:{brightness},rgb});box.buildLight();}
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);discoLight.phase=phase;discoLight.opacity=1;
  Object.assign(box,{ctx,unlit:false,discoLight,fixtureWeights:weights,discoLightLevel:level,irradiance,lightPower:power,colorBreath:1,beamW:820,beamH:570,beamAngle:slope,source:{x:390,y:45},surface:floorOn?{floor}:{},W,H,beamRevision:1,coverSleeve:{update(){}},dt:1/60,windowMotion:{},target:rgb,previewLamp:null,scene:{lampStyle:key,discoStrength:strength},reduce:{matches:false}});
  paint.runInContext(box);
  if(ctx.globalAlpha!==1||ctx.globalCompositeOperation!=='source-over')throw Error('Leaked light compositor state');
  return readPixels?ctx.getImageData(0,0,W,H).data:c;
 }
 return {render,canvas:c,box};
}
function compare(a,b,scale=1){let max=0,error=0,signal=0,sum=0,count=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const d=Math.abs(a[i]*scale-b[i]);max=Math.max(max,d);error+=d;signal+=a[i];sum+=b[i];count++;}return{max,mean:error/count,ratio:sum/signal};}
module.exports={engine,compare};
