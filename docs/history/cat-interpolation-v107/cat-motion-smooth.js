// Bidirectional geometry with one continuous silhouette; no midpoint source switch.
// Worker-side contour reconstruction avoids double-image opacity dissolves.
(()=>{
  const base=new URL('.',document.currentScript.src);
  class CatMotionSmoother{
    constructor(){
      this.entries=new Map();this.held=new Map();this.maxSources=location.pathname.includes('/cat-stills/')?8:3;this.busy=false;this.serial=0;this.queued=false;
      this.failed=typeof Worker==='undefined'||typeof createImageBitmap==='undefined'||typeof OffscreenCanvas==='undefined';
      if(this.failed)return;
      try{
        this.worker=new Worker(new URL('cat-motion-worker.js?v=107',base));
        this.worker.onmessage=({data})=>{
          if(data.type==='ready'){const e=this.entries.get(data.key);if(e&&e.epoch===data.epoch){e.ready=true;this.schedule();}return;}
          this.busy=false;
          for(const r of data.results||[]){const e=this.entries.get(r.key);if(!e||e.epoch!==r.epoch){r.texture.close();continue;}
            e.current?.texture.close();e.current=r;
          }
          this.schedule();
        };
        this.worker.onerror=()=>this.fail();
      }catch{this.fail();}
    }
    fail(){this.failed=true;this.worker?.terminate();for(const e of this.entries.values())e.current?.texture.close();this.entries.clear();for(const e of this.held.values())e.texture.close();this.held.clear();}
    key(image){return image.catMotionKey||new URL(image.src,base).pathname.split('/').pop().replace(/\.webp$/,'');}
    prime(image){
      if(this.failed||!image.complete||!image.naturalWidth||!(image.catMotionKey||image.src.includes('/cat-motion/')))return null;
      const key=this.key(image);let e=this.entries.get(key);
      if(!e){
        e={key,epoch:++this.serial,ready:false,current:this.held.get(key)||null,wanted:null};this.held.delete(key);this.entries.set(key,e);
        Promise.all([createImageBitmap(image),fetch(new URL('cat-motion-flow/'+key+'.bin',base),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('motion vectors');return r.arrayBuffer();})])
          .then(([texture,vectors])=>{if(this.failed||this.entries.get(key)!==e){texture.close();return;}
            this.worker.postMessage({type:'source',key,epoch:e.epoch,texture,vectors},[texture,vectors]);
          }).catch(()=>{e.unavailable=true;});
      }
      this.entries.delete(key);this.entries.set(key,e);
      while(this.entries.size>this.maxSources){
        const k=this.entries.keys().next().value,old=this.entries.get(k);
        if(old.current){this.held.get(k)?.texture.close();this.held.delete(k);this.held.set(k,old.current);}
        this.entries.delete(k);this.worker.postMessage({type:'drop',key:k});
      }
      while(this.held.size>32){const k=this.held.keys().next().value;this.held.get(k).texture.close();this.held.delete(k);}
      return e;
    }
    schedule(){if(this.queued||this.failed)return;this.queued=true;queueMicrotask(()=>{this.queued=false;this.pump();});}
    pump(){
      if(this.busy||this.failed)return;
      const jobs=[];
      for(const e of this.entries.values())if(e.ready&&e.wanted&&e.sent!==e.wanted.stamp){e.sent=e.wanted.stamp;jobs.push({key:e.key,epoch:e.epoch,...e.wanted});}
      if(jobs.length){this.busy=true;this.worker.postMessage({type:'draw',jobs});}
    }
    draw(image,position,time,darkness=0){
      const e=this.prime(image);if(!e)return null;
      const frame=Math.floor(position*60+1e-6)/60,tail=Math.floor(time*60)/60;
      const stamp=frame+'|'+tail+'|'+darkness;
      e.wanted={frame,time:tail,darkness,stamp};this.schedule();
      if(!e.current){
        if(e.unavailable)return null;
        // During the first worker bake, keep one authored pose stable. Returning
        // to a cached clip holds its last interpolated bitmap until ready.
        const w=image.naturalWidth/4,h=w*2/3,count=Math.round(image.naturalHeight/h)*4;
        if(e.initial===undefined)e.initial=Math.max(0,Math.min(count-1,Math.round(position)));
        return {tile:null,cell:{index:'initial-'+e.initial,position:e.initial,w,h,sx:e.initial%4*w,sy:Math.floor(e.initial/4)*h}};
      }
      return {tile:e.current.texture,cell:{index:e.current.serial,position:e.current.position,w:e.current.texture.width,h:e.current.texture.height,sx:0,sy:0}};
    }
  }
  globalThis.catFrameNext=(key,i,count)=>{
    if(key==='exit-upper')return Math.min(count-1,i+1);
    if(key.startsWith('exit-')&&i===count-1)return 8;
    if(['leap','arch','land'].includes(key)&&[23,31].includes(i))return i-7;
    if(key==='kick'&&i===count-1)return 16;
    return (i+1)%count;
  };
  globalThis.catMotionSmoothing=new CatMotionSmoother();
})();
