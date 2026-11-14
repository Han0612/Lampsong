// Keep full, contiguous source rows. Subpixel horizontal sampling produces no
// alpha overlaps, clipped triangle seams, or two-pixel steps.
const sources=new Map();
self.onmessage=({data})=>{
  try{
    if(data.type==='source'){sources.set(data.id,{texture:data.texture});return;}
    if(data.type==='drop'){const part=sources.get(data.id);part?.texture.close();sources.delete(data.id);return;}
    const results=[];
    for(const {id,expansion,tone}of data.jobs){
      const part=sources.get(id);if(!part)continue;
      const texture=part.texture,gray=Math.round((tone||0)*255);
      if(part.gray!==gray){
        part.gray=gray;
        if(gray){
          part.ink ||= new OffscreenCanvas(texture.width,texture.height);const g=part.ink.getContext('2d');
          g.globalCompositeOperation='copy';g.drawImage(texture,0,0);g.globalCompositeOperation='source-in';g.fillStyle=`rgb(${gray},${gray},${gray})`;g.fillRect(0,0,texture.width,texture.height);g.globalCompositeOperation='source-over';
        }
      }
      const src=gray?part.ink:texture;
      // Fixed size per source: movement cannot reallocate/rescale the backing
      // surface at threshold crossings. 0.8 MP maximum for each warped row.
      part.out ||= new OffscreenCanvas(Math.min(2048,Math.floor(800000/src.height),Math.ceil(src.width*1.6/128)*128),src.height);
      const out=part.out,g=out.getContext('2d');g.clearRect(0,0,out.width,out.height);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      for(let y=0;y<src.height;y++){
        const width=out.width*(1+expansion*(y+.5)/src.height)/(1+expansion);
        g.drawImage(src,0,y,src.width,1,(out.width-width)/2,y,width,1);
      }
      results.push({id,expansion,texture:out.transferToImageBitmap()});
    }
    self.postMessage({results},results.map(r=>r.texture));
  }catch(error){self.postMessage({error:String(error)});}
};
