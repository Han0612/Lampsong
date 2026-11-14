// A small, opaque cached cover wash. No full-resolution blur during animation.
'use strict';
class CoverBackground {
  constructor(makeCanvas=()=>document.createElement('canvas')){
    this.makeCanvas=makeCanvas;this.image=null;this.pending=null;
    this.from=null;this.to=null;this.progress=1;this.opacity=0;this.width=0;this.height=0;this.blur=24;
  }
  setImage(image){
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    if(!iw||!ih)return;
    // Keep a decoded snapshot: the visible cover element can change src before
    // its next load completes, including while the viewport is being resized.
    const source=this.makeCanvas(),scale=Math.min(1,640/Math.max(iw,ih));
    source.width=Math.max(1,Math.round(iw*scale));source.height=Math.max(1,Math.round(ih*scale));
    source.getContext('2d').drawImage(image,0,0,source.width,source.height);this.pending=source;
  }
  blend(canvas){
    const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);
    if(this.from)g.drawImage(this.from,0,0,canvas.width,canvas.height);
    if(this.to){g.globalAlpha=this.from?this.ease(this.progress):1;g.drawImage(this.to,0,0,canvas.width,canvas.height);g.globalAlpha=1;}
  }
  ease(t){return t*t*(3-2*t);}
  soften(pixels,width,height,sigma){
    // Three separable box passes approximate a Gaussian. Running sums keep
    // work linear in pixel count even at 120; clamped edges never admit black.
    let src=Float32Array.from(pixels.data),dst=new Float32Array(src.length);
    // Fractional box kernels preserve a continuous variance, including below
    // one pixel. Each of three passes contributes sigma²/3 per axis.
    const radius=Math.floor((Math.sqrt(1+4*sigma*sigma)-1)/2);
    const mix=(sigma*sigma-radius*(radius+1))/(2*(radius+1));
    const inner=(1-mix)/(2*radius+1)+mix/(2*radius+3);
    const outer=mix/(2*radius+3);
    if(sigma>0)for(let pass=0;pass<3;pass++){
      for(let axis=0;axis<2;axis++){
        const length=axis?height:width,lines=axis?width:height,stride=axis?width*4:4;
        for(let line=0;line<lines;line++){
          const base=axis?line*4:line*width*4;
          let red=src[base]*(radius+1),green=src[base+1]*(radius+1),blue=src[base+2]*(radius+1);
          for(let k=1;k<=radius;k++){
            const i=base+Math.min(length-1,k)*stride;
            red+=src[i];green+=src[i+1];blue+=src[i+2];
          }
          for(let p=0;p<length;p++){
            const i=base+p*stride;
            const left=base+Math.max(0,p-radius-1)*stride,right=base+Math.min(length-1,p+radius+1)*stride;
            dst[i]=red*inner+(src[left]+src[right])*outer;
            dst[i+1]=green*inner+(src[left+1]+src[right+1])*outer;
            dst[i+2]=blue*inner+(src[left+2]+src[right+2])*outer;
            const add=base+Math.min(length-1,p+radius+1)*stride,remove=base+Math.max(0,p-radius)*stride;
            red+=src[add]-src[remove];green+=src[add+1]-src[remove+1];blue+=src[add+2]-src[remove+2];
          }
        }
        [src,dst]=[dst,src];
      }
    }
    for(let i=0;i<src.length;i+=4){
      const gray=.2126*src[i]+.7152*src[i+1]+.0722*src[i+2];
      for(let c=0;c<3;c++)pixels.data[i+c]=gray+(src[i+c]-gray)*.55;
      pixels.data[i+3]=255;
    }
    return pixels;
  }
  blurSigma(value){
    const amount=Math.max(0,Math.min(120,Number(value)||0));
    return 120*Math.pow(amount/120,1.5);
  }
  cache(image,width,height,blur=24){
    const canvas=this.makeCanvas();canvas.width=width;canvas.height=height;
    const g=canvas.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,width,height);
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    if(!iw||!ih)return canvas;
    const scale=Math.max(width/iw,height/ih)*1.4,w=iw*scale,h=ih*scale;
    g.drawImage(image,(width-w)/2,(height-h)/2,w,h);
    g.putImageData(this.soften(g.getImageData(0,0,width,height),width,height,this.blurSigma(blur)),0,0);
    const shade=g.createRadialGradient(width*.5,height*.5,0,width*.5,height*.5,Math.max(width,height)*.65);
    shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,0.35)');g.fillStyle=shade;g.fillRect(0,0,width,height);
    return canvas;
  }
  draw(g,width,height,dt,enabled,reduced=false,blur=24,dim=86){
    blur=Math.max(0,Math.min(120,blur));dim=Math.max(0,Math.min(100,dim));
    const scale=Math.min(1,320/Math.max(width,height));
    const cw=Math.max(1,Math.round(width*scale)),ch=Math.max(1,Math.round(height*scale));
    const resized=cw!==this.width||ch!==this.height;
    if(this.pending||resized&&this.image){
      const image=this.pending||this.image,next=this.cache(image,cw,ch,blur);
      if(this.to){const from=this.makeCanvas();from.width=cw;from.height=ch;this.blend(from);this.from=from;}
      this.to=next;this.image=image;this.pending=null;this.width=cw;this.height=ch;this.blur=blur;
      this.progress=this.from&&!reduced?0:1;
    }
    // Slider changes update immediately without restarting the cover transition.
    // The dimmer only changes compositing strength and never regenerates blur.
    if(this.to&&blur!==this.blur){this.to=this.cache(this.image,cw,ch,blur);this.blur=blur;}
    this.progress=Math.min(1,this.progress+Math.max(0,dt)/1.2);
    if(this.progress===1)this.from=null;
    const goal=enabled?1:0;
    this.opacity=reduced?goal:this.opacity+(goal-this.opacity)*(1-Math.exp(-Math.max(0,dt)*7));
    if(Math.abs(goal-this.opacity)<.001)this.opacity=goal;
    if(!this.to||this.opacity===0)return;
    // Screen is additive over black and cannot darken an existing light beam.
    // Apply after rhythm attenuation so the background itself does not pulse.
    g.save();g.globalCompositeOperation='screen';
    const t=this.ease(this.progress),alpha=this.opacity*(1-dim/100);
    if(this.from){g.globalAlpha=alpha*(1-t);g.drawImage(this.from,0,0,width,height);}
    g.globalAlpha=alpha*(this.from?t:1);g.drawImage(this.to,0,0,width,height);g.restore();
  }
}
