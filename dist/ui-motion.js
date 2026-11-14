// Interruptible transitions: closing removes input immediately, visual removal
// waits for the exit. Reopening starts at the currently displayed opacity.
const UiMotion=(()=>{
  const states=new WeakMap(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const isOpen=el=>states.get(el)?.open??(el.tagName==='DIALOG'?el.open:!el.hidden);
  function show(el,open,{duration=200,offset=6}={}){
    const previous=states.get(el);
    if(isOpen(el)===open&&!previous?.animation)return;
    if(previous?.open===open&&previous.animation)return;
    const dialog=el.tagName==='DIALOG',wasHidden=dialog?!el.open:el.hidden;
    const computed=wasHidden?null:getComputedStyle(el);
    const from={opacity:wasHidden?'0':computed.opacity,transform:wasHidden?`translateY(${offset}px)`:computed.transform};
    previous?.animation?.cancel();
    if(open){if(dialog&&!el.open)el.showModal();else if(!dialog)el.hidden=false;}
    el.inert=!open;el.setAttribute('aria-hidden',String(!open));
    const state={open,animation:null};states.set(el,state);
    const finish=()=>{
      if(states.get(el)!==state)return;
      if(!open){if(dialog&&el.open)el.close();else if(!dialog)el.hidden=true;}
      state.animation?.cancel();state.animation=null;
    };
    if(wasHidden&&!open||reduce.matches||!el.animate||duration===0){finish();return;}
    state.animation=el.animate([from,{opacity:open?1:0,transform:open?'translateY(0)':`translateY(${offset}px)`}],
      {duration,easing:open?'cubic-bezier(.25,.8,.25,1)':'ease-out',fill:'both'});
    state.animation.onfinish=finish;
  }
  return {show,isOpen};
})();
