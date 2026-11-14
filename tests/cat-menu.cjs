const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0,nextTimer=0;const timers=new Map();
function later(fn,ms){const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;}
function advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=end;}
class Node{
 constructor(tag='div'){this.tag=tag;this.handlers={};this.attrs={};this.dataset={};this.children=[];this.innerHTML='';this.hidden=false;this.inert=false;this.disabled=false;this.capture=null;this.style={setProperty(k,v){this[k]=v;}};this.classes=new Set();this.classList={add:k=>this.classes.add(k)};}
 append(...nodes){nodes.forEach(n=>{n.parent=this;this.children.push(n);});}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 emit(type,data={}){let prevented=false;const e={type,target:this,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,clientX:726,clientY:530,detail:1,preventDefault(){prevented=true;},...data};for(const fn of this.handlers[type]||[])fn(e);return prevented;}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return this.attrs[k];}
 focus(){doc.activeElement=this;}
 setPointerCapture(id){this.capture=id;}
 hasPointerCapture(id){return this.capture===id;}
 releasePointerCapture(){this.capture=null;this.emit('lostpointercapture');}
 animate(frames,options){this.animation={frames,options};return{cancel(){},finished:Promise.resolve()};}
 getBoundingClientRect(){if(this.id==='pawTrigger')return {left:700,right:752,top:504,bottom:556,width:52,height:52};const left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0;return{left,top,right:left+52,bottom:top+52,width:52,height:52};}
}
const doc=new Node('document'),win=new Node('window');doc.body=new Node('body');doc.createElement=tag=>new Node(tag);doc.activeElement=null;
const button=new Node('button');button.id='pawTrigger';button.innerHTML='<svg>PAW</svg>';button.ownerDocument=doc;doc.body.append(button);
let sleeping=false,random=0,wake=0,sleepCalls=0,selected=[];
const poses=Object.fromEntries(Array.from({length:12},(_,i)=>['pose'+i,{file:'cat'+i+'.png',label:'动作'+i}]));
const box={document:doc,window:win,innerWidth:800,innerHeight:600,Image:class{},setTimeout:later,clearTimeout:id=>timers.delete(id)};
vm.createContext(box);vm.runInContext(fs.readFileSync('dist/cat-menu.js','utf8'),box);
const menu=box.installCatMenu({button,poses,onRandom:()=>random++,onSleep:()=>sleepCalls++,onPose:key=>selected.push(key),onWake:()=>wake++,isSleeping:()=>sleeping,reduced:false});
const host=menu.element,grid=host.children[0];assert.equal(host.children.length,1,'no sleep button');
assert.equal(grid.children.length,12);assert.equal(button.attrs['aria-label'],'唤猫');
button.emit('pointerdown');advance(499);assert.equal(menu.isOpen,false);button.emit('pointerup');button.emit('click');assert.equal(random,1,'short press summons one random action');
button.emit('pointerdown');advance(500);assert.equal(menu.isOpen,true,'exact 500ms opens');assert.equal(button.attrs['aria-label'],'收起动作');button.emit('pointerup');button.emit('click');assert.equal(menu.isOpen,true,'release click must not close opened menu');assert.equal(random,1);
grid.children[7].emit('click');assert.deepEqual(selected,['pose7']);assert.equal(menu.isOpen,true,'selection keeps palette pinned');button.emit('click',{detail:0});assert.equal(menu.isOpen,false);assert.equal(host.inert,true);advance(180);assert.equal(host.hidden,true);
button.emit('pointerdown');advance(200);button.emit('pointermove',{clientX:760});advance(700);button.emit('pointerup');button.emit('click');assert.equal(menu.isOpen,false);assert.equal(random,1,'drag-out cancels both long and short action');
button.emit('pointerdown',{pointerType:'touch'});advance(250);button.emit('pointercancel',{pointerType:'touch'});advance(600);button.emit('click');assert.equal(random,1,'cancelled touch cannot summon');
button.emit('pointerdown',{pointerType:'touch'});advance(500);button.emit('pointerup',{pointerType:'touch'});button.emit('click');assert.equal(menu.isOpen,true);assert.equal(menu.isOpen,true,'touch palette stays pinned');button.emit('click',{detail:0});assert.equal(menu.isOpen,false);
sleeping=true;menu.sync();assert.equal(button.attrs['aria-label'],'唤猫');button.emit('click',{detail:0});assert.equal(wake,0);assert.equal(random,2,'old sleeping callback cannot restore sleep flow');
button.emit('keydown',{key:'ArrowUp'});assert.equal(menu.isOpen,true);assert.equal(doc.activeElement,grid.children[0]);host.emit('keydown',{key:'ArrowDown'});assert.equal(doc.activeElement,grid.children[3]);host.emit('keydown',{key:'End'});assert.equal(doc.activeElement,grid.children[11]);doc.emit('keydown',{key:'Escape'});assert.equal(menu.isOpen,true,'only X closes palette');button.emit('click',{detail:0});assert.equal(menu.isOpen,false);
menu.open();doc.emit('pointerdown',{target:new Node()});assert.equal(menu.isOpen,true,'outside pointer keeps palette pinned');button.emit('pointerdown');advance(650);button.emit('pointerup');button.emit('click');assert.equal(menu.isOpen,true,'second long press on X remains pinned');button.emit('click',{detail:0});assert.equal(menu.isOpen,false);
sleeping=false;menu.sync();button.emit('pointerdown');advance(250);win.emit('blur');advance(600);assert.equal(menu.isOpen,false,'background blur cancels charge');
console.log('PASS cat menu: 500 ms threshold, quick click, long release suppression, drag/touch cancel, exact 12-action selection, sleep flow removed, keyboard grid, pinned selection, outside-click retention, repeated long press and background cancellation.');
