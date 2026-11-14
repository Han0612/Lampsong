const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sent=[];let worker;const box={Intl,Worker:class{constructor(){worker=this;}postMessage(m){sent.push(m);}terminate(){}},OffscreenCanvas:class{}};
vm.createContext(box);vm.runInContext(fs.readFileSync('dist/caster.js','utf8')+';this.P=LetterProjector;',box);const p=new box.P();
let visible=[];p.spreadTexture=part=>part.texture;
const ctx={save(){},restore(){},translate(){},transform(){},drawImage(t){visible.push(t.label);}};
const mask={width:400,height:120,inkHeight:96,referenceHeight:96,pad:12,pixels:new Uint8ClampedArray(400*120*4),sampleX:2};
const shade={softness:0,projection:'parallel',trail:100,lean:0,contact:0,density:90,fan:0,blurStart:14,blurSpan:74,fadeStrength:45};
const row=text=>({text,rootY:200,layout:{mode:'pure',dimensions:{mask,width:700,inkScale:1},anchorHeight:130,bakeMaxWidth:Infinity,anchorRatio:.4,shade,opacity:1,edge:1,bodyHeight:130,referenceDistance:270,plateLength:240,fanReferenceWidth:800,pixelRatio:2,tone:0}});
const source={x:700,y:0,heightScale:1};const draw=labels=>{visible=[];const ready=p.drawRows(ctx,labels.map(row),700,source,2);return{ready,visible};};
const complete=()=>{const request=sent.at(-1),job=p.pending.get(request.id);worker.onmessage({data:{id:request.id,parts:[{texture:{width:1200,height:320,label:job.key.split('|')[0],close(){}},heightRatio:1,fullWidth:600,highResolution:true}]}});};
assert.deepEqual(draw(['A','B']),{ready:false,visible:[]});complete();assert.deepEqual(draw(['A','B']),{ready:false,visible:[]});complete();assert.deepEqual(draw(['A','B']),{ready:true,visible:['A','B']});
assert.deepEqual(draw(['C','D']),{ready:false,visible:['A','B']});complete();assert.deepEqual(draw(['C','D']),{ready:false,visible:['A','B']});complete();assert.deepEqual(draw(['C','D']),{ready:true,visible:['C','D']});
p.fontReady=false;assert.deepEqual(draw(['E','F']),{ready:false,visible:['C','D']});p.fontReady=true;
p.cache.clear();assert.deepEqual(draw(['C','D']),{ready:false,visible:['C','D']});complete();complete();assert.deepEqual(draw(['C','D']),{ready:true,visible:['C','D']});
// Rapid slider changes discard obsolete queued fields, without affecting visible text.
draw(['E','F']);draw(['G','H']);assert([...p.pending.values()].every(j=>!j.key.startsWith('F|')));assert.equal(p.presentationRows[0].text,'C');
console.log('PASS: complete row sets commit atomically; no draft pixels, mixed old/new rows, fallback fonts, or stale slider queue.');
