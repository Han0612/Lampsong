// Orthographic view of thin standing letters. A ground pixel darkens only when
// rays from the finite emitting aperture meet ink on the upright letter plate.
class LetterProjector {
  constructor() { this.cache = new Map(); this.masks = new Map(); this.faceSurfaces=[];
    this.segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null; }
  layoutRuns(paint,text){
    paint.font=this.font;
    const han=paint.measureText('国'),cap=paint.measureText('H'),lower=paint.measureText('x');
    const descent=Math.max(0,paint.measureText('gyp').actualBoundingBoxDescent);
    const referenceHeight=Math.max(1,han.actualBoundingBoxAscent+han.actualBoundingBoxDescent);
    const hanCenter=(han.actualBoundingBoxDescent-han.actualBoundingBoxAscent)/2;
    const clusters=this.segmenter?Array.from(this.segmenter.segment(text),g=>g.segment):Array.from(text);
    const runs=[],glyphs=[];
    for(const glyph of clusters){
      const previous=runs[runs.length-1];
      let script;
      if(/[\p{Script=Latin}0-9]/u.test(glyph))script='latin';
      else if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(glyph))script='cjk';
      else if(/[\p{L}\p{Extended_Pictographic}]/u.test(glyph))script='other';
      else script=previous?.script||'neutral';
      if(previous?.script==='neutral')previous.script=script;
      if(previous?.script===script)previous.glyphs.push(glyph);
      else runs.push({script,glyphs:[glyph]});
    }
    const tracked='letterSpacing' in paint;
    let totalSpacing=0;
    let advance=0,top=Infinity,bottom=-Infinity,left=0,right=0;
    const feet=[];
    const needsFeet=/\p{Script=Latin}/u.test(text);
    for(const run of runs){
      const latin=run.script==='latin',cjk=run.script==='cjk';
      const word=run.glyphs.join('');
      // Match apparent body size using caps and x-height, without resizing
      // each word to its own bounds (which would enlarge short lowercase words).
      // One font calibration for every Latin run, including mixed-case lyrics.
      const latinBody=cap.actualBoundingBoxAscent*.60+lower.actualBoundingBoxAscent*.40;
      const fullBody=cap.actualBoundingBoxAscent+descent;
      const scale=latin?Math.max(.88,Math.min(1.32,referenceHeight/Math.max(1,latinBody),
        1.08*referenceHeight/Math.max(1,fullBody))):1;
      run.font=this.font.replace('96px',(96*scale)+'px');
      run.dy=latin?hanCenter+(cap.actualBoundingBoxAscent-(.65*descent))*scale/2:0;
      run.spacing=latin?.6+(this.tracking||0)*.65:cjk?1.5+(this.tracking||0):(this.tracking||0);
      run.left=advance;
      paint.font=run.font;
      if(tracked)paint.letterSpacing=run.spacing+'px';
      const metrics=paint.measureText(word);
      const separate=!tracked&&run.spacing!==0&&(latin||cjk);
      run.positions=separate?[]:null;
      let prefix='',offset=0,inkRight=0;
      if(!separate&&!needsFeet)offset=metrics.width;
      else for(const glyph of run.glyphs){
        const ink=paint.measureText(glyph);
        if(needsFeet&&glyph.trim()){
          const descent=ink.actualBoundingBoxDescent;
          feet.push({x:advance+offset,foot:latin&&Math.abs(descent)<referenceHeight*.075?run.dy+1:run.dy+descent});
        }
        if(separate){
          run.positions.push(offset);inkRight=Math.max(inkRight,offset+ink.actualBoundingBoxRight);
          offset+=ink.width+run.spacing;
        }else{
          prefix+=glyph;offset=paint.measureText(prefix).width;
        }
      }
      top=Math.min(top,run.dy-metrics.actualBoundingBoxAscent);
      bottom=Math.max(bottom,run.dy+metrics.actualBoundingBoxDescent);
      left=Math.min(left,advance-metrics.actualBoundingBoxLeft);
      right=Math.max(right,advance+Math.max(offset,separate?inkRight:metrics.actualBoundingBoxRight));
      // Keep segmentation tied to the original typeset run, including kerning
      // and grapheme clusters. Never re-typeset a moving letter at a new size.
      let wavePrefix='';
      run.glyphs.forEach((text,i)=>{
        const start=run.positions?run.positions[i]:paint.measureText(wavePrefix).width;
        const m=paint.measureText(text);wavePrefix+=text;
        glyphs.push({text,left:advance+start-m.actualBoundingBoxLeft,right:advance+start+m.actualBoundingBoxRight,beforeSpacing:totalSpacing+i*run.spacing});
      });
      advance+=offset;totalSpacing+=run.glyphs.length*run.spacing;
    }
    return {runs,feet,glyphs,totalSpacing,top:runs.length?Math.floor(top):0,bottom:runs.length?Math.ceil(bottom):1,left:Math.floor(left),
      right:Math.ceil(right),referenceHeight,tracked};
  }
  mask(text,quality=1.5) {
    const key=text+'|'+quality;
    if(this.masks.has(key)){const mask=this.masks.get(key);this.masks.delete(key);this.masks.set(key,mask);return mask;}
    const bitmap = document.createElement('canvas');
    const paint = bitmap.getContext('2d', {willReadFrequently:true});
    const row=this.layoutRuns(paint,text);
    const pad=12,origin=pad-row.left,baseline=pad-row.top;
    const logicalWidth=Math.max(1,row.right-row.left)+pad*2;
    const logicalHeight=Math.max(1,row.bottom-row.top)+pad*2;
    // Supersample the original font outlines, never upscale a low-resolution mask.
    const sampling=Math.max(1,Math.min(quality,8192/logicalWidth,2048/logicalHeight,Math.sqrt(4000000/(logicalWidth*logicalHeight))));
    bitmap.width=Math.ceil(logicalWidth*sampling);bitmap.height=Math.ceil(logicalHeight*sampling);
    const sx=bitmap.width/logicalWidth,sy=bitmap.height/logicalHeight;
    paint.setTransform(sx,0,0,sy,0,0);
    for(const run of row.runs){
      paint.font=run.font;
      if(row.tracked)paint.letterSpacing=run.spacing+'px';
      const x=origin+run.left,y=baseline+run.dy;
      if(run.positions)run.glyphs.forEach((glyph,i)=>paint.fillText(glyph,x+run.positions[i],y));
      else paint.fillText(run.glyphs.join(''),x,y);
    }
    const pixels = paint.getImageData(0,0,bitmap.width,bitmap.height).data;
    const mask = {bitmap,pixels,pad,width:logicalWidth,height:logicalHeight,
      inkHeight:logicalHeight-pad*2,referenceHeight:row.referenceHeight,totalSpacing:row.totalSpacing,
      pixelWidth:bitmap.width,pixelHeight:bitmap.height,sampleX:sx,sampleY:sy,
      waveGlyphs:row.glyphs.map(g=>({...g,left:g.left+origin,right:g.right+origin}))};
    if(/\p{Script=Latin}/u.test(text)){
      for(const foot of row.feet)foot.x=Math.round(origin+foot.x);
      mask.contacts=this.contactMasks(mask,row.feet,baseline);
    }
    this.masks.set(key,mask);
    let pixelsHeld=0;for(const m of this.masks.values())pixelsHeld+=m.pixels.length/4*(1+(m.contacts?.length||0));
    while(this.masks.size>1&&(this.masks.size>16||pixelsHeld>12000000)){
      const oldest=this.masks.keys().next().value,m=this.masks.get(oldest);
      pixelsHeld-=m.pixels.length/4*(1+(m.contacts?.length||0));this.masks.delete(oldest);
    }
    return mask;
  }
  contactMasks(mask,feet,baseline){
    // When a descender lowers the line's ink bounds, project the other letters
    // from their own feet. Keep the original typeset bitmap for the visible face.
    const threshold=Math.max(3,mask.inkHeight*.075);
    const bottoms=feet.map(g=>g.foot);
    if(!bottoms.length||Math.max(...bottoms)-Math.min(...bottoms)<=threshold)return null;
    const groups=new Map();
    const lastInk=mask.pad+mask.inkHeight;
    for(let i=0;i<feet.length;i++){
      const foot=feet[i];
      // Optical overshoot on round letters shares the normal baseline.
      const bottom=Math.max(mask.pad+1,Math.min(lastInk,Math.ceil(baseline+foot.foot)));
      const inkHeight=bottom-mask.pad;
      if(!groups.has(inkHeight))groups.set(inkHeight,{
        pad:mask.pad,width:mask.width,height:mask.height,inkHeight,
        pixelWidth:mask.pixelWidth,pixelHeight:mask.pixelHeight,sampleX:mask.sampleX,sampleY:mask.sampleY,
        pixels:new Uint8ClampedArray(mask.pixels.length)
      });
      const pixels=groups.get(inkHeight).pixels;
      const sx=mask.sampleX||1,sy=mask.sampleY||1,pw=mask.pixelWidth||mask.width;
      const left=i===0?0:Math.max(0,Math.round(foot.x*sx));
      const right=i===feet.length-1?pw:Math.min(pw,Math.round(feet[i+1].x*sx));
      for(let y=Math.floor(mask.pad*sy);y<Math.min(mask.pixelHeight||mask.height,Math.ceil(bottom*sy));y++){
        const start=(y*pw+left)*4,end=(y*pw+right)*4;
        pixels.set(mask.pixels.subarray(start,end),start);
      }
    }
    return groups.size>1?Array.from(groups.values()):null;
  }
  bake(mask,width,plateRatio,combined,blurStart,blurSpan,softness,fadeStrength=0) {
    // Bake the occluded ink once. Row distance, fan and shear are applied
    // at draw time so moving a row never triggers another ray trace.
    const qMax = plateRatio / (1 - plateRatio) * 1.22;
    const w=Math.max(120,Math.min(2100,Math.ceil(width*2.4)));
    const h=318;
    const sampleX=mask.sampleX||1,sampleY=mask.sampleY||1;
    const pixelWidth=mask.pixelWidth||mask.width,pixelHeight=mask.pixelHeight||mask.height;
    const texture=document.createElement('canvas');texture.width=w;texture.height=h;
    const ctx=texture.getContext('2d'); const out=ctx.createImageData(w,h);
    const samples=softness===0?1:16;
    // Stratified samples of one circular emitter. Each produces a complete
    // projected glyph; their mean is the partially occluded light.
    const disk=Array.from({length:samples},(_,i)=>{
      const r=softness*Math.sqrt((i+.5)/samples),phi=i*2.39996323;
      return [r*Math.cos(phi),r*Math.sin(phi)];
    });
    const fullWidth=width*1.03;
    for(let y=0;y<h;y++) {
      const q=(y+.5)/h*qMax;
      for(let x=0;x<w;x++) {
        const groundX=((x+.5)/w-.5)*fullWidth;
        let blocked=0;
        for(const [ax,az] of disk) {
          const t=q/(1+q);
          const heightFraction=t*(1+.044*az)/plateRatio;
          // The floor ray meets the lowest ink first on an upright visible face.
          const inkRow=combined ? 1-heightFraction : heightFraction;
          const sy=(mask.pad+inkRow*mask.inkHeight)*sampleY-.5;
          if(sy>=pixelHeight-1||sy<0)continue;
          const sx=(.5+(groundX+ax*15*t)/width)*mask.width*sampleX-.5;
          if(sx<0||sx>=pixelWidth-1)continue;
          const left=Math.floor(sx), top=Math.floor(sy), fx=sx-left, fy=sy-top;
          const a=(top*pixelWidth+left)*4+3,b=a+pixelWidth*4;
          blocked+=(mask.pixels[a]*(1-fx)+mask.pixels[a+4]*fx)*(1-fy)+
                   (mask.pixels[b]*(1-fx)+mask.pixels[b+4]*fx)*fy;
        }
        out.data[(y*w+x)*4+3]=blocked/samples;
      }
    }
    if(softness>0)this.softenTail(out,w,h,blurStart,blurSpan,softness,1.5,1.5);
    this.fadeTail(out,w,h,plateRatio,fadeStrength);
    ctx.putImageData(out,0,0);
    // Record the ink envelope once, alongside the existing bake. Layout must
    // not center the blank padding below the projected glyph or scan each frame.
    let first=h,last=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(out.data[(y*w+x)*4+3]>1){first=Math.min(first,y);last=y;break;}
    const verticalBand=last<0?[0,0]:[first/h,(last+1)/h];
    return {texture,qMax,fullWidth,verticalBand};
  }
  // Reflow only inter-letter spacing in the cached projection. The ray-traced
  // mask and glyph contours stay unchanged; continuous gaps absorb the offset.
  trackingTexture(part,mask,ratio=1){
    if(!mask?.totalSpacing||Math.abs(ratio-1)<1e-6)return part.texture;
    if(part.trackingRatio===ratio&&part.trackingMask===mask)return part.retracked;
    const src=part.texture,out=part.retracked||document.createElement('canvas');
    if(out.width!==src.width)out.width=src.width;if(out.height!==src.height)out.height=src.height;
    const g=out.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,out.width,out.height);g.imageSmoothingEnabled=true;
    const change=ratio-1,width=mask.width+mask.totalSpacing*change;
    const knots=[[0,0]];
    for(const glyph of mask.waveGlyphs){
      if(!glyph.text.trim())continue;
      for(const x of [glyph.left,glyph.right]){
        const a=(.5+(x/mask.width-.5)/1.03)*src.width;
        const b=(.5+(x+glyph.beforeSpacing*change-width/2)/(width*1.03))*out.width;
        const last=knots[knots.length-1];
        if(a>last[0]+.01&&b>last[1]+.01&&a<src.width&&b<out.width)knots.push([a,b]);
      }
    }
    knots.push([src.width,out.width]);
    for(let i=1;i<knots.length;i++){
      const [a,b]=knots[i-1],[c,d]=knots[i];g.drawImage(src,a,0,c-a,src.height,b,0,d-b,out.height);
    }
    part.trackingRatio=ratio;part.trackingMask=mask;part.retracked=out;return out;
  }
  spreadTexture(part,expansion,tone=0,mask=null,spacingRatio=1){
    if(part.lastSpacingRatio!==spacingRatio){part.spread=undefined;part.gray=undefined;part.lastSpacingRatio=spacingRatio;}
    const base=this.trackingTexture(part,mask,spacingRatio);
    // Change the shadow ink's RGB while retaining the baked coverage mask.
    const gray=Math.round(tone*255);
    if(part.gray!==gray){
      part.gray=gray;part.spread=undefined;
      if(gray){
        const ink=part.ink||document.createElement('canvas');
        ink.width=part.texture.width;ink.height=part.texture.height;
        const g=ink.getContext('2d');
        g.drawImage(base,0,0);g.globalCompositeOperation='source-in';
        g.fillStyle='rgb('+[gray,gray,gray].join(',')+')';g.fillRect(0,0,ink.width,ink.height);
        part.ink=ink;
      }
    }
    const src=gray?part.ink:base;
    if(expansion===0)return src;
    // Reuse the ray-traced alpha field. Widen each scanline about its centre,
    // leaving the contact edge at exactly its original width.
    if(part.spread===expansion)return part.warped;
    const out=part.warped||document.createElement('canvas');
    const w=Math.min(2400,Math.ceil(src.width*(1+expansion)/32)*32);
    if(out.width<w||!part.warped)out.width=w;
    if(out.height!==src.height)out.height=src.height;
    const paint=out.getContext('2d');
    paint.clearRect(0,0,out.width,out.height);
    for(let y=0;y<src.height;y++){
      const span=out.width*(1+expansion*y/(src.height-1))/(1+expansion);
      paint.drawImage(src,0,y,src.width,1,(out.width-span)/2,y,span,1);
    }
    part.spread=expansion;part.warped=out;
    return out;
  }
  softenTail(image,w,h,start,span,softness,scaleX=1,scaleY=1) {
    // The apparent size of the emitter grows with caster separation.
    // Two variable-radius box passes spread the existing occlusion, preserving its contact edge.
    const summed=new Float64Array((w+1)*(h+1));
    const stride=w+1;
    for(let pass=0;pass<3;pass++){
      for(let y=0;y<h;y++){
        let row=0;
        for(let x=0;x<w;x++){
          row+=image.data[(y*w+x)*4+3];
          summed[(y+1)*stride+x+1]=summed[y*stride+x+1]+row;
        }
      }
      for(let y=0;y<h;y++){
        const depth=y/(h-1);
        const progress=Math.max(0,Math.min(1,(depth-start)/span));
        const radius=15*softness*progress*progress*(3-2*progress);
        if(radius===0)continue;
        const rx=radius*scaleX,ry=radius*scaleY;
        const ix=Math.floor(rx),iy=Math.floor(ry),mx=rx-ix,my=ry-iy;
        // Preserve the old kernel for unchanged resolution, otherwise scale
        // each axis in texture pixels so the on-screen softness stays the same.
        const kernels=scaleX===1&&scaleY===1?[[ix,iy,1-mx],[ix+1,iy+1,mx]]:
          [[ix,iy,(1-mx)*(1-my)],[ix+1,iy,mx*(1-my)],[ix,iy+1,(1-mx)*my],[ix+1,iy+1,mx*my]];
        for(let x=0;x<w;x++){
          let alpha=0;
          for(const [dx,dy,weight]of kernels){
            if(!weight)continue;
            const top=Math.max(0,y-dy),bottom=Math.min(h,y+dy+1);
            const left=Math.max(0,x-dx),right=Math.min(w,x+dx+1);
            const total=summed[bottom*stride+right]-summed[top*stride+right]
                       -summed[bottom*stride+left]+summed[top*stride+left];
            alpha+=total/((right-left)*(bottom-top))*weight;
          }
          image.data[(y*w+x)*4+3]=alpha;
        }
      }
    }
  }
  fadeTail(image,w,h,plateRatio,strength){
    if(strength<=0)return;
    const amount=Math.max(0,Math.min(1,strength/100));
    const qMax=plateRatio/(1-plateRatio)*1.22;
    for(let y=0;y<h;y++){
      const q=y/(h-1)*qMax;
      // Normalize to the ink's projected end, not the transparent texture padding.
      const v=Math.max(0,Math.min(1,(q/(1+q)/plateRatio-.08)/.92));
      const coverage=Math.pow(1-v*v*(3-2*v),amount);
      for(let x=0;x<w;x++)image.data[(y*w+x)*4+3]*=coverage;
    }
  }
  prepareFace(ctx,rootX,rootY,layout,surface,scale){
    // Shade the solid face against the lit floor before any shadow is drawn.
    const {mask,width,inkScale}=layout.dimensions;
    const faceHeight=Math.max(10,layout.bodyHeight*.61)*inkScale;
    const h=faceHeight*mask.height/mask.inkHeight;
    const x=rootX-width/2,y=rootY-faceHeight*mask.pad/mask.inkHeight;
    const w=Math.max(1,Math.ceil(width*scale)),height=Math.max(1,Math.ceil(h*scale));
    if(surface.width!==w)surface.width=w;
    if(surface.height!==height)surface.height=height;
    const paint=surface.getContext('2d');
    paint.globalCompositeOperation='source-over';paint.fillStyle='#000';
    paint.fillRect(0,0,w,height);
    paint.drawImage(ctx.canvas,x*scale,y*scale,width*scale,h*scale,0,0,w,height);
    const dark=layout.finish==='dark';
    const absorbs=dark||layout.finish==='darkTint';
    const contrast=.97*(1-layout.tone)*(absorbs?1:.25+.75*Math.sqrt(layout.illumination));
    const color=layout.faceColor.slice(1).match(/../g).map(v=>parseInt(v,16));
    const stops=dark?[[23,21,17],[16,15,13],[12,11,10]]:
      [color.map(v=>Math.min(255,v+5)),color,color.map(v=>Math.round(v*.95))];
    const margin=height*mask.pad/mask.height;
    const gradient=paint.createLinearGradient(0,margin,0,height-margin);
    for(let i=0;i<3;i++){
      const rgb=stops[i].map(v=>Math.round((absorbs?255*(1-contrast):0)+contrast*v));
      gradient.addColorStop([0,dark?.16:.25,1][i],'rgb('+rgb.join(',')+')');
    }
    paint.globalCompositeOperation='multiply';
    if(!absorbs){
      const base=Math.round(255*(1-contrast));
      paint.fillStyle='rgb('+[base,base,base].join(',')+')';paint.fillRect(0,0,w,height);
      paint.globalCompositeOperation='lighter';
    }
    paint.fillStyle=gradient;paint.fillRect(0,0,w,height);
    const brightness=layout.faceBrightness??1;
    if(brightness!==1){
      paint.globalCompositeOperation=brightness<1?'multiply':'screen';
      const v=Math.round(255*(brightness<1?brightness:brightness-1));
      paint.fillStyle='rgb('+[v,v,v].join(',')+')';paint.fillRect(0,0,w,height);
    }
    paint.globalCompositeOperation='destination-in';paint.drawImage(mask.bitmap,0,0,w,height);
    paint.globalCompositeOperation='source-over';
    return {surface,x,y,width,height:h,edge:layout.edge};
  }
  floatingInkColor(cover,finish){
    if(finish==='dark')return '#242622';
    if(finish==='light')return '#f3f3f3';
    const luma=.2126*cover[0]+.7152*cover[1]+.0722*cover[2];
    return '#'+cover.map(v=>Math.round(Math.max(232,Math.min(251,243+(v-luma)*.10))).toString(16).padStart(2,'0')).join('');
  }
  floatingFace(mask,color,illumination,options,brightness=1){
    this.floatingCache ||= new WeakMap();
    const level=Math.round(Math.min(1,Math.max(.18,illumination))*16)/16;
    const key=[this.font,this.tracking,mask.width,mask.height,color,level,options.floatSideDarkness,options.floatHighlight,brightness].join('|');
    let materials=this.floatingCache.get(mask);
    if(!materials){materials=new Map();this.floatingCache.set(mask,materials);}
    let cached=materials.get(key);const frame=this.floatingFrame||0;
    if(cached){cached.frame=frame;return cached;}
    // Reuse an earlier frame's tint surfaces while the row changes brightness.
    // Never overwrite a material already referenced by another row this frame.
    let reusable=null;
    if(materials.size>=3)for(const [oldKey,material]of materials)if(material.frame!==frame){reusable=material;materials.delete(oldKey);break;}
    const make=(shade,surface)=>{const c=surface||document.createElement('canvas');if(c.width!==mask.bitmap.width)c.width=mask.bitmap.width;if(c.height!==mask.bitmap.height)c.height=mask.bitmap.height;const g=c.getContext('2d');g.globalCompositeOperation='source-over';g.clearRect(0,0,c.width,c.height);g.drawImage(mask.bitmap,0,0);g.globalCompositeOperation='source-in';
      const base=color.slice(1).match(/../g).map(v=>parseInt(v,16)),gradient=g.createLinearGradient(0,0,0,c.height);
      const light=.60+.40*Math.sqrt(level);
      for(const [at,mult,plus]of shade)gradient.addColorStop(at,'rgb('+base.map(v=>{const lit=Math.min(255,Math.max(0,v*light*mult+plus));return Math.round(brightness<1?lit*brightness:lit+(255-lit)*(brightness-1));}).join(',')+')');
      g.fillStyle=gradient;g.fillRect(0,0,c.width,c.height);return c;};
    const side=options.floatSideDarkness/100,edge=options.floatHighlight/100;
    cached={mask,frame,front:make([[0,1+.08*edge,24*edge],[.3,1,8*edge],[1,1-.36*edge,0]],reusable?.front),side:make([[0,1-.8*side,0],[1,Math.max(.06,1-1.1*side),0]],reusable?.side)};
    if(materials.size>=3)materials.delete(materials.keys().next().value);materials.set(key,cached);return cached;
  }
  floatingGradient(ctx,width,ink,cx,cy,angle){
    // 0° down, 90° right, 180° up, 270° left. Use ink bounds,
    // not transparent padding, so start/span remain meaningful at any angle.
    const radians=(angle||0)*Math.PI/180,dx=Math.sin(radians),dy=Math.cos(radians);
    const extent=(Math.abs(dx)*width+Math.abs(dy)*ink)/2;
    return ctx.createLinearGradient(cx-dx*extent,cy-dy*extent,cx+dx*extent,cy+dy*extent);
  }
  floatingBlur(source,radius){
    const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    if(this.floatNativeBlur===undefined){
      const probe=make(20,20),g=probe.getContext('2d');g.filter='blur(2px)';g.fillRect(8,8,4,4);
      this.floatNativeBlur=g.getImageData(6,9,1,1).data[3]>0;
    }
    const result=make(source.width,source.height),out=result.getContext('2d');
    if(radius<.05){out.drawImage(source,0,0);return result;}
    if(this.floatNativeBlur){out.filter='blur('+radius.toFixed(2)+'px)';out.drawImage(source,0,0);out.filter='none';return result;}
    // Safari / filter-less Canvas fallback: three separable box passes on alpha.
    // Only material edits run this; lamp movement reuses the completed texture.
    const shrink=Math.max(1,Math.min(4,radius/3)),w=Math.ceil(source.width/shrink),h=Math.ceil(source.height/shrink);
    const small=make(w,h),g=small.getContext('2d');g.drawImage(source,0,0,w,h);
    const pixels=g.getImageData(0,0,w,h);let a=new Float32Array(w*h),b=new Float32Array(w*h);
    for(let i=0;i<a.length;i++)a[i]=pixels.data[i*4+3];
    const r=Math.max(1,Math.round(radius/shrink)),divisor=2*r+1;
    for(let pass=0;pass<3;pass++){
      for(let y=0;y<h;y++){
        const row=y*w;let sum=0;for(let x=0;x<=r&&x<w;x++)sum+=a[row+x];
        for(let x=0;x<w;x++){b[row+x]=sum/divisor;if(x-r>=0)sum-=a[row+x-r];if(x+r+1<w)sum+=a[row+x+r+1];}
      }
      for(let x=0;x<w;x++){
        let sum=0;for(let y=0;y<=r&&y<h;y++)sum+=b[y*w+x];
        for(let y=0;y<h;y++){a[y*w+x]=sum/divisor;if(y-r>=0)sum-=b[(y-r)*w+x];if(y+r+1<h)sum+=b[(y+r+1)*w+x];}
      }
    }
    // Preserve the single shadow tint even in newly expanded transparent pixels.
    let color=[0,0,0],peak=0;for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i+3]>peak){peak=pixels.data[i+3];color=Array.from(pixels.data.slice(i,i+3));}
    for(let i=0;i<a.length;i++){pixels.data[i*4]=color[0];pixels.data[i*4+1]=color[1];pixels.data[i*4+2]=color[2];pixels.data[i*4+3]=Math.round(a[i]);}
    g.putImageData(pixels,0,0);out.imageSmoothingQuality='high';out.drawImage(small,0,0,result.width,result.height);return result;
  }
  floatingShadow(mask,o){
    // One static material per visible line. Lamp motion and manual transforms
    // only move this texture; they never enqueue or crossfade replacement frames.
    this.floatingShadowCache ||= new WeakMap();
    const key=[o.floatShadowColor,o.floatFan,o.floatGap,o.floatSoftness,o.floatBlurEnd,o.floatBlurStart,o.floatBlurSpan,o.floatBlurAngle,o.floatFade,o.floatFadeStart,o.floatFadeSpan,o.floatFadeAngle].join('|');
    let materials=this.floatingShadowCache.get(mask);
    if(!materials){materials=new Map();this.floatingShadowCache.set(mask,materials);}
    const old=materials.get(key);if(old)return old;
    const sample=Math.min(1,1800/mask.bitmap.width),w=Math.max(1,Math.ceil(mask.bitmap.width*sample)),h=Math.max(1,Math.ceil(mask.bitmap.height*sample));
    const ink=mask.inkHeight/mask.height*h,padTop=mask.pad/mask.height*h,fan=o.floatFan/100;
    const blur=ink*.30*Math.pow(o.floatSoftness/100,1.7),extra=ink*.50*o.floatBlurEnd/100;
    const rowWidth=mask.waveRowWidth?mask.waveRowWidth/mask.width*w:w;
    const center=mask.waveRowWidth?(mask.waveRowWidth/2-mask.waveStart)/mask.width*w:w/2;
    const padding=Math.ceil((blur+extra)*3+3),fanExtra=Math.ceil(Math.max(w,Math.abs(center)*2,Math.abs(w-center)*2)*Math.abs(fan)*.25);
    const tw=w+padding*2+fanExtra*2,th=h+padding*2;
    const canvas=()=>{const c=document.createElement('canvas');c.width=tw;c.height=th;return c;};
    const shape=canvas(),g=shape.getContext('2d');g.imageSmoothingQuality='high';
    if(!fan)g.drawImage(mask.bitmap,padding+fanExtra,padding,w,h);
    else for(let row=0;row<h;row++){
      const t=Math.max(0,Math.min(1,(row-padTop)/Math.max(1,ink))),spread=1+fan*(t-.5)*.5,dw=w*spread;
      const sy=row*mask.bitmap.height/h,sh=mask.bitmap.height/h;
      g.drawImage(mask.bitmap,0,sy,mask.bitmap.width,sh,padding+fanExtra+center*(1-spread),padding+row,dw,1.001);
    }
    g.globalCompositeOperation='source-in';g.fillStyle=o.floatShadowColor;g.fillRect(0,0,tw,th);
    const surface=canvas(),out=surface.getContext('2d');
    const gradient=(context,angle)=>this.floatingGradient(context,mask.waveRowWidth?rowWidth*(1+Math.abs(fan)*.5):w+fanExtra*2,ink,padding+fanExtra+center,padding+padTop+ink/2,angle);
    if(extra<.01)out.drawImage(this.floatingBlur(shape,blur),0,0);
    else{
      const levels=6,start=o.floatBlurStart/100,span=Math.max(.01,o.floatBlurSpan/100),layer=canvas(),paint=layer.getContext('2d');
      const points=new Set([0,1]);for(let k=0;k<levels;k++)points.add(Math.min(1,start+span*k/(levels-1)));
      for(let i=0;i<levels;i++){
        paint.clearRect(0,0,tw,th);paint.globalCompositeOperation='source-over';paint.drawImage(this.floatingBlur(shape,blur+extra*i/(levels-1)),0,0);
        const ramp=gradient(paint,o.floatBlurAngle);
        for(const t of [...points].sort((a,b)=>a-b)){
          const progress=Math.max(0,Math.min(1,(t-start)/span)),weight=Math.max(0,1-Math.abs(progress*(levels-1)-i));
          ramp.addColorStop(t,'rgba(255,255,255,'+weight+')');
        }
        paint.globalCompositeOperation='destination-in';paint.fillStyle=ramp;paint.fillRect(0,0,tw,th);out.globalCompositeOperation='lighter';out.drawImage(layer,0,0);
      }
      out.globalCompositeOperation='source-over';
    }
    if(o.floatFade>0){
      const fade=gradient(out,o.floatFadeAngle),start=o.floatFadeStart/100,span=Math.max(.01,o.floatFadeSpan/100),points=new Set([0,1]);
      for(let i=0;i<=16;i++)points.add(Math.min(1,start+span*i/16));
      for(const t of [...points].sort((a,b)=>a-b)){const progress=Math.max(0,Math.min(1,(t-start)/span)),a=1-o.floatFade/100*progress*progress*(3-2*progress);fade.addColorStop(t,'rgba(255,255,255,'+a+')');}
      out.globalCompositeOperation='destination-in';out.fillStyle=fade;out.fillRect(0,0,tw,th);out.globalCompositeOperation='source-over';
    }
    const result={key,surface,width:w,height:h,padX:padding+fanExtra,padY:padding};if(materials.size>=2)materials.delete(materials.keys().next().value);materials.set(key,result);return result;
  }
  floatingGeometry(layout,rootX,rootY,source,wallHeight){
    const o=layout.floatPrefs,{mask,width,inkScale}=layout.dimensions;
    const faceHeight=Math.max(10,layout.bodyHeight*.61)*inkScale,h=faceHeight*mask.height/mask.inkHeight;
    const x=rootX-width/2,y=rootY-faceHeight*mask.pad/mask.inkHeight;
    const follow=o.floatFollow/100,gap=o.floatGap/100*faceHeight*.95,distance=Math.max(60,rootY-source.y);
    const offsetY=o.floatOffsetY+gap*(1+follow*((.7+Math.min(1.4,distance/Math.max(300,wallHeight))*.65)*(source.heightScale||1)-1));
    const offsetX=o.floatOffsetX+follow*gap*((rootX-source.x)/Math.max(220,distance)-(source.slope||0)*.8);
    const anchorGrowth=1+gap/Math.max(600,wallHeight*2),growth=anchorGrowth+follow*((1+gap/Math.max(600,distance*5))-anchorGrowth);
    const shadowWidth=width*growth*o.floatScale/100*o.floatWidth/100,shadowHeight=h*growth*o.floatScale/100*o.floatHeight/100;
    const response=o.floatLightResponse/100,illumination=Math.max(0,Math.min(1,layout.illumination));
    return {x,y,width,h,faceHeight,shadowX:rootX+offsetX,shadowY:y+h/2+offsetY,shadowWidth,shadowHeight,skew:Math.tan(o.floatSkew*Math.PI/180),alpha:layout.edge*o.floatOpacity/100*(1-response+response*illumination)};
  }
  paintFloatingBody(g,f,x,y){
    const steps=Math.ceil(f.depth);
    for(let i=steps;i>0;i--){const offset=f.depth*i/steps;g.drawImage(f.tint.side,x+offset*f.dx,y+offset,f.width,f.h);}
    g.drawImage(f.tint.front,x,y,f.width,f.h);
  }
  floatingBodyGroup(f,scale,index){
    this.floatingGroups ||= [];
    const surface=this.floatingGroups[index] ||= document.createElement('canvas');
    const pad=2/scale,left=Math.min(0,f.depth*f.dx)-pad;
    const w=Math.max(1,Math.ceil((f.width+Math.abs(f.depth*f.dx)+2*pad)*scale));
    const h=Math.max(1,Math.ceil((f.h+f.depth+2*pad)*scale));
    if(surface.width!==w)surface.width=w;if(surface.height!==h)surface.height=h;
    const g=surface.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);
    g.setTransform(scale,0,0,scale,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingQuality='high';
    this.paintFloatingBody(g,f,-left,pad);
    return {surface,x:f.x+left,y:f.y-pad,w:w/scale,h:h/scale};
  }
  waveSegments(mask){
    if(mask.waveSegments)return mask.waveSegments;
    const glyphs=mask.waveGlyphs;
    if(!glyphs?.length||glyphs.length>96)return null;
    const sx=mask.bitmap.width/mask.width,segments=[];
    let previous=0,total=0;
    for(let i=0;i<glyphs.length;i++){
      const glyph=glyphs[i],right=i===glyphs.length-1?mask.bitmap.width:Math.max(previous,Math.min(mask.bitmap.width,Math.round((glyph.right+glyphs[i+1].left)*.5*sx)));
      const width=right-previous;
      const weight=/^\s+$/u.test(glyph.text)?.25:/^[\p{P}]+$/u.test(glyph.text)?1.6:1;
      if(width>0){
        const bitmap=document.createElement('canvas');bitmap.width=width;bitmap.height=mask.bitmap.height;
        bitmap.getContext('2d').drawImage(mask.bitmap,previous,0,width,bitmap.height,0,0,width,bitmap.height);
        segments.push({text:glyph.text,start:previous/sx,at:total,weight,mask:{bitmap,width:width/sx,height:mask.height,inkHeight:mask.inkHeight,pad:mask.pad,referenceHeight:mask.referenceHeight,waveRowWidth:mask.width,waveStart:previous/sx}});
      }
      total+=weight;previous=right;
    }
    return mask.waveSegments={segments,total};
  }
  wavePulse(elapsed,at,weight,total,duration,range=3,softness=70){
    if(!Number.isFinite(elapsed)||total<=0||duration<=0||elapsed<=0||elapsed>=duration)return 0;
    // One continuous crest travels through character-space, rather than a
    // collection of timed bounces. Its support includes both neighbouring sides.
    const reach=Math.max(1,Math.min(6,range));
    const phase=elapsed/duration;
    const progress=phase*phase*phase*(phase*(phase*6-15)+10);
    const crest=-reach+(total+reach*2)*progress;
    const distance=Math.abs(at+weight*.5-crest)/reach;
    if(distance>=1)return 0;
    // Compact bell with zero slope at its peak and both ends. Even at the
    // firmest setting there is no hard onset, bounce or historical-frame blend.
    const exponent=4-2*Math.max(0,Math.min(100,softness))/100;
    return Math.pow(1-distance*distance,exponent);
  }
  floatingWaveRows(rows,rootX,source,wallHeight){
    const result=[];
    for(const row of rows){
      const {layout}=row,wave=layout.wave,mask=layout.dimensions.mask;
      // Unsupported connected scripts keep their complete shaping.
      if(!wave||wave.amplitude<=0||/[^\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{N}\p{P}\p{Z}\p{M}\s]/u.test(row.text||'')){result.push(row);continue;}
      const sequence=this.waveSegments(mask);if(!sequence){result.push(row);continue;}
      const geo=this.floatingGeometry(layout,rootX,row.rootY,source,wallHeight);
      const dx=Math.max(-.7,Math.min(.7,(rootX-source.x)/Math.max(220,row.rootY-source.y)-(source.slope||0)));
      for(const segment of sequence.segments){
        const fraction=segment.mask.width/mask.width,center=(segment.start+segment.mask.width/2)/mask.width-.5;
        const pulse=this.wavePulse(wave.elapsed,segment.at,segment.weight,sequence.total,wave.duration,wave.range,wave.softness);
        const lift=layout.bodyHeight*wave.amplitude/100*pulse;
        const geometry={...geo,x:geo.x+segment.start/mask.width*geo.width,y:geo.y-lift,width:geo.width*fraction,shadowX:geo.shadowX+center*geo.shadowWidth+lift*dx*.3,shadowY:geo.shadowY+lift*.45,shadowWidth:geo.shadowWidth*fraction,shadowHeight:geo.shadowHeight};
        result.push({...row,layout:{...layout,dimensions:{...layout.dimensions,mask:segment.mask,width:geometry.width},waveGeometry:geometry,waveSoft:pulse*wave.amplitude/18,waveRow:row}});
      }
    }
    return result;
  }
  drawFloating(ctx,rows,rootX,source,scale){
    this.floatingFrame=(this.floatingFrame||0)+1;
    rows=this.floatingWaveRows(rows,rootX,source,ctx.canvas.height/scale);
    const faces=[];
    for(const row of rows){
      const {rootY,layout}=row;
      if(layout.edge<=0)continue;
      const {mask}=layout.dimensions,options=layout.floatPrefs,geometry=layout.waveGeometry||this.floatingGeometry(layout,rootX,rootY,source,ctx.canvas.height/scale);
      const {x,y,width,h,faceHeight}=geometry;
      const tint=this.floatingFace(mask,layout.faceColor,layout.illumination,options,layout.faceBrightness??1),distance=Math.max(200,rootY-source.y);
      const f={x,y,width,h,edge:layout.edge,tint,depth:options.floatThickness/100*faceHeight*.12,dx:Math.max(-.6,Math.min(.6,(rootX-source.x)/distance-(source.slope||0)))};
      const index=faces.length;
      // Composite the complete opaque body before applying its transition alpha.
      if(f.edge<1)f.body=this.floatingBodyGroup(f,scale,index);
      faces.push({...f,layout,geometry,rowKey:layout.waveRow||row});
    }
    // A fading word wave is one opaque row before alpha is applied.
    // Adjacent extruded faces can overlap, so per-letter alpha would darken seams.
    const waveGroups=new Map();
    for(const f of faces)if(f.body&&f.layout.waveRow){const group=waveGroups.get(f.rowKey)||[];group.push(f);waveGroups.set(f.rowKey,group);}
    let waveGroupIndex=0;this.floatingWaveBodies ||= [];
    for(const group of waveGroups.values()){
      const left=Math.floor(Math.min(...group.map(f=>f.body.x))*scale)/scale,top=Math.floor(Math.min(...group.map(f=>f.body.y))*scale)/scale;
      const right=Math.max(...group.map(f=>f.body.x+f.body.w)),bottom=Math.max(...group.map(f=>f.body.y+f.body.h));
      const surface=this.floatingWaveBodies[waveGroupIndex++] ||= document.createElement('canvas');
      const w=Math.ceil((right-left)*scale),h=Math.ceil((bottom-top)*scale);if(surface.width!==w)surface.width=w;if(surface.height!==h)surface.height=h;
      const g=surface.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);g.globalAlpha=1;g.globalCompositeOperation='source-over';
      g.setTransform(scale,0,0,scale,-left*scale,-top*scale);
      for(const f of group)this.paintFloatingBody(g,f,f.x,f.y);
      const body={surface,x:left,y:top,w:w/scale,h:h/scale};for(const f of group)f.body=body;
    }
    for(let index=0;index<faces.length;index++){
      const f=faces[index],{layout,geometry}=f,{mask}=layout.dimensions,options=layout.floatPrefs;
      if(geometry.alpha>0&&layout.showShadow!==false){
        const texture=this.floatingShadow(mask,options),sx=geometry.shadowWidth/texture.width,sy=geometry.shadowHeight/texture.height;
        const tx=-geometry.shadowWidth/2-texture.padX*sx,ty=-geometry.shadowHeight/2-texture.padY*sy;
        const tw=texture.surface.width*sx,th=texture.surface.height*sy;
        const soft=layout.waveSoft!==undefined?this.floatingShadow(mask,{...options,floatSoftness:Math.min(100,options.floatSoftness+12)}):null;
        const paintShadow=g=>{g.save();g.translate(geometry.shadowX,geometry.shadowY);g.transform(1,0,geometry.skew,1,0,0);
          const alpha=g.globalAlpha,mix=layout.waveSoft||0;
          g.globalAlpha=alpha*(1-mix);g.drawImage(texture.surface,tx,ty,tw,th);
          if(soft){g.globalAlpha=alpha*mix;const ax=geometry.shadowWidth/soft.width,ay=geometry.shadowHeight/soft.height;g.drawImage(soft.surface,-geometry.shadowWidth/2-soft.padX*ax,-geometry.shadowHeight/2-soft.padY*ay,soft.surface.width*ax,soft.surface.height*ay);}
          g.restore();};
        ctx.save();ctx.globalAlpha=geometry.alpha;
        if(!f.body)paintShadow(ctx);
        else {
          // An object's own shadow cannot show through its dissolving body.
          // Mask only that shadow; all row shadows still sit below all faces.
          const skew0=geometry.skew*ty,skew1=geometry.skew*(ty+th);
          const left=Math.max(0,Math.floor((geometry.shadowX+tx+Math.min(skew0,skew1))*scale)/scale);
          const top=Math.max(0,Math.floor((geometry.shadowY+ty)*scale)/scale);
          const right=Math.min(ctx.canvas.width/scale,geometry.shadowX+tx+tw+Math.max(skew0,skew1));
          const bottom=Math.min(ctx.canvas.height/scale,geometry.shadowY+ty+th);
          if(right>left&&bottom>top){
            this.floatingShadowGroups ||= [];
            const surface=this.floatingShadowGroups[index] ||= document.createElement('canvas');
            const w=Math.ceil((right-left)*scale),h=Math.ceil((bottom-top)*scale);
            if(surface.width!==w)surface.width=w;if(surface.height!==h)surface.height=h;
            const g=surface.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w,h);
            g.setTransform(scale,0,0,scale,-left*scale,-top*scale);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.imageSmoothingQuality='high';paintShadow(g);
            g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='destination-out';const b=f.body;g.drawImage(b.surface,(b.x-left)*scale,(b.y-top)*scale,b.w*scale,b.h*scale);g.globalCompositeOperation='source-over';
            ctx.drawImage(surface,left,top,w/scale,h/scale);
          }
        }
        ctx.restore();
      }
    }
    const paintedBodies=new Set();
    for(const f of faces){
      if(f.body&&paintedBodies.has(f.body))continue;if(f.body)paintedBodies.add(f.body);
      ctx.save();ctx.globalAlpha=f.edge;
      if(f.body){const b=f.body;ctx.drawImage(b.surface,b.x,b.y,b.w,b.h);}
      else this.paintFloatingBody(ctx,f,f.x,f.y);
      ctx.restore();
    }
  }
  projectedWaveSequence(layout){
    const wave=layout.wave,mask=layout.dimensions.mask;
    if(!wave||wave.amplitude<=0||!Number.isFinite(wave.elapsed)||wave.elapsed<=0||wave.elapsed>=wave.duration)return null;
    if(mask.waveGlyphs?.some(g=>/[^\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{N}\p{P}\p{Z}\p{M}\s]/u.test(g.text)))return null;
    return this.waveSegments(mask);
  }
  projectedWaveSample(layout,sequence,u){
    const {segments}=sequence,position=u*layout.dimensions.mask.width;
    let a=segments[0],b=a;
    for(let i=1;i<segments.length;i++){b=segments[i];if(position<=(b.start+b.mask.width/2))break;a=b;}
    const left=a.start+a.mask.width/2,right=b.start+b.mask.width/2;
    const ratio=right>left?Math.max(0,Math.min(1,(position-left)/(right-left))):0;
    const coordinate=a.at+a.weight/2+(b.at+b.weight/2-a.at-a.weight/2)*ratio;
    const wave=layout.wave;
    return this.wavePulse(wave.elapsed,coordinate,0,sequence.total,wave.duration,wave.range,wave.softness);
  }
  projectedWaveTexture(texture,width,height,layout){
    const sequence=this.projectedWaveSequence(layout);
    if(!sequence||height<=0)return {texture,height};
    // Assemble integer-width columns before scene compositing. Drawing fractional
    // strips directly with multiply produced visible seams between adjacent strips.
    const count=Math.max(1,Math.min(180,texture.width,Math.max(48,sequence.segments.length*6)));
    const pure=layout.mode==='pure',amount=layout.wave.amplitude/100;
    const shiftScale=layout.bodyHeight*amount*(pure?1.8:.5)*texture.height/height;
    const reserve=pure?Math.ceil(shiftScale)+2:0;
    this.projectedWaveSurfaces ||= new WeakMap();
    let surface=this.projectedWaveSurfaces.get(texture);
    if(!surface){surface=document.createElement('canvas');this.projectedWaveSurfaces.set(texture,surface);}
    const needed=Math.ceil(texture.height*(pure?1:1+amount)+shiftScale)+2;
    if(surface.width!==texture.width)surface.width=texture.width;
    if(surface.height<needed)surface.height=Math.ceil(needed/64)*64;
    const paint=surface.getContext('2d');paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,surface.width,surface.height);
    paint.imageSmoothingEnabled=true;
    const mapping=layout.waveMapping;
    let previousPulse=pure?this.projectedWaveSample(layout,sequence,mapping?-mapping.left/mapping.width:0):0;
    let moved=false;
    for(let i=0;i<count;i++){
      const start=Math.round(i/count*texture.width),end=Math.round((i+1)/count*texture.width);
      if(pure){
        // Adjacent strips share the same end point. A vertical shear interpolates
        // the lift inside each strip, eliminating the old staircase without more
        // strips, extra blur, overlapping alpha or a larger render texture.
        const u=end/texture.width;
        const nextPulse=this.projectedWaveSample(layout,sequence,mapping?(u*mapping.screenWidth-mapping.left)/mapping.width:u);
        const shift=reserve-shiftScale*previousPulse;
        const slope=shiftScale*(previousPulse-nextPulse)/(end-start);
        if(previousPulse>0||nextPulse>0)moved=true;
        paint.setTransform(1,slope,0,1,start,shift);
        paint.drawImage(texture,start,0,end-start,texture.height,0,0,end-start,texture.height);
        previousPulse=nextPulse;
        continue;
      }
      const u=(start+end)/2/texture.width;
      const pulse=this.projectedWaveSample(layout,sequence,mapping?(u*mapping.screenWidth-mapping.left)/mapping.width:u);
      if(pulse>0)moved=true;
      const stretch=pure?1:1+amount*pulse*.6,shift=pure?reserve-shiftScale*pulse:shiftScale*pulse;
      paint.drawImage(texture,start,0,end-start,texture.height,start,shift,end-start,texture.height*stretch);
    }
    paint.setTransform(1,0,0,1,0,0);
    return moved?{texture:surface,height:height*surface.height/texture.height,offsetY:-reserve*height/texture.height}:{texture,height};
  }
  drawProjectedWaveShadow(ctx,text,rootX,rootY,source,layout,scale,index){
    if(!this.projectedWaveSequence(layout)){this.drawShadow(ctx,text,rootX,rootY,source,layout);return;}
    // Compose the original contact layers once, then deform the completed shadow.
    // This avoids repeating a column warp for every letter-height contact band.
    const {inkScale}=layout.dimensions,combined=layout.mode==='combined';
    const faceHeight=combined?Math.max(10,layout.bodyHeight*.61)*inkScale:0;
    const distance=Math.hypot(rootX-source.x,Math.max(0,rootY-source.y))/Math.max(1,layout.referenceDistance);
    const height=layout.plateLength*1.22*distance/(.8+.35*distance)*source.heightScale*layout.shade.trail/100*inkScale;
    const top=Math.floor(rootY+layout.shade.contact-2),screenWidth=ctx.canvas.width/scale;
    const pixelHeight=Math.max(1,Math.ceil((faceHeight+height+4)*scale));
    this.projectedBases ||= [];
    const surface=this.projectedBases[index] ||= document.createElement('canvas');
    if(surface.width!==ctx.canvas.width)surface.width=ctx.canvas.width;
    if(surface.height<pixelHeight)surface.height=Math.ceil(pixelHeight/64)*64;
    const paint=surface.getContext('2d');paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,surface.width,surface.height);
    paint.setTransform(scale,0,0,scale,0,-top*scale);
    this.drawShadow(paint,text,rootX,rootY,source,layout);
    const waveLayout={...layout,waveMapping:{screenWidth,left:rootX-layout.dimensions.width/2,width:layout.dimensions.width}};
    const waved=this.projectedWaveTexture(surface,screenWidth,surface.height/scale,waveLayout);
    ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='multiply';
    ctx.drawImage(waved.texture,0,top+(waved.offsetY||0),screenWidth,waved.height);ctx.restore();
  }
  drawProjectedWaveFace(ctx,face){
    const {layout}=face,sequence=this.projectedWaveSequence(layout);
    if(!sequence){ctx.drawImage(face.surface,face.x,face.y,face.width,face.height);return;}
    const mask=layout.dimensions.mask,wave=layout.wave;
    for(const segment of sequence.segments){
      const start=segment.start/mask.width,fraction=segment.mask.width/mask.width;
      const pulse=this.wavePulse(wave.elapsed,segment.at,segment.weight,sequence.total,wave.duration,wave.range,wave.softness);
      const lift=layout.bodyHeight*wave.amplitude/100*pulse;
      ctx.drawImage(face.surface,start*face.surface.width,0,fraction*face.surface.width,face.surface.height,face.x+start*face.width,face.y-lift,fraction*face.width,face.height);
    }
  }
  drawRows(ctx,rows,rootX,source,scale){
    if(rows[0]?.layout.mode==='floating'){this.drawFloating(ctx,rows,rootX,source,scale);return;}
    const faces=[];
    for(const {rootY,layout} of rows){
      if(layout.mode!=='combined'||!layout.edge)continue;
      const i=faces.length;
      this.faceSurfaces[i] ||= document.createElement('canvas');
      faces.push({...this.prepareFace(ctx,rootX,rootY,layout,this.faceSurfaces[i],scale),layout});
    }
    let waveIndex=0;
    for(const {text,rootY,layout} of rows)if(layout.showShadow!==false)this.drawProjectedWaveShadow(ctx,text,rootX,rootY,source,layout,scale,waveIndex++);
    ctx.save();
    for(const face of faces){
      ctx.globalAlpha=face.edge;
      this.drawProjectedWaveFace(ctx,face);
    }
    ctx.restore();
  }
  dimensions(text,bodyHeight,maxWidth,spacingReferenceHeight=bodyHeight){
    const mask=this.mask(text),unit=mask.referenceHeight||mask.inkHeight;
    const spacingRatio=spacingReferenceHeight/bodyHeight;
    const natural=(mask.width+(mask.totalSpacing||0)*(spacingRatio-1))*bodyHeight/unit*.48;
    const fit=Math.min(1,maxWidth/natural);
    return {mask,width:natural*fit,inkScale:mask.inkHeight/unit*fit,spacingRatio};
  }
  shadowLayer(text,layout,mask=layout.dimensions.mask) {
    const bakeWidth=Math.min(layout.bakeMaxWidth,mask.width*layout.anchorHeight/(mask.referenceHeight||mask.inkHeight)*.48);
    const combined=layout.mode==='combined';
    // Fixed row anchors remain on the receiver during a swing.
    const ratio=layout.anchorRatio;
    const softness=(layout.shade.softness??100)/100;
    const fadeStrength=layout.shade.fadeStrength??45;
    const key=[text,Math.round(bakeWidth),ratio.toFixed(4),combined,layout.shade.blurStart,layout.shade.blurSpan,softness,fadeStrength].join('|');
    let layer=this.cache.get(key);
    if(!layer){
      const masks=combined&&mask.contacts?mask.contacts:[mask];
      layer=masks.map(contact=>({...this.bake(contact,bakeWidth,ratio,combined,
        layout.shade.blurStart/100,layout.shade.blurSpan/100,softness,fadeStrength),heightRatio:contact.inkHeight/mask.inkHeight}));
      if(this.cache.size>=24)this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key,layer);
    }
    return layer;
  }
  shadowBand(text,layout) {
    const layer=this.shadowLayer(text,layout);
    return layer[0].verticalBand||[0,1];
  }
  drawShadow(ctx,text,rootX,rootY,source,layout) {
    const {mask,width,inkScale}=layout.dimensions||this.dimensions(text,layout.bodyHeight,layout.maxWidth);
    const bakeWidth=Math.min(layout.bakeMaxWidth,mask.width*layout.anchorHeight/(mask.referenceHeight||mask.inkHeight)*.48);
    const combined=layout.mode==='combined';
    const softness=(layout.shade.softness??100)/100;
    const layer=this.shadowLayer(text,layout,mask);
    if(layout.opacity===0)return;
    const faceHeight=combined ? Math.max(10,layout.bodyHeight*.61)*inkScale : 0;
    const baseline=rootY+faceHeight;
    const throwDistance=Math.hypot(rootX-source.x,Math.max(0,rootY-source.y));
    const parallel=layout.shade.projection!=='perspective';
    // With fixed lamp and letter heights the geometric shadow grows with throw.
    // Compress the extremes so distant rows stay readable on the finite stage.
    const throwRatio=throwDistance/Math.max(1,layout.referenceDistance);
    const reach=throwRatio/(.8+.35*throwRatio);
    const height=layout.plateLength*1.22*reach*source.heightScale*layout.shade.trail/100*inkScale;
    const tilt=Math.tan(layout.shade.lean*Math.PI/180);
    for(const part of layer){
      const footY=baseline-faceHeight*(1-part.heightRatio);
      const distance=parallel?layout.referenceDistance:Math.max(35,footY-source.y);
      ctx.save();
      ctx.translate(rootX,footY+layout.shade.contact);
      ctx.transform(1,0,(rootX-source.x)/distance+tilt,1,0,0);
      ctx.globalCompositeOperation='multiply';
      ctx.globalAlpha=layout.opacity*(combined?1-.27*softness:1)*layout.shade.density/100;
      const partHeight=height*part.heightRatio;
      const rootWidth=part.fullWidth*width/bakeWidth;
      // A nearby row opens at a steeper angle. Distance changes this slope;
      // shadow length and the finite-emitter blur keep their own calculations.
      // Parallel projection retains one slope at every row.
      const edgeSlope=.20*(parallel?1:layout.referenceDistance/Math.max(distance,.35*layout.referenceDistance));
      const fan=layout.shade.fan/100*2*edgeSlope*partHeight/layout.fanReferenceWidth;
      const expansion=Math.round(fan*rootWidth*2)/(rootWidth*2);
      const texture=this.spreadTexture(part,expansion,layout.tone,mask,layout.dimensions?.spacingRatio||1);
      const span=rootWidth*(1+expansion);
      // Project a finite emitter: its horizontal penumbra starts at zero
      // on contact and widens with the length of the projected ray.
      const penumbra=softness*partHeight*.035*Math.min(1.8,throwRatio);
      if(penumbra>.8 && partHeight>0){
        const alpha=ctx.globalAlpha;
        ctx.globalAlpha=1-Math.pow(1-Math.min(.99,alpha),1/3);
        for(const sample of [-1,0,1]){
          ctx.save();ctx.transform(1,0,sample*penumbra/partHeight,1,0,0);
          ctx.drawImage(texture,-span/2,0,span,partHeight);ctx.restore();
        }
      }else ctx.drawImage(texture,-span/2,0,span,partHeight);
      ctx.restore();
    }
  }
}
