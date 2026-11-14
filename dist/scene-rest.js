/* Power fades change brightness, never blend snapshots of moving geometry. */
'use strict';
class SceneRest {
  constructor(){this.on=true;this.pausedAt=null;this.elapsedPause=0;this.started=0;this.fromLevel=1;}
  now(stamp=performance.now()){return ((this.pausedAt??stamp)-this.elapsedPause)/1000;}
  level(stamp,reduced=false){
    const t=reduced?1:Math.min(1,Math.max(0,(stamp-this.started)/480));
    return this.fromLevel+((this.on?1:0)-this.fromLevel)*t*t*(3-2*t);
  }
  setOn(on,stamp){
    if(on===this.on)return;
    this.fromLevel=this.level(stamp);this.started=stamp;
    if(on){this.elapsedPause+=stamp-this.pausedAt;this.pausedAt=null;}
    else this.pausedAt=stamp;
    this.on=on;
  }
  present(ctx,stamp,reduced=false){
    const alpha=.80*(1-this.level(stamp,reduced));
    if(alpha<=0)return;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha;ctx.fillStyle='#000';
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();
  }
}
