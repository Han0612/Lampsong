const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
const b={performance:{now:()=>0}};vm.createContext(b);vm.runInContext(fs.readFileSync('dist/scene-rest.js','utf8')+';this.Rest=SceneRest;',b);
const rest=new b.Rest(),c=createCanvas(180,80),g=c.getContext('2d');
rest.setOn(false,10000);assert.equal(rest.now(600000),10);assert.equal(rest.level(10000),1);assert.equal(rest.level(10240),.5);assert.equal(rest.level(10480),0);
rest.setOn(true,11000);assert.equal(rest.now(11000),10);const mid=rest.level(11240);rest.setOn(false,11240);assert.equal(rest.level(11240),mid,'interruptible brightness, no jump');
rest.setOn(true,12000);
// A moving shape must have exactly one current position even during fades.
for(let i=0;i<60;i++){
 const x=10+i*2,stamp=12000+i*8;
 g.fillStyle='#000';g.fillRect(0,0,180,80);g.fillStyle='#fff';g.fillRect(x,10,2,30);rest.present(g,stamp);
 const p=g.getImageData(0,20,180,1).data;
 for(let k=0;k<180;k++)if(k<x||k>=x+2)assert.equal(p[k*4],0,'no historical lamp position in power transition');
 assert(p[x*4]>0);
}
const app=fs.readFileSync('dist/app.js','utf8');let physical=0,blend=0,profiles=0,bake=0,rendered=0,raf=0,coasting=0;
Object.assign(b,{rest:{on:false},reduce:{matches:false},document:{hidden:false,createElement:()=>createCanvas(1,1)},advanceRestLamp:()=>physical++,discoLight:{coast(dt){assert(dt>=0);coasting++;}},updateFixtureBlend:()=>blend++,updateBeamProfile:()=>profiles++,lightDirty:false,buildLight:()=>bake++,renderScene:(dt,stamp,off)=>{assert(off);rendered++;},requestAnimationFrame:()=>raf++});
const a=app.indexOf('  function frame(stamp){'),z=app.indexOf("  document.addEventListener('visibilitychange'",a);
vm.runInContext('let last=0;'+app.slice(a,z)+';frame(1000);frame(1016);',b);
assert.equal(coasting,2);assert.equal(physical,2);assert.equal(blend,2);assert.equal(profiles,2);assert.equal(rendered,2);assert.equal(bake,0);assert.equal(raf,2);
vm.runInContext(fs.readFileSync('dist/cat-sleep.js','utf8')+';this.Companion=CatCompanion;',b);
const cat=new b.Companion({}, {scene:()=>({}),now:()=>10});cat.paused=true;const lastActivity=cat.clock.lastActivity;cat.activity(1000,true);cat.request('random');cat.tick(1000,1,{});assert.equal(cat.clock.lastActivity,lastActivity);assert.equal(cat.queued,null);
console.log('PASS: 60 ghost-free moving-frame transitions; interrupted brightness and paused clocks; off fixture/profile updates; autonomous simulation/cat remain paused.');
