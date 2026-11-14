const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('dist/app.js','utf8');
const nodes={},listeners={};
for(const id of ['lyricBoundaryGuide','lyricWidth','lyricHeight','panel'])nodes[id]={hidden:id!=='panel',style:{},dataset:{},handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}};
const box={H:900,W:1360,cx:870,pivotY:0,L:100,Intl,
 typePrefs:{lyricRows:3,lineGap:100,activeSize:112,regularSize:100,lyricWidth:100,lyricHeight:100},
 $:id=>nodes[id]||{checked:true},window:{addEventListener:(name,fn)=>listeners[name]=fn},
 document:{createElement:()=>({getContext:()=>({})}),querySelector:()=>({getBoundingClientRect:()=>({right:400})}),body:{classList:{contains:()=>false}}},
 projector:{layoutRuns:(_,t)=>({left:0,right:t.length*96,referenceHeight:96})}};
vm.createContext(box);
vm.runInContext(app.slice(app.indexOf('  function lyricArea('),app.indexOf('  function drawLyrics(')),box);
const guide=nodes.lyricBoundaryGuide;
assert(guide.hidden);
for(const [id,axis]of [['lyricWidth','x'],['lyricHeight','y']]){
 for(const stop of ['pointerup','pointercancel','blur','presetsapplied']){
  nodes[id].handlers.pointerdown({button:0,pointerId:7});assert(!guide.hidden);assert.equal(guide.dataset.axis,axis);
  box.updateBoundaryGuide(box.lyricArea(600,.3));assert.equal(guide.style.left,'570px');
  if(stop==='pointerup'){listeners.pointerup({pointerId:8});assert(!guide.hidden);}
  listeners[stop]({pointerId:7});assert(guide.hidden,stop+' hides immediately');
 }
}
nodes.lyricWidth.handlers.pointerdown({button:0,pointerId:7});nodes.panel.hidden=true;box.updateBoundaryGuide(box.lyricArea(600,.3));assert(guide.hidden);nodes.panel.hidden=false;
const full=box.lyricLayout();box.typePrefs.lyricWidth=55;const narrow=box.lyricLayout();
assert(narrow.width<full.width);assert.equal(narrow.typeSize,full.typeSize,'boundaries never resize glyphs');
const words='ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT';
assert(narrow.wrap(words).length>=full.wrap(words).length);
assert.equal(narrow.wrap(words).join(' '),words,'no word splitting or loss');
const tall=box.lyricArea(600);box.typePrefs.lyricHeight=40;const short=box.lyricArea(600);
assert(short.top>tall.top&&short.bottom<tall.bottom);
assert.equal((short.top+short.bottom)/2,(tall.top+tall.bottom)/2,'both boundaries move symmetrically');
box.typePrefs.lyricHeight=140;const extended=box.lyricArea(600);assert(extended.top<tall.top&&extended.bottom>tall.bottom);
box.typePrefs.lyricPosition=62;const moved=box.lyricArea(600);assert.equal(moved.center,558);
box.L=400;box.pivotY=100;assert.equal(box.lyricArea(600).center,moved.center,'lamp height never relocates lyrics');
assert(box.lyricLayout().count>=1);
console.log('PASS: centered symmetric bounds, independent lamp/lyric positions, fixed glyph size, word wrap and pointer-only guides.');

assert(!app.includes("baseGap*typePrefs.lineGap/100*area.heightRatio"));assert(app.includes("const rowGap=count>1?requestedGap:0"));
