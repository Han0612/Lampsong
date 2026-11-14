const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/app.js','utf8');
const box={};vm.createContext(box);
vm.runInContext(`
let lines=['A B C D E','F','G H'],current=1,pageOffset=0,previousPage=null;
let transition=1,pendingLine=0,lineClock=0;
const typePrefs={activeSize:112,regularSize:100},reduce={matches:false};
let motion='slide';const $=()=>({value:motion});
function updateA11y(){}function rememberLyrics(){}
const lyricLayout=()=>({count:3,wrap:s=>s.split(' ')});
${source.slice(source.indexOf('  function slideChunks('),source.indexOf("  $('nextLine')"))}
this.api={
 next(){transition=1;stepLine(1);},
 prev(){transition=1;stepLine(-1);},
 state(){return JSON.stringify({current,pageOffset});},
 rows(){return JSON.stringify(lyricRowsAt(lyricLayout(),(current-1+lines.length)%lines.length,pageOffset,motion==='slide').map(r=>[r.text,r.active]));},
 fade(){motion='fade';current=1;pageOffset=0;}
};`,box);
const api=box.api,rows=()=>JSON.parse(api.rows()),state=()=>JSON.parse(api.state());
assert.deepEqual(rows(),[['A',1],['B',0],['C',0]]);
const states=[api.state()];
for(const expected of ['B','C','D','E','F','G','H','A']){
 api.next();assert.equal(rows()[0][0],expected);states.push(api.state());
}
for(let i=states.length-2;i>=0;i--){api.prev();assert.equal(api.state(),states[i]);}
api.fade();api.next();assert.deepEqual(state(),{current:1,pageOffset:3});
assert.deepEqual(rows(),[['D',1],['E',1],['F',0]]);
console.log('PASS: one visual row per step, wrap continuations, three-row fill, backward symmetry, whole-corpus loop, fade pagination retained.');
