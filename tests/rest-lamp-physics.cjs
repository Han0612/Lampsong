const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const app=fs.readFileSync('dist/app.js','utf8');
const lamp={style:{},setPointerCapture(){},hasPointerCapture(){return false;}},other={style:{}};
const b={document:{hidden:false,createElement:()=>createCanvas(1,1)},performance:{now:()=>0},$:id=>id==='lamp'?lamp:other,window:{},windowMotion:{sample(){},reset(){},torque(){return 0;}},rest:{on:false},state:{swing:60},reduce:{matches:false},depthImpulse:()=>.15,cx:400,pivotY:-14,L:80,last:0};vm.createContext(b);
vm.runInContext(fs.readFileSync('dist/pendulum.js','utf8')+';this.pendulum=new SuspendedLamp();this.foreAft=new SuspendedLamp();',b);
vm.runInContext(app.slice(app.indexOf('  function advanceRestLamp('),app.indexOf("  $('lightToggle').onclick=")),b);
vm.runInContext(app.slice(app.indexOf('  function impulse('),app.indexOf('  const lamp='))+'const lamp=$("lamp");'+app.slice(app.indexOf('  const pointerAngle='),app.indexOf('  let pendingLine=0;')),b);
Object.assign(b,{dragging:false,dragMoved:false,startY:0,grabbedYaw:0,gripDepth:0,grabbedPitch:0,grabOffset:0,dragStartX:0,pointerTime:0,manualLamp:false});
b.pendulum.angle=.65;b.pendulum.speed=.3;b.foreAft.angle=.2;
const angle=b.pendulum.angle;b.advanceRestLamp(1/60);assert(Math.abs(b.pendulum.angle-angle)<.03,'no instantaneous reset');
let crossed=false;for(let i=0;i<1500;i++){b.advanceRestLamp(1/60);if(b.pendulum.angle<0)crossed=true;}
assert(crossed,'gravity should produce a real return swing');assert.equal(b.pendulum.angle,0);assert.equal(b.foreAft.angle,0);
lamp.onpointerdown({button:0,isPrimary:true,clientX:400,clientY:100,pointerId:1,timeStamp:0});
lamp.onpointermove({isPrimary:true,clientX:470,clientY:115,pointerId:1,timeStamp:30});
for(let i=0;i<12;i++)b.advanceRestLamp(1/60);assert(b.pendulum.angle>.15,'drag works while off');
lamp.onpointerup({type:'pointerup',pointerId:1,clientX:470});assert.equal(b.pendulum.target,null);assert(Math.abs(b.pendulum.speed)>.01,'release keeps inertia');
const atRelease=b.pendulum.angle;b.advanceRestLamp(1/60);assert.notEqual(b.pendulum.angle,atRelease);
b.document.hidden=true;const frozen=b.pendulum.angle;b.advanceRestLamp(1);assert.equal(b.pendulum.angle,frozen);b.document.hidden=false;
for(let i=0;i<1500;i++)b.advanceRestLamp(1/60);assert.equal(b.pendulum.angle,0);
assert(!fs.readFileSync('dist/console.css','utf8').includes('.lights-out #lamp{pointer-events:none'));
// Render the actual lamp wrapper with a simple material: all inner alpha must
// be dimmed once, no emission overlay, current hit target, and no clipped body.
let emission=0;Object.assign(b,{W:800,H:600,dpr:2,ctx:createCanvas(1600,1200).getContext('2d'),previewLamp:null,scene:{lampStyle:'dome'},fixtures:{dome:{width:60}},surface:{},fixtureWeights:{dome:1},fixtureScale:()=>1,rgb:[240,230,220],time:5,discoLight:{phase:1},lightPower:.5,lampHover:true,
 drawFixture(g){g.globalAlpha=1;g.fillStyle='#fff';g.fillRect(-30,0,60,60);return{};},drawFixtureLight(){emission++;}});
vm.runInContext(app.slice(app.indexOf("  const restLamp=document"),app.indexOf('  function stageWidth()')),b);
b.ctx.setTransform(2,0,0,2,0,0);b.ctx.fillStyle='#14171a';b.ctx.fillRect(0,0,800,600);b.theta=0;
b.drawLamp({x:400,y:100,dx:0,dy:1,scale:1},0);assert.equal(emission,0);const p=b.ctx.getImageData(800,240,1,1).data[0];assert(p>=50&&p<=61,'fixture internal alpha cannot bypass ambient dimming');
assert.equal(lamp.style.left,'400px');b.drawLamp({x:450,y:90,dx:.3,dy:.95,scale:1},0);assert.equal(lamp.style.left,'456px');
console.log('PASS: physical return without snapping, off-state drag/release inertia, final rest, hidden pause, dim grouped fixture, no emitter and updated hit target.');
