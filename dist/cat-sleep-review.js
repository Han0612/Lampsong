'use strict';
const samples=[],host=document.getElementById('sleepSamples');
for(const style of ['curl','side'])for(const kind of ['full','sleep','pet0','pet1','pet2','wake']){
 const title=(style==='curl'?'蜷睡':'侧卧')+' · '+({full:'进场到离场',sleep:'睡眠循环',pet0:'轻顺额头',pet1:'轻揉耳根',pet2:'轻蹭脸颊',wake:'慵懒起身'}[kind]);
 const card=document.createElement('article');card.className='asset-card';const h=document.createElement('h2');h.textContent=title;
 const sampleBox=document.createElement('div');sampleBox.className='sample';const canvas=document.createElement('canvas');canvas.width=960;canvas.height=480;sampleBox.append(canvas);
 const footer=document.createElement('footer'),play=document.createElement('button'),restart=document.createElement('button'),flip=document.createElement('button');play.textContent='暂停';restart.textContent='重播';flip.textContent='切换方向';footer.append(play,restart,flip);
 const scrub=document.createElement('label');scrub.className='scrub';const range=document.createElement('input');range.type='range';range.min=0;range.max=1000;range.value=0;range.setAttribute('aria-label',title+' 动作进度');scrub.append(range);card.append(h,sampleBox,footer,scrub);host.append(card);
 const cat=new SleepingCat();cat.style=style;const s={cat,canvas,style,kind,time:0,paused:false,visible:false,ready:false,flip:style==='curl'?1:-1,range,play};samples.push(s);sampleBox.sample=s;
 s.duration=kind==='full'?15.3:kind==='sleep'?8:kind==='wake'?cat.wakeSeconds:2.8;
 const reset=()=>{cat.state='sleep';cat.age=0;cat.positioned=false;cat.style=style;cat.runVariant=style==='curl'?0:1;cat.flip=s.flip;cat.entrySide=-s.flip;cat.walkPhase=0;cat.sleepTime=0;cat.wakeVariant=style==='curl'?0:1;cat.petEnd=2.8;cat.handStyle=kind.startsWith('pet')?Number(kind.slice(3)):0;};
 cat.load().then(()=>{s.ready=true;reset();}).catch(()=>{h.textContent=title+' · 素材加载失败';});
 play.onclick=()=>{s.paused=!s.paused;play.textContent=s.paused?'播放':'暂停'};restart.onclick=()=>{s.time=0;s.paused=false;play.textContent='暂停';reset();};flip.onclick=()=>{s.flip*=-1;cat.flip=s.flip;cat.entrySide=-s.flip;};
 range.oninput=()=>{s.paused=true;play.textContent='播放';s.time=Number(range.value)/1000*s.duration;};
}
const obs=new IntersectionObserver(entries=>entries.forEach(e=>e.target.sample.visible=e.isIntersecting),{rootMargin:'30px'});document.querySelectorAll('.sample').forEach(e=>obs.observe(e));
let paused=false;document.getElementById('allPause').onclick=e=>{paused=!paused;for(const s of samples){s.paused=paused;s.play.textContent=paused?'播放':'暂停'}e.target.textContent=paused?'全部播放':'全部暂停';};
let last=0;function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;for(const s of samples){if(!s.ready||!s.visible||document.hidden)continue;if(!s.paused)s.time=(s.time+dt)%s.duration;
 const c=s.cat,t=s.time,w=480,h=240,g=s.canvas.getContext('2d');g.setTransform(2,0,0,2,0,0);g.fillStyle='#202825';g.fillRect(0,0,w,h);const light=g.createRadialGradient(240,30,10,240,80,360);light.addColorStop(0,'#d6d4bc');light.addColorStop(1,'#48514a');g.fillStyle=light;g.fillRect(0,0,w,h);
 const scene={catMinSize:45,catMaxSize:45,catFollowLight:document.getElementById('reviewLight').checked,catFar:Number(document.getElementById('reviewOpacity').value),catOpacity:Number(document.getElementById('reviewOpacity').value)};
 const view={width:w,height:h,cx:240,stage:430,scene,beam:{x:240,y:0,slope:Math.sin(now/2000)*.7,heightScale:1}};
 c.layout(w,h,240,430,scene,view.beam);c.bodyWidth=150;c.x=240;c.targetX=240;c.flip=s.flip;c.sleepTime=t;c.petEnd=2.8;
 if(s.kind==='full'){
  if(t<3){c.state='enter';c.age=t;c.x=s.flip>0?-120+360*sleepEase(t/3):600-360*sleepEase(t/3);c.walkPhase=sleepEase(t/3)*4;}
  else if(t<3+c.settleSeconds){c.state='settle';c.age=t-3;}
  else if(t<9.2){c.state='sleep';c.age=t-3-c.settleSeconds;}
  else if(t<9.2+c.wakeSeconds){c.state='wake';c.age=t-9.2;}
  else{c.state='exit';c.age=t-9.2-c.wakeSeconds;c.x=240+s.flip*120*(c.age-.5*(1-Math.exp(-c.age/.5)));c.walkPhase=c.age*1.3;}
 }else{c.state=s.kind.startsWith('pet')?'pet':s.kind;c.age=t;c.handStyle=Number(s.kind.slice(3))||0;}
 c.draw(g,view);s.range.value=Math.round(t/s.duration*1000);
 }requestAnimationFrame(frame)}requestAnimationFrame(frame);
