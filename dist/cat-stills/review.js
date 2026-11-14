'use strict';
const samples=[],container=document.getElementById('poses');
const revisions=fetch('../preload.json',{cache:'no-cache',signal:AbortSignal.timeout(15000)})
  .then(r=>{if(!r.ok)throw Error('manifest');return r.json();})
  .then(m=>new Map(m.files.map(f=>[f.path,f.revision]))).catch(()=>new Map());
const ink=document.getElementById('silhouette'),reduce=matchMedia('(prefers-reduced-motion:reduce)');
const frameCounts={sneak:24,leap:32,arch:32,kick:40,land:32};
const assets=Object.entries(catPoses).flatMap(([key,pose])=>['a','b'].map(variant=>({
  key,variant,label:pose.label.replace('母图 · ',''),meta:variant==='b'?catAltPoses[key]:pose,
  file:'cat-motion/'+key+(variant==='b'?'-b':'')+'.webp',frames:frameCounts[key]||16,fps:key==='sneak'?9.6:5,
  badge:variant==='a'?'A · 原版':'B · 新版'
})));
for(const [key,art]of Object.entries(catExitArt))assets.push({key:'exit-'+key,exit:true,art,
  file:art.file,frames:art.frames.length,fps:8,badge:'退场衔接',label:{low:'低姿转身离开',sit:'坐姿转身离开',upper:'上沿转身向下跳走'}[key]});
for(const [i,asset]of assets.entries()){
  const card=document.createElement('article');card.className='asset-card';
  const title=document.createElement('h2'),order=document.createElement('span');order.textContent=String(i+1).padStart(2,'0');title.append(order,asset.label);
  const box=document.createElement('div');box.className='sample';
  const badge=document.createElement('span');badge.className='badge';badge.textContent=asset.badge;
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=456;canvas.setAttribute('aria-label',asset.label+' '+asset.badge+' 动画预览');
  const state=document.createElement('div');state.className='state';state.textContent='准备动画';
  box.append(badge,canvas,state);
  const footer=document.createElement('footer'),toggle=document.createElement('button'),replay=document.createElement('button');
  const actions=document.createElement('div');actions.className='playback';replay.textContent='重播';actions.append(toggle,replay);footer.append(actions);
  const link=document.createElement('a');link.target='_blank';link.rel='noopener';
  if(!asset.exit){link.href='../?cat='+asset.key+'&variant='+asset.variant;link.textContent='放进灯下 ↗';}
  else{link.href='../'+asset.file;link.textContent='查看图集 ↗';}
  footer.append(link);
  const scrub=document.createElement('label'),slider=document.createElement('input'),position=document.createElement('output');scrub.className='scrub';
  slider.type='range';slider.min=0;slider.max=asset.frames-1;slider.step=1;slider.value=0;slider.setAttribute('aria-label',asset.label+' '+asset.badge+' 逐帧检查');
  position.textContent='01 / '+asset.frames;scrub.append(slider,position);
  const sample={...asset,box,canvas,state,toggle,slider,position,visible:false,image:null,paused:reduce.matches,time:0,ready:false,dirty:true,index:-1};
  toggle.setAttribute('aria-label',asset.label+' '+asset.badge+' 播放或暂停');replay.setAttribute('aria-label',asset.label+' '+asset.badge+' 重播');
  toggle.textContent=sample.paused?'播放':'暂停';
  toggle.onclick=()=>{sample.paused=!sample.paused;toggle.textContent=sample.paused?'播放':'暂停';if(!sample.ready)load(sample);};
  replay.onclick=()=>{sample.time=0;sample.dirty=true;sample.paused=false;toggle.textContent='暂停';if(!sample.ready)load(sample);};
  slider.oninput=()=>{sample.paused=true;sample.time=Number(slider.value)/sample.fps;sample.dirty=true;toggle.textContent='播放';};
  card.append(title,box,footer,scrub);container.append(card);box.sample=sample;samples.push(sample);
}
function trimDecoded(){
  const decoded=samples.filter(s=>s.image);
  const inactive=decoded.filter(s=>!s.visible).sort((a,b)=>a.lastSeen-b.lastSeen);
  while(decoded.length>8&&inactive.length){const s=inactive.shift();s.generation=(s.generation||0)+1;s.image=null;s.ready=false;decoded.splice(decoded.indexOf(s),1);}
}
async function load(sample){
  if(sample.image)return;
  const generation=sample.generation=(sample.generation||0)+1,image=new Image();sample.image=image;sample.state.hidden=false;sample.state.textContent='准备动画';
  const revision=(await revisions).get(sample.file);
  image.src='../'+sample.file+(revision?'?v='+revision:'');
  try{
    await image.decode();if(sample.generation!==generation)return;
    // Atlas rows are the authority, so playback and scrubbing use the same count.
    sample.frames=Math.floor(image.naturalWidth/576)*Math.floor(image.naturalHeight/384);sample.slider.max=sample.frames-1;
    sample.ready=true;sample.dirty=true;sample.state.hidden=true;trimDecoded();
  }catch{if(sample.generation===generation){sample.image=null;sample.state.textContent='加载失败，点击播放重试';}}
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){const s=entry.target.sample;s.visible=entry.isIntersecting;s.lastSeen=performance.now();if(s.visible)load(s);}
  trimDecoded();
},{rootMargin:'80px'});
samples.forEach(s=>observer.observe(s.box));
ink.onchange=()=>samples.forEach(s=>s.dirty=true);
const all=document.getElementById('toggleAll');let allPaused=reduce.matches;
all.textContent=allPaused?'全部播放':'全部暂停';
all.onclick=()=>{allPaused=!allPaused;all.textContent=allPaused?'全部播放':'全部暂停';for(const s of samples){s.paused=allPaused;s.toggle.textContent=s.paused?'播放':'暂停';}};
reduce.addEventListener('change',e=>{if(e.matches){allPaused=true;all.textContent='全部播放';for(const s of samples){s.paused=true;s.toggle.textContent='播放';}}});
let previous=0;
function draw(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  for(const s of samples){
    if(document.hidden||!s.visible||!s.ready)continue;
    if(!s.paused)s.time+=dt;
    let index=Math.min(s.frames-1,Math.floor(s.time*s.fps+1e-6)%s.frames),departure=null;
    if(s.key==='exit-upper'&&!s.paused){
      const scale=100/s.art.reference;
      const motion=new CatDeparture('upper',{x:160,y:88,floor:160,scale},1,1);
      motion.age=s.time%2.9;departure=motion.sample(0,1,320,228);index=departure.frame;
    }
    if(index===s.index&&!s.dirty&&!departure)continue;s.index=index;s.dirty=false;
    s.slider.value=index;s.position.textContent=String(index+1).padStart(2,'0')+' / '+s.frames;
    const ctx=s.canvas.getContext('2d');let scale,cx,foot;
    if(s.exit){const f=s.art.frames[index];scale=100/s.art.reference;cx=s.art.frames[0].cx;foot=f.foot;}
    else{const pose=s.meta;scale=100/pose.sizeReference;cx=(pose.bounds[0]+pose.bounds[2])*.5;foot=pose.pawRow?(pose.pawRow[index]+1)/.375:pose.footY||pose.bounds[3];}
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,320,228);ctx.save();
    if(departure){
      ctx.translate(departure.x,departure.y);ctx.scale(departure.flip,1);
      ctx.translate(-departure.pose.anchorX*scale,-departure.pose.anchorY*scale);
    }else ctx.translate(160-cx*scale,196-foot*scale);
    ctx.scale(scale,scale);ctx.globalAlpha=.9;
    ctx.drawImage(s.image,index%4*576,Math.floor(index/4)*384,576,384,0,0,1536,1024);ctx.restore();
    if(ink.checked){ctx.save();ctx.globalCompositeOperation='source-in';ctx.fillStyle='#000';ctx.fillRect(0,0,320,228);ctx.restore();}
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
