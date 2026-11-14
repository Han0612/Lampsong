const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('dist/app.js','utf8');
const b={window:{screenX:0,screenY:0,outerWidth:1200,outerHeight:800},document:{hidden:false},reduce:{matches:false},L:90,dragging:false};vm.createContext(b);
vm.runInContext(fs.readFileSync('dist/pendulum.js','utf8')+fs.readFileSync('dist/sleeve.js','utf8')+';this.pendulum=new SuspendedLamp();this.foreAft=new SuspendedLamp();this.windowMotion=new WindowSuspension();this.sleeve=Object.create(RecordSleeve.prototype);',b);
vm.runInContext(app.slice(app.indexOf('  function advanceRestLamp('),app.indexOf("  $('lightToggle').onclick=")),b);
Object.assign(b.sleeve,{reduce:b.reduce,pitch:0,yaw:0,wp:0,wy:0,roll:0,wr:0,homeP:0,homeY:0,coast:0,grip:null,back:false,rect:{left:50,top:150,width:280,height:280},sleeve:{style:{setProperty(){}}}});
const beam={x:700,y:70,slope:0,width:900,height:800,gain:.8};
let lampMax=0,coverMax=0;b.pendulum.stop();b.foreAft.stop();
for(let i=0;i<180;i++){
 const x=i<30?i*4:i<60?120-(i-30)*4:0;b.window.screenX=x;b.window.screenY=x*.3;
 b.advanceRestLamp(1/60,i*1000/60);b.sleeve.update(1/60,b.windowMotion,beam,[236,231,216],1);
 lampMax=Math.max(lampMax,Math.abs(b.pendulum.angle));coverMax=Math.max(coverMax,Math.abs(b.sleeve.yaw));
}
assert(lampMax>.08,'window motion wakes stopped lamp');assert(coverMax>.05,'cover receives same window inertia');
assert(Math.abs(b.sleeve.yaw)<coverMax*.1,'cover settles after window stops');
console.log('PASS: real WindowSuspension → off-state lamp and RecordSleeve; peak lamp '+lampMax.toFixed(3)+' rad, cover '+coverMax.toFixed(3)+' rad.');
