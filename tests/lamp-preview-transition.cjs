const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync('dist/app.js','utf8');const code=app.slice(app.indexOf('  let fixtureWeights='),app.indexOf('  function showScene()'));
const box={previewLamp:null,scene:{lampStyle:'disco'},reduce:{matches:false}};vm.createContext(box);vm.runInContext(code+';this.getWeights=()=>({...fixtureWeights});',box);
box.updateFixtureBlend(.016);assert.deepEqual({...box.getWeights()},{disco:1});box.previewLamp='red';box.updateFixtureBlend(.1);let a=box.getWeights();assert(a.disco>0&&a.red>0);
box.previewLamp='jazz';box.updateFixtureBlend(0);assert.deepEqual({...box.getWeights()},{...a});
for(let i=0;i<30;i++){box.updateFixtureBlend(1/60);const w=Object.values(box.getWeights());assert(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-10);assert(w.every(x=>x>=0&&x<=1));}
assert.deepEqual({...box.getWeights()},{jazz:1});box.reduce.matches=true;box.previewLamp='tube';box.updateFixtureBlend(.016);assert.deepEqual({...box.getWeights()},{tube:1});
console.log('PASS: 320ms blend is interruptible without a reset flash, weights normalized, reduced-motion respects preference.');
