// Additional fixtures share the original suspension point and y=40 emitter.
// Code-native contours are rasterised once at 6×, retaining clean material edges
// at every normal fixture size without any additional per-frame image decoding.
const designerFixtures=(()=>{
  const profiles={
    ph5:{width:80,rim:18,lensY:40,material:'satin copper',metal:['#6f3825','#cc916c','#714330']},
    caravaggio:{width:43,rim:19,lensY:40,material:'gloss enamel',metal:['#090d0d','#414846','#070909']},
    concert:{width:66,rim:25,lensY:40,material:'white lacquer',metal:['#85857b','#f1eee2','#9c9b8f']},
    gubi1965:{width:72,rim:31,lensY:40,material:'green enamel',metal:['#17352d','#668879','#17392e']},
    gubiA1965:{width:68,rim:29,lensY:40,material:'ivory enamel',metal:['#a5a499','#f4f1e6','#b4b3a7']},
    romeo:{width:57,rim:24,lensY:40,material:'pleated linen',metal:['#8e6a3a','#d3b57b','#806137']},
    mayfair:{width:77,rim:32,lensY:34,material:'green lacquer',metal:['#0c4539','#62af88','#124c3e']},
    jazz:{width:40,rim:17,lensY:40,material:'gloss white',metal:['#9c9c94','#eeeee4','#91948d']},
    flamingo:{width:82,rim:7,lensY:40,material:'translucent diffuser',metal:['#b6afa0','#e9e1cc','#a59f92']},
    skan:{width:82,rim:6,lensY:40,material:'matte graphite',metal:['#101716','#4b5350','#111817']},
    disco:{width:42,rim:17,lensY:40,material:'mirror mosaic',metal:['#282f32','#bfc9ca','#384448']}
  };
  const cache=new Map(),TAU=Math.PI*2;
  function linear(g,x0,y0,x1,y1,stops){const grad=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(([at,color])=>grad.addColorStop(at,color));return grad;}
  function metal(g,w,palette,shine=.3){return linear(g,-w,0,w,0,[[0,palette[0]],[.24,palette[1]],[.43,palette[1]],[.67,palette[2]],[1,palette[0]]]);}
  function path(g,trace,fill,stroke='#fff5dd30',line=.35){g.beginPath();trace(g);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=line;g.stroke();}}
  function oval(g,x,y,rx,ry,fill,stroke){path(g,c=>c.ellipse(x,y,rx,ry,0,0,TAU),fill,stroke);}
  function collar(g,w,y,h,palette){path(g,c=>c.roundRect(-w,y,w*2,h,Math.min(.7,h/2)),metal(g,w,palette));}
  function cord(g,from,to,color='#5f635c',width=.55,x=0){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,from);g.lineTo(x,to);g.stroke();}
  function lip(g,y,w,depth,palette,lit=true){
    oval(g,0,y,w,depth,linear(g,0,y-depth,0,y+depth,[[0,palette[0]],[.45,palette[1]],[1,palette[2]]]),'#fff9e631');
    if(lit)oval(g,0,y+.2,w*.91,Math.max(.6,depth*.46),linear(g,-w,0,w,0,[[0,'#b1a68a'],[.48,'#eee6c9'],[1,'#b9ac8d']]),null);
  }
  // A rounded radial shade: each layer owns its dark underside, bright rolled
  // rim and different curvature instead of stacking generic flat ellipses.
  function dish(g,{top,bottom,w,neck=3,palette,depth=1.25,curve=.5,lit=false}){
    path(g,c=>{c.moveTo(-neck,top);c.bezierCurveTo(-w*.72,top+(bottom-top)*curve*.15,-w*.98,bottom-(bottom-top)*.48,-w,bottom);
      c.quadraticCurveTo(0,bottom+depth*2,w,bottom);c.bezierCurveTo(w*.98,bottom-(bottom-top)*.48,w*.72,top+(bottom-top)*curve*.15,neck,top);c.closePath();},metal(g,w,palette));
    lip(g,bottom,w,depth,palette,lit);
  }
  function shell(g,w,top,bottom,palette,bulge=.6){
    path(g,c=>{c.moveTo(-w*.2,top);c.bezierCurveTo(-w*.65,top,-w*bulge,top+(bottom-top)*.5,-w,bottom-1);c.quadraticCurveTo(0,bottom+2,w,bottom-1);
      c.bezierCurveTo(w*bulge,top+(bottom-top)*.5,w*.65,top,w*.2,top);c.closePath();},metal(g,w,palette));
  }
  function build(g,key){
    const p=profiles[key],m=p.metal;
    if(key==='ph5'){
      collar(g,3.3,0,10,['#7a4332','#d09b7a','#6f3b2b']);
      cord(g,8,37,'#a47d55',.55,-7);cord(g,8,37,'#a47d55',.55,7);
      // The broad central canopy, smaller top shade and warm lower reflector.
      dish(g,{top:20,bottom:28,w:39,neck:4,palette:['#8f4a2d','#d69c6c','#8c5838'],depth:1.7,curve:.15});
      dish(g,{top:9,bottom:15,w:27,neck:3.5,palette:['#a56650','#dfb49a','#965c49'],depth:1.05,curve:.24});
      dish(g,{top:29,bottom:35,w:25,neck:7,palette:['#b99973','#e3ccb0','#aa8a67'],depth:1.5,curve:.2});
      dish(g,{top:34,bottom:40,w:18,neck:8,palette:['#9c6132','#c8954d','#815329'],depth:.9,curve:.2,lit:true});
      collar(g,3.2,28,6,['#5c3929','#ba8560','#543829']);
    }else if(key==='caravaggio'){
      collar(g,1.5,0,6,['#4d514d','#adae9e','#414743']);
      shell(g,21,5,39,m,.85);lip(g,39,20.6,1.2,['#101513','#4d534c','#121914'],true);
      // Long soft photographic reflection on the curved high-gloss shell.
      g.save();g.globalAlpha=.28;path(g,c=>{c.moveTo(-8,8);c.bezierCurveTo(-14,12,-15,23,-17,34);c.lineTo(-14,35);c.bezierCurveTo(-11,21,-11,11,-8,8);},linear(g,-16,0,-7,0,[[0,'#ffffff00'],[.55,'#c9d4cc'],[1,'#ffffff00']]),null);g.restore();
    }else if(key==='concert'){
      cord(g,0,7,'#cac8b9',.65);collar(g,3,6,3,['#aaa99c','#eeeadd','#a5a698']);
      dish(g,{top:9,bottom:16,w:12,neck:4,palette:m,curve:.15,depth:.85});
      dish(g,{top:14,bottom:24,w:22,neck:7,palette:['#9d9c90','#eeebdf','#8a8c80'],curve:.3,depth:1.1});
      dish(g,{top:21,bottom:33,w:32,neck:10,palette:m,curve:.25,depth:1.4});
      dish(g,{top:30,bottom:40,w:25,neck:13,palette:['#bbb9a9','#e6e2d1','#a3a394'],curve:.15,depth:1.25,lit:true});
    }else if(key==='gubi1965'){
      // Continuous trumpet neck with a broad, low green canopy.
      path(g,c=>{c.moveTo(-1.4,0);c.lineTo(-2.3,15);c.bezierCurveTo(-2.7,25,-21,27,-35,38);c.quadraticCurveTo(0,41,35,38);c.bezierCurveTo(21,27,2.7,25,2.3,15);c.lineTo(1.4,0);c.closePath();},metal(g,35,m));
      lip(g,39,34,1.2,['#15372c','#9caf8d','#1b4437'],true);
      path(g,c=>{c.moveTo(-1,4);c.bezierCurveTo(-1,25,-20,29,-29,35);c.bezierCurveTo(-21,29,-.2,25,-.1,4);},'#a3c8a62e',null);
    }else if(key==='gubiA1965'){
      // Deliberately no brass counterweight or metal ceiling attachment.
      // The white continuous neck belongs to the shade itself.
      path(g,c=>{c.moveTo(-1,0);c.lineTo(-1.7,18);c.bezierCurveTo(-1.9,27,-18,28,-33,38);c.quadraticCurveTo(0,41,33,38);c.bezierCurveTo(18,28,1.9,27,1.7,18);c.lineTo(1,0);c.closePath();},metal(g,33,m),'#f4efdf57');
      lip(g,39,32.5,1.1,['#999d91','#eee9d7','#a9ada1'],true);
    }else if(key==='romeo'){
      cord(g,0,8,'#aaa692',.55);collar(g,2,7,4,['#6b6758','#bcb6a1','#686657']);
      path(g,c=>{c.moveTo(-17,12);c.quadraticCurveTo(0,8,17,12);c.lineTo(28,38);c.quadraticCurveTo(0,43,-28,38);c.closePath();},metal(g,28,m),'#ead6a14a');
      // Individual pleats follow the conical surface, with subtle woven threads.
      for(let i=-21;i<=21;i++){
        const n=i/21,xTop=16.6*n,xBottom=27.5*n;
        g.strokeStyle=i%2?'#533e226b':'#f4dda662';g.lineWidth=.32;
        g.beginPath();g.moveTo(xTop,11.6+1.1*n*n);g.lineTo(xBottom,38.1+1.1*(1-n*n));g.stroke();
      }
      for(let y=15;y<38;y+=2){g.strokeStyle='#e9d8ac12';g.lineWidth=.22;const w=17+(y-12)*.42;g.beginPath();g.moveTo(-w,y);g.quadraticCurveTo(0,y+1,w,y);g.stroke();}
      lip(g,39,27.4,1.6,['#72592e','#d3c193','#715832'],true);
    }else if(key==='mayfair'){
      cord(g,0,16,'#59665d',.75);
      path(g,c=>{c.moveTo(-12,18);c.quadraticCurveTo(0,15,12,18);c.lineTo(38,31);c.lineTo(21,34);c.lineTo(-21,34);c.lineTo(-38,31);c.closePath();},metal(g,38,m));
      // Angular upper canopy and an inset opal underside are distinct surfaces.
      path(g,c=>{c.moveTo(-38,31);c.lineTo(0,29.5);c.lineTo(38,31);c.lineTo(21,34.5);c.quadraticCurveTo(0,36,-21,34.5);c.closePath();},linear(g,0,30,0,36,[[0,'#c6d5bc'],[.6,'#ecead5'],[1,'#87998a']]),'#ccd5bd52');
      cord(g,34,43,'#3c5547',1.15);
    }else if(key==='jazz'){
      // Long narrow neck flares into a rounded droplet at the bottom.
      path(g,c=>{c.moveTo(-1.4,0);c.bezierCurveTo(-.6,17,-7,25,-15,34);c.bezierCurveTo(-23,43,23,43,15,34);c.bezierCurveTo(7,25,.6,17,1.4,0);c.closePath();},metal(g,19,m),'#fbf6e247');
      lip(g,39,16.5,1.05,['#939b91','#e9e6d4','#a2a699'],true);
      path(g,c=>{c.moveTo(-.4,3);c.bezierCurveTo(-1.2,18,-5.5,29,-12,36);c.bezierCurveTo(-7,33,-1.8,22,.3,4);},'#fffdf648',null);
    }else if(key==='flamingo'){
      cord(g,0,16,'#888a80',.5,-10);cord(g,0,16,'#888a80',.5,10);cord(g,0,32,'#b6ac8b',.55);
      // Airy layered opal discs: fine rim shading instead of opaque metal slabs.
      dish(g,{top:14,bottom:22,w:30,neck:1.5,palette:['#b9b5a8','#eee6d2','#b1ad9e'],depth:.65,curve:.1});
      dish(g,{top:20,bottom:27,w:40,neck:4,palette:['#aca99c','#e2ddc9','#a6a79b'],depth:.7,curve:.1});
      dish(g,{top:26,bottom:31,w:30,neck:5,palette:['#aaa89c','#ded9c5','#b4b2a5'],depth:.55,curve:.1});
      cord(g,29,35,'#9e8554',1.3);collar(g,2.8,34,6,['#8a6e39','#c5aa66','#796038']);
      oval(g,0,40,3,.85,'#ece5c8',null);
    }else if(key==='skan'){
      path(g,c=>{c.moveTo(-1.4,0);c.lineTo(-2.2,25);c.quadraticCurveTo(-2.6,32,-9,33.8);c.lineTo(-40,38.5);c.quadraticCurveTo(0,41,40,38.5);c.lineTo(9,33.8);c.quadraticCurveTo(2.6,32,2.2,25);c.lineTo(1.4,0);c.closePath();},metal(g,40,m),'#99a49c38');
      oval(g,0,39,38,.8,'#151d19','#8d95803b');oval(g,0,39.8,5,.8,'#dfd6b8',null);
    }
  }
  function surface(key){
    if(cache.has(key))return cache.get(key);
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=312;
    const g=canvas.getContext('2d');g.scale(6,6);g.translate(50,5);build(g,key);
    // A soft vertical ambient reflection adds depth without introducing a
    // foreign hard studio shine or a flat saturated UI-icon appearance.
    g.globalCompositeOperation='source-atop';
    g.fillStyle=linear(g,0,0,0,43,[[0,'#f3eddb18'],[.36,'#e8eed908'],[.7,'#07100e06'],[1,'#080f0a20']]);
    g.fillRect(-50,-5,100,52);g.globalCompositeOperation='source-over';
    cache.set(key,canvas);return canvas;
  }
  function drawDisco(g,time,yaw,color){
    const r=20,cy=20,spin=time*.14+yaw*.32;
    const grad=g.createRadialGradient(-7,cy-9,1,0,cy,r);grad.addColorStop(0,'#d1d7d3');grad.addColorStop(.42,'#657379');grad.addColorStop(1,'#172125');
    oval(g,0,cy,r,r,grad,'#b2bcb466');
    // Surface-projected mirror squares retain spherical foreshortening at edges.
    const rows=14,cols=28;
    for(let j=0;j<rows;j++){
      const lat0=-Math.PI/2+(j+.045)/rows*Math.PI,lat1=-Math.PI/2+(j+.955)/rows*Math.PI;
      for(let i=0;i<cols;i++){
        const lon0=(i+.05)/cols*TAU+spin,lon1=(i+.95)/cols*TAU+spin,lon=(lon0+lon1)/2;
        if(Math.cos(lon)<.035)continue;
        const lat=(lat0+lat1)/2,nx=Math.cos(lat)*Math.sin(lon),ny=Math.sin(lat),nz=Math.cos(lat)*Math.cos(lon);
        const diffuse=Math.max(0,-nx*.38-ny*.5+nz*.68),spec=Math.pow(Math.max(0,-nx*.2-ny*.27+nz*.94),36);
        const wave=.5+.5*Math.sin(i*12.9898+j*78.233),v=Math.min(232,30+diffuse*116+wave*34+spec*96);
        const hue=185+42*Math.sin(i*1.9+j*.7+spin),sat=spec>.4?18:8;
        g.fillStyle=`hsl(${hue} ${sat}% ${v/255*100}%)`;
        const point=(a,b)=>[Math.cos(a)*Math.sin(b)*r,cy+Math.sin(a)*r];
        const corners=[point(lat0,lon0),point(lat0,lon1),point(lat1,lon1),point(lat1,lon0)];
        g.beginPath();g.moveTo(...corners[0]);for(let k=1;k<4;k++)g.lineTo(...corners[k]);g.closePath();g.fill();
      }
    }
    collar(g,2,-2,3,['#4a5150','#c6c9ba','#535b57']);
    // A handful of small glints, not a large pulsing halo.
    for(let i=0;i<3;i++){
      const a=spin*1.15+i*1.9,x=Math.sin(a)*r*.68,y=cy-7+Math.cos(a*1.2)*r*.43;
      const opacity=Math.pow(Math.max(0,Math.sin(time*.7+i*2)),8)*.7;
      g.save();g.globalAlpha=opacity;g.strokeStyle=['#d8e9e6','#e2d8eb','#eddfbd'][i];g.lineWidth=.35;g.beginPath();g.moveTo(x-1.7,y);g.lineTo(x+1.7,y);g.moveTo(x,y-1.7);g.lineTo(x,y+1.7);g.stroke();g.restore();
    }
  }
  function draw(ctx,key,{yaw=0,pitch=0,color=[255,215,170],power=1,time=0}={}){
    const p=profiles[key];if(!p)return null;
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.rotate(Math.sin(pitch)*.016);ctx.scale(1+Math.sin(pitch)*.012,1+Math.sin(pitch)*.019);
    if(key==='disco')drawDisco(ctx,time,yaw,color);
    else{
      ctx.drawImage(surface(key),-50,-5,100,52);
      // Thin inset emission: retain the designed rim rather than appending the
      // generic thick glowing ellipse used by simplified placeholder fixtures.
      const radii={ph5:16,caravaggio:18.1,concert:22,gubi1965:30,gubiA1965:29,romeo:24,mayfair:25,jazz:15,flamingo:2.4,skan:4.5};
      ctx.globalAlpha=Math.min(.42,.22*power);ctx.fillStyle=`rgb(${color.map(v=>Math.round(v)).join(',')})`;
      ctx.beginPath();ctx.ellipse(0,p.lensY,radii[key],key==='mayfair'?.75:.65,0,0,TAU);ctx.fill();
    }
    ctx.restore();return {rim:p.rim,lensY:p.lensY,integratedLight:true};
  }
  return {draw,profiles};
})();
