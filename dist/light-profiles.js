// All fixtures share the same projection/illumination coordinates. Only their
// aperture distribution changes, so particles and cat placement see the light
// that is actually painted. The hemisphere is the approved original profile.
const LampBeam=(()=>{
  const smooth=n=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
  const profiles={
    dome:{width:1,growth:4.5,neck:.115,power:2.75,core:1.7,halo:.18,haloFall:1.22,fall:1.05,depthFall:.77},
    modern:{width:1.24,growth:5.2,neck:.14,power:3.1,core:1.7,halo:.16,haloFall:1.3,fall:1.04,depthFall:.77},
    red:{width:.96,growth:4.4,neck:.12,power:2.65,core:1.7,halo:.26,haloFall:1.12,fall:1.02,depthFall:.78},
    glass:{width:1.04,growth:4.1,neck:.13,power:2.1,core:1.9,halo:.48,haloFall:.73,fall:1.0,depthFall:.79},
    tube:{width:.76,growth:3.8,neck:.09,power:4,core:1.6,halo:.09,haloFall:1.6,fall:.84,depthFall:.74},
    vintage:{width:.91,growth:2.9,neck:.11,power:3,core:1.65,halo:.19,haloFall:1.22,fall:.95,depthFall:.76},
    capsule:{width:.84,growth:3.4,neck:.095,power:2.7,core:1.7,halo:.16,haloFall:1.30,fall:.78,depthFall:.72}
  };
  // Material and aperture, kept in the same illumination coordinate system.
  const variants={ph5:['vintage',{width:1.1,halo:.28}],caravaggio:['dome',{width:.85,halo:.10}],gubi1965:['dome',{width:1.02}],jazz:['capsule',{width:.74}],disco:['red',{}]};
  for(const [key,[base,overrides]]of Object.entries(variants))profiles[key]={...profiles[base],...overrides};
  function sample(key,u,v){
    const p=profiles[key]||profiles.dome,depth=v*1.45,lateral=Math.abs(u)*1.42;
    let radius=(p.neck+.94*(1-Math.exp(-depth*p.growth)))*p.width;
    if(key==='vintage')radius+=.13*Math.exp(-Math.pow((depth-.58)/.30,2));
    // Capsule opens gradually from its small mouth, without an early oval bulge.
    const distance=lateral/Math.max(.02,radius);
    const core=Math.exp(-p.core*Math.pow(distance,p.power)),halo=Math.exp(-p.haloFall*distance*distance);
    const axial=Math.exp(-p.fall*depth-p.depthFall*depth*depth);
    return ((1-p.halo)*core+p.halo*halo)*smooth(depth/.08)*axial*(1-smooth((v-.46)/.54))*(1-smooth((Math.abs(u)-.48)/.52));
  }
  const cache=new Map();
  function buffer(key,w=480,h=640){
    const id=key+':'+w+':'+h;if(cache.has(id))return cache.get(id);
    const out=new Float32Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const random=Math.sin(x*12.9898+y*78.233)*43758.5453,noise=random-Math.floor(random)-.5;
      out[y*w+x]=sample(key,(x/(w-1)-.5)*2,y/(h-1))*(1+.035*noise);
    }
    cache.set(id,out);return out;
  }
  return {profiles,sample,buffer};
})();
