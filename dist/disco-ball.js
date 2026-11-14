// A real rotating, flat-faceted 3D mirror mesh. One small GPU surface is shared
// by the scene and thumbnails; no sequence frames or frame-rate-dependent phase.
const DiscoBall=(()=>{
 let surface,gl,program,buffer,count,failed=false,last='',softwareCanvas,softwareMesh;
 const clamp=n=>Math.max(0,Math.min(1,n));
 const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform float phase;uniform float pitch;varying vec3 N;varying vec3 P;varying vec2 U;varying float G;
 void main(){float c=cos(phase),s=sin(phase);mat3 spin=mat3(c,0.,-s,0.,1.,0.,s,0.,c);float a=cos(pitch),b=sin(pitch);mat3 tilt=mat3(1.,0.,0.,0.,a,b,0.,-b,a);P=tilt*spin*position;N=tilt*spin*normal;U=uv;G=.82+.30*fract(sin(dot(normal,vec3(12.91,78.27,33.14)))*43758.5453);gl_Position=vec4(P.x*.91,P.y*.91,P.z*.25,1.);}`;
 const fragment=`precision highp float;varying vec3 N;varying vec3 P;varying vec2 U;varying float G;uniform vec3 tint;uniform float power;
 float box(vec3 d,vec3 axis,float k){return exp((dot(d,normalize(axis))-1.)*k);}
 void main(){vec3 n=normalize(N),v=normalize(vec3(0.,0.,4.)-P);vec3 r=reflect(-v,n);
 // A colored room reflected by each planar mirror. Broad colored sources
 // establish spherical volume; narrow white sources supply glass-like glints.
 vec3 env=vec3(.012,.017,.025)+vec3(.025,.034,.048)*smoothstep(-.7,.8,r.y);
 env+=vec3(1.8,1.9,2.)*box(r,vec3(-.55,.8,1.),28.);
 env+=vec3(.035,.75,1.6)*box(r,vec3(.8,.25,1.),12.);
 env+=vec3(1.4,.055,.55)*box(r,vec3(-.85,.02,1.),15.);
 env+=vec3(1.3,.42,.025)*box(r,vec3(-.15,-.8,1.),19.);
 env+=vec3(2.7,.8,1.8)*box(r,vec3(.8,.8,1.),220.);
 env+=vec3(.8,1.8,3.)*box(r,vec3(-1.,-.1,.8),260.);
 env+=vec3(.15,.12,.8)*box(r,vec3(.35,.75,-.5),9.);
 env+=vec3(1.15,1.2,1.25)*(1.-smoothstep(.07,.115,abs(r.x+.34)))*smoothstep(-.15,.1,r.y)*(1.-smoothstep(.72,.9,r.y));
 env+=tint*.18*box(r,vec3(.1,-.2,1.),6.);
 float sun=box(r,vec3(-.55,.7,1.),390.);env+=vec3(4.5)*sun;
 // Face-on facets receive more of the room; the lower rear falls naturally dark.
 float volume=.38+.62*pow(max(0.,n.z),.42);
 env*=volume*(.87+.13*n.y)*G;
 float edge=min(min(U.x,1.-U.x),min(U.y,1.-U.y));float seam=smoothstep(.018,.055,edge);
 vec3 col=mix(vec3(.008,.012,.02),env,seam);col+=vec3(.085)*exp(-pow((edge-.045)/.017,2.));
 float fres=pow(1.-max(0.,dot(n,v)),5.);col+=vec3(.045,.07,.095)*fres;
 col=pow(col/(col+vec3(.48)),vec3(.4545));gl_FragColor=vec4(col*clamp(power,0.,1.),1.);}`;
 function init(){
  surface=document.createElement('canvas');surface.width=surface.height=288;
  gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true,depth:true});if(!gl)throw Error('WebGL unavailable');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const vertices=[],rings=24,segments=48;
  const point=(lat,lon)=>[Math.sin(lat)*Math.sin(lon),Math.cos(lat),Math.sin(lat)*Math.cos(lon)];
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
   const a=i*Math.PI/rings,b=(i+1)*Math.PI/rings,c=j*2*Math.PI/segments,d=(j+1)*2*Math.PI/segments;
   const jitter=(Math.sin(i*87.73+j*45.19)*43758.5453)%1*.034;
   const corners=[point(a,c),point(b,c),point(b,d),point(a,d)],normal=point((a+b)/2+jitter,(c+d)/2+jitter*.7),uv=[[0,1],[0,0],[1,0],[1,1]];
   for(const k of [0,1,2,0,2,3])vertices.push(...corners[k],...normal,...uv[k]);
  }
  count=vertices.length/8;buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  for(const [name,size,offset] of [['position',3,0],['normal',3,12],['uv',2,24]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,32,offset);}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.GREATER);gl.clearDepth(0);gl.clearColor(0,0,0,0);
  surface.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;});
 }
 const softLights=[
  [-.55,.8,1,28,1.8,1.9,2.], [.8,.25,1,12,.035,.75,1.6],
  [-.85,.02,1,15,1.4,.055,.55],[-.15,-.8,1,19,1.3,.42,.025],
  [.35,.75,-.5,9,.15,.12,.8],[.8,.8,1,220,2.7,.8,1.8],[-1,-.1,.8,260,.8,1.8,3.],[-.55,.7,1,390,4.5,4.5,4.5]
 ].map(([x,y,z,k,...rgb])=>{const l=Math.hypot(x,y,z);return[x/l,y/l,z/l,k,...rgb];});
 const toneMap=v=>Math.round(Math.pow(Math.max(0,v)/(Math.max(0,v)+.48),.4545)*255);
 function software(phase,pitch,color,power){
  if(!softwareCanvas){softwareCanvas=document.createElement('canvas');softwareCanvas.width=softwareCanvas.height=256;}
  if(!softwareMesh){softwareMesh=[];const rows=20,cols=40,point=(a,b)=>[Math.sin(a)*Math.sin(b),Math.cos(a),Math.sin(a)*Math.cos(b)];
   for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*Math.PI/rows,b=(i+1)*Math.PI/rows,c=j*Math.PI*2/cols,d=(j+1)*Math.PI*2/cols,jitter=(Math.sin(i*87.73+j*45.19)*43758.5453)%1*.034;softwareMesh.push({n:point((a+b)/2+jitter,(c+d)/2+jitter*.7),p:[...point(a,c),...point(b,c),...point(b,d),...point(a,d)]});}}
  const g=softwareCanvas.getContext('2d'),r=116,tilt=pitch*.4+.08,ct=Math.cos(tilt),st=Math.sin(tilt),cs=Math.cos(phase),sn=Math.sin(phase);
  g.clearRect(0,0,256,256);g.fillStyle='#0e1520';g.beginPath();g.arc(128,128,r,0,Math.PI*2);g.fill();g.strokeStyle='#152031';g.lineWidth=.32;
  for(const face of softwareMesh){
   const raw=face.n,x=raw[0]*cs+raw[2]*sn,z0=raw[2]*cs-raw[0]*sn,y=raw[1]*ct-z0*st,z=raw[1]*st+z0*ct;if(z<.015)continue;
   const vl=Math.hypot(x,y,4-z),vx=-x/vl,vy=-y/vl,vz=(4-z)/vl,dot=x*vx+y*vy+z*vz,rx=2*dot*x-vx,ry=2*dot*y-vy,rz=2*dot*z-vz;
   const sky=clamp((ry+.7)/1.5),env=[.012+.025*sky,.017+.034*sky,.025+.048*sky];
   for(let i=0;i<softLights.length;i++){const l=softLights[i],v=Math.exp((rx*l[0]+ry*l[1]+rz*l[2]-1)*l[3]);for(let channel=0;channel<3;channel++)env[channel]+=l[4+channel]*v;}
   const strip=clamp((.115-Math.abs(rx+.34))/.045)*clamp((ry+.15)/.25)*clamp((.9-ry)/.18);
   const grain=Math.sin(raw[0]*12.91+raw[1]*78.27+raw[2]*33.14)*43758.5453;
   const volume=(.38+.62*Math.pow(Math.max(0,z),.42))*(.87+.13*y)*(.82+.3*(grain-Math.floor(grain))),fres=Math.pow(1-Math.max(0,dot),5);
   // The dynamic tint is a broad reflected source, not flat color painted on tiles.
   const tintLight=Math.exp(((rx*.1+ry*-.2+rz)/Math.sqrt(1.05)-1)*6)*.18;
   const rgb=env.map((v,k)=>toneMap((v+strip*[1.15,1.2,1.25][k]+color[k]/255*tintLight)*volume+[.045,.07,.095][k]*fres));
   // Apply rhythm after tone mapping, preserving opaque mirror geometry.
   const [red,green,blue]=rgb.map(v=>Math.round(v*clamp(power)));
   g.beginPath();const points=face.p;
   for(let k=0;k<12;k+=3){const px=points[k]*cs+points[k+2]*sn,pz=points[k+2]*cs-points[k]*sn,py=points[k+1]*ct-pz*st;if(k===0)g.moveTo(128+px*r,128-py*r);else g.lineTo(128+px*r,128-py*r);}
   g.closePath();g.fillStyle=`rgb(${red},${green},${blue})`;g.fill();g.stroke();
  }return softwareCanvas;
 }
 function draw(ctx,{phase=0,pitch=0,color=[255,215,170],power=1}={}){
  try{if(!gl&&!failed){try{init();}catch{failed=true;}}const key=[phase,pitch,power,...color].map(x=>Math.round(x*1000)).join(':');
   if(!failed&&key!==last){gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'phase'),phase);gl.uniform1f(gl.getUniformLocation(program,'pitch'),pitch*.4+.08);gl.uniform1f(gl.getUniformLocation(program,'power'),power);gl.uniform3fv(gl.getUniformLocation(program,'tint'),color.map(v=>v/255));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,count);last=key;}
   if(failed&&key!==last){software(phase,pitch,color,power);last=key;}
   const picture=failed?softwareCanvas:surface;
   ctx.save();const opacity=ctx.globalAlpha;const metal=ctx.createLinearGradient(-3,0,3,0);metal.addColorStop(0,'#252a2c');metal.addColorStop(.4,'#c4c9c7');metal.addColorStop(1,'#252b2e');ctx.fillStyle=metal;ctx.fillRect(-2.4,-3,4.8,6);
   ctx.drawImage(picture,-35.2,-3.2,70.4,70.4);
   // Crisp glass glints ride the rotating facet highlights, never a full glow.
   const sparkle=Math.pow(Math.max(0,Math.sin(phase*32+.6)),18)*power;
   if(sparkle>.02){ctx.globalAlpha=opacity*Math.min(.9,sparkle);ctx.strokeStyle='#fff9e7';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(-17,7);ctx.lineTo(-17,16);ctx.moveTo(-21.5,11.5);ctx.lineTo(-12.5,11.5);ctx.stroke();}
   ctx.restore();return{rim:1,lensY:32,integratedLight:true};
  }catch(error){failed=true;console.warn('Mirror ball uses canvas fallback:',error.message);return null;}
 }
 return{draw};
})();
