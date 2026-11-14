// Background geometry, separate from the slower finite-light bake queue.
// Present only the latest completed silhouette; never crossfade geometry.
class ProjectionSurfaces {
  constructor(){
    this.entries=new Map();this.nextId=0;this.busy=false;this.scheduled=false;
    this.failed=typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined';
    if(this.failed)return;
    try{
      this.worker=new Worker('projection-spread-worker.js');
      this.worker.onmessage=({data})=>{
        this.busy=false;
        if(data.error){this.fail();return;}
        for(const result of data.results){
          const entry=[...this.entries.values()].find(e=>e.id===result.id);
          if(!entry){result.texture.close();continue;}
          // Replace one silhouette with one silhouette. Geometry is already
          // continuous in the pendulum; dissolving different contours creates
          // two shadows and visibly trails the light.
          entry.current?.texture.close?.();
          entry.current=result;entry.initial=null;

        }
        this.schedule();
      };
      this.worker.onerror=()=>this.fail();
    }catch{this.fail();}
  }
  fail(){this.failed=true;this.worker?.terminate();this.worker=null;for(const e of this.entries.values()){e.current?.texture.close?.();}this.entries.clear();}
  schedule(){
    if(this.scheduled||this.failed)return;
    this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;this.pump();});
  }
  pump(){
    if(this.busy||this.failed)return;
    const jobs=[];
    for(const e of this.entries.values()){
      if(!e.ready||!e.wanted)continue;
      const {expansion,tone}=e.wanted;
      if(e.sent&&Math.abs(e.sent.expansion-expansion)<.00001&&e.sent.tone===tone)continue;
      e.sent={expansion,tone};jobs.push({id:e.id,expansion,tone});
    }
    if(jobs.length){this.busy=true;this.worker.postMessage({type:'draw',jobs});}
  }
  draw(part,expansion,tone=0){
    if(this.failed)return null;
    let e=this.entries.get(part);
    if(!e){
      e={id:++this.nextId,ready:false,current:null};this.entries.set(part,e);
      createImageBitmap(part.texture).then(texture=>{
        if(this.failed||this.entries.get(part)!==e){texture.close();return;}
        this.worker.postMessage({type:'source',id:e.id,texture},[texture]);e.ready=true;this.schedule();
      }).catch(()=>this.fail());
    }
    this.entries.delete(part);this.entries.set(part,e);e.wanted={expansion,tone};this.schedule();
    // Keep just the recently used rows; evicted worker atlases and transferred
    // images are explicitly released, not left to accumulate across a playlist.
    while(this.entries.size>12){
      const key=this.entries.keys().next().value,old=this.entries.get(key);this.entries.delete(key);
      old.current?.texture.close?.();this.worker.postMessage({type:'drop',id:old.id});
    }
    if(!e.current){
      // First use already has the final ray-traced field. Do not downsample
      // it: replacing a tiny provisional warp used to expose progressive detail.
      if(!e.initial)e.initial={texture:LetterProjector.prototype.spreadTextureSync(part,expansion,tone),expansion};
      return e.initial;
    }
    return e.current;
  }
}
