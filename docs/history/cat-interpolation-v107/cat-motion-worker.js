// Bidirectional geometry, one continuously reconstructed silhouette. No nearest
// drawing switch at the interval midpoint and no opacity-stacked double outline.
const sources=new Map();let serial=0;
const W=288,H=192;
function flowAt(src,pair,x,y,back,out){
  const gx=Math.max(0,Math.min(src.gw-1,x/(W-1)*(src.gw-1))),gy=Math.max(0,Math.min(src.gh-1,y/(H-1)*(src.gh-1)));
  const ix=Math.floor(gx),iy=Math.floor(gy),nx=Math.min(ix+1,src.gw-1),ny=Math.min(iy+1,src.gh-1),u=gx-ix,v=gy-iy;
  const stride=src.gw*4,offset=pair*src.gw*src.gh*4+(back?2:0),a=offset+iy*stride+ix*4,b=offset+iy*stride+nx*4,c=offset+ny*stride+ix*4,d=offset+ny*stride+nx*4;
  const wa=(1-u)*(1-v),wb=u*(1-v),wc=(1-u)*v,wd=u*v,k=W/384/16,f=src.flow;
  out[0]=(f[a]*wa+f[b]*wb+f[c]*wc+f[d]*wd)*k;out[1]=(f[a+1]*wa+f[b+1]*wb+f[c+1]*wc+f[d+1]*wd)*k;
}
function distanceTo(pixels,inside){
  const d=new Float32Array(W*H),diagonal=Math.SQRT2;
  for(let i=0;i<d.length;i++)d[i]=((pixels[i*4+3]>=128)===inside)?0:10000;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;let v=d[i];if(x)v=Math.min(v,d[i-1]+1);if(y){v=Math.min(v,d[i-W]+1);if(x)v=Math.min(v,d[i-W-1]+diagonal);if(x<W-1)v=Math.min(v,d[i-W+1]+diagonal);}d[i]=v;
  }
  for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){
    const i=y*W+x;let v=d[i];if(x<W-1)v=Math.min(v,d[i+1]+1);if(y<H-1){v=Math.min(v,d[i+W]+1);if(x)v=Math.min(v,d[i+W-1]+diagonal);if(x<W-1)v=Math.min(v,d[i+W+1]+diagonal);}d[i]=v;
  }
  return d;
}
function cell(src,index){
  if(src.cells.has(index)){const a=src.cells.get(index);src.cells.delete(index);src.cells.set(index,a);return a;}
  const g=src.cellContext;g.clearRect(0,0,W,H);
  const dx=src.registration[index*2]*W/384/16,dy=src.registration[index*2+1]*W/384/16;
  g.drawImage(src.atlas,index%4*W,Math.floor(index/4)*H,W,H,dx,dy,W,H);
  const pixels=g.getImageData(0,0,W,H).data;
  const outside=distanceTo(pixels,true),inside=distanceTo(pixels,false),distance=new Float32Array(W*H);
  let left=W,right=0,top=H,bottom=0;
  for(let i=0;i<distance.length;i++){
    const a=pixels[i*4+3]/255,solid=a>=.5;
    distance[i]=(solid?inside[i]-.5:-outside[i]+.5)+(a-(solid?1:0))*.6;
    if(a>.01){const x=i%W,y=(i/W)|0;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
  const item={pixels,distance,bounds:[left,top,right,bottom]};src.cells.set(index,item);
  while(src.cells.size>4)src.cells.delete(src.cells.keys().next().value);return item;
}
// Cache sampling coordinates once: SDF/alpha/RGB all use identical geometry.
function coordinate(x,y,out){
  if(x<0||y<0||x>=W-1||y>=H-1){out[0]=-1;return;}
  const ix=x|0,iy=y|0,u=x-ix,v=y-iy;out[0]=iy*W+ix;out[1]=(1-u)*(1-v);out[2]=u*(1-v);out[3]=(1-u)*v;out[4]=u*v;
}
function field(data,c){if(c[0]<0)return -100;const i=c[0];return data[i]*c[1]+data[i+1]*c[2]+data[i+W]*c[3]+data[i+W+1]*c[4];}
function color(pixels,c,out){
  if(c[0]<0){out.fill(0);return;}
  const i=c[0]*4,a=c[1]*pixels[i+3],b=c[2]*pixels[i+7],j=i+W*4,cw=c[3]*pixels[j+3],d=c[4]*pixels[j+7],alpha=a+b+cw+d;
  out[3]=alpha;
  if(alpha<.001){out[0]=out[1]=out[2]=0;return;}
  for(let k=0;k<3;k++)out[k]=(pixels[i+k]*a+pixels[i+4+k]*b+pixels[j+k]*cw+pixels[j+4+k]*d)/alpha;
}
function draw(src,job){
  const started=performance.now(),position=Math.max(0,Math.min(src.count-.00001,job.frame)),pair=Math.floor(position),t=position-pair;
  const a=cell(src,pair),b=cell(src,src.next[pair]),result=src.output.getContext('2d'),image=result.createImageData(W,H),dest=image.data;
  const f=[0,0],ca=[0,0,0,0,0],cb=[0,0,0,0,0],rgba=[0,0,0,0],rgbb=[0,0,0,0],ink=Math.max(0,1-job.darkness/100);
  const left=Math.max(0,Math.min(a.bounds[0],b.bounds[0])-24),right=Math.min(W-1,Math.max(a.bounds[2],b.bounds[2])+24);
  const top=Math.max(0,Math.min(a.bounds[1],b.bounds[1])-24),bottom=Math.min(H-1,Math.max(a.bounds[3],b.bounds[3])+24);
  const weights=new Float32Array(W),tailY=new Float32Array(W),tailX=new Float32Array(H);
  for(let x=0;x<W;x++){const w=Math.max(0,(W*.28-x)/(W*.28));weights[x]=w*w;tailY[x]=2.1*Math.sin(job.time*2.3-x*.021)*weights[x];}
  for(let y=0;y<H;y++)tailX[y]=.7*Math.sin(job.time*2.2-y*.014);
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    const tx=x-tailX[y]*weights[x],ty=y-tailY[x];let ax=tx,ay=ty,bx=tx,by=ty;
    if(t>0){flowAt(src,pair,tx,ty,false,f);ax=tx-f[0]*t;ay=ty-f[1]*t;if(Math.abs(f[0])+Math.abs(f[1])>4){flowAt(src,pair,ax,ay,false,f);ax=tx-f[0]*t;ay=ty-f[1]*t;}}
    if(t<1){flowAt(src,pair,tx,ty,true,f);bx=tx-f[0]*(1-t);by=ty-f[1]*(1-t);if(Math.abs(f[0])+Math.abs(f[1])>4){flowAt(src,pair,bx,by,true,f);bx=tx-f[0]*(1-t);by=ty-f[1]*(1-t);}}
    coordinate(ax,ay,ca);coordinate(bx,by,cb);
    const distance=field(a.distance,ca)*(1-t)+field(b.distance,cb)*t;
    // A single level set defines the contour; even imperfect correspondence
    // cannot leave two separately faded silhouettes or a midpoint hard cut.
    const edge=Math.max(0,Math.min(1,(distance+1.1)/2.2));if(edge<=0)continue;
    const alpha=edge*edge*(3-2*edge)*255,o=(y*W+x)*4;
    color(a.pixels,ca,rgba);color(b.pixels,cb,rgbb);
    const wa=(1-t)*rgba[3],wb=t*rgbb[3],sum=wa+wb;
    for(let k=0;k<3;k++)dest[o+k]=sum>.01?(rgba[k]*wa+rgbb[k]*wb)/sum*ink:0;
    dest[o+3]=alpha;
  }
  result.putImageData(image,0,0);
  return {key:job.key,epoch:job.epoch,texture:src.output.transferToImageBitmap(),serial:++serial,position,stamp:job.stamp,workerMs:performance.now()-started};
}
onmessage=({data})=>{
  if(data.type==='drop'){sources.delete(data.key);return;}
  if(data.type==='source'){
    const header=new DataView(data.vectors),gw=header.getUint16(4,true),gh=header.getUint16(6,true),count=header.getUint16(8,true),offset=12+count+(count%2);
    const next=new Uint8Array(data.vectors,12,count),registration=new Int16Array(data.vectors,offset,count*2),flow=new Int16Array(data.vectors,offset+count*4);
    const atlas=new OffscreenCanvas(W*4,H*Math.ceil(count/4)),context=atlas.getContext('2d');
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(data.texture,0,0,atlas.width,atlas.height);data.texture.close();
    const single=new OffscreenCanvas(W,H),cellContext=single.getContext('2d',{willReadFrequently:true});
    sources.set(data.key,{epoch:data.epoch,gw,gh,count,next,registration,flow,atlas,cellContext,cells:new Map(),output:new OffscreenCanvas(W,H)});
    postMessage({type:'ready',key:data.key,epoch:data.epoch});return;
  }
  if(data.type==='draw'){
    const results=[];for(const job of data.jobs){const src=sources.get(job.key);if(src&&src.epoch===job.epoch)results.push(draw(src,job));}
    postMessage({results},results.map(r=>r.texture));
  }
};
