const catRange=(min,max)=>min+(max-min)*Math.random();
const catStageBounds=(cx,stage,width)=>({left:Math.max(0,cx-stage*.61),right:Math.min(width,cx+stage*.61)});

// Measured visible silhouette heights in logical sprite units, excluding padding.
// Use the median frame height so gait changes do not make the floor bob.
const catGroundHeights={sneak:{a:513,b:519,still:465},leap:{a:651,b:667,still:576},kick:{a:612,b:640,still:835}};

// A finite light aperture casts several nearby projections. Averaging them
// softens the distant contour without filters, duplicate trails or sprite warping.
class CatShadowProjection {
  constructor(){this.surface=null;this.key=null;}
  geometry(beam,x,y,height,pose,foot,route){
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const depth=clamp(beam.heightScale||1,.6,1.6);
    const ray=(x-beam.x)/Math.max(height*.55,y-beam.y,1);
    const slope=beam.slope||0;
    const vertical=foot!=null||route==='overhang'||route==='arc'||route==='landing';
    const stretch=clamp(1+.13*(depth-1)+.075*Math.abs(ray)+.08*Math.abs(slope),.94,1.20);
    const shear=clamp(ray*.095-slope*.16,-.18,.18);
    const distance=clamp(Math.hypot(x-beam.x,y-beam.y)/height,.25,1.5);
    // The same wall-distance input drives the letter projection. A longer
    // throw increases penumbra; motion does not add a delayed ghost image.
    const softness=clamp(.0025+.005*distance+.007*Math.abs(slope)+.008*Math.abs(depth-1),.003,.02);
    return {vertical,stretch,shear,softness,ax:pose.anchorX,
      ay:foot??(route==='overhang'?pose.bounds[1]:pose.anchorY)};
  }
  draw(ctx,tile,cell,pose,scale,geometry,flip){
    const g=geometry,margin=384,logicalW=1536+2*margin,logicalH=1024+2*margin;
    const quality=Math.min(.5,Math.max(.28,scale*(globalThis.devicePixelRatio||1)));
    const w=Math.ceil(logicalW*quality),h=Math.ceil(logicalH*quality);
    const key=[cell.index,cell.w,cell.h,w,h,g.vertical,g.ax,g.ay,
      g.stretch.toFixed(3),g.shear.toFixed(3),g.softness.toFixed(4),flip].join('|');
    if(this.key!==key||this.tile!==tile){
      if(!this.surface)this.surface=document.createElement('canvas');
      const out=this.surface;
      if(out.width!==w||out.height!==h){out.width=w;out.height=h;}
      const paint=out.getContext('2d');
      paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,w,h);
      paint.setTransform(w/logicalW,0,0,h/logicalH,0,0);
      paint.globalCompositeOperation='lighter';
      const samples=16;paint.globalAlpha=1/samples;
      for(let i=0;i<samples;i++){
        const r=Math.sqrt((i+.5)/samples),angle=i*2.399963229728653;
        const sx=Math.cos(angle)*r*g.softness,sy=Math.sin(angle)*r*g.softness;
        paint.save();paint.translate(margin+g.ax,margin+g.ay);
        if(g.vertical)paint.transform(1,0,(g.shear+sx)*flip,g.stretch+sy,0,0);
        else paint.transform(g.stretch+sy,(g.shear+sx)*flip,0,1,0,0);
        paint.drawImage(tile,cell.sx,cell.sy,cell.w,cell.h,-g.ax,-g.ay,1536,1024);
        paint.restore();
      }
      paint.globalAlpha=1;paint.globalCompositeOperation='source-over';
      this.key=key;this.tile=tile;
    }
    ctx.drawImage(this.surface,-pose.anchorX-margin,-pose.anchorY-margin,logicalW,logicalH);
  }
}

class CatPaw {
  constructor(){
    this.tile=document.createElement('canvas');
    this.projection=new CatShadowProjection();
    this.images=new Map();
    this.queue=[];
    this.sideChoices=new Map();
    this.lastPose=null;
    this.choice='random';
    this.poseKey='master';
    this.reset();
  }
  reset(){this.path=null;this.pending=false;this.again=false;this.awaitingReady=false;}
  available(key,alternate){
    const exit=catExitGroups[key];
    return typeof siteAssetReady!=='function'||(siteAssetReady('cat-motion/'+key+(alternate?'-b':'')+'.webp')&&
      (!exit||siteAssetReady(catExitArt[exit].file)));
  }
  hasReadyVariant(key){
    if(this.fixedVariant)return this.available(key,this.fixedVariant==='b');
    return this.available(key,false)||this.available(key,true);
  }
  chooseVariant(key){
    if(this.fixedVariant)return this.fixedVariant==='b';
    if(!this.available(key,false))return true;
    return this.available(key,true)&&Math.random()<.5;
  }
  preloadNext(){
    if(!this.nextPrepared){
      const key=this.nextKey();
      if(!key)return Promise.resolve();
      this.nextPrepared={key,alternate:this.chooseVariant(key)};
    }
    const {key,alternate}=this.nextPrepared;
    const image=this.imageFor('cat-motion/'+key+(alternate?'-b':'')+'.webp');
    const exit=catExitGroups[key],files=[image];
    if(exit)files.push(this.imageFor(catExitArt[exit].file));
    return Promise.all(files.map(file=>file.decode?file.decode():Promise.resolve()));
  }
  nextKey(){
    if(this.choice!=='random')return this.hasReadyVariant(this.choice)?this.choice:null;
    // Recheck at consumption, including after manual selection and late loads.
    // A/B share one pose key and cannot bypass the no-repeat rule.
    this.queue=this.queue.filter(key=>key!==this.lastPose&&this.hasReadyVariant(key));
    if(!this.queue.length){
      const keys=Object.keys(catPoses).filter(key=>key!==this.lastPose&&this.hasReadyVariant(key));
      for(let i=keys.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [keys[i],keys[j]]=[keys[j],keys[i]];
      }
      this.queue=keys;
    }
    return this.queue.pop();
  }
  select(value){
    if(this.choice!==value)this.nextPrepared=null;
    this.choice=value;
    if(this.path?.visit?.last){
      this.again=true;this.path.visit.withdraw();this.preloadNext().catch(()=>{});return;
    }
    this.again=false;
    const candidate=this.nextPrepared;
    const prepared=candidate&&this.hasReadyVariant(candidate.key)&&
      (value==='random'?candidate.key!==this.lastPose:candidate.key===value)?candidate:null;
    const key=prepared?.key||this.nextKey();
    this.nextPrepared=null;
    if(!key){this.pending=false;this.awaitingReady=true;return;}
    this.poseKey=key;this.awaitingReady=false;
    this.alternate=prepared?prepared.alternate:this.chooseVariant(this.poseKey);
    this.sizeDraw=Math.random();
    this.entryDraw=Math.random();
    this.pending=true;
  }
  trigger(){
    if(this.path?.visit?.last){
      this.again=true;this.path.visit.withdraw();this.preloadNext().catch(()=>{});return;
    }
    this.select(this.choice);
  }
  entryInRange(min,max){return min+Math.floor(this.entryDraw*(max-min+1));}
  sizeInRange(min,max){return min+Math.floor(this.sizeDraw*(max-min+1));}
  nextSide(){
    // Each pose gets both sides in a shuffled pair. Repeated testing cannot
    // get stuck on one side; the first side of each new pair remains random.
    let sides=this.sideChoices.get(this.poseKey);
    if(!sides?.length){
      const first=Math.random()<.5?-1:1;
      sides=[-first,first];this.sideChoices.set(this.poseKey,sides);
    }
    return sides.pop();
  }
  imageFor(file){
    if(!this.images.has(file)){
      // Keep only a few decoded sheets; repeated visits can draw from 24 atlases.
      if(this.images.size>=5)this.images.delete(this.images.keys().next().value);
      const image=new Image();image.src=typeof siteAsset==='function'?siteAsset(file):file;this.images.set(file,image);
    }
    const image=this.images.get(file);
    this.images.delete(file);this.images.set(file,image);
    return image;
  }
  edgeAt(beam,y,side,sample,level=.13){
    const center=beam.x+beam.slope*(y-beam.y);
    const peak=sample(center,y,beam);
    let lo=0,hi=beam.width*.5;
    // Locate the dim, still legible shoulder of this particular lamp footprint.
    for(let i=0;i<12;i++){
      const r=(lo+hi)*.5;
      if(sample(center+side*r,y,beam)>peak*level)lo=r;else hi=r;
    }
    return {x:center+side*lo,y,span:2*lo,peak};
  }
  choose(cx,stage,width,height,beam,sample){
    // Resizing preserves the visitor's side; only a new visit draws a side.
    const preferred=this.path?-this.path.flip:this.nextSide();
    const route=catRoutes[this.poseKey]||'edge';
    // Freeze the beam at arrival. A hand moving the lamp cannot pull a cat
    // sideways while its feet are planted or change its trajectory midflight.
    if(catTransit(route)){
      const low=catRange(.72,.82)*height, high=catRange(.48,.56)*height;
      const down=route==='landing'||Math.random()<.5;
      const ground=route==='cross'||this.poseKey==='leap';
      const y0=ground?height:(down?high:low);
      const y1=ground?height:(down?low:high);
      const start=this.edgeAt(beam,y0,preferred,sample),end=this.edgeAt(beam,y1,-preferred,sample);
      const flip=-preferred;
      let jump=null;
      if(route!=='cross'){
        // Pick separate offsets on the two sides of the light for each visit.
        const axis=Math.max(width*.20,Math.min(width*.85,beam.x));
        const room=stage*.08;
        const endpoint=(x,side)=>side>0?Math.min(width-room,Math.max(axis+room,x)):
          Math.max(room,Math.min(axis-room,x));
        const takeoff=endpoint(start.x-flip*start.span*catRange(-.10,.23),preferred);
        const touchdown=endpoint(end.x+flip*end.span*catRange(-.14,.20),-preferred);
        jump=new CatJump(this.poseKey,takeoff,y0,touchdown,y1,height);
      }
      return {route,x:start.x,y:y0,endX:end.x,flip,tilt:0,width,height,jump};
    }
    if(route==='run'){
      const y=height,edge=this.edgeAt(beam,y,preferred,sample);
      return {route,x:edge.x,y,spot:Math.random(),flip:-preferred,tilt:0,width,height};
    }
    const region=catStageBounds(cx,stage,width);
    const upper=route==='overhang';
    const targetY=(upper?catRange(.45,.54):catRange(.46,.80))*height;
    let best=null,score=-Infinity;
    // Pick a suitable height on the chosen side only. A screen-margin score
    // must never replace the randomly selected side with the other side.
    for(let i=0;i<28;i++){
      const y=beam.y+height*(.045+i*.032);
      if(y>height*(upper?.62:.91)||y<height*.39)continue;
      for(const side of [preferred]){
        const edge=this.edgeAt(beam,y,side,sample);
        if(edge.peak<=.005||edge.span<12)continue;
        const margin=Math.min(edge.x-region.left,region.right-edge.x);
        const value=-Math.abs(y-targetY)/height
          -Math.max(0,stage*.035-margin)/stage*8;
        if(value>score){score=value;best={...edge,side};}
      }
    }
    if(!best)return null;
    const {x,y,span,side}=best;
    if(catPoses[this.poseKey].footY){
      const axis=beam.x+beam.slope*(y-beam.y);
      const headX=Math.min(region.right-stage*.04,Math.max(region.left+stage*.04,axis+side*span*catRange(.14,.30)));
      return {route,x:headX,y,flip:-side,tilt:0,width,height,layoutCx:cx};
    }
    return {route,x,y,flip:-side,tilt:catRange(-.12,.12),width,height,layoutCx:cx};
  }
  placeAtFringe(p,pose,scale,beam,sample,entry=32){
    // Inward-most opaque contour at each height. Align it to the visible
    // penumbra, even when the paw is higher or lower than the pose origin.
    const side=-p.flip,cos=Math.cos(p.tilt),sin=Math.sin(p.tilt);
    let outward=entry<=32?0:-Infinity;
    for(const [u,v] of pose.frontEdge){
      const forward=(u*cos-v*sin)*scale;
      const y=p.y+(u*sin+v*cos)*scale;
      if(y<0||y>=p.height)continue;
      const edge=this.edgeAt(beam,y,side,sample,entry/100);
      if(edge.peak>.005)outward=Math.max(outward,side*(edge.x-p.x)+forward);
    }
    return Number.isFinite(outward)?p.x+side*outward:p.x;
  }
  outside(p,pose,scale){
    const [l,t,r,b]=pose.bounds;
    // Include the complete sprite plus a margin for the maximum lean. The
    // drawing stays opaque and the viewport itself clips every arrival/exit.
    const margin=3+.42*scale*Math.max(r-l,b-t);
    return {left:-(p.flip>0?r-pose.anchorX:pose.anchorX-l)*scale-margin,
      right:p.width+(p.flip>0?pose.anchorX-l:r-pose.anchorX)*scale+margin,
      top:-(b-pose.anchorY)*scale-margin,bottom:p.height+(pose.anchorY-t)*scale+margin};
  }
  holdIsLit(p,pose,scale,beam,sample){
    const sin=Math.sin(p.tilt),cos=Math.cos(p.tilt);
    let visible=false;
    for(const [u,v] of pose.frontEdge){
      const x=p.drawX+p.flip*(u*cos-v*sin)*scale,y=p.drawY+(u*sin+v*cos)*scale;
      if(x<0||x>=p.width||y<0||y>=p.height)continue;
      visible=true;
      if(sample(x,y,beam)>beam.gain*.002)return true;
    }
    return !visible;
  }
  prepare(image,darkness){
    this.projection.key=null;
    this.preparedImage=image;
    this.tile.width=image.naturalWidth;
    this.tile.height=image.naturalHeight;
    const art=this.tile.getContext('2d');
    art.drawImage(image,0,0);
    // Darken the RGB in-place, retaining the original alpha of every hair.
    art.globalCompositeOperation='source-atop';
    art.fillStyle='rgba(0,0,0,'+darkness/100+')';
    art.fillRect(0,0,this.tile.width,this.tile.height);
    this.darkness=darkness;this.preparedKey=this.poseKey;
  }
  finishVisit(){
    this.path=null;
    if(this.again){this.again=false;this.trigger();}
    else this.preloadNext().catch(()=>{});
  }
  startDeparture(cell,pose,scale,x,y,flip,ratio,group){
    // Read the real fur silhouette once, excluding padding, to match size and
    // the planted paw at the splice into the independently drawn turn.
    const a=this.tile.getContext('2d').getImageData(cell.sx,cell.sy,cell.w,cell.h).data;
    let mass=0,cx=0,cy=0,bottom=0;
    for(let py=0;py<cell.h;py+=2)for(let px=0;px<cell.w;px+=2){
      const alpha=a[(py*cell.w+px)*4+3]/255;
      mass+=alpha*4;cx+=px*alpha*4;cy+=py*alpha*4;
      if(alpha>.12)bottom=Math.max(bottom,py+1);
    }
    const sx=1536/cell.w,sy=1024/cell.h;
    const centerX=cx/Math.max(1,mass)*sx,centerY=cy/Math.max(1,mass)*sy;
    const art=catExitArt[group];
    return new CatDeparture(group,{
      x:x+flip*(centerX-pose.anchorX)*scale,
      y:y+(centerY-pose.anchorY)*scale,
      floor:y+(bottom*sy-pose.anchorY)*scale,
      scale:scale*Math.sqrt(mass*sx*sy)/art.reference
    },ratio,flip);
  }
  update(ctx,beam,width,height,cx,stage,sample,ratio,darkness,far,near,dt,entry=32,reduced=false,stayMin=2,stayMax=5,followLight=true){
    if(this.pending||(this.path&&(width!==this.path.width||height!==this.path.height))){
      this.pending=false;this.path=this.choose(cx,stage,width,height,beam,sample);
    }
    const p=this.path;
    if(!p)return;
    // Layout transitions move the whole light stage. Manual lamp motion does
    // not change cx, so it leaves the cat's planted position alone.
    if(p.layoutCx!==undefined&&p.layoutCx!==cx&&!p.departure){
      const shift=cx-p.layoutCx;p.x+=shift;
      if(p.drawX!==undefined)p.drawX+=shift;
      if(p.renderX!==undefined)p.renderX+=shift;
      p.layoutCx=cx;
    }
    let alternate=this.alternate;
    let clip=this.imageFor('cat-motion/'+this.poseKey+(alternate?'-b':'')+'.webp');
    if(alternate && clip.complete && !clip.naturalWidth){
      alternate=false;
      clip=this.imageFor('cat-motion/'+this.poseKey+'.webp');
    }
    // Defer the visit clock until this pose has decoded; a failed clip can
    // still perform the full hide-and-seek interaction with its original.
    const sheet=clip.complete&&clip.naturalWidth>0;
    const image=sheet||!clip.complete?clip:this.imageFor('cat-stills/'+catPoses[this.poseKey].file);
    if(!image.complete||!image.naturalWidth)return;
    this.lastPose=this.poseKey;
    const visit=p.visit||(p.visit=new CatVisit(this.poseKey,stayMin,stayMax,p.jump));
    visit.setStay(stayMin,stayMax);
    const pose=sheet&&alternate?catAltPoses[this.poseKey]:catPoses[this.poseKey];
    if(!p.departure&&(this.darkness!==darkness||this.preparedKey!==this.poseKey||this.preparedImage!==image))this.prepare(image,darkness);
    // Size is relative to the lyric stage, independently of the light footprint.
    // Match the established stretch pose at fixed size, using visible body mass.
    const reference=sheet?pose.sizeReference:catStillSizes[this.poseKey];
    const scale=Math.min(stage,width*.54)*1.26*ratio/100/reference;
    const groundHeight=catGroundHeights[this.poseKey];
    const floorOffset=groundHeight?groundHeight[sheet?(alternate?'b':'a'):'still']*scale*.08:0;
    if(p.placedImage!==image||p.placedRatio!==ratio||p.placedEntry!==entry||(!catTransit(p.route)&&p.route!=='run'&&!p.departure&&p.placedProfile!==beam.profileRevision)){
      if(catTransit(p.route)){
        p.drawX=p.x;p.drawY=p.y;
      }else if(p.route==='run'){
        p.drawY=height;
        // Pick a visible spot in the light at the kitten’s torso height.
        const row=height+floorOffset-(pose.stillPawRow-pose.anchorY)*scale;
        const left=this.edgeAt(beam,row,-1,sample,.56).x;
        const right=this.edgeAt(beam,row,1,sample,.56).x;
        const [back,front]=pose.bodyX.map(u=>p.flip*(u-pose.anchorX)*scale);
        const bodyLeft=Math.min(back,front),bodyRight=Math.max(back,front);
        const offset=(back+front)/2;
        const region=catStageBounds(cx,stage,width);
        const lo=Math.max(left-offset,region.left-bodyLeft);
        const hi=Math.min(right-offset,region.right-bodyRight);
        p.drawX=lo<=hi?lo+(hi-lo)*p.spot:Math.max(-bodyLeft,Math.min(width-bodyRight,(left+right)/2-offset));
      }else if(pose.footY){
        // The real paw (not the transparent PNG border) meets the viewport.
        // Less penetration sinks the whole, uniformly scaled kitten farther.
        const sink=(pose.footY-pose.topY)*(1-entry/100)*scale;
        p.drawY=height-(pose.footY-pose.anchorY)*scale+sink;
        p.drawX=this.placeAtFringe({...p,y:p.drawY},pose,scale,beam,sample,entry);
      }else{
        p.drawY=p.y;
        p.drawX=this.placeAtFringe({...p,y:p.drawY},pose,scale,beam,sample,entry);
      }
      p.outside=this.outside(p,pose,scale);
      if(p.route==='cross'||p.route==='run'){
        const start=p.flip>0?p.outside.left:p.outside.right;
        const end=p.flip>0?p.outside.right:p.outside.left;
        visit.setWalk(start,p.drawX,end,scale*pose.reach,width);
      }
      if(p.jump&&!p.jump.total){
        const a=p.flip>0?p.outside.left:p.outside.right;
        const b=p.flip>0?p.outside.right:p.outside.left;
        p.jump.runway(a,b,Math.max(32,pose.reach*scale*1.4));
      }
      p.placedImage=image;p.placedRatio=ratio;p.placedEntry=entry;p.placedProfile=beam.profileRevision;
    }
    const tip=scale*pose.reach;
    const lit=catTransit(p.route)||p.route==='run'||visit.age<visit.arrival||
      this.holdIsLit(p,pose,scale,beam,sample);
    const motion=visit.sample(dt,reduced,lit);
    if(visit.done){
      this.finishVisit();
      return;
    }
    const rows=sheet?Math.round(image.naturalHeight/(image.naturalWidth/4*2/3)):1;
    const index=sheet?Math.round(motion.frame):0;
    const w=image.naturalWidth/(sheet?4:1),h=image.naturalHeight/rows;
    const cell={index,w,h,sx:(index%4)*w,sy:Math.floor(index/4)*h};
    if(!catTransit(p.route)&&p.route!=='run'){
      if(p.renderX===undefined||reduced)p.renderX=p.drawX;
      else p.renderX+=(p.drawX-p.renderX)*(1-Math.exp(-dt*8));
    }
    let x=p.renderX??p.drawX,y=p.drawY;
    const start=p.flip>0?p.outside.left:p.outside.right;
    const end=p.flip>0?p.outside.right:p.outside.left;
    if(p.jump){
      x=motion.x;y=motion.y;
    }else if(p.route==='cross'||p.route==='run'){
      x=start+(end-start)*motion.progress;
    }else if(p.route==='overhang'){
      y+=(p.outside.top-y)*motion.out;
    }else if(pose.footY){
      y+=(p.outside.bottom-y)*motion.out;
    }else{
      x+=(start-x)*motion.out;
    }
    let contact=pose.footY??null;
    if(pose.pawRow){
      // Touch the ground plane at the supporting paw, ignoring transparent padding.
      const foot=sheet?(pose.pawRow[index]+1)*1024/h:pose.stillPawRow+1;
      contact=foot;
      y=(p.jump?motion.y:height)+floorOffset-(foot-pose.anchorY)*scale;
    }
    if(motion.depart){
      const group=catExitGroups[this.poseKey],art=catExitArt[group];
      const exitImage=this.imageFor(art.file);
      if(exitImage.complete&&exitImage.naturalWidth){
        if(!p.departure)p.departure=this.startDeparture(cell,pose,scale,x,y,p.flip,ratio,group);
        const d=p.departure.sample(dt,ratio,width,height);
        if(p.departure.done){this.finishVisit();return;}
        if(this.preparedImage!==exitImage||this.darkness!==darkness)this.prepare(exitImage,darkness);
        const ew=exitImage.naturalWidth/4,eh=exitImage.naturalHeight/4;
        this.paint(ctx,beam,height,{index:d.frame,w:ew,h:eh,sx:d.frame%4*ew,sy:Math.floor(d.frame/4)*eh},
          d.pose,d.scale,d.x,d.y,d.flip,0,d.foot,group==='upper'?'overhang':'run',p,far,near,dt,reduced,followLight);
        return;
      }
    }
    this.paint(ctx,beam,height,cell,pose,scale,x,y,p.flip,p.tilt+(pose.footY||p.route==='run'?0:motion.lean),
      contact,p.route,p,far,near,dt,reduced,followLight);
  }
  paint(ctx,beam,height,cell,pose,scale,x,y,flip,tilt,contact,route,p,far,near,dt,reduced,followLight){
    const tip=scale*(pose.reach||0);
    const dx=x+flip*tip*.65*Math.cos(tilt)-beam.x;
    const dy=y+tip*.65*Math.sin(tilt)-beam.y;
    const distance=Math.hypot(dx,dy,height*.19/beam.heightScale)/height;
    const nearFactor=1-catEase((distance-.23)/.62);
    p.proximity=p.proximity===undefined?nearFactor:p.proximity+(nearFactor-p.proximity)*(-Math.expm1(-dt/.14));
    ctx.save();ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=(far+(near-far)*p.proximity)/100;
    ctx.translate(x,y);ctx.scale(flip*scale,scale);ctx.rotate(tilt);
    const target=followLight?1:0;
    if(this.lightFollow===undefined||reduced)this.lightFollow=target;
    else this.lightFollow+=(target-this.lightFollow)*(-Math.expm1(-dt/.12));
    if(Math.abs(this.lightFollow-target)<.001)this.lightFollow=target;
    if(this.lightFollow===0){
      ctx.drawImage(this.tile,cell.sx,cell.sy,cell.w,cell.h,-pose.anchorX,-pose.anchorY,1536,1024);
    }else{
      const projection=this.projection.geometry(beam,x,y,height,pose,contact,route);
      projection.stretch=1+(projection.stretch-1)*this.lightFollow;
      projection.shear*=this.lightFollow;projection.softness*=this.lightFollow;
      this.projection.draw(ctx,this.tile,cell,pose,scale,projection,flip);
    }
    ctx.restore();
  }
}
