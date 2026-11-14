// Clean scene keeps summon accessible and preserves playback/drawer state.
(() => {
  const ui=[...document.querySelectorAll('header,.album-area,.home-switches,.lyric-dock,.lyric-preview,.lamp-preview-note,#panel,#toast,.lamp-hint')];
  const lamp=document.getElementById('lamp');
  let hidden=false,saved=[],focus=null,lampTitle=null;
  function setHidden(value){
    if(value===hidden)return;
    hidden=value;
    if(hidden){
      focus=document.activeElement;
      saved=ui.map(element=>({element,inert:element.inert,aria:element.getAttribute('aria-hidden')}));
      if(ui.some(element=>element.contains(focus)))focus?.blur();
      for(const {element} of saved){element.inert=true;element.setAttribute('aria-hidden','true');}
      lampTitle=lamp?.getAttribute('title');lamp?.removeAttribute('title');
    }else{
      for(const {element,inert,aria} of saved){
        element.inert=inert;
        if(aria===null)element.removeAttribute('aria-hidden');else element.setAttribute('aria-hidden',aria);
      }
      if(lampTitle!==null)lamp?.setAttribute('title',lampTitle);
    }
    document.body.classList.toggle('scene-only',hidden);
    window.dispatchEvent(new CustomEvent('sceneonlychange',{detail:{active:hidden}}));
    if(!hidden&&focus?.isConnected&&!focus.closest('[hidden],[inert]'))focus.focus({preventScroll:true});
  }
  document.getElementById('immersiveToggle')?.addEventListener('click',()=>setHidden(!hidden));
  // Capture Escape before the drawer's handler, so restoring the scene also
  // restores the same drawer rather than silently closing it.
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(hidden&&event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();setHidden(false);return;
    }
    if(event.key?.toLowerCase()!=='f'||(document.getElementById('adminDialog')?.open||document.getElementById('guideDialog')?.open))return;
    if(event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return;
    event.preventDefault();event.stopImmediatePropagation();setHidden(!hidden);
  },true);
})();
