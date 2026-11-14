const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=new Proxy({}, {get:(o,k)=>k.startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true});
const box={document:{createElement:()=>({getContext:()=>ctx})}};vm.createContext(box);vm.runInContext(fs.readFileSync('dist/disco-light.js','utf8')+';this.D=DiscoLight;',box);const light=new box.D();
for(let i=0;i<180;i++)light.advance(1/60,true,100);
assert(light.velocity<=.685&&light.velocity>.68,'limit restored to twice v110 maximum');
const phase=light.phase,velocity=light.velocity;light.advance(1/60,false,100);
assert(light.phase>phase&&light.velocity<velocity&&light.velocity>0,'stop coasts rather than snapping');
for(let i=0;i<360;i++)light.advance(1/60,false,100);
assert.equal(light.velocity,0);const stopped=light.phase;light.advance(1/60,false,100);assert.equal(light.phase,stopped);
for(let i=0;i<120;i++)light.advance(1/60,true,100,{rhythm:true,beat:0});const slow=light.velocity;
for(let i=0;i<30;i++)light.advance(1/60,true,100,{rhythm:true,beat:1});assert(light.velocity>slow*5&&light.velocity<=1.35);
light.advance(.016,true,100,{reduced:true});assert.equal(light.velocity,0);
light.phase=Math.PI*2-.00001;light.advance(.016,true,100);assert(light.phase>=0&&light.phase<Math.PI*2);
const html=fs.readFileSync('dist/index.html','utf8');assert.equal((html.match(/data-lamp=/g)||[]).length,12);for(const id of ['discoRotation','discoSpeed','discoStrength','discoRotationToggle'])assert(html.includes('id="'+id+'"'));assert(html.includes('<small class="lamp-special">SPECIAL</small><span class="lamp-name">迪斯科镜球'));
const app=fs.readFileSync('dist/app.js','utf8');assert(app.includes('phase:discoLight.phase'));assert(!app.includes('button.title='));
const source=fs.readFileSync('dist/presets.js','utf8'),validate=source.slice(source.indexOf('  function validate('),source.indexOf('  function readSession('));const validKeys=['dome','modern','red','glass','tube','vintage','capsule','ph5','caravaggio','gubi1965','jazz','disco'];const preset={floatingDefaults:{},projectedWaveDefaults:{},defaults:{mode:'pure',lampStyle:'modern',discoRotation:true,discoSpeed:35,discoStrength:70},catPlacementDefaults:()=>({}),catOpacityDefaults:()=>({}),lightModeDefaults:()=>({}),$:key=>key==='lampStyle'?{options:validKeys.map(value=>({value}))}:{tagName:'INPUT',min:key==='discoSpeed'?5:0,max:100}};vm.createContext(preset);vm.runInContext(validate+';this.validate=validate;',preset);
for(const key of ['concert','gubiA1965','romeo','mayfair','flamingo','skan']){const doc=preset.validate({version:1,name:'old',settings:{mode:'pure',lampStyle:key}});assert(validKeys.includes(doc.settings.lampStyle));assert.equal(doc.settings.discoRotation,true);assert.equal(doc.settings.discoSpeed,35);}
console.log('PASS: rotation pause/resume, velocity bounds, one shared angular phase, 12 picker options, legacy preset migration and new defaults.');

let calls=0;const inactive=new Proxy({}, {get:()=>()=>calls++,set:()=>{calls++;return true;}});
light.opacity=1;light.draw(inactive,{active:false,dt:.016,reduce:false});assert.equal(calls,0);assert.equal(light.opacity,0);
console.log('PASS: switching away from Disco renders zero stale spots, even with a fully visible previous frame.');
