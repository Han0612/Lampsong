// Rotate about the centre of the sleeve. The spring returns to the nearest
// turn of the selected face, taking the release velocity into account.
class RecordSleeve {
  constructor(handle,sleeve,reduce){
    this.handle=handle;this.sleeve=sleeve;this.reduce=reduce;
    this.pitch=0;this.yaw=0;this.wp=0;this.wy=0;this.roll=0;this.wr=0;
    this.homeP=0;this.homeY=0;this.coast=0;this.grip=null;
    this.back=false;this.suppressClick=false;
    this.faces=[handle.querySelector('.sleeve-front'),handle.querySelector('.sleeve-back')];
    const isPlayer=target=>target.closest('.audition button,.audition select,.audition-picker');
    handle.onclick=e=>{
      if(isPlayer(e.target))return;
      if(this.suppressClick && e.detail!==0){this.suppressClick=false;return;}
      this.flip(e.detail===0||this.faces.some(face=>face.contains(document.activeElement)));
    };
    const invalidate=()=>{this.rect=null;};
    window.addEventListener('resize',invalidate);
    document.addEventListener('scroll',invalidate,true);
    if(typeof ResizeObserver==='function')new ResizeObserver(invalidate).observe(handle);
    handle.onpointerdown=e=>{
      if(this.grip||e.button!==0||isPlayer(e.target))return;
      this.suppressClick=false;
      this.rect=handle.getBoundingClientRect();
      this.grip={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,t:e.timeStamp,dragged:false};
      this.wp=0;this.wy=0;handle.setPointerCapture(e.pointerId);
    };
    handle.onpointermove=e=>{
      const g=this.grip;if(!g||e.pointerId!==g.id)return;
      if(!g.dragged){
        if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)<5)return;
        g.dragged=true;
      }
      const width=Math.max(1,this.rect?.width||handle.clientWidth);
      const dy=(e.clientX-g.x)*2*Math.PI/width;
      const dp=-(e.clientY-g.y)*2*Math.PI/width;
      const dt=Math.max(.008,(e.timeStamp-g.t)/1000);
      const gain=1-Math.exp(-dt/.04);
      const speed=v=>Math.max(-9,Math.min(9,v/dt));
      this.wy+=(speed(dy)-this.wy)*gain;this.wp+=(speed(dp)-this.wp)*gain;
      this.yaw+=dy;this.pitch+=dp;g.x=e.clientX;g.y=e.clientY;g.t=e.timeStamp;
      this.pose();
    };
    const release=e=>{
      const g=this.grip;if(!g||e.pointerId!==g.id)return;
      const decay=e.type==='pointerup'?Math.exp(-Math.max(0,e.timeStamp-g.t)/85):0;
      this.suppressClick=g.dragged||e.type!=='pointerup';
      this.wy*=decay;this.wp*=decay;this.grip=null;
      if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
      if(g.dragged)this.returnHome(.14);
    };
    handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=release;
    handle.onkeydown=e=>{
      if(isPlayer(e.target))return;
      const moves={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[1,0],ArrowDown:[-1,0]};
      const move=moves[e.key];if(!move)return;
      e.preventDefault();this.pitch+=move[0]*Math.PI/4;this.yaw+=move[1]*Math.PI/4;
      this.wp=0;this.wy=0;this.pose();this.returnHome(.32);
    };
  }
  flip(moveFocus){
    this.back=!this.back;
    const pairedHome=this.homeY+(this.back?Math.PI:-Math.PI);
    const index=this.back?1:0;
    const shown=this.faces[index],hidden=this.faces[1-index];
    shown.inert=false;shown.removeAttribute('aria-hidden');
    if(moveFocus)shown.querySelector('.face-flip').focus({preventScroll:true});
    hidden.inert=true;hidden.setAttribute('aria-hidden','true');
    this.returnHome(0);this.homeY=pairedHome;
  }
  returnHome(delay){
    const turn=2*Math.PI;
    this.homeP=Math.round((this.pitch+this.wp*.14)/turn)*turn;
    const face=this.back?Math.PI:0;
    this.homeY=face+Math.round((this.yaw+this.wy*.14-face)/turn)*turn;
    this.coast=delay;
  }
  brush(x,y,dx,dy,strength){
    if(this.grip||this.reduce.matches)return;
    const r=this.rect||=this.handle.getBoundingClientRect();
    const norm=(p,start,size)=>Math.max(-1,Math.min(1,2*(p-start)/Math.max(1,size)-1));
    const nx=norm(x,r.left,r.width),ny=norm(y,r.top,r.height);
    const lever=Math.min(1,Math.hypot(nx,ny));
    // Press the touched corner away from the viewer. Tangential motion
    // adds a small twist around the centre, in screen coordinates.
    this.wy+=strength*(1.05*nx+.30*dx*lever);
    this.wp-=strength*(1.05*ny+.30*dy*lever)*Math.cos(this.yaw);
    this.wr+=strength*.50*(nx*dy-ny*dx);
  }
  pose(){
    const transform='rotateZ('+this.roll.toFixed(4)+'rad) rotateY('+this.yaw.toFixed(4)+'rad) rotateX('+this.pitch.toFixed(4)+'rad)';
    if(this.lastPose!==transform){this.sleeve.style.transform=transform;this.lastPose=transform;}
  }
  update(dt,support,beam,rgb,brightness,coverColor=rgb){
    // Preserve the album hue on the back, with a low-luminance aurora palette.
    // Palette changes are independent of lamp white/magic-colour selection.
    const palette=coverColor.map(v=>Math.round(v/6)*6),paletteKey=palette.join(',');
    if(this.lastPalette!==paletteKey){
      const primary=palette.map(v=>Math.round(7+v*.19));
      const secondary=[palette[2],palette[0],palette[1]].map(v=>Math.round(6+v*.14));
      const base=palette.map(v=>Math.round(5+v*.045));
      for(const [key,value]of [['--sleeve-magic',primary],['--sleeve-magic-alt',secondary],['--sleeve-base',base]])this.sleeve.style.setProperty(key,'rgb('+value.join(',')+')');
      this.lastPalette=paletteKey;
    }

    if(this.reduce.matches){this.wr=0;this.roll=0;}
    else if(this.roll||this.wr){
      let remaining=dt;
      while(remaining>0){
        const step=Math.min(remaining,1/120);remaining-=step;
        this.wr+=(-24*this.roll-7*this.wr)*step;this.roll+=this.wr*step;
      }
      if(Math.abs(this.roll)+Math.abs(this.wr)<.0001)this.roll=this.wr=0;
      if(this.grip)this.pose();
    }
    if(!this.grip){
      if(this.reduce.matches){this.pitch=this.wp=this.wy=this.homeP=0;this.yaw=this.homeY=this.back?Math.PI:0;}
      else {
        let remaining=dt;
        while(remaining>0){
          const step=Math.min(remaining,1/120);remaining-=step;
          const k=this.coast>0?0:19,damping=this.coast>0?2.1:6.4;
          this.coast=Math.max(0,this.coast-step);
          this.wp+=(k*(this.homeP-this.pitch)-damping*this.wp+support.ay*1.3)*step;
          this.wy+=(k*(this.homeY-this.yaw)-damping*this.wy-support.ax*1.55)*step;
          this.pitch+=this.wp*step;this.yaw+=this.wy*step;
        }
      }
      this.pose();
    }
    const r=this.rect||=this.handle.getBoundingClientRect();
    const dx=beam.x-(r.left+r.width/2),dy=beam.y-(r.top+r.height/2);
    const lateral=(dx-dy*beam.slope)/Math.max(1,beam.width*.55);
    const spill=Math.exp(-lateral*lateral*1.65)*beam.gain*brightness;
    const focus=Math.atan2(dx,Math.max(r.width,150))-this.yaw;
    const glancing=Math.sin(focus);
    const x=Math.round(50+56*glancing),y=Math.round(50+32*Math.sin(Math.atan2(dy,Math.max(r.height,150))+this.pitch));
    const alpha=Math.min(.14,spill*(.05+.085*Math.abs(glancing)));
    const tint='rgba('+rgb.map(Math.round).join(',')+','+alpha.toFixed(3)+')';
    const key=x+'/'+y+'/'+tint;
    if(key!==this.lastLight){
      this.sleeve.style.setProperty('--sheen-x',x+'%');this.sleeve.style.setProperty('--sheen-y',y+'%');
      this.sleeve.style.setProperty('--sheen-tint',tint);this.lastLight=key;
    }
  }
}
