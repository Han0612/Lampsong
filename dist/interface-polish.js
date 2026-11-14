// Shared help, keyboard hints and viewport-safe album details.
(() => {
  const $=id=>document.getElementById(id),guide=$('guideDialog'),opener=$('guideButton');
  opener.addEventListener('click',()=>{UiMotion.show(guide,true,{duration:220});$('guideTitle').focus({preventScroll:true});});
  $('closeGuide').addEventListener('click',()=>UiMotion.show(guide,false,{duration:200}));
  guide.addEventListener('click',e=>{if(e.target===guide){const r=guide.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)UiMotion.show(guide,false,{duration:200});}});
  guide.addEventListener('cancel',e=>{e.preventDefault();UiMotion.show(guide,false);});
  guide.addEventListener('close',()=>{hide();opener.focus({preventScroll:true});});

  const details=document.querySelector('.album-details'),handle=$('coverHandle'),area=document.querySelector('.album-area');
  let fitFrame=0;
  function fitDetails(){
    fitFrame=0;
    // Spend unused cover-to-title whitespace before clipping any metadata.
    handle.style.width="100%";
    let coverHeight=handle.offsetHeight;
    const safeTop=document.querySelector('header').getBoundingClientRect().bottom+12;
    const safeBottom=Math.min(innerHeight-18,document.querySelector('.home-switches').getBoundingClientRect().top-14);
    const available=Math.max(0,safeBottom-safeTop);
    const naturalGap=Math.min(36,Math.max(14,innerHeight*.035));
    area.style.setProperty('--metadata-gap',naturalGap+'px');
    details.classList.remove('compact-metadata');
    let fullHeight=coverHeight+details.scrollHeight;
    if(fullHeight>available){
      const gap=Math.max(8,naturalGap-(fullHeight-available));
      area.style.setProperty('--metadata-gap',gap+'px');
      fullHeight=coverHeight+details.scrollHeight;
    }
    if(fullHeight>available){details.classList.add('compact-metadata');fullHeight=coverHeight+details.scrollHeight;}
    if(fullHeight>available){
      const size=Math.max(112,coverHeight-(fullHeight-available)-4);
      handle.style.width=Math.min(coverHeight,size)+'px';coverHeight=handle.offsetHeight;
      fullHeight=coverHeight+details.scrollHeight;
    }
    const groupHeight=Math.min(fullHeight,Math.max(coverHeight,available));
    const top=Math.max(safeTop,Math.min((innerHeight-groupHeight)/2,safeBottom-groupHeight));
    area.style.setProperty('--album-top',top+'px');
    details.style.maxHeight=Math.max(0,safeBottom-top-coverHeight)+'px';
  }
  function scheduleFit(){if(!fitFrame)fitFrame=requestAnimationFrame(fitDetails);}
  const fitObserver=new ResizeObserver(scheduleFit);
  for(const node of [handle,document.querySelector('header'),...details.children])fitObserver.observe(node);
  window.addEventListener('resize',scheduleFit);document.fonts?.ready.then(scheduleFit);fitDetails();

  const tip=document.createElement('div');tip.id='appTooltip';tip.className='app-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);
  let active=null,timer=0,previousDescription=null;
  function normalize(root){
    if(root.nodeType!==1)return;
    const all=[...(root.matches('[title]')?[root]:[]),...root.querySelectorAll('[title]')];
    for(const el of all){if(el.closest('.album-area')){el.removeAttribute('title');delete el.dataset.tooltip;continue;}if(el.getAttribute('title'))el.dataset.tooltip=el.getAttribute('title');el.removeAttribute('title');}
  }
  normalize(document.body);
  new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')normalize(record.target);else record.addedNodes.forEach(normalize);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
  function hide(){
    clearTimeout(timer);UiMotion.show(tip,false,{duration:160,offset:3});
    if(active){if(previousDescription===null)active.removeAttribute('aria-describedby');else active.setAttribute('aria-describedby',previousDescription);}
    active=null;
  }
  function place(){
    if(!active||!UiMotion.isOpen(tip))return;
    const r=active.getBoundingClientRect(),t=tip.getBoundingClientRect();
    tip.style.left=Math.max(10,Math.min(innerWidth-t.width-10,r.left+(r.width-t.width)/2))+'px';
    const below=r.top<innerHeight*.4;
    tip.style.top=Math.max(8,Math.min(innerHeight-t.height-8,below?r.bottom+10:r.top-t.height-10))+'px';
  }
  function show(el){
    if(el===active)return;
    hide();if(!el||el.closest('.album-area')||document.body.classList.contains('scene-only'))return;
    active=el;previousDescription=el.getAttribute('aria-describedby');
    timer=setTimeout(()=>{
      if(!active)return;
      (el.closest('dialog[open]')||document.body).append(tip);
      tip.replaceChildren(document.createTextNode(el.dataset.tooltip));
      if(el.dataset.tooltipKeys){const keys=document.createElement('span');keys.className='tooltip-keys';for(const key of el.dataset.tooltipKeys.split('|')){const cap=document.createElement('kbd');cap.textContent=key;keys.append(cap);}tip.append(keys);}
      el.setAttribute('aria-describedby',[previousDescription,'appTooltip'].filter(Boolean).join(' '));UiMotion.show(tip,true,{duration:180,offset:3});place();
    },320);
  }
  document.addEventListener('pointerover',e=>{if(e.pointerType!=='touch')show(e.target.closest?.('[data-tooltip]'));});
  document.addEventListener('pointerout',e=>{if(active&&!active.contains(e.relatedTarget))hide();});
  document.addEventListener('focusin',e=>show(e.target.closest?.('[data-tooltip]')));
  document.addEventListener('focusout',hide);
  document.addEventListener('pointerdown',hide,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  document.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);window.addEventListener('sceneonlychange',hide);
})();
