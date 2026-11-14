// Rigid suspended lamp. SI units; the moment of inertia is about the ceiling pin.
class SuspendedLamp {
  constructor() {
    this.mass = .72;
    this.arm = .56;
    this.inertia = this.mass * (this.arm ** 2 + (.14 ** 2 + .05 ** 2) / 12);
    this.angle = 0;
    this.speed = 0;
    this.target = null;
    this.handSpeed = 0;
    this.stopped = false;
    this.calming = false;
    this.remainder = 0;
  }
  grab(angle) {
    this.target = angle;
    this.handSpeed = 0;
    this.stopped = false;
    this.calming = false;
  }
  release() {
    this.target = null;
    this.handSpeed = 0;
    // Velocity is the body's integrated velocity, including any flick during contact.
  }
  kick(impulse) {
    this.stopped = false;
    this.calming = false;
    this.speed += impulse * this.arm / this.inertia;
  }
  calm() {
    this.release();
    this.calming = true;
  }
  stop() {
    this.release();
    this.angle = this.speed = this.remainder = 0;
    this.stopped = true;
  }
  advance(elapsed, ambientTorque) {
    if (this.stopped) return;
    const step = 1 / 240;
    this.remainder += Math.min(elapsed, .1);
    while (this.remainder >= step) {
      const friction = (this.calming ? 1.5 : .125) * this.speed + .031 * this.speed * Math.abs(this.speed);
      let torque = -this.mass * 9.81 * this.arm * Math.sin(this.angle) - friction;
      if (this.target === null) {
        torque += this.calming ? 0 : ambientTorque;
      } else {
        torque += 30 * (this.target - this.angle) + 2.45 * (this.handSpeed - this.speed);
        this.handSpeed *= Math.exp(-16 * step);
      }
      this.speed += torque / this.inertia * step;
      this.angle += this.speed * step;
      this.remainder -= step;
      if(this.calming && Math.abs(this.angle)+Math.abs(this.speed)<.001){this.stop();return;}
    }
  }
}

// Window position is reported in CSS pixels, sometimes in batches during a native drag.
class WindowSuspension {
  reset() { this.previous=null;this.vx=0;this.vy=0;this.ax=0;this.ay=0; }
  constructor(){this.reset();}
  sample(win,stamp,pxPerMetre) {
    const next={x:win.screenX,y:win.screenY,w:win.outerWidth,h:win.outerHeight,t:stamp};
    const previous=this.previous;
    this.previous=next;
    if(!Number.isFinite(next.x)||!Number.isFinite(next.y)||!previous)return;
    const dt=(stamp-previous.t)/1000;
    const dx=next.x-previous.x,dy=next.y-previous.y;
    if(dt<=0||dt>.32||next.w!==previous.w||next.h!==previous.h||Math.hypot(dx,dy)>350){
      this.reset();this.previous=next;return;
    }
    const gain=1-Math.exp(-dt/.09),soft=1-Math.exp(-dt/.045);
    const newVX=this.vx+(dx/dt/pxPerMetre-this.vx)*gain;
    const newVY=this.vy+(dy/dt/pxPerMetre-this.vy)*gain;
    const limit=a=>Math.max(-10,Math.min(10,a));
    this.ax+=(limit((newVX-this.vx)/dt)-this.ax)*soft;
    this.ay+=(limit((newVY-this.vy)/dt)-this.ay)*soft;
    this.vx=newVX;this.vy=newVY;
  }
  torque(bob,axis='lateral'){
    // Screen vertical travel represents depth in this spatial scene.
    // Keep the two axes independent; stopping a drag supplies the recoil.
    const acceleration=axis==='depth'?this.ay:this.ax;
    return -bob.mass*bob.arm*acceleration*Math.cos(bob.angle);
  }
}


// Isolated, smooth pulses with quiet gaps; the pendulum integrates wind as torque.
class AmbientPulse {
  constructor(delay,duration,gap,amplitude,signed=false){
    this.until=delay;this.duration=duration;this.gap=gap;
    this.amplitude=amplitude;this.signed=signed;this.age=0;this.length=0;
  }
  range([lo,hi]){return lo+Math.random()*(hi-lo);}
  advance(dt){
    if(this.until>0){
      this.until-=dt;
      if(this.until>0)return 0;
      this.age=-this.until;this.length=this.range(this.duration);
      this.peak=this.range(this.amplitude)*(this.signed&&Math.random()<.5?-1:1);
    }else this.age+=dt;
    if(this.age>=this.length){this.until=this.range(this.gap);return 0;}
    return this.peak*Math.sin(Math.PI*this.age/this.length)**2;
  }
}

// A hand briefly pushes on audible attacks, then lets go completely.
// No beat target angle, persistent sideways pull, or positional limiter.
class MusicSway {
  constructor(){this.reset();}
  reset(){this.age=1;this.duration=.12;this.peak=0;this.cooldown=0;this.lastTime=null;this.lastDirection=0;this.nextDirection=1;}
  advance(dt,{time,tempo,energy,onset,strength},bob){
    if(this.lastTime!==null&&(time<this.lastTime||time-this.lastTime>.4))this.reset();
    this.lastTime=time;
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(bob.target!==null||bob.calming||bob.stopped){this.peak=0;this.age=1;return 0;}
    const s=Math.max(0,Math.min(100,strength))/100;
    if(s===0){this.peak=0;return 0;}
    const moving=Math.abs(bob.speed)>.06;
    const direction=moving?Math.sign(bob.speed):(Math.abs(bob.angle)>.025?-Math.sign(bob.angle):this.nextDirection);
    const audible=energy>.025&&onset>.012+energy*.045;
    // One push per half-swing, away from the turning points. Faster music
    // offers more attacks; soft passages naturally leave longer quiet gaps.
    const ready=this.age>=this.duration&&this.cooldown===0&&Math.abs(bob.angle)<.40;
    if(audible&&ready&&(direction!==this.lastDirection||!moving&&Math.abs(bob.angle)<.025)){
      const pace=Math.max(0,Math.min(1,(tempo-65)/100));
      const vitality=Math.min(1,energy*1.6+onset*2);
      const amplitude=(.10+.72*Math.pow(s,1.3))*(.46+.30*vitality+.24*pace);
      const gravity=bob.mass*9.81*bob.arm;
      const ceiling=gravity*(1-Math.cos(amplitude));
      const current=gravity*(1-Math.cos(bob.angle))+.5*bob.inertia*bob.speed**2;
      const headroom=Math.max(0,ceiling-current);
      // Bound added energy, not the lamp's position or existing velocity.
      const impulse=Math.max(0,Math.sqrt(bob.inertia**2*bob.speed**2+2*bob.inertia*headroom)-bob.inertia*Math.abs(bob.speed));
      this.duration=.10+.05*(1-pace);
      this.peak=direction*Math.min(5.5*s,2*impulse/this.duration);
      this.age=0;this.cooldown=Math.max(.20,60/Math.max(45,tempo)*.55);
      if(Math.abs(this.peak)>.001){this.lastDirection=direction;this.nextDirection=-direction;}
    }
    if(this.age>=this.duration)return 0;
    this.age+=dt;
    if(this.age>=this.duration)return 0;
    // Release early if the bob turns: a push must never fight its rebound.
    if(Math.abs(bob.speed)>.08&&this.peak*bob.speed<0){this.age=this.duration;return 0;}
    return this.peak*Math.sin(Math.PI*this.age/this.duration)**2;
  }
}
