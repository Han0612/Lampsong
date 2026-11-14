// One stable hit target; only the inner disc stretches during the 500 ms charge.
function installCatMenu({button,poses,onRandom,onPose,currentPose=()=>null,reduced=false}){
  const doc=button.ownerDocument||document;
  const reduce=()=>typeof reduced==='function'?reduced():typeof reduced==='object'?reduced.matches:!!reduced;
  const original=button.innerHTML;
  const visual=doc.createElement('span');visual.className='cat-trigger-disc';visual.innerHTML=original;
  button.replaceChildren(visual);button.classList.add('cat-menu-trigger');
  button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-controls','catActionMenu');
  const host=doc.createElement('div');host.id='catActionMenu';host.className='cat-action-menu';host.hidden=true;host.inert=true;
  const grid=doc.createElement('div');grid.className='cat-action-grid';grid.setAttribute('role','menu');grid.setAttribute('aria-label','猫咪动作');
  host.append(grid);doc.body.append(host);
  const items=[];let open=false,chargeTimer=0,closeTimer=0,press=null,suppressClick=false,discMotion=null,paintedState=null;
  const animations=new Set();
  const closeIcon='<svg viewBox="0 0 24 24" width="27" height="27" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  function animate(el,frames,options){if(reduce()||!el.animate)return null;const a=el.animate(frames,options);animations.add(a);a.finished?.then(()=>animations.delete(a),()=>animations.delete(a));return a;}
  function disc(frames,duration){discMotion?.cancel();discMotion=animate(visual,frames,{duration,easing:'linear'});}
  function sync(){
    const selected=currentPose(),state=(open?'open':'closed')+'|'+(selected||'');
    if(paintedState===state)return;paintedState=state;
    for(const item of items)item.setAttribute('aria-checked',String(item.dataset.catAction===selected));
    visual.innerHTML=open?closeIcon:original;
    const label=open?'收起动作':'唤猫';
    button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.setAttribute('aria-expanded',String(open));
  }
  function shortAction(){if(open){close();return;}onRandom();sync();}
  function thumbnail(canvas,key,pose){
    const image=new Image();image.onload=()=>{
      // Strip the wide shadow haze so a 32 px thumbnail has the actual pose contour.
      const scratch=doc.createElement('canvas');scratch.width=256;scratch.height=171;
      const g=scratch.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,256,171);
      const pixels=g.getImageData(0,0,256,171);let left=256,top=171,right=0,bottom=0;
      for(let y=0;y<171;y++)for(let x=0;x<256;x++){
        const i=(y*256+x)*4,a=pixels.data[i+3];pixels.data[i]=231;pixels.data[i+1]=228;pixels.data[i+2]=220;
        pixels.data[i+3]=Math.max(0,Math.min(255,(a-80)*2.2));
        if(a>120){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      g.putImageData(pixels,0,0);if(right<=left||bottom<=top)return;
      const ctx=canvas.getContext('2d');const fit=Math.min(76/(right-left+1),68/(bottom-top+1)),w=(right-left+1)*fit,h=(bottom-top+1)*fit;
      ctx.clearRect(0,0,88,80);ctx.imageSmoothingQuality='high';ctx.drawImage(scratch,left,top,right-left+1,bottom-top+1,(88-w)/2,(80-h)/2,w,h);
    };
    image.src='cat-stills/'+pose.file;
  }
  for(const [key,pose] of Object.entries(poses)){
    const item=doc.createElement('button');item.type='button';item.className='cat-action-button';item.dataset.catAction=key;
    const label=pose.label.replace(/^母图\s*·\s*/,'');item.dataset.tooltip=label;item.setAttribute('aria-label',label);item.setAttribute('role','menuitemradio');
    const canvas=doc.createElement('canvas');canvas.width=88;canvas.height=80;canvas.setAttribute('aria-hidden','true');item.append(canvas);grid.append(item);items.push(item);thumbnail(canvas,key,pose);
    item.addEventListener('click',()=>{onPose(key);sync();});
  }
  function layout(){
    const r=button.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;
    const gap=10,available=Math.max(136,r.top-24),size=Math.max(30,Math.min(r.width,Math.floor((available-3*gap)/4)));
    const width=size*3+gap*2,height=size*4+gap*3;
    host.style.setProperty('--cat-choice-size',size+'px');host.style.setProperty('--cat-choice-gap',gap+'px');
    grid.style.left=Math.max(10,Math.min(vw-width-10,r.right-width))+'px';
    grid.style.top=Math.max(10,r.top-height-14)+'px';
  }
  function flyIn(item,delay){
    const from=button.getBoundingClientRect(),to=item.getBoundingClientRect(),x=from.left+from.width/2-to.left-to.width/2,y=from.top+from.height/2-to.top-to.height/2;
    animate(item,[{opacity:0,transform:`translate(${x}px,${y}px) scale(.25)`},{opacity:1,transform:'translate(0,-3px) scale(1.07)',offset:.72},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:330,delay,fill:'backwards',easing:'cubic-bezier(.2,.75,.25,1)'});
  }
  function clearChoiceMotion(){
    for(const item of items)for(const motion of item.getAnimations?.()||[])motion.cancel();
  }
  function show(focus=false){
    if(open)return;clearTimeout(closeTimer);for(const a of animations)a.cancel();animations.clear();
    clearChoiceMotion();
    open=true;host.hidden=false;host.inert=false;layout();sync();
    items.forEach((item,i)=>flyIn(item,(3-Math.floor(i/3))*25+(i%3)*8));
    disc([{transform:'scale(1.18)'},{transform:'scale(.97)',offset:.45},{transform:'scale(1.02)',offset:.75},{transform:'scale(1)'}],250);
    if(focus)items[0]?.focus({preventScroll:true});
  }
  function close(focus=false){
    if(!open)return;open=false;host.inert=true;sync();
    for(const a of animations)a.cancel();animations.clear();
    clearChoiceMotion();
    if(reduce()){host.hidden=true;}else{
      const target=button.getBoundingClientRect();
      for(const item of items){const r=item.getBoundingClientRect(),x=target.left+target.width/2-r.left-r.width/2,y=target.top+target.height/2-r.top-r.height/2;animate(item,[{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:0,transform:`translate(${x}px,${y}px) scale(.3)`}],{duration:170,fill:'forwards',easing:'cubic-bezier(.4,0,.8,.3)'});}
      closeTimer=setTimeout(()=>{if(!open){clearChoiceMotion();host.hidden=true;}},180);
    }
    if(focus)button.focus({preventScroll:true});
  }
  function cancelPress(blockClick=false){
    clearTimeout(chargeTimer);if(blockClick)suppressClick=true;
    const active=press;press=null;discMotion?.cancel();
    if(active&&button.hasPointerCapture?.(active.id))button.releasePointerCapture(active.id);
  }
  button.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0||e.isPrimary===false)return;
    suppressClick=false;
    if(open){
      // Holding the visible X is not a click. Keep the palette pinned until
      // the X receives an ordinary short click.
      press={id:e.pointerId,x:e.clientX,y:e.clientY,long:false,open:true};
      button.setPointerCapture?.(e.pointerId);
      chargeTimer=setTimeout(()=>{if(press?.open){press.long=true;suppressClick=true;}},500);
      return;
    }
    press={id:e.pointerId,x:e.clientX,y:e.clientY,long:false};button.setPointerCapture?.(e.pointerId);
    disc([{transform:'scale(1)'},{transform:'scale(.94)',offset:.2},{transform:'scale(1.06)',offset:.8},{transform:'scale(1.18)'}],500);
    chargeTimer=setTimeout(()=>{if(!press)return;press.long=true;suppressClick=true;show();},500);
  });
  button.addEventListener('pointermove',e=>{
    if(!press||e.pointerId!==press.id||press.long)return;
    const r=button.getBoundingClientRect();
    if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>12||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cancelPress(true);
  });
  button.addEventListener('pointerup',e=>{
    if(!press||e.pointerId!==press.id)return;
    const active=press,wasLong=active.long;clearTimeout(chargeTimer);const id=active.id;press=null;
    if(button.hasPointerCapture?.(id))button.releasePointerCapture(id);
    if(!wasLong&&!active.open)disc([{transform:'scale(.96)'},{transform:'scale(1.08)',offset:.4},{transform:'scale(1)'}],260);
  });
  button.addEventListener('pointercancel',()=>cancelPress(true));
  button.addEventListener('lostpointercapture',()=>{if(press)cancelPress(true);});
  button.addEventListener('contextmenu',e=>e.preventDefault());
  button.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){suppressClick=false;e.preventDefault();return;}shortAction();});
  button.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();show(true);}});
  host.addEventListener('keydown',e=>{
    const i=items.indexOf(doc.activeElement);if(i<0)return;
    const steps={ArrowUp:-3,ArrowDown:3,ArrowLeft:-1,ArrowRight:1};let next;
    if(e.key==='Home')next=0;else if(e.key==='End')next=items.length-1;else if(e.key in steps)next=(i+steps[e.key]+items.length)%items.length;else return;
    e.preventDefault();items[next].focus({preventScroll:true});
  });
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)cancelPress(true);});
  window.addEventListener('blur',()=>cancelPress(true));
  window.addEventListener('resize',()=>{cancelPress(true);if(open)layout();});
  sync();return {sync,close,open:show,trigger:shortAction,get isOpen(){return open;},element:host};
}
