const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const box={};vm.createContext(box);vm.runInContext(fs.readFileSync('dist/disco-light.js','utf8')+';this.D=DiscoLight',box);
const f=box.D.operatingPoint;
assert.equal(f({automatic:true,playing:false}).level,.56);assert.equal(f({automatic:true,playing:true}).level,.7);
assert.equal(f({automatic:false,playing:false,speed:72}).speed,72);assert.equal(f({automatic:false,playing:true}).rhythm,false);
assert(f({automatic:true,playing:true,tempo:150}).speed>f({automatic:true,playing:true,tempo:70}).speed);
assert.equal(f({automatic:true,playing:false}).speed,8);
const app=fs.readFileSync('dist/app.js','utf8');assert(app.includes("$('discoSpeed').disabled=scene.discoAutoRotation"));assert(app.includes('power:baseBeamGain/compositeRhythm*state.brightness/80,strength:scene.discoStrength'));
console.log('PASS: Disco normal 70%, auto idle 56%, tempo-linked automatic speed, slow idle, manual speed preserved, spots retain independent strength.');

for(const automatic of [true,false]){
 assert.equal(f({automatic,playing:true,rhythmLight:true}).level,1,'rhythm light temporarily removes only Disco discount');
 assert.equal(f({automatic,playing:true,rhythmLight:false}).level,.7,'turning it off restores discount');
}
assert.equal(f({automatic:true,playing:false,rhythmLight:true}).level,.56,'silent idle keeps the existing 20% dimming');
assert(app.includes('rhythmLight:state.breath'));
console.log('PASS: all fixtures use the same rhythm light; Disco discount is transient, independent of auto rotation.');
