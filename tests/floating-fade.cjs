const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');const b={document:{createElement:()=>createCanvas(1,1)},Intl};vm.createContext(b);
vm.runInContext(fs.readFileSync('dist/defaults.js','utf8')+fs.readFileSync('dist/caster.js','utf8')+'\nthis.p=new LetterProjector();this.opts=floatingDefaults;',b);
const bitmap=createCanvas(100,100);bitmap.getContext('2d').fillRect(0,0,100,100);
const dimensions={mask:{bitmap,width:100,height:100,inkHeight:100,pad:0},width:100,inkScale:1};
function pixel(edge,thickness,bg,highlight,dpr=1,skew=0){const c=createCanvas(300*dpr,220*dpr),g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=`rgb(${bg},${bg},${bg})`;g.fillRect(0,0,300,220);
 b.p.drawFloating(g,[{rootY:50,layout:{bodyHeight:100,edge,illumination:1,faceColor:'#eee7da',floatPrefs:{...b.opts,floatThickness:thickness,floatHighlight:highlight,floatSkew:skew},showShadow:true,dimensions}}],150,{x:150+skew*4,y:0,slope:0,heightScale:1},dpr);
 return [...g.getImageData(150*dpr,80*dpr,1,1).data];}
for(const thickness of [0,25,100,200])for(const bg of [12,80,180,235])for(const hi of [0,25,100])for(const dpr of [1,2])for(const skew of [-30,0,30]){
 const opaque=pixel(1,thickness,bg,hi,dpr,skew);
 for(const edge of [.9,.75,.5,.25,.1,.02,0]){const result=pixel(edge,thickness,bg,hi,dpr,skew);for(let k=0;k<3;k++)assert(Math.abs(result[k]-(opaque[k]*edge+bg*(1-edge)))<=2,`face must dissolve directly to background: depth=${thickness}, bg=${bg}, edge=${edge}`);}
}
console.log('PASS: 2016 fade steps with actual overlapping/skewed projection and DPR 1/2 across light/dark backgrounds and 4 extrusion depths; body color never dips below the expected composite.');
