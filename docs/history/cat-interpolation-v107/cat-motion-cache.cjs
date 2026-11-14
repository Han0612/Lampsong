const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let worker,closed=0;const bitmap=()=>({width:288,height:192,close(){closed++;}});
class Worker{constructor(){worker=this;this.sent=[];}postMessage(m){this.sent.push(m);}terminate(){}}
const context={URL,console,queueMicrotask,Worker,OffscreenCanvas:function(){},document:{currentScript:{src:'https://example.test/cat-motion-smooth.js'}},location:{pathname:'/'},createImageBitmap:async()=>bitmap(),fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(16)})};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/cat-motion-smooth.js','utf8'),context);
const smooth=context.catMotionSmoothing;const im=key=>({catMotionKey:key,src:'blob:'+key,complete:true,naturalWidth:2304,naturalHeight:1536});const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const a=im('master');let rendered=smooth.draw(a,2,0,100);assert.equal(rendered.cell.position,2);
 rendered=smooth.draw(a,6,.2,100);assert.equal(rendered.cell.position,2,'first bake must hold one pose rather than play raw jumps');
 await flush();const first=smooth.entries.get('master'),epoch=first.epoch;
 worker.onmessage({data:{type:'ready',key:'master',epoch}});await flush();
 const texture=bitmap();worker.onmessage({data:{results:[{key:'master',epoch,texture,serial:1,position:6}]}});
 assert.equal(smooth.draw(a,6.3,.3,100).tile,texture);
 smooth.maxSources=1;smooth.draw(im('tap'),0,0,100);assert.equal(smooth.held.get('master').texture,texture);assert.equal(closed,0);
 rendered=smooth.draw(a,6.5,.4,100);assert.equal(rendered.tile,texture,'returning source must retain its last interpolated bitmap');
 const second=smooth.entries.get('master');assert.notEqual(second.epoch,epoch);
 const stale=bitmap();worker.onmessage({data:{results:[{key:'master',epoch,texture:stale,serial:2,position:0}]}});
 assert.equal(closed,1,'stale in-flight bitmap must be closed');assert.equal(second.current.texture,texture,'stale generation must not replace current image');
 worker.onmessage({data:{type:'ready',key:'master',epoch}});assert.equal(second.ready,false);
 worker.onmessage({data:{type:'ready',key:'master',epoch:second.epoch}});assert.equal(second.ready,true);
 smooth.fail();assert.equal(smooth.entries.size,0);assert.equal(smooth.held.size,0);assert.ok(closed>=2);
 console.log('PASS: blob keys, stable first bake, held interpolated frame, bounded sources, stale result/ready rejection, explicit bitmap release.');
})().catch(e=>{console.error(e);process.exitCode=1;});
