const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync('dist/app.js','utf8'),pixels=new Uint8ClampedArray(48*48*4);
for(let y=0;y<48;y++)for(let x=0;x<48;x++){let i=(y*48+x)*4;pixels.set(x<24?[220,70,40,255]:[40,100,220,255],i);}
const box={document:{createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})}};vm.createContext(box);
vm.runInContext('let coverPalette=[],discoColorClock=0,discoColorIndex=-1;'+app.slice(app.indexOf('  function coverColor('),app.indexOf('  const artURL='))+';coverColor({});this.palette=coverPalette;',box);
assert.equal(box.palette.length,36);assert(box.palette.some(c=>c[0]>c[2]));assert(box.palette.some(c=>c[2]>c[0]));
assert(app.includes("scene.lampStyle)==='disco'&&scene.discoColorCycle"));
const html=fs.readFileSync('dist/index.html','utf8');assert(/id="discoColorCycle" type="checkbox" checked/.test(html));
assert(!html.includes('id="lampPreviewNote"'));assert.equal((html.match(/class="lamp-selected-dot"/g)||[]).length,12);
console.log('PASS: spatial cover samples retain multiple local hues; Disco-only cycle; default-on control, no preview label, trailing selection dots.');
