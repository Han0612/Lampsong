const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0,next=0;const timers=new Map();
const later=(fn,ms)=>{const id=++next;timers.set(id,{fn,at:now+ms});return id;};
function advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}
class Node {
 constructor(id){this.id=id;this.handlers={};this.attrs={};this.children=[];this.style={setProperty(){}};this.classes=new Set();this.classList={add:s=>this.classes.add(s),remove:s=>this.classes.delete(s)};}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
 emit(name,e={}){for(const fn of this.handlers[name]||[])fn({target:this,preventDefault(){},...e});}
 setAttribute(k,v){this.attrs[k]=v;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 focus(){document.activeElement=this;this.emit('focus');}
 blur(){document.activeElement=null;this.emit('blur');}
 matches(){return false;}
 querySelector(selector){return selector==='canvas'?{width:160,height:128,getContext:()=>ctx}:this.children[0];}
 querySelectorAll(){return this.children;}
 dispatchEvent(e){this.onchange?.(e);this.emit(e.type,e);document.emit(e.type,e);}
}
const ctx=new Proxy({}, {get:(o,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):k==='getImageData'?()=>({data:new Uint8ClampedArray(256*256*4).fill(255)}):()=>{},set:()=>true});
const document=new Node('document'),window=new Node('window');document.createElement=()=>({width:256,height:256,getContext:()=>ctx});document.activeElement=null;
const nodes={};document.getElementById=id=>nodes[id]??=(new Node(id));
const $=document.getElementById;
const cards=['dome','modern','red','glass','tube','vintage','capsule'].map(key=>{const n=new Node(key);n.dataset={lamp:key};return n;});
document.querySelectorAll=selector=>selector==='[data-lamp]'?cards:[];
$('panel').hidden=true;$('lampTray').children=cards;$('lampTray').hidden=true;$('lampPicker').children=[$('lampPickerButton'),$('lampTray')];
$('lyricDock').children=[$('lyricDockPanel'),$('lyricDockReveal')];$('lyricDockPanel').inert=true;
const scene={lampStyle:'modern'};let preview=null,saves=0;
$('lampStyle').onchange=()=>{scene.lampStyle=$('lampStyle').value;saves++;};
const box={document,window,matchMedia:()=>({matches:true}),getComputedStyle:()=>({opacity:1,transform:"none"}),drawFixture(){},setTimeout:later,clearTimeout:id=>timers.delete(id),Event:class{constructor(type){this.type=type;}}};vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/ui-motion.js','utf8'),box);
vm.runInContext(fs.readFileSync('dist/console-ui.js','utf8'),box);
box.installConsoleUI({},()=>scene,()=>{},()=>{},s=>preview=s);
$('lampPickerButton').onclick();assert.equal($('lampTray').hidden,false);
cards[2].emit('pointerenter',{pointerType:'mouse'});assert.equal(preview,'red');assert.equal(scene.lampStyle,'modern');assert.equal(saves,0);
cards[2].emit('pointerleave');assert.equal(preview,'red','card gaps preserve preview rather than briefly restoring selected Disco');
cards[3].emit('focus');assert.equal(preview,'glass');cards[3].onclick();assert.equal(scene.lampStyle,'glass');assert.equal(saves,1);assert.equal(preview,null);assert($('lampTray').hidden);
$('lampPickerButton').onclick();cards[0].emit('pointerenter',{pointerType:'mouse'});window.emit('presetsapplied');assert.equal(preview,null);assert($('lampTray').hidden);
$('lyricDock').emit('pointerenter',{pointerType:'mouse'});assert.equal($('lyricDockPanel').inert,false);
$('lyricDock').emit('pointerleave');advance(999);assert.equal($('lyricDockPanel').inert,false);advance(1);assert.equal($('lyricDockPanel').inert,true);
$('lyricDock').emit('pointerenter',{pointerType:'mouse'});$('lyricDock').emit('pointerleave');advance(700);$('lyricDock').emit('pointerenter',{pointerType:'mouse'});advance(500);assert.equal($('lyricDockPanel').inert,false);
window.emit('sceneonlychange');assert.equal($('lyricDockPanel').inert,true);
console.log('PASS: preview never saves, leave restores, select commits/closes, mode resets preview, dock waits 1 s and cancels on reentry, immersive hides dock.');

$('lampPickerButton').emit('pointerenter',{pointerType:'mouse'});assert.equal($('lampTray').hidden,false);
$('lampPickerButton').onclick();assert.equal($('lampTray').hidden,false,'hover then click remains open');
$('lampPickerButton').emit('pointerleave',{pointerType:'mouse'});advance(100);$('lampTray').emit('pointerenter',{pointerType:'mouse'});advance(300);assert.equal($('lampTray').hidden,false,'crossing gap preserves menu');
$('lampTray').emit('pointerleave',{pointerType:'mouse'});advance(220);assert.equal($('lampTray').hidden,true);

$('panel').hidden=false;$('lampPickerButton').emit('pointerenter',{pointerType:'mouse'});assert.equal($('lampTray').hidden,true,'no hover while console visible');
$('panel').hidden=true;$('lampPickerButton').emit('pointerenter',{pointerType:'mouse'});assert.equal($('lampTray').hidden,false,'hover resumes once console is closed');
console.log('PASS: console blocks hover; card gaps and keyboard focus keep the active preview until menu close.');

// Real event ordering: a row label can blur the trigger before pointer-up/click.
window.emit('presetsapplied');$('lampPickerButton').onclick();$('lampPickerButton').focus();
const label=new Node('red-label');cards[2].children.push(label);
$('lampTray').emit('pointerleave',{pointerType:'mouse'}); // stale hover-close timer
const beforeGesture=saves;
document.emit('pointerdown',{target:label,pointerId:7,pointerType:'mouse',button:0,clientX:70,clientY:80});
document.activeElement=null;$('lampPicker').emit('focusout',{relatedTarget:null});
advance(0);advance(240);
assert.equal($('lampTray').inert,false,'focus loss and hover timer cannot disable a pressed row');
document.emit('pointerup',{target:label,pointerId:7,pointerType:'mouse',clientX:70,clientY:80});
advance(0);assert.equal($('lampTray').inert,false,'pointer-up must leave room for click');
cards[2].onclick({target:label,detail:1});
assert.equal(scene.lampStyle,'red');assert.equal(saves,beforeGesture+1,'row text commits exactly once');
advance(400);assert.equal(preview,null);assert.equal($('lampTray').hidden,true);

// Touch opening must stay open even on browsers which do not focus a tap target.
document.emit('pointerdown',{target:$('lampPickerButton'),pointerId:8,pointerType:'touch',clientX:10,clientY:10});
document.emit('pointerup',{target:$('lampPickerButton'),pointerId:8,pointerType:'touch',clientX:10,clientY:10});
$('lampPickerButton').onclick();advance(400);
assert.equal($('lampTray').hidden,false,'touch-open has no stale release/blur timeout');
document.emit('pointerdown',{target:cards[4],pointerId:9,pointerType:'touch',clientX:50,clientY:90});
$('lampPicker').emit('focusout');advance(0);
document.emit('pointerup',{target:cards[4],pointerId:9,pointerType:'touch',clientX:50,clientY:90});
advance(280);cards[4].onclick({detail:1});assert.equal(scene.lampStyle,'tube','delayed touch click commits');
const afterTouch=saves;

for(const cancelled of [false,true]){
 $('lampPickerButton').onclick();
 document.emit('pointerdown',{target:cards[0],pointerId:11,pointerType:'touch',clientX:30,clientY:40});
 if(cancelled)document.emit('pointercancel',{pointerId:11});
 else{
  document.emit('pointermove',{target:cards[0],pointerId:11,clientX:30,clientY:80});
  document.emit('pointerup',{target:cards[0],pointerId:11,clientX:30,clientY:80});
 }
 cards[0].onclick({detail:1});advance(400);
 assert.equal(saves,afterTouch,'touch scroll/cancel never selects, even if a click is emitted');
}
$('lampPickerButton').onclick();cards[1].focus();$('lampPicker').emit('focusout');advance(0);
assert.equal($('lampTray').hidden,false,'keyboard focus moving inside the picker stays open');
cards[1].onclick({detail:0});assert.equal(scene.lampStyle,'modern','keyboard activation still commits');
$('lampPickerButton').onclick();document.activeElement=null;$('lampPicker').emit('focusout');advance(0);
assert.equal($('lampTray').hidden,true,'real focus exit still closes the menu');
console.log('PASS: row pointer/focus race, stale leave timer, delayed touch click, touch scroll/cancel and keyboard selection.');
