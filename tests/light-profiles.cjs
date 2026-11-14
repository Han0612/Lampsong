const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const box=vm.createContext({});vm.runInContext(fs.readFileSync('dist/light-profiles.js','utf8'),box);const beam=vm.runInContext('LampBeam',box);
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
for(let y=0;y<=100;y++)for(let x=0;x<=100;x++){
 const u=x/100,v=y/100,d=v*1.45,r=.115+.94*(1-Math.exp(-d*4.5)),q=u*1.42/r;
 const original=(.82*Math.exp(-1.7*q**2.75)+.18*Math.exp(-1.22*q*q))*smooth(d/.08)*Math.exp(-1.05*d-.77*d*d)*(1-smooth((v-.46)/.54))*(1-smooth((u-.48)/.52));
 assert(Math.abs(original-beam.sample('dome',u,v))<1e-12);
 for(const key of Object.keys(beam.profiles)){const value=beam.sample(key,u,v);assert(Number.isFinite(value)&&value>=0&&value<=1);assert.equal(value,beam.sample(key,-u,v));}
}
function halfWidth(key){const peak=beam.sample(key,0,.35);for(let u=0;u<1;u+=.001)if(beam.sample(key,u,.35)<peak*.5)return u;}
assert(halfWidth('modern')>halfWidth('dome')*1.1);assert(halfWidth('tube')<halfWidth('dome')*.9);
const footprints=Object.keys(beam.profiles).map(key=>Array.from({length:10},(_,i)=>beam.sample(key,.4,i/10).toFixed(5)).join(','));assert.equal(new Set(footprints).size,11);
console.log('PASS: original hemisphere preserved; twelve finite, symmetric beams; Disco shares red main profile; wide/narrow ordering.');

assert(halfWidth('red')<halfWidth('modern')*.85,'red dome must be visibly more gathered than thin disc');assert(halfWidth('red')>halfWidth('tube'),'red remains soft, not a narrow spotlight');

assert.deepEqual(beam.profiles.disco,beam.profiles.red);
