// Original crisp pose playback; the upper departure has a 16-pose turn and opposite-side ballistic leap.
const catExitGroups={master:'low',tap:'low',stretch:'low',dangle:'upper'};

class CatDeparture {
  constructor(group,origin,ratio,flip){
    this.group=group;this.art=catExitArt[group];this.origin=origin;
    this.ratio=ratio;this.flip=flip;this.age=0;this.distance=0;
    this.turn=group==='upper'?.68:catRange(1.05,1.28)+(group==='sit'?.16:0);
    this.cycle=catRange(.96,1.18);this.done=false;
  }
  sample(dt,ratio,width,height){
    this.age+=dt;
    const art=this.art,scale=this.origin.scale*ratio/this.ratio;
    if(this.group==='upper'){
      // Pivot through the front-facing drawing before facing the other side.
      // Keep every authored drawing intact (no squeezed body or blended outline).
      const crouch=.28,push=.16,launch=this.turn+crouch+push;
      const air=Math.max(0,this.age-launch);
      let frame;
      if(this.age<this.turn)frame=Math.min(4,Math.floor(this.age/this.turn*5));
      else if(this.age<this.turn+crouch)frame=5+Math.min(2,Math.floor((this.age-this.turn)/crouch*3));
      else if(this.age<launch)frame=8+Math.min(2,Math.floor((this.age-this.turn-crouch)/push*3));
      else frame=11+Math.min(4,Math.floor(air/.095));
      const first=art.frames[0],f=art.frames[frame];
      const direction=-this.flip;
      const turned=this.age>=this.turn*.8;
      const x=this.origin.x+direction*height*.35*air;
      // Initial upward impulse followed by constant gravity: the apex is at
      // 0.271 s, then falling accelerates. The horizontal flight is not eased.
      const y=this.origin.y+height*(-.38*air+.70*air*air);
      // Keep the body registered during the turn, then let gravity carry the
      // whole silhouette (including raised tail) below the viewport.
      const anchorY=first.cy+((this.age<launch?f:art.frames[10]).foot-first.foot);
      // Register each whole native pose by its measured body centroid, avoiding
      // a sideways jump when the frontal turn changes to the opposite facing.
      const pose={anchorX:f.cx,anchorY,bounds:[0,0,1536,1024]};
      const margin=64*scale+4;
      this.done=y+(f.bounds[1]-anchorY)*scale>height+margin;
      return {x,y,scale,pose,frame,foot:null,flip:turned?direction:this.flip};
    }
    const stepWidth=(art.frames[8].bounds[2]-art.frames[8].bounds[0])*scale;
    const stride=Math.max(24,stepWidth*(this.group==='upper'?.24:.30));
    let frame;
    if(this.age<this.turn){
      frame=Math.min(7,Math.floor(catEase(this.age/this.turn)*8));
    }else{
      const walkAge=this.age-this.turn;
      // Begin walking only after the drawn pivot. A short acceleration ramps
      // the travel speed; gait phase follows actual distance, not a free timer.
      const speed=stride/this.cycle*catEase(walkAge/.42);
      this.distance+=speed*dt;
      frame=8+Math.floor((this.distance/stride%1)*8);
    }
    const f=art.frames[frame],first=art.frames[0];
    const up=this.group==='upper';
    const x=this.origin.x+(up?.18*this.flip*this.distance:-this.flip*this.distance);
    const y=up?this.origin.y-this.distance:this.origin.floor-f.foot*scale;
    const pose={anchorX:first.cx,anchorY:up?first.cy:0,bounds:[0,0,1536,1024]};
    // End only after the visible fur plus its light projection leaves the
    // viewport. Transparent atlas padding must not delay a queued visitor.
    const margin=64*scale+4;
    if(up)this.done=y+(f.bounds[3]-first.cy)*scale*1.25+margin<0;
    else{
      const tail=(f.bounds[2]-first.cx)*scale*1.25+margin;
      this.done=this.flip>0?x+tail<0:x-tail>width;
    }
    return {x,y,scale,pose,frame,foot:up?null:f.foot,flip:this.flip};
  }
}
