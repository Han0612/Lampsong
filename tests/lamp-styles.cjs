const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let delegated=0,paints=0;const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get(o,k){if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;return(...args)=>{args.forEach(x=>{if(typeof x==='number')assert(Number.isFinite(x));});if(k==='fill')paints++;};},set(){return true;}});
const box={realisticFixtures:{draw(){delegated++;return{rim:9,lensY:40};}}};vm.createContext(box);vm.runInContext(fs.readFileSync('dist/fixtures.js','utf8')+'\nthis.draw=drawFixture;this.keys=Object.keys(fixtures);',box);
assert.equal(box.keys.length,7);
for(const key of box.keys)for(const realistic of [false,true]){const out=box.draw(ctx,key,null,{realistic});assert(out.rim>0&&out.lensY>0);}
assert.equal(delegated,7);assert(paints>=7);
box.realisticFixtures.draw=()=>null;
for(const key of box.keys){const out=box.draw(ctx,key,null,{realistic:true});assert(out.rim>0&&out.lensY>0);}
const source=fs.readFileSync('dist/presets.js','utf8');const validate=source.slice(source.indexOf('  function validate('),source.indexOf('  function readSession('));
const settingBox={defaults:{mode:'pure',lampStyle:'tube',lampRealistic:true},catPlacementDefaults:()=>({}),catOpacityDefaults:()=>({}),lightModeDefaults:()=>({}),$:()=>({options:box.keys.map(value=>({value}))})};vm.createContext(settingBox);vm.runInContext(validate+'\nthis.check=validate;',settingBox);
for(const mode of ['pure','combined'])for(const key of box.keys){const doc={version:1,name:'test',settings:{mode,lampStyle:key}};assert.equal(settingBox.check(doc).settings.lampRealistic,true);doc.settings.lampRealistic=false;assert.equal(settingBox.check(doc).settings.lampRealistic,true);}
const html=fs.readFileSync('dist/index.html','utf8');assert.equal((html.match(/id="lampRealistic"/g)||[]).length,0);assert(html.includes('realistic-fixtures.js'));
console.log('PASS: 14 style paths, finite geometry, missing-image fallback, and 28 legacy/new mode preset combinations.');
// Reproduce the loaded-image path (the previous tests covered only a stub).
// An integrated diffuser must never receive a second procedural light plate.
const loadedImages=[];let ellipses=0;
const pixels=()=>({data:new Uint8ClampedArray(6*4*4).fill(255)});
const renderCtx=new Proxy({}, {get(o,k){if(k==='getImageData'||k==='createImageData')return pixels;if(k==='createRadialGradient'||k==='createLinearGradient')return()=>gradient;return()=>{if(k==='ellipse')ellipses++;};},set(){return true;}});
const renderBox={console,Image:class{constructor(){this.naturalWidth=6;this.naturalHeight=4;loadedImages.push(this);}},document:{createElement:()=>({getContext:()=>renderCtx})}};
vm.createContext(renderBox);
vm.runInContext(fs.readFileSync('dist/realistic-fixtures.js','utf8')+'\n'+fs.readFileSync('dist/fixtures.js','utf8')+'\nthis.draw=drawFixture;this.light=drawFixtureLight;',renderBox);
// Loading fallback still has its own light, then all seven loaded textures
// switch atomically to their integrated diffuser, including the glass core.
let fixture=renderBox.draw(renderCtx,'dome',null,{realistic:true});
renderBox.light(renderCtx,fixture);assert.equal(ellipses,2);
loadedImages.forEach(img=>img.onload());
for(const key of box.keys){
  ellipses=0;
  fixture=renderBox.draw(renderCtx,key,null,{realistic:true});
  assert.equal(fixture.integratedLight,true,key);
  renderBox.light(renderCtx,fixture,{hover:true,power:.7,texture:{}});
  assert.equal(ellipses,0,key+' must not draw a floating second diffuser');
  fixture=renderBox.draw(renderCtx,key,null,{realistic:false});
  const before=ellipses;renderBox.light(renderCtx,fixture);
  assert.equal(ellipses-before,2,key+' simplified fixture retains emission');
}
assert(fs.readFileSync('dist/app.js','utf8').includes('drawFixtureLight(ctx,fixture,'));
assert(fs.readFileSync('dist/lamp-review.html','utf8').includes('drawFixtureLight(g,lens)'));
console.log('PASS: all seven loaded textures avoid duplicate diffusers; simplified and image-loading fallback retain light.');

// Additional lamp geometry uses the same picker, preset and emission contract.
const modernBox={document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})},realisticFixtures:{draw:()=>({rim:9,lensY:40,integratedLight:true})}};
vm.createContext(modernBox);vm.runInContext(fs.readFileSync('dist/designer-fixtures.js','utf8')+'\n'+fs.readFileSync('dist/fixtures.js','utf8')+'\nthis.draw=drawFixture;this.light=drawFixtureLight;this.keys=Object.keys(fixtures);',modernBox);
assert.equal(modernBox.keys.length,12);
const cardKeys=[...html.matchAll(/data-lamp="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(cardKeys).size,12);assert.deepEqual([...modernBox.keys].sort(),cardKeys.sort());
for(const key of modernBox.keys)for(const time of [0,.016,10,123]){
 const result=modernBox.draw(ctx,key,null,{realistic:true,pitch:.3,yaw:.5,time});
 assert(Number.isFinite(result.rim)&&result.rim>0,key);assert(result.integratedLight,key);
 modernBox.light(ctx,result);
}
settingBox.$=()=>({options:modernBox.keys.map(value=>({value}))});
for(const mode of ['pure','combined'])for(const key of modernBox.keys)assert.equal(settingBox.check({version:1,name:'new fixture',settings:{mode,lampStyle:key}}).settings.lampStyle,key);
console.log('PASS: twelve fixture/picker keys agree, new materials draw at varying time/pose, integrated emission and both-mode preset compatibility.');
