// Product textures retain their alpha and proportions. The reflection is a
// separate masked layer, driven by the same pendulum angles as the fixture.
const realisticFixtures=(()=>{
  // Authored front/back keyframes interpolate with smoothstep. Rest is an exact
  // identity: original PNG silhouette, proportions, surface and diffuser.
  const frames=[{pitch:-.65,sx:.99,sy:.985,tilt:-.012},{pitch:0,sx:1,sy:1,tilt:0},{pitch:.65,sx:1.012,sy:1.018,tilt:.012}];
  function poseFrame(pitch){
    const p=Math.max(-.65,Math.min(.65,pitch)),a=p<0?frames[0]:frames[1],b=p<0?frames[1]:frames[2];
    const u=(p-a.pitch)/(b.pitch-a.pitch),t=u*u*(3-2*u);
    return {sx:a.sx+(b.sx-a.sx)*t,sy:a.sy+(b.sy-a.sy)*t,tilt:a.tilt+(b.tilt-a.tilt)*t};
  }
  const sprites=new Map();
  const profiles={tube:{width:22,rim:9},dome:{width:48,rim:21},vintage:{width:52,rim:23},modern:{width:56,rim:24},capsule:{width:28,rim:11},red:{width:80,rim:10},glass:{width:48,rim:7,lensY:32}};
  function install(image,keys,columns,rows){
    const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
    const data=g.getImageData(0,0,c.width,c.height).data;
    keys.forEach((key,index)=>{
      const left=Math.floor(index%columns*c.width/columns),right=Math.floor((index%columns+1)*c.width/columns);
      const top=Math.floor(Math.floor(index/columns)*c.height/rows),bottom=Math.floor((Math.floor(index/columns)+1)*c.height/rows);
      let x0=right,y0=bottom,x1=-1,y1=-1;
      for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
        if(data[(y*c.width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      }
      if(x1<x0)return;
      const b={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
      const scale=Math.min(profiles[key].width/b.w,44/b.h);
      const width=b.w*scale,height=b.h*scale;
      const mask=document.createElement('canvas');mask.width=256;mask.height=Math.max(16,Math.round(256*b.h/b.w));
      const mg=mask.getContext('2d',{willReadFrequently:true});mg.drawImage(image,b.x,b.y,b.w,b.h,0,0,mask.width,mask.height);
      // Limit colour modulation to the existing luminous pixels; never draw a
      // second ellipse or recolour the metal. Glass transmission is tinted separately.
      const glass=key==='glass'?document.createElement('canvas'):null;
      let glassBase=null;
      if(glass){glass.width=mask.width;glass.height=mask.height;glassBase=mg.getImageData(0,0,mask.width,mask.height);}
      const emission=document.createElement('canvas');emission.width=mask.width;emission.height=mask.height;
      const eg=emission.getContext('2d'),ep=mg.getImageData(0,0,mask.width,mask.height);
      for(let i=0;i<ep.data.length;i+=4){
        const r=ep.data[i],g=ep.data[i+1],b=ep.data[i+2],y=Math.floor(i/4/mask.width)/mask.height;
        const lit=Math.max(0,Math.min(1,(Math.min(r,g)-150)/80));
        ep.data[i+3]*=y>.48&&r>=b*.94?lit:0;
      }
      eg.putImageData(ep,0,0);
      const tint=document.createElement('canvas');tint.width=mask.width;tint.height=mask.height;
      const pixels=mg.getImageData(0,0,mask.width,mask.height);
      for(let i=0;i<pixels.data.length;i+=4){
        const r=pixels.data[i],green=pixels.data[i+1],blue=pixels.data[i+2];
        const strength=key==='red'?Math.max(0,Math.min(1,(r-Math.max(green,blue)*1.15)/35)):.7*(1-Math.max(r,green,blue)/350);
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]*=strength;
      }
      mg.putImageData(pixels,0,0);
      const reflection=document.createElement('canvas');reflection.width=mask.width;reflection.height=mask.height;
      sprites.set(key,{image,b,width,height,mask,reflection,emission,tint,glass,glassBase,glassColor:null,tg:tint.getContext('2d'),g:reflection.getContext('2d'),lastYaw:NaN,lastPitch:NaN});
    });
    if(typeof window!=='undefined')window.dispatchEvent(new Event('lamptexturesready'));
  }
  function load(url,keys,columns,rows){
    const img=new Image();img.decoding='async';img.onload=()=>{try{install(img,keys,columns,rows);}catch(error){console.warn('Lamp texture unavailable',error);}};
    img.src=url;
  }
  load('materials/lamp-classics-atlas.png',['tube','dome','vintage','modern','capsule','glass'],3,2);
  load('materials/lamp-02-burgundy.png',['red'],1,1);
  function tintGlassPixels(source,dest,color,width,height){
    const peak=Math.max(1,...color);
    for(let i=0;i<source.length;i+=4){
      const light=.2126*source[i]+.7152*source[i+1]+.0722*source[i+2];
      const y=Math.floor(i/4/width)/height;
      // Keep the suspension neutral and specular highlights nearly white.
      const amount=y<.13?0:.65*(1-Math.pow(light/255,3));
      for(let c=0;c<3;c++)dest[i+c]=source[i+c]*(1-amount)+light*(color[c]/peak)*amount;
      dest[i+3]=source[i+3];
    }
  }
  function draw(ctx,key,{yaw=0,pitch=0,color=[255,215,170],power=1}={}){
    const s=sprites.get(key);if(!s)return null;
    const x=-s.width/2,y=40-s.height;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const pose=poseFrame(pitch);ctx.rotate(pose.tilt);ctx.scale(pose.sx,pose.sy);
    if(y>0){ctx.strokeStyle='#5a5141';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,y+1);ctx.stroke();}
    if(s.glass){
      const channels=color.map(v=>Math.round(v/4)*4),cache=channels.join(',');
      if(s.glassColor!==cache){
        s.glassColor=cache;
        const gg=s.glass.getContext('2d'),out=gg.createImageData(s.glass.width,s.glass.height);
        tintGlassPixels(s.glassBase.data,out.data,channels,s.glass.width,s.glass.height);
        gg.putImageData(out,0,0);
      }
      ctx.drawImage(s.glass,x,y,s.width,s.height);
    }else ctx.drawImage(s.image,s.b.x,s.b.y,s.b.w,s.b.h,x,y,s.width,s.height);
    if(Math.abs(yaw-s.lastYaw)>.002||Math.abs(pitch-s.lastPitch)>.002||!Number.isFinite(s.lastYaw)){
      s.lastYaw=yaw;s.lastPitch=pitch;
      const g=s.g,w=s.reflection.width,h=s.reflection.height;
      g.clearRect(0,0,w,h);g.globalCompositeOperation='source-over';g.drawImage(s.mask,0,0);g.globalCompositeOperation='source-in';
      g.save();g.translate(w*(.27+Math.sin(yaw)*.24+Math.sin(pitch)*.08),h*(.43+Math.sin(pitch)*.13));g.scale(.33,1);
      const glow=g.createRadialGradient(0,0,0,0,0,w*.48);
      glow.addColorStop(0,'rgba(255,241,220,.22)');glow.addColorStop(.36,'rgba(255,241,220,.065)');glow.addColorStop(1,'rgba(255,241,220,0)');
      g.fillStyle=glow;g.fillRect(-w*4,-h*2,w*8,h*4);g.restore();
    }
    ctx.globalCompositeOperation='screen';ctx.drawImage(s.reflection,x,y,s.width,s.height);
    const tg=s.tg,w=s.tint.width,h=s.tint.height;
    tg.clearRect(0,0,w,h);tg.globalCompositeOperation='source-over';tg.drawImage(s.emission,0,0);
    tg.globalCompositeOperation='source-in';tg.fillStyle='rgb('+color.map(v=>Math.round(v)).join(',')+')';tg.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='color';ctx.globalAlpha=.68;ctx.drawImage(s.tint,x,y,s.width,s.height);
    tg.fillStyle='#000';tg.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Math.max(0,Math.min(.45,(1-power)*.55));ctx.drawImage(s.tint,x,y,s.width,s.height);
    ctx.restore();
    // The product texture already contains its complete diffuser/luminous core.
    // Do not add the procedural ellipse used by the simplified fixtures.
    return {rim:profiles[key].rim,lensY:profiles[key].lensY||40,integratedLight:true};
  }
  return {draw,poseFrame,tintGlassPixels};
})();
