// Only the expensive alpha field is computed here; movement stays on the UI thread.
importScripts('caster.js');
const projector=new LetterProjector();
self.onmessage=({data})=>{
  try{
    const parts=data.masks.map((mask,i)=>{
      const part=projector.bake(mask,...data.args,data.raster,8);
      return {...part,texture:part.texture.transferToImageBitmap(),heightRatio:data.ratios[i]};
    });
    self.postMessage({id:data.id,parts},parts.map(part=>part.texture));
  }catch(error){self.postMessage({id:data.id,error:String(error)});}
};
