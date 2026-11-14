const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync('dist/demo-lyrics.js','utf8');
const corpus=new Function(source+';return DemoLyrics')();
const covers=corpus.albumSongs.slice(0,7);
assert.equal(corpus.songs.length,20);
assert.deepEqual(covers.map(s=>s.language),['en','zh','en','zh','en','zh','en']);
assert.equal(new Set(covers.map(s=>s.title)).size,7);
for(const [i,song]of covers.entries()){
 const original=corpus.songs.find(s=>s.title===song.title);
 assert.equal(song.lines.join(' '),original.lines.map(s=>i===0?s.toUpperCase():s).join(' '));
 assert(song.lines.every(s=>s.trim()));
}
assert(covers[0].lines.length>new Set(covers[0].lines).size,'retain repeated refrains');
const personal={lines:['这是我的歌词','保留这句'],current:1,draft:'未提交的编辑'};
assert.equal(corpus.migrate(personal,4),personal);
assert.deepEqual(corpus.migrate({lines:['THE WATER STILLS','BENEATH THE QUAY'],current:0},2).lines,covers[2].lines);
// Execute the app's real session functions across selections, modes and reloads.
const app=fs.readFileSync('dist/app.js','utf8');
const sessions=app.slice(app.indexOf('  let pageOffset='),app.indexOf('  function selectAlbum('));
function boot(storage=new Map()){
 const box={DemoLyrics:corpus,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 vm.createContext(box);
 vm.runInContext(`let mode='pure',albumIndex=0,lines=[],current=1,lineClock=0,transition=1,pendingLine=0;
 const textarea={value:''};const $=()=>textarea;function updateA11y(){}
 ${sessions}
 lyricsReady=true;
 this.api={select(i,m=mode){rememberLyrics();albumIndex=i;mode=m;loadLyrics();rememberLyrics();localStorage.setItem('shadowLyrics.album',String(i));},
 init(i=0){albumIndex=i;loadLyrics();rememberLyrics();},
 edit(){lines=['这是我的歌词','保留这句'];current=0;lineClock=2;textarea.value='未提交的编辑';rememberLyrics();},
 state(){return {lines:Array.from(lines),current,draft:textarea.value,clock:lineClock};}};`,box);
 return box.api;
}
const storage=new Map(),client=boot(storage);client.init();
for(let i=0;i<7;i++){client.select(i);assert.deepEqual(Array.from(client.state().lines),covers[i].lines);}
client.select(3);client.edit();client.select(4);client.select(3);
assert.deepEqual(Array.from(client.state().lines),personal.lines);assert.equal(client.state().draft,personal.draft);assert.equal(client.state().clock,2);
client.select(3,'combined');assert.deepEqual(Array.from(client.state().lines),covers[3].lines);
client.select(3,'pure');assert.deepEqual(Array.from(client.state().lines),personal.lines);
const refreshed=boot(storage);refreshed.init(3);assert.deepEqual(Array.from(refreshed.state().lines),personal.lines);
// Old shared corpus is replaced, never allowed to mask every cover again.
const oldSource=require('node:child_process').execFileSync('git',['show','3f8e904:dist/demo-lyrics.js'],{encoding:'utf8'});
const old=new Function(oldSource+';return DemoLyrics')();
const stale=new Map([['shadowLyrics.album','4'],['shadowLyrics.text.pure',JSON.stringify({lines:old.lines,current:9})]]);
const migrated=boot(stale);migrated.init(4);assert.deepEqual(Array.from(migrated.state().lines),covers[4].lines);assert(!stale.has('shadowLyrics.text.pure'));
const sharedPersonal=new Map([['shadowLyrics.album','2'],['shadowLyrics.text.pure',JSON.stringify(personal)]]);
const kept=boot(sharedPersonal);kept.init(2);assert.deepEqual(Array.from(kept.state().lines),personal.lines);kept.select(4);assert.deepEqual(Array.from(kept.state().lines),covers[4].lines);
console.log('PASS: demo corpus, persistence and migration.');
