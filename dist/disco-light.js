// Cached soft colour spots use the same inertial phase as the mirror ball.
class DiscoLight {
 static finishRhythm(ctx,power,width,height){
  if(power>=1)return;
  // Modulate the completed illumination once, after screen blending. The
  // scene is opaque black beneath it; lyrics and foreground are drawn later.
  ctx.save();ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1-Math.max(0,power);ctx.fillStyle='#000';
  ctx.fillRect(0,0,width,height);ctx.restore();
 }
 static operatingPoint({automatic,playing,tempo=90,beat=0,speed=35,rhythmLight=false}){
  return {speed:automatic?(playing?Math.max(25,Math.min(70,tempo*.5-5)):8):speed,
    rhythm:automatic&&playing,beat,level:rhythmLight&&playing?1:automatic&&!playing?.56:.7};
 }
 constructor(){
  this.phase=0;this.velocity=0;this.opacity=0;
  // One soft cached shaft: no per-frame blur, hard edges or connecting lines.
  this.shaft=document.createElement('canvas');this.shaft.width=128;this.shaft.height=256;
  const g=this.shaft.getContext('2d');
  for(let y=0;y<256;y++){
   const t=y/255,w=3+58*t,fade=Math.sin(Math.PI*t)**.7*(1-t*.65);
   const grad=g.createLinearGradient(64-w,0,64+w,0);
   grad.addColorStop(0,'rgba(245,220,192,0)');grad.addColorStop(.5,`rgba(245,220,192,${fade})`);grad.addColorStop(1,'rgba(245,220,192,0)');
   g.fillStyle=grad;g.fillRect(0,y,128,1);
  }
  this.tiles=Array.from({length:7},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),h=i*360/7;
   const glow=g.createRadialGradient(48,48,0,48,48,45);glow.addColorStop(0,`hsla(${h},82%,86%,1)`);glow.addColorStop(.30,`hsla(${h},86%,70%,.90)`);glow.addColorStop(.65,`hsla(${h},80%,58%,.30)`);glow.addColorStop(1,`hsla(${h},72%,52%,0)`);g.fillStyle=glow;g.fillRect(0,0,96,96);return c;});
  // Pre-baked diffuse colour pools: continuously mixed with the existing crisp pool.
  // No canvas filter or per-frame blur allocation during rotation.
  this.softTiles=Array.from({length:7},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),h=i*360/7;
   const glow=g.createRadialGradient(48,48,0,48,48,45);
   glow.addColorStop(0,`hsla(${h},82%,86%,.62)`);glow.addColorStop(.25,`hsla(${h},86%,70%,.42)`);glow.addColorStop(.55,`hsla(${h},80%,58%,.16)`);glow.addColorStop(.8,`hsla(${h},72%,52%,.035)`);glow.addColorStop(1,`hsla(${h},72%,52%,0)`);
   g.fillStyle=glow;g.fillRect(0,0,96,96);return c;});
 }
 coast(dt,{reduced=false}={}){this.advance(dt,false,0,{reduced,coasting:true});}
 advance(dt,rotating,speed=35,{rhythm=false,beat=0,reduced=false,coasting=false}={}){
  if(reduced){this.velocity=0;return;}
  dt=Math.min(.05,Math.max(0,dt));
  const base=.035+Math.max(0,Math.min(100,speed))/100*.65;
  // Automatic motion has a broad beat response; manual speed keeps its existing range.
  const tempoGain=.78+.22*Math.max(0,Math.min(1,(speed-25)/45));
  const accent=Math.max(0,Math.min(1,beat))**1.35;
  const target=rotating?(rhythm?.10+1.25*tempoGain*accent:base):0;
  const previous=this.velocity;
  const tau=!rotating?(coasting?1.1:.62):rhythm?(target>previous?.06:.17):.26;
  const decay=Math.exp(-dt/tau);
  this.velocity=target+(previous-target)*decay;
  this.phase=(this.phase+target*dt+(previous-target)*tau*(1-decay))%(Math.PI*2);
  if(!rotating&&this.velocity<.0003)this.velocity=0;
 }
 draw(ctx,{active,dt,reduce,width,height,source,power=1,strength=.7}){
  // Never carry a Disco afterglow into another fixture's source coordinates.
  if(!active){this.opacity=0;return;}
  const target=1;this.opacity=reduce?target:this.opacity+(target-this.opacity)*(1-Math.exp(-dt*5));if(this.opacity<.001||strength<=0)return;
  ctx.save();ctx.globalCompositeOperation='screen';
  // Soft reflected pools vary in size; lower pools are wider and more diffuse.
  for(let ring=0;ring<4;ring++)for(let j=0;j<14;j++){
   const angle=j*Math.PI*2/14+ring*.47+Math.sin(j*7.13+ring*3.2)*.17+this.phase*2;
   const radius=(.21+ring*.145)*width*(1+.11*Math.sin(j*5.71+ring));
   const x=source.x+Math.sin(angle)*radius;
   const y=source.y+height*(.17+ring*.18)+Math.cos(angle)*height*(.075+ring*.018);
   const edge=Math.max(0,Math.min(1,x/50,(width-x)/50,y/30,(height-y)/45));
   const shine=.62+.38*Math.sin(angle*.7+ring+1)**2;
   // Distance in the illuminated plane, not discrete ring membership.
   const distance=Math.hypot((x-source.x)/width,(y-source.y)/height);
   const t=Math.max(0,Math.min(1,(distance-.28)/.64)),outer=t*t*(3-2*t);
   const alpha=Math.min(1,1.30*this.opacity*power*strength/0.7*edge*shine*(.66-ring*.045))*(1-.62*outer);
   const variation=.65+.65*(.5+.5*Math.sin(j*12.73+ring*8.19));
   const size=(25+ring*15)*variation*(1+.65*outer),stretch=1.65+ring*.23;
   ctx.save();ctx.translate(x,y);ctx.rotate(-Math.sin(angle)*.55);const color=(j+ring*2)%7;
   ctx.globalAlpha=alpha*(1-outer);ctx.drawImage(this.tiles[color],-size*stretch/2,-size/2,size*stretch,size);
   if(outer>0){ctx.globalAlpha=alpha*outer;ctx.drawImage(this.softTiles[color],-size*stretch/2,-size/2,size*stretch,size);}
   ctx.restore();
  }ctx.restore();
 }
}
