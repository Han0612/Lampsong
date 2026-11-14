// Pack redrawn equal-cell sheets. Crop/alignment only: no contour interpolation.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)('sharp');
const inputs=process.argv.slice(2);if(inputs.length<2)throw Error('curl and side source sheets required');
const cellWidth=640,cellHeight=480,baseline=430,anchorX=320;
async function readFrames(source,rows){
 const info=await sharp(source).metadata(),sw=Math.floor(info.width/4),sh=Math.floor(info.height/rows),frames=[];
 for(let i=0;i<4*rows;i++){
  const {data,info:cell}=await sharp(source).extract({left:i%4*sw,top:Math.floor(i/4)*sh,width:sw,height:sh}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=sw,y0=sh,x1=0,y1=0,mass=0,mx=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const a=data[(y*sw+x)*4+3];if(a>50){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}mass+=a/255;mx+=x*a/255;}
  if(x1<=x0)throw Error('empty frame '+i);frames.push({data,info:cell,x0,y0,x1,y1,mass,cx:mx/mass,sw,sh});
 }return frames;
}
const variants={};
for(let k=0;k<2;k++){
 const style=['curl','side'][k],source=inputs[k];fs.copyFileSync(source,'dist/cat-sleep/source/'+style+'-redrawn-v124.png');
 const originals=await readFrames(source,4);
 // One constant scale for each source action preserves actual pose contraction.
 const baseScale=Math.min(540/Math.max(...originals.map(f=>f.x1-f.x0+1)),375/Math.max(...originals.map(f=>f.y1-f.y0+1)));
 for(const f of originals){f.scale=baseScale;f.shift=-f.sw*.5*baseScale;}
 if(k===0&&inputs[2]){
  const extra=await readFrames(inputs[2],2),last=originals.at(-1),scale=baseScale*Math.sqrt(last.mass/extra[0].mass);
  const shift=(last.cx-last.sw*.5)*baseScale-extra[0].cx*scale;
  for(const f of extra){f.scale=scale;f.shift=shift;}
  originals.push(...extra);fs.copyFileSync(inputs[2],'dist/cat-sleep/source/curl-tuck-redrawn-v124.png');
 }
 const frames=[],composites=[];
 for(let i=0;i<originals.length;i++){
  const f=originals[i],scale=f.scale,w=Math.round((f.x1-f.x0+1)*scale),h=Math.round((f.y1-f.y0+1)*scale);
  const left=Math.round(anchorX+f.shift+f.x0*scale),top=baseline-h+1;
  if(left<0||left+w>cellWidth||top<0)throw Error('clipped frame '+style+' '+i);
  const tile=await sharp(f.data,{raw:f.info}).extract({left:f.x0,top:f.y0,width:f.x1-f.x0+1,height:f.y1-f.y0+1}).resize(w,h).png().toBuffer();
  composites.push({input:tile,left:i%4*cellWidth+left,top:Math.floor(i/4)*cellHeight+top});
  frames.push({bounds:[left,top,left+w-1,baseline],baseline,anchorX,head:[Math.round(left+w*.79),Math.round(top+h*.22)],mass:Math.round(f.mass*scale*scale),authoredFrame:i});
 }
 const rows=Math.ceil(frames.length/4),output='cat-sleep/'+style+'-redrawn.webp';
 await sharp({create:{width:cellWidth*4,height:cellHeight*rows,channels:4,background:'#0000'}}).composite(composites).webp({lossless:true}).toFile('dist/'+output);
 const referenceWidth=Math.sqrt(frames[0].mass),n=frames.length;
 variants[style]={file:output,label:style==='curl'?'蜷卧入睡':'侧卧入睡',columns:4,rows,cellWidth,cellHeight,referenceWidth,frames,authoredRoute:Array.from({length:n},(_,i)=>i),sleepLoop:'stable-frame-with-local-breathing',sleepFrame:n-1,wakeRoute:Array.from({length:n},(_,i)=>n-1-i),facing:'right'};
}
fs.writeFileSync('dist/cat-sleep/metadata.json',JSON.stringify({revision:124,variants}));
console.log(JSON.stringify(Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,{reference:v.referenceWidth,frames:v.frames.length,first:v.frames[0].bounds,last:v.frames.at(-1).bounds}]))));
