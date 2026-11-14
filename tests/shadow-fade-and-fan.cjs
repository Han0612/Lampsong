const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={Intl,document:{createElement(){const canvas={};canvas.getContext=()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData:image=>{canvas.pixels=image.data;}
});return canvas;}}};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('dist/caster.js','utf8')+';this.Projector=LetterProjector;',sandbox);
const p=new sandbox.Projector();
const mask={width:48,height:48,inkHeight:24,pad:12,pixels:new Uint8ClampedArray(48*48*4).fill(255)};
const alphaSum=t=>t.pixels.reduce((sum,v,i)=>sum+(i%4===3?v:0),0);
for(const combined of [false,true])for(const softness of [0,1]){
  const off=p.bake(mask,80,.2,combined,.14,.74,softness,0).texture;
  const light=p.bake(mask,80,.2,combined,.14,.74,softness,45).texture;
  const strong=p.bake(mask,80,.2,combined,.14,.74,softness,100).texture;
  assert(alphaSum(off)>alphaSum(light)&&alphaSum(light)>alphaSum(strong),'fade works independently of blur and mode');
  assert.equal(off.pixels[3],light.pixels[3],'contact opacity retained');
  for(let i=3;i<off.pixels.length;i+=4)assert(strong.pixels[i]<=light.pixels[i]&&light.pixels[i]<=off.pixels[i]);
}
for(const mode of ['pure','combined'])for(const projection of ['perspective','parallel']){
  const angles=[],lengths=[];
  p.bake=()=>({texture:{width:2048,height:2048},fullWidth:100});
  for(const rootY of [200,300,400]){
    let expansion,height;
    p.spreadTexture=(_,fan)=>{expansion=fan;return {};};
    const ctx={save(){},restore(){},translate(){},transform(){},drawImage(t,x,y,w,h){height=h;}};
    const layout={mode,dimensions:{mask:{width:100,inkHeight:96,referenceHeight:96},width:100,inkScale:1},anchorHeight:96,bakeMaxWidth:100,anchorRatio:.2,
      shade:{softness:0,projection,trail:100,lean:0,contact:0,density:90,fan:145,blurStart:14,blurSpan:74,shadowFade:true,fadeStrength:45},
      opacity:1,bodyHeight:30,referenceDistance:200,plateLength:50,fanReferenceWidth:400,tone:0};
    p.drawShadow(ctx,'ANGLE',100,rootY,{x:100,y:80,heightScale:1},layout);
    angles.push(expansion*100/(2*height));lengths.push(height);
  }
  if(projection==='perspective')assert(angles[0]>angles[1]&&angles[1]>angles[2],'near rows open at a steeper angle');
  else assert(Math.max(...angles)-Math.min(...angles)<.005,'parallel rows keep the same angle');
  assert(lengths[0]<lengths[1]&&lengths[1]<lengths[2],'farther rows keep longer shadows');
}
console.log('PASS: fade pixels at both blur extremes and both modes; near-to-far perspective angles decrease while shadow lengths increase; parallel slopes stable.');
