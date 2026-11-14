// Sprite keyframes replace the former procedural 3D fixture. Never warp the
// original silhouette substantially, and keep the exact rest proportions.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={Image:class{},console};vm.createContext(box);
vm.runInContext(fs.readFileSync('dist/realistic-fixtures.js','utf8')+'\nthis.fixture=realisticFixtures;',box);
const at=box.fixture.poseFrame;
assert.deepEqual(JSON.parse(JSON.stringify(at(0))),{sx:1,sy:1,tilt:0});
for(let i=-100;i<=100;i++){
 const f=at(i/100),next=at((i+.01)/100);
 for(const key of ['sx','sy']){assert(f[key]>.98&&f[key]<1.02);assert(Math.abs(f[key]-next[key])<.0001);}
 assert(Math.abs(f.tilt)<.013);
}
const src=fs.readFileSync('dist/realistic-fixtures.js','utf8');
assert(src.includes("materials/lamp-classics-atlas.png"));assert(src.includes("materials/lamp-02-burgundy.png"));
assert(src.includes('ctx.drawImage(s.image,s.b.x,s.b.y,s.b.w,s.b.h,x,y,s.width,s.height)'));
assert(!src.includes('drawSolid'));
console.log('PASS: original PNG artwork, exact rest proportions, bounded continuous keyframes, no procedural 3D shell.');

const sourcePixels=new Uint8ClampedArray([80,90,100,0,120,130,140,90,245,245,245,200,70,80,90,255]);
const red=new Uint8ClampedArray(sourcePixels.length),blue=new Uint8ClampedArray(sourcePixels.length);
box.fixture.tintGlassPixels(sourcePixels,red,[255,110,80],1,4);
box.fixture.tintGlassPixels(sourcePixels,blue,[90,150,255],1,4);
for(let i=3;i<sourcePixels.length;i+=4){assert.equal(red[i],sourcePixels[i]);assert.equal(blue[i],sourcePixels[i]);}
assert(red[4]>blue[4]);assert(blue[6]>red[6]);
assert(Math.abs(red[8]-red[10])<20,'specular highlights stay almost neutral');
assert.deepEqual([...sourcePixels.slice(0,4)],[...red.slice(0,4)],'suspension remains original');
console.log('PASS: glass hue follows light, exact alpha retained, neutral suspension and protected highlights.');
