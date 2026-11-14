// Durations are in seconds. Travelling cats complete their path, even when
// another visit is queued. Only edge visitors use the adjustable pause.
const catRoutes={leap:'arc',arch:'arc',land:'landing',sneak:'cross',kick:'run',dangle:'overhang'};
const catClamp=n=>Math.max(0,Math.min(1,n));
const catEase=n=>{const t=catClamp(n);return t*t*(3-2*t);};
const catTransit=route=>['arc','landing','cross'].includes(route);
const arrivalTimes={
  master:1.0,tap:.92,stretch:1.1,listen:1.05,
  swat:.76,wash:.98,dangle:1.15,
  leap:1.12,arch:1.03,land:1.26,sneak:3.1,kick:1.05
};
// Each phrase uses the existing hand-drawn anatomy. A beat names a destination
// drawing, travel time and time spent still after reaching it (in seconds).
const catHoldPoses={
  master:{ready:2,rest:[0,15],gestures:[
    [[5,.34,.22],[3,.31,.17],[8,.49,.32],[15,.60,0]],  // test, hesitate, reach
    [[3,.34,.32],[7,.48,.18],[6,.28,.13],[10,.33,.25],[15,.49,0]],
    [[4,.32,.23],[2,.34,.38],[0,.35,0]]                 // abort a small reach
  ]},
  tap:{ready:2,rest:[2,15],gestures:[
    [[7,.46,.25],[10,.22,.12],[8,.18,.16],[11,.18,.15],[15,.40,0]], // touch twice
    [[5,.34,.21],[4,.22,.14],[8,.35,.36],[11,.23,.15],[15,.44,0]],
    [[4,.27,.30],[6,.30,.16],[2,.44,0]]                 // lift but don't commit
  ]},
  stretch:{ready:2,rest:[0,15],gestures:[
    [[6,.53,.20],[9,.38,.48],[7,.33,.17],[10,.40,.33],[15,.67,0]],
    [[4,.47,.21],[6,.33,.38],[4,.39,.21],[0,.54,0]],   // half stretch, settle
    [[8,.60,.35],[10,.37,.52],[15,.67,0]]
  ]},
  listen:{ready:2,rest:[0,15],gestures:[
    [[6,.41,.48],[4,.27,.25],[9,.46,.55],[15,.60,0]],   // tip chin, listen again
    [[4,.33,.46],[2,.33,.29],[0,.39,0]],
    [[8,.52,.65],[10,.37,.33],[15,.53,0]]
  ]},
  swat:{ready:11,rest:[10,12],gestures:[
    [[8,.38,.20],[4,.28,.14],[2,.19,.08],[6,.24,.17],[11,.45,0]],
    [[7,.36,.19],[5,.21,.15],[8,.27,.22],[11,.39,0]], // half lift and reconsider
    [[6,.34,.23],[3,.20,.11],[5,.18,.19],[2,.18,.10],[11,.55,0]]
  ]},
  wash:{ready:2,rest:[0,15],gestures:[
    [[5,.37,.15],[8,.31,.18],[6,.26,.13],[9,.31,.19],[15,.54,0]], // short return stroke
    [[4,.35,.18],[7,.34,.38],[11,.36,.22],[15,.44,0]],
    [[5,.38,.24],[3,.29,.15],[0,.38,0]]
  ]},
  dangle:{ready:2,rest:[0,15],gestures:[
    [[6,.43,.25],[9,.37,.34],[7,.30,.25],[10,.31,.28],[15,.56,0]],
    [[4,.31,.22],[6,.36,.57],[3,.34,.19],[0,.36,0]],  // hang a paw, draw it back
    [[8,.49,.45],[7,.26,.16],[9,.31,.38],[15,.53,0]]
  ]}
};

class CatHold {
  constructor(pose){
    this.pose=pose;
    this.end=catRange(.08,.30);
    this.lastChoice=-1;
    this.frame=pose.ready;
    this.beats=[];
  }
  nextPhrase(){
    const n=this.pose.gestures.length;
    let index=Math.floor(Math.random()*(this.lastChoice<0?n:n-1));
    if(this.lastChoice>=0&&index>=this.lastChoice)index++;
    this.lastChoice=index;
    const pace=catRange(.84,1.18);
    this.beats=this.pose.gestures[index].map(([to,move,hold])=>
      [to,move*pace,hold*catRange(.76,1.35)]);
    this.beats.at(-1)[2]+=catRange(.40,1.20);
  }
  at(time){
    while(time>=this.end){
      if(!this.beats.length)this.nextPhrase();
      const [to,move,hold]=this.beats.shift();
      this.from=this.frame;this.frame=to;
      this.start=this.end;this.move=Math.max(move,Math.abs(to-this.from)/15);
      this.end=this.start+this.move+hold;
    }
    if(this.start===undefined)return this.frame;
    return this.from+(this.frame-this.from)*catEase((time-this.start)/this.move);
  }
}

// World units are stage pixels and seconds (positive Y points downward).
class CatJump{
  constructor(key,startX,startY,endX,endY,height){
    this.x=startX;this.y=startY;this.endX=endX;this.endY=endY;
    const drop=key==='land', dy=endY-startY;
    this.push=catRange(.15,.22);
    this.settle=catRange(.24,.32);
    this.brake=catRange(.09,.14);
    this.g=height*2.15;
    // A pounce clears the higher of the two endpoints; the landing pose
    // enters the light already descending from an unseen ledge.
    const clearance=height*(key==='arch'?catRange(.08,.15):catRange(.11,.20));
    this.vy=drop?0:-Math.sqrt(2*this.g*(clearance+Math.max(0,-dy)));
    this.flight=(Math.sqrt(this.vy*this.vy+2*this.g*dy)-this.vy)/this.g;
    this.vx=(endX-startX)/this.flight;
    this.releaseFrame=drop?0:4;
    this.contactFrame=drop?10:12;
    this.duration=this.push+this.flight+this.settle;
  }
  runway(outsideIn,outsideOut,stride){
    this.stride=stride;
    this.runV=Math.sign(this.vx)*Math.min(Math.abs(this.vx)*.87, this.g*.62);
    this.startX=this.x-(this.runV+this.vx)*this.push/2;
    this.stopX=this.endX+this.runV*this.settle+(this.vx-this.runV)*this.brake/2;
    this.runIn=Math.max(0,(this.startX-outsideIn)/this.runV);
    this.runOut=Math.max(0,(outsideOut-this.stopX)/this.runV);
    this.total=this.runIn+this.duration+this.runOut;
  }
  at(age){
    const local=age-this.runIn;
    if(local<0){
      const dx=this.runV*local;
      const stride=((local*Math.abs(this.runV)/this.stride%1)+1)%1;
      return {x:this.startX+dx,y:this.y,frame:16+Math.floor(stride*8)};
    }
    const t=local-this.push;
    if(t<0){
      const u=catClamp(local/this.push);
      const x=this.startX+this.push*(this.runV*u+(this.vx-this.runV)*u*u/2);
      return {x,y:this.y,frame:this.releaseFrame*catEase(u)};
    }
    if(t<this.flight){
      const u=t/this.flight;
      return {x:this.x+this.vx*t,y:this.y+this.vy*t+this.g*t*t/2,
        frame:this.releaseFrame+(this.contactFrame-this.releaseFrame)*u};
    }
    const dt=t-this.flight;
    if(dt<this.settle){
      const braking=catClamp(dt/this.brake);
      const x=this.endX+this.runV*dt+(this.vx-this.runV)*this.brake*(braking-braking*braking/2);
      return {x,y:this.endY,frame:this.contactFrame+(15-this.contactFrame)*catEase(dt/this.settle)};
    }
    const dx=this.runV*(dt-this.settle);
    return {x:this.stopX+dx,y:this.endY,frame:24+Math.floor(Math.abs(dx/this.stride)%1*8)};
  }
}

class CatVisit{
  constructor(key,stayMin,stayMax,jump){
    this.jump=jump;
    this.key=key;this.route=catRoutes[key]||'edge';this.age=0;
    this.arrival=arrivalTimes[key]*catRange(.94,1.1);
    if(catHoldPoses[key])this.hold=new CatHold(catHoldPoses[key]);
    this.stayDraw=Math.random();this.litTime=0;
    if(this.route==='run'||this.route==='cross'){
      this.strideFactor=catRange(1.78,2.12);
      this.walkPhase=catRange(0,2*Math.PI);
    }
    this.setStay(stayMin,stayMax);
    this.departure=catRange(.65,.84);this.exiting=null;this.done=false;
  }
  setStay(min,max){this.pause=this.route==='run'?4.2:min+(max-min)*this.stayDraw;}
  withdraw(){
    if(catTransit(this.route)||this.route==='run'||this.exiting||this.done)return;
    const from=this.last||{out:1,frame:0};
    const [early,late]=this.hold.pose.rest;
    const restFrame=Math.abs(from.frame-early)<Math.abs(from.frame-late)?early:late;
    this.exiting={start:this.age,from,restFrame,tuck:.34+Math.abs(from.frame-restFrame)*.022};
  }
  setWalk(start,stop,end,reach,width){
    const distance=Math.abs(end-start);
    const speed=Math.max(width*.09,Math.min(width*.19,reach*1.55));
    const stride=Math.max(16,reach*this.strideFactor);
    this.walkSteps=distance/stride;
    this.stopFraction=catClamp((stop-start)/(end-start));
    if(this.route==='cross'){
      this.arrival=distance/speed;
    }else{
      this.arrival=1.125*distance*this.stopFraction/speed;
      this.departure=1.125*distance*(1-this.stopFraction)/speed;
    }
  }
  creepProgress(t,cycles){
    // Small alternating changes in speed as weight moves onto each hind paw.
    // Remove the endpoint drift so both sides still meet the exact stop.
    const w=4*Math.PI*cycles;
    const sway=u=>Math.sin(this.walkPhase+w*u)-Math.sin(this.walkPhase);
    return cycles<=0?t:t+.13*(sway(t)-t*sway(1))/w;
  }
  creepFrame(distance){
    return Math.floor(24*((distance*this.walkSteps)%1));
  }
  walkSample(reduced){
    let progress,frame;
    if(this.route==='cross'){
      progress=this.creepProgress(catClamp(this.age/this.arrival),this.walkSteps);
      frame=this.creepFrame(progress);
      this.done=this.age>=this.arrival;
    }else{
      const rest=this.age-this.arrival;
      // Constant walking pace, easing only in the last quarter before planting.
      const approach=t=>t<.75?t/.875:(t-2*(t-.75)**2)/.875;
      if(rest<0){
        progress=this.stopFraction*this.creepProgress(approach(this.age/this.arrival),this.walkSteps*this.stopFraction);
        frame=16+this.creepFrame(progress);
      }else if(rest<this.pause){
        progress=this.stopFraction;
        if(rest<1.45)frame=7*catEase(rest/1.45);
        else if(rest<2.95)frame=7+4*catEase((rest-1.45)/1.5);
        else frame=11+4*catEase((rest-2.95)/1.1);
      }else{
        const t=catClamp((rest-this.pause)/this.departure);
        progress=this.stopFraction+(1-this.stopFraction)*this.creepProgress(1-approach(1-t),this.walkSteps*(1-this.stopFraction));
        frame=16+this.creepFrame(progress-this.stopFraction);
        this.done=t===1;
      }
    }
    return this.last={progress,frame:reduced?(this.route==='run'?(frame>=16?16:9):7):frame,lean:0,out:0};
  }
  sample(dt,reduced,lit=true){
    const previous=this.age;
    this.age+=dt;
    let frame=0,out=0,progress=0,lean=0;
    if(this.jump){
      const jump=this.jump;
      const pose=jump.at(this.age);
      if(reduced)pose.frame=this.age<jump.runIn?16:this.age>jump.runIn+jump.duration?24:7;
      if(this.age>=jump.total)this.done=true;
      return this.last={...pose,out,progress,lean};
    }
    if(this.route==='cross'||this.route==='run')return this.walkSample(reduced);
    {
      const u=catClamp(this.age/this.arrival),rest=Math.max(0,this.age-this.arrival);
      const approach=catEase((u-.12)/.88);
      out=1-approach;
      lean=.035*Math.sin(2*Math.PI*u);
      const ready=this.hold.pose.ready;
      frame=u<1?ready+(this.key==='swat'?-2:2)*(catEase(u/.82)-1)
        :this.exiting?this.exiting.from.frame:this.hold.at(rest);
      if(!this.exiting&&lit)this.litTime+=Math.max(0,this.age-Math.max(previous,this.arrival));
      if(!this.exiting&&this.litTime>=this.pause)this.withdraw();
      if(this.exiting){
        const e=this.exiting,v=catClamp((this.age-e.start)/e.tuck);
        // Plant the paws before turning. Translation belongs to the forward
        // walk in CatDeparture, never to this resting/crouching drawing.
        out=e.from.out;
        frame=e.from.frame+(e.restFrame-e.from.frame)*catEase(v);
        lean=(e.from.lean||0)*(1-catEase(v));
        if(catPoses[this.key].footY){
          // Hidden lower bodies stay below the viewport: gather the paw/head,
          // then sink back down without splicing in a standing/walking cat.
          const retreat=catClamp((this.age-e.start-e.tuck*.65)/this.departure);
          out=e.from.out+(1-e.from.out)*catEase(retreat);
          this.done=retreat===1;
        }else if(v===1)return this.last={out,frame,progress,lean,depart:true};
      }
    }
    if(reduced){lean=0;frame=this.hold.pose.ready;}
    return this.last={out,frame,progress,lean};
  }
}
