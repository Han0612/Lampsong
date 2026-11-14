// Photographic lamp bodies, calibrated to manufacturer proportions.
// The four replacement assets are transparent, full-detail material renders.
// They are decoded once and drawn through the same lightweight pose treatment
// as the seven existing realistic fixtures. See docs/refined-lamps-v107.md.
const refinedFixtures=(()=>{
  const profiles={
    ph5:{width:80,height:42.72,rim:18,lensY:40,material:'painted spun metal',metal:['#8a492b','#d69a76','#79422a'],file:'ph5',gloss:.08,emissionTop:.93},
    caravaggio:{width:33.685,height:44,rim:15.5,lensY:40,material:'high-gloss black lacquer',metal:['#060707','#727772','#080b09'],file:'caravaggio',gloss:.14,emissionTop:.935},
    gubi1965:{width:76,height:46,rim:34,lensY:40,dropBelowLens:4.5,material:'matte white powder coat',metal:['#b7b5ac','#e6e3d8','#a5a69e'],file:'gubi-semi',gloss:.015,emissionTop:.88,emissionBottom:.94},
    jazz:{width:17.875,height:44,rim:8,lensY:40,material:'gloss white lacquer',metal:['#a9aaa4','#f2f0e8','#b5b8b0'],file:'jazz',gloss:.05,emissionTop:.955}
  };
  const sprites=new Map(),pending=[];
  function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
  function install(key,image){
    const source=canvas(image.naturalWidth,image.naturalHeight),sg=source.getContext('2d',{willReadFrequently:true});sg.drawImage(image,0,0);
    const pixels=sg.getImageData(0,0,source.width,source.height).data;
    let x0=source.width,y0=source.height,x1=-1,y1=-1;
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(pixels[(y*source.width+x)*4+3]>96){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    if(x1<x0)throw new Error('Empty refined fixture: '+key);
    const p=profiles[key],b={x:Math.max(0,x0-2),y:Math.max(0,y0-2),w:x1-x0+5,h:y1-y0+5};
    const scale=640/Math.max(b.w,b.h),w=Math.round(b.w*scale),h=Math.round(b.h*scale);
    const base=canvas(w,h),g=base.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(image,b.x,b.y,b.w,b.h,0,0,w,h);
    const mw=Math.max(1,Math.round(w*192/Math.max(w,h))),mh=Math.max(1,Math.round(h*192/Math.max(w,h))),small=canvas(mw,mh),mg=small.getContext('2d',{willReadFrequently:true});mg.drawImage(base,0,0,mw,mh);
    const original=mg.getImageData(0,0,mw,mh),mask=mg.createImageData(mw,mh),emit=mg.createImageData(mw,mh);
    // Surface highlights and the luminous underside are independent masks:
    // lamp colour can tint the light without painting the white Jazz body.
    for(let i=0;i<original.data.length;i+=4){
      const r=original.data[i],green=original.data[i+1],blue=original.data[i+2],a=original.data[i+3],y=Math.floor(i/4/mw)/mh;
      const light=(r*.2126+green*.7152+blue*.0722)/255;
      mask.data[i]=mask.data[i+1]=mask.data[i+2]=255;mask.data[i+3]=a*Math.max(0,Math.min(.7,light*.85));
      emit.data[i]=emit.data[i+1]=emit.data[i+2]=255;
      emit.data[i+3]=y>p.emissionTop&&y<(p.emissionBottom??1)&&r>blue*1.03?a*Math.max(0,Math.min(1,(Math.min(r,green)-130)/105)):0;
    }
    const reflectionMask=canvas(mw,mh);reflectionMask.getContext('2d').putImageData(mask,0,0);
    const emissionMask=canvas(mw,mh);emissionMask.getContext('2d').putImageData(emit,0,0);
    const reflection=canvas(mw,mh),tint=canvas(mw,mh);
    sprites.set(key,{base,reflectionMask,emissionMask,reflection,tint,lastYaw:NaN,lastPitch:NaN,lastColor:'',lastPower:NaN});
    if(typeof window!=='undefined')window.dispatchEvent(new Event('lamptexturesready'));
  }
  for(const [key,p]of Object.entries(profiles))pending.push(new Promise(resolve=>{
    const image=new Image();image.decoding='async';image.onload=()=>{try{install(key,image);}catch(error){console.warn('Refined lamp unavailable',key,error);}resolve();};image.onerror=()=>resolve();image.src='materials/refined/'+p.file+'.webp';
  }));
  function draw(ctx,key,{yaw=0,pitch=0,color=[255,215,170],power=1}={}){
    const p=profiles[key];if(!p)return null;const s=sprites.get(key);
    // Reserve recognised styles while their textures decode. Falling through
    // would flash the discarded procedural lamp for a frame on cold loads.
    if(!s)return {rim:p.rim,lensY:p.lensY,integratedLight:true,pending:true};
    const x=-p.width/2,y=p.lensY-p.height+(p.dropBelowLens||0);
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    // Preserve measured rest proportions; all styles use a small, continuous
    // viewing-angle response rather than stretching to a common silhouette.
    const lean=Math.sin(Math.max(-.65,Math.min(.65,pitch)));
    ctx.rotate(lean*.012);ctx.scale(1+lean*.012,1+lean*.018);
    if(y>0){ctx.strokeStyle=key==='gubi1965'?'#bebeb4':'#6d7062';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,y+.3);ctx.stroke();}
    ctx.drawImage(s.base,x,y,p.width,p.height);
    if(Math.abs(yaw-s.lastYaw)>.003||Math.abs(pitch-s.lastPitch)>.003||!Number.isFinite(s.lastYaw)){
      s.lastYaw=yaw;s.lastPitch=pitch;
      const g=s.reflection.getContext('2d'),w=s.reflection.width,h=s.reflection.height;
      g.clearRect(0,0,w,h);g.globalCompositeOperation='source-over';g.drawImage(s.reflectionMask,0,0);g.globalCompositeOperation='source-in';
      const shift=w*(.28+Math.sin(yaw)*.16+Math.sin(pitch)*.06),glow=g.createLinearGradient(shift-w*.2,0,shift+w*.2,0);
      glow.addColorStop(0,'rgba(244,241,223,0)');glow.addColorStop(.45,'rgba(244,241,223,'+p.gloss+')');glow.addColorStop(1,'rgba(244,241,223,0)');g.fillStyle=glow;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
    }
    ctx.drawImage(s.reflection,x,y,p.width,p.height);
    const channels=color.map(v=>Math.max(0,Math.min(255,Math.round(v/4)*4))),signature=channels.join(','),brightness=Math.round(Math.max(0,Math.min(1.5,power))*30)/30;
    if(s.lastColor!==signature||s.lastPower!==brightness){
      s.lastColor=signature;s.lastPower=brightness;
      const g=s.tint.getContext('2d'),w=s.tint.width,h=s.tint.height;g.clearRect(0,0,w,h);g.globalCompositeOperation='source-over';g.drawImage(s.emissionMask,0,0);g.globalCompositeOperation='source-in';g.fillStyle='rgb('+signature+')';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
    }
    ctx.globalAlpha=.38;ctx.drawImage(s.tint,x,y,p.width,p.height);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    if(brightness<1){ctx.globalAlpha=(1-brightness)*.32;ctx.globalCompositeOperation='multiply';ctx.drawImage(s.tint,x,y,p.width,p.height);}
    ctx.restore();return {rim:p.rim,lensY:p.lensY,integratedLight:true};
  }
  return {draw,profiles,ready:Promise.all(pending),isReady:key=>sprites.has(key)};
})();
