/* One companion, one owner of the stage. Idle/wake clocks never use music events. */
'use strict';
const sleepClamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const sleepEase=n=>{n=sleepClamp(n);return n*n*(3-2*n);};
const CAT_SETTLE_SECONDS=2.4,CAT_WAKE_SECONDS=2.8;
class CatActivityClock{
  constructor(now=0){this.reset(now);}
  reset(now){this.lastActivity=now;this.clearWake();}
  clearWake(){this.started=null;this.lastMove=null;}
  activity(now,movement=false,petting=false){
    this.lastActivity=now;
    if(petting){this.clearWake();return;}
    if(movement){if(this.lastMove===null||now-this.lastMove>=10)this.started=now;this.lastMove=now;}
  }
  readyToWake(now){
    if(this.lastMove===null)return false;
    if(now-this.lastMove>=10){this.clearWake();return false;}
    return this.started!==null&&now-this.started>=30;
  }
  idle(now){return now-this.lastActivity>=300;}
}
class SleepingCat{
  constructor({notify=()=>{}}={}){
    this.notify=notify;this.state='idle';this.age=0;this.images=new Map();this.canvas=document.createElement('canvas');
    this.catMask=document.createElement('canvas');this.token=0;this.style='curl';this.handStyle=-1;
  }
  get active(){return this.state!=='idle';}
  get settleSeconds(){return this.style==='side'?1.8:CAT_SETTLE_SECONDS;}
  get wakeSeconds(){return this.style==='side'?2.1:CAT_WAKE_SECONDS;}
  get sleeping(){return ['enter','settle','sleep','pet','loading'].includes(this.state);}
  async load(){
    if(this.ready)return;
    if(!SleepingCat.sharedLoad){
      SleepingCat.sharedLoad=(async()=>{
        const response=await fetch('cat-sleep/metadata.json',{cache:'no-cache'});if(!response.ok)throw Error('sleep assets');
        const metadata=await response.json(),art=metadata.variants||metadata,images=new Map();
        const files=[...Object.values(art).map(v=>v.file),'cat-motion/sneak.webp','cat-motion/sneak-b.webp'];
        await Promise.all(files.map(async file=>{const image=new Image();image.src=typeof siteAsset==='function'?siteAsset(file):file;await image.decode();images.set(file,image);}));
        return {art,images};
      })().catch(error=>{SleepingCat.sharedLoad=null;throw error;});
    }
    const resources=await SleepingCat.sharedLoad;this.art=resources.art;this.images=resources.images;this.ready=true;
  }
  async request(){
    if(this.active)return;
    this.state='loading';const token=++this.token;
    try{await this.load();if(token!==this.token)return;this.state='enter';this.age=0;this.positioned=false;this.wakeRequested=false;
      this.style=Math.random()<.5?'curl':'side';this.runVariant=Math.random()<.5?0:1;this.entrySide=Math.random()<.5?-1:1;
      this.flip=-this.entrySide;this.walkPhase=0;this.sleepTime=0;this.sizeDraw=Math.random();
    }catch{if(token!==this.token)return;this.state='idle';this.notify('猫咪素材暂未就绪，请稍后再试');}
  }
  cancelLoading(){if(this.state==='loading'){++this.token;this.state='idle';}}
  wake(){
    if(!this.active||this.state==='exit'||this.state==='wake')return;
    if(this.state==='loading'){this.cancelLoading();return;}
    this.wakeRequested=true;
    if(this.state==='pet'){this.petEnd=Math.min(this.petEnd,this.age+1);return;}
    if(this.state==='sleep')this.setState('wake');
  }
  pet(){
    if(this.wakeRequested)return false;
    if(this.state==='pet'){this.handStyle=(this.handStyle+1)%3;this.petEnd=2.8;this.age=0;return true;}
    if(this.state!=='sleep')return false;
    this.handStyle=(this.handStyle+1+Math.floor(Math.random()*2))%3;
    this.petEnd=2.8;this.setState('pet');return true;
  }
  setState(state){this.state=state;this.age=0;}
  layout(width,height,cx,stage,scene,beam){
    const oldWidth=this.width,oldHeight=this.height,oldSize=this.bodyWidth;
    this.width=width;this.height=height;
    this.sizeDraw??=Math.random();
    // Exactly the original cat's percentage-to-body-mass normalization.
    // Keep one percentile during a visit so editing either range endpoint
    // changes this same cat smoothly rather than choosing a new random size.
    const low=Number(scene.catMinSize)||16,high=Math.max(low,Number(scene.catMaxSize)||low);
    const ratio=low+Math.floor(this.sizeDraw*(high-low+1));
    this.bodyWidth=Math.min(stage,width*.54)*1.26*ratio/100;
    const shoulder=stage*.18,edge=this.bodyWidth*1.02;
    const target=sleepClamp(cx+this.entrySide*shoulder,Math.min(edge,width/2),Math.max(width-edge,width/2));
    if(!this.positioned){
      this.targetX=target;this.targetNorm=target/width;
      this.x=this.entrySide<0?-this.bodyWidth*1.15:width+this.bodyWidth*1.15;
      this.startX=this.x;
      this.enterTime=Math.abs(target-this.x)/(this.bodyWidth*(this.runVariant?1.8:1.45))+1;
      this.positioned=true;
    }else{
      if(oldWidth!==width||oldHeight!==height){
        const factor=width/(oldWidth||width);this.x*=factor;this.startX*=factor;
      }
      this.targetX=target;this.targetNorm=target/width;
      if(['sleep','pet','wake','settle'].includes(this.state))this.x=this.targetX;
      if(oldSize!==this.bodyWidth)this.rasterKey='';
    }
  }
  update(dt,view){
    if(!this.active||this.state==='loading')return;
    this.layout(view.width,view.height,view.cx,view.stage,view.scene,view.beam);
    this.age+=dt;this.sleepTime+=dt;
    if(this.state==='enter'){
      const u=sleepClamp(this.age/this.enterTime);
      // Smooth acceleration, a steady gait, then a complete planted stop.
      this.x=this.startX+(this.targetX-this.startX)*sleepEase(u);
      const distance=Math.abs(this.targetX-this.startX),cycles=Math.max(1,Math.round(distance/Math.max(1,this.bodyWidth*.50)));
      this.walkPhase=sleepEase(u)*cycles;
      if(u>=1)this.setState('settle');
    }else if(this.state==='settle'&&this.age>=this.settleSeconds){this.setState(this.wakeRequested?'wake':'sleep');}
    else if(this.state==='pet'&&this.age>=this.petEnd){this.setState(this.wakeRequested?'wake':'sleep');}
    else if(this.state==='wake'&&this.age>=this.wakeSeconds){this.setState('exit');this.exitStart=this.x;this.walkPhase=0;}
    else if(this.state==='exit'){
      const speed=this.bodyWidth*(this.runVariant?1.15:.90),acc=.65;
      this.x=this.exitStart+this.flip*speed*(this.age-acc*(1-Math.exp(-this.age/acc)));
      this.walkPhase=Math.abs(this.x-this.exitStart)/Math.max(1,this.bodyWidth*.50);
      if(this.x<-this.bodyWidth||this.x>view.width+this.bodyWidth)this.setState('idle');
    }
  }
  sample(){
    const art=this.art[this.style];
    // Draw only the hand-authored anatomical poses. The generated contour
    // in-betweens collapse the paws, ears and tail as the animal changes pose.
    const seq=(art.authoredRoute||[]).map(source=>art.frames.findIndex(frame=>frame.authoredFrame===source)).filter(index=>index>=0);
    const wake=art.wakeRoute||[...seq].reverse();
    let index;
    if(this.state==='settle')index=seq[Math.min(seq.length-1,Math.floor(sleepEase(this.age/this.settleSeconds)*seq.length))];
    else if(this.state==='wake')index=wake[Math.min(wake.length-1,Math.floor(sleepEase(this.age/this.wakeSeconds)*wake.length))];
    else if(this.state==='pet'){
      const count=this.handStyle===1?3:this.handStyle===2?6:4;
      const list=(art.wakeRoute||[...seq].reverse()).slice(0,count);
      const rise=sleepEase(this.age/.75)*(1-sleepEase((this.age-(this.petEnd-.9))/.9));
      index=list[Math.round(rise*(list.length-1))];
    }else{
      index=art.sleepFrame??seq[seq.length-1];
    }
    return {art,index,meta:art.frames[index],image:this.images.get(art.file)};
  }
  draw(ctx,view){
    if(!this.active||this.state==='loading'||!this.positioned)return;
    const bw=this.bodyWidth,quality=Math.min(1.6,globalThis.devicePixelRatio||1),rw=Math.ceil(bw*3.2*quality),rh=Math.ceil(bw*2.4*quality);
    if(this.canvas.width!==rw||this.canvas.height!==rh){for(const c of [this.canvas,this.catMask]){c.width=rw;c.height=rh;}}
    const ox=bw*1.6,oy=bw*1.55;
    const rasterKey=[this.state,this.style,this.runVariant,this.handStyle,view.scene.catDarkness,rw,rh,Math.floor(this.age*30),Math.floor(this.sleepTime*24),Math.floor(this.walkPhase*24)].join('|');
    if(rasterKey!==this.rasterKey){
    this.rasterKey=rasterKey;
    const g=this.catMask.getContext('2d',{willReadFrequently:true});
    g.setTransform(quality,0,0,quality,ox*quality,oy*quality);g.clearRect(-ox,-oy,rw/quality,rh/quality);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingQuality='high';
    let head,chin,bounds;
    const drawNative=()=>{
      const key='sneak',pose=this.runVariant?catAltPoses[key]:catPoses[key],file='cat-motion/sneak'+(this.runVariant?'-b':'')+'.webp',im=this.images.get(file);
      const cols=4,cw=im.naturalWidth/cols,ch=cw*2/3,frames=Math.round(im.naturalHeight/ch)*cols;
      const i=Math.floor(this.walkPhase*frames)%frames,scale=bw/pose.sizeReference,foot=(pose.pawRow[i]+1)*1024/ch;
      g.drawImage(im,(i%4)*cw,Math.floor(i/4)*ch,cw,ch,-768*scale,-foot*scale,1536*scale,1024*scale);
    };
    if(this.state==='enter'||this.state==='exit'){
      drawNative();bounds=[-bw*1.2,-bw*1.4,bw*1.2,0];
    }else{
      const {art,index,meta,image}=this.sample(),cw=art.cellWidth,ch=art.cellHeight;
      const scale=bw/art.referenceWidth,ax=meta.anchorX??cw/2,foot=meta.baseline;
      const dx=-ax*scale,dy=-foot*scale,w=cw*scale,h=ch*scale;
      const sx=index%art.columns*cw,sy=Math.floor(index/art.columns)*ch;
      // Keep every silhouette intact. A subpixel rise from the planted floor
      // suggests sleep breathing without independently warping body slices.
      const asleep=this.state==='sleep',period=this.style==='curl'?4.8:5.6;
      const breath=(asleep?Math.sin(this.sleepTime*Math.PI*2/period):0)*bw*.0025;
      g.drawImage(image,sx,sy,cw,ch,dx,dy-breath,w,h+breath);
      head=[(meta.head[0]-ax)*scale,(meta.head[1]-foot)*scale];
      chin=meta.chin?[(meta.chin[0]-ax)*scale,(meta.chin[1]-foot)*scale]:head;
      bounds=[(meta.bounds[0]-ax)*scale,(meta.bounds[1]-foot)*scale,(meta.bounds[2]-ax)*scale,(meta.bounds[3]-foot)*scale];
    }
    g.globalCompositeOperation='source-in';g.fillStyle='#000';g.fillRect(-ox,-oy,rw/quality,rh/quality);g.globalCompositeOperation='source-over';
    const out=this.canvas.getContext('2d');out.setTransform(1,0,0,1,0,0);out.clearRect(0,0,rw,rh);out.drawImage(this.catMask,0,0);
    const tone=Math.round(22*(1-(view.scene.catDarkness??100)/100));
    if(tone){out.globalCompositeOperation='source-in';out.fillStyle='rgb('+tone+','+tone+','+tone+')';out.fillRect(0,0,rw,rh);out.globalCompositeOperation='source-over';}
    this.rasterBounds=bounds;
    }
    const follow=view.scene.catFollowLight,beam=view.beam;
    const ray=(this.x-beam.x)/Math.max(view.height*.6,view.height-beam.y),targetShear=follow?sleepClamp(ray*.07-(beam.slope||0)*.12,-.12,.12):0;
    this.shear=(this.shear??targetShear)+(targetShear-(this.shear??targetShear))*.14;
    const stretch=follow?sleepClamp(1+.09*((beam.heightScale||1)-1),.96,1.10):1;
    const near=1-sleepEase((Math.hypot(this.x-beam.x,view.height-beam.y)/view.height-.23)/.9);
    const opacity=(view.scene.catFar+(view.scene.catOpacity-view.scene.catFar)*near)/100;
    ctx.save();ctx.translate(this.x,view.height);ctx.transform(this.flip,0,this.shear,stretch,0,0);
    ctx.globalAlpha=opacity;ctx.globalCompositeOperation='source-over';
    // The kitten is the only projected silhouette; touching is virtual.
    ctx.filter=follow?'blur('+Math.min(1.1,bw*.0025)+'px)':'none';
    ctx.drawImage(this.canvas,-ox,-oy,rw/quality,rh/quality);ctx.restore();
    this.hit={bounds:this.rasterBounds,ox,oy,quality,stretch,shear:this.shear,x:this.x,y:view.height,flip:this.flip};
  }
  contains(x,y){
    if(!['sleep','pet'].includes(this.state)||!this.hit)return false;
    const h=this.hit,ly=(y-h.y)/h.stretch,lx=(x-h.x-h.shear*ly)/h.flip,b=h.bounds;
    if(lx<b[0]-7||lx>b[2]+7||ly<b[1]-7||ly>b[3]+7)return false;
    const px=Math.round((lx+h.ox)*h.quality),py=Math.round((ly+h.oy)*h.quality);
    const g=this.catMask.getContext('2d',{willReadFrequently:true});
    const x0=Math.max(0,px-5),y0=Math.max(0,py-5),w=Math.min(11,this.catMask.width-x0),height=Math.min(11,this.catMask.height-y0);
    if(w<=0||height<=0)return false;
    const a=g.getImageData(x0,y0,w,height).data;for(let i=3;i<a.length;i+=4)if(a[i]>40)return true;return false;
  }
}
class CatCompanion{
  constructor(paw,{scene,notify=()=>{},now=()=>performance.now()/1000}){this.getNow=now;this.paused=false;this.paw=paw;this.scene=scene;this.ground=new SleepingCat({notify});this.clock=new CatActivityClock(this.getNow());this.queued=null;this.now=this.getNow();this.prepared=false;this.lastGround=false;}
  activity(now,movement=false){if(this.paused)return;this.now=now;this.clock.activity(now,movement&&this.ground.sleeping,this.ground.state==='pet');}
  request(kind){
    if(this.paused)return;
    this.clock.reset(this.now);
    if(kind==='wake'){this.queued=null;this.ground.wake();return;}
    if(kind==='sleep'&&this.ground.active)return;
    this.queued=kind;
    if(this.ground.active)this.ground.wake();
    if(this.paw.path){this.paw.again=false;this.paw.path.visit?.withdraw();}
    else if(this.paw.pending||this.paw.awaitingReady)this.paw.reset();
  }
  tick(now,dt,view){
    if(this.paused)return;
    this.now=now;
    if(document.hidden)return;
    if(this.ground.state==='pet')this.clock.reset(now);
    if(this.ground.sleeping&&this.clock.readyToWake(now)){this.ground.wake();this.clock.clearWake();}
    if(!this.ground.active&&!this.paw.path&&!this.paw.pending){
      if(this.lastGround){this.clock.reset(now);this.lastGround=false;}
      if(this.queued){const action=this.queued;this.queued=null;
        if(action==='sleep'){this.ground.request();this.lastGround=true;}
        else this.paw.select(action==='random'?'random':action);
      }else if(this.scene().catIdleSleep&&this.clock.idle(now)){this.ground.request();this.lastGround=true;this.clock.reset(now);}
    }
    if(!this.prepared&&now-this.clock.lastActivity>240){this.prepared=true;this.ground.load().catch(()=>{this.prepared=false;this.clock.reset(now);});}
    if(!document.hidden)this.ground.update(dt,view);
  }
  petAt(x,y){if(this.paused)return false;if(!this.ground.contains(x,y))return false;const accepted=this.ground.pet();if(accepted)this.clock.reset(this.now);return accepted;}
  visibility(){this.clock.reset(this.getNow());}
}
