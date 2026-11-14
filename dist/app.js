'use strict';
(async () => {
  const $ = id => document.getElementById(id);
  // Sync the decoded front artwork, including locally uploaded covers.
  $('cover').addEventListener('load',()=>{ $('backCover').src=$('cover').currentSrc||$('cover').src; });
  const canvas = $('scene');
  let ctx = canvas.getContext('2d', {alpha:false});
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rest=new SceneRest();
  const coverBackground=new CoverBackground();
  let lastScene=null;
  const state = {brightness:100,swing:swingDefault('pure'),shadow:30,protect:true,dust:true,moths:true,breath:!reduce.matches,auto:false,rhythmSwing:false};
  const sceneDefaults={...lightModeDefaults('pure'),...catPlacementDefaults('pure'),catFollowLight:true,catDarkness:100,...catOpacityDefaults('pure'),insectKind:'butterfly',lampStyle:'modern',lampRealistic:true,lampHeight:10,coverBackground:true,coverBlur:24,coverDim:86,magicColor:true,discoColorCycle:true,discoRotation:true,discoAutoRotation:true,discoSpeed:35,discoStrength:70,rhythmStrength:50,dustSize:100,dustDensity:100,butterflies:2};
  const scene={...sceneDefaults};
  let previewLamp=null;
  function setLampPreview(style){previewLamp=style;}
  let fixtureWeights=null,fixtureFrom=null,fixtureTarget=null,fixtureProgress=1;
  function updateFixtureBlend(dt){
    const key=previewLamp||scene.lampStyle;
    if(!fixtureWeights||reduce.matches){fixtureWeights={[key]:1};fixtureTarget=key;fixtureProgress=1;return;}
    if(key!==fixtureTarget){fixtureFrom={...fixtureWeights};fixtureTarget=key;fixtureProgress=0;}
    if(fixtureProgress>=1)return;
    fixtureProgress=Math.min(1,fixtureProgress+dt/.32);
    const t=fixtureProgress*fixtureProgress*(3-2*fixtureProgress),next={};
    for(const k of new Set([...Object.keys(fixtureFrom),key])){const value=(fixtureFrom[k]||0)*(1-t)+(k===key?t:0);if(value>0)next[k]=value;}
    fixtureWeights=next;
  }

  function showScene(){
    for(const [id,value] of Object.entries(scene)){
      if(id==='lampRealistic')continue;
      if(typeof value==='boolean')$(id).checked=value;
      else $(id).value=value;
      if(typeof value==='number')$(id+'Out').textContent=value+(id==='coverBlur'?'':id==='butterflies'?' 只':id.startsWith('catStay')?' 秒':'%');
    }
    $('magicColorInfo').hidden=!scene.magicColor;
    $('coverBackgroundControls').hidden=!scene.coverBackground;
    syncDiscoControls();
  }
  function syncDiscoControls(){
    const active=scene.lampStyle==='disco';
    $('discoSpeed').disabled=scene.discoAutoRotation;
    $('discoControls').hidden=!active;$('discoRotationToggle').hidden=!active;
    $('discoRotationToggle').setAttribute('aria-pressed',String(scene.discoRotation));
    const label=scene.discoRotation?'关闭灯球旋转':'开启灯球旋转';
    $('discoRotationToggle').dataset.tooltip=label;$('discoRotationToggle').setAttribute('aria-label',label);
  }
  showScene();
  $('discoColorCycle').onchange=e=>{scene.discoColorCycle=e.target.checked;lightDirty=true;};
  $('coverBackground').onchange=e=>{scene.coverBackground=e.target.checked;$('coverBackgroundControls').hidden=!scene.coverBackground;};
  $('magicColor').onchange=e=>{scene.magicColor=e.target.checked;lightDirty=true;$('magicColorInfo').hidden=!scene.magicColor;};
  $('catFollowLight').onchange=e=>{scene.catFollowLight=e.target.checked;};
  for(const id of ['lampStyle','insectKind'])$(id).onchange=e=>{scene[id]=e.target.value;syncDiscoControls();};
  for(const id of ['coverBlur','coverDim','lampHeight','discoSpeed','discoStrength','beamRange','lightContrast','rhythmStrength','dustSize','dustDensity','butterflies'])$(id).oninput=()=>{scene[id]=Number($(id).value);if(id==='lampHeight')L=H*scene.lampHeight/100-Math.min(8,H*.008);showScene();};
  $('discoAutoRotation').onchange=e=>{scene.discoAutoRotation=e.target.checked;syncDiscoControls();};
  $('discoRotation').onchange=e=>{scene.discoRotation=e.target.checked;syncDiscoControls();};
  $('discoRotationToggle').onclick=()=>{$('discoRotation').checked=!scene.discoRotation;$('discoRotation').dispatchEvent(new Event('change',{bubbles:true}));};
  const projector = new LetterProjector();
  const paw=new CatPaw();
  const lyricTempo=new LyricTempo();
  const requestCat=kind=>{if(rest.on)paw.select(kind);};
  const variant=new URLSearchParams(location.search).get('variant');
  if(variant==='a'||variant==='b')paw.fixedVariant=variant;
  for(const [key,pose] of Object.entries(catPoses))$('catPose').add(new Option(pose.label,key));
  function refreshCatChoices(){
    for(const option of $('catPose').options){
      option.disabled=option.value!=='random'&&!paw.hasReadyVariant(option.value);
    }
  }
  refreshCatChoices();
  window.addEventListener('siteassetready',event=>{
    if(!event.detail.startsWith('cat-motion/'))return;
    if(!rest.on)return;
    refreshCatChoices();
    if(paw.awaitingReady)paw.select(paw.choice);
    else if(!paw.path&&!paw.pending)paw.preloadNext().catch(()=>{});
    $('pawTrigger').setAttribute('aria-busy',String(paw.awaitingReady));
  });
  $('catPose').onchange=e=>requestCat(e.target.value);
  const trialPose=new URLSearchParams(location.search).get('cat');
  if(Object.hasOwn(catPoses,trialPose)){
    $('catPose').value=trialPose;
    paw.select(trialPose);
  }
  const catMenu=installCatMenu({button:$('pawTrigger'),poses:catPoses,reduced:reduce,
    onRandom:()=>requestCat('random'),onPose:key=>{$('catPose').value=key;requestCat(key);},
    currentPose:()=>paw.path?paw.poseKey:null});
  $('pawTrigger').setAttribute('aria-keyshortcuts','C Space');
  const catTypingTarget=target=>!!target?.closest?.('textarea,input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="url"],input[type="password"],input[type="tel"],input[type="number"],[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
  const catSpaceKey=e=>e.code==='Space'||e.key===' '||e.key==='Spacebar';
  let catSpacePressed=false;
  window.addEventListener('keydown',e=>{
    if(e.target?.closest?.('#catActionMenu'))return;
    if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||catTypingTarget(e.target)||document.querySelector('dialog[open]'))return;
    if(catSpaceKey(e)){
      // Capture before focused controls: Space belongs exclusively to the cat.
      e.preventDefault();e.stopImmediatePropagation();catSpacePressed=true;
      if(!e.repeat)$('pawTrigger').click();
      return;
    }
    if(e.defaultPrevented||e.repeat||e.key?.toLowerCase()!=='c')return;
    if(e.target?.closest?.('input,select'))return;
    e.preventDefault();$('pawTrigger').click();
  },true);
  window.addEventListener('keyup',e=>{
    if(!catSpaceKey(e)||!catSpacePressed)return;
    catSpacePressed=false;e.preventDefault();e.stopImmediatePropagation();
  },true);
  window.addEventListener('blur',()=>{catSpacePressed=false;});
  for(const id of ['catMinSize','catMaxSize','catEntryMin','catEntryMax','catStayMin','catStayMax','catDarkness','catFar','catOpacity']){
    $(id).oninput=e=>{
      scene[id]=Number(e.target.value);
      if(id==='catMinSize')scene.catMaxSize=Math.max(scene.catMinSize,scene.catMaxSize);
      if(id==='catMaxSize')scene.catMinSize=Math.min(scene.catMinSize,scene.catMaxSize);
      if(id==='catEntryMin')scene.catEntryMax=Math.max(scene.catEntryMin,scene.catEntryMax);
      if(id==='catEntryMax')scene.catEntryMin=Math.min(scene.catEntryMin,scene.catEntryMax);
      if(id==='catStayMin')scene.catStayMax=Math.max(scene.catStayMin,scene.catStayMax);
      if(id==='catStayMax')scene.catStayMin=Math.min(scene.catStayMin,scene.catStayMax);
      if(id==='catFar')scene.catOpacity=Math.max(scene.catOpacity,scene.catFar);
      if(id==='catOpacity')scene.catFar=Math.min(scene.catOpacity,scene.catFar);
      showScene();
      if(!paw.path&&!paw.pending)requestCat('random');
    };
  }
  $('catInspect').ontoggle=()=>{if($('catInspect').open&&!paw.path&&!paw.pending)requestCat('random');};
  const pendulum = new SuspendedLamp();
  const foreAft = new SuspendedLamp();
  const windowMotion=new WindowSuspension();
  const musicSway=new MusicSway();
  const coverSleeve=new RecordSleeve($('coverHandle'),$('sleeve'),reduce);
  const discoLight=new DiscoLight();
  let startY=0, grabbedPitch=0, grabbedYaw=0, gripDepth=0;
  function depthImpulse() {
    // Sample the off-centre hand contact once, then let gravity carry the swing.
    return (Math.random()<.5 ? -1 : 1)*(.24+.22*Math.random());
  }
  const breeze=new AmbientPulse(1.5,[1.8,3.1],[5.5,11],[.031,.056],true);
  const faintBreath=new AmbientPulse(4.5,[3.5,5.5],[9,18],[.012,.024]);
  let playbackStarted=false;
  const airPhase=Math.random()*2*Math.PI;
  const floatPrefs={...floatingDefaults};
  const projectedWavePrefs={...projectedWaveDefaults};
  const rowPrefs=lyricRowDefaults("pure");
  function showFloating(){
    for(const [key,value] of Object.entries({...floatPrefs,...projectedWavePrefs,...rowPrefs})){
      const input=$(key);if(typeof value==='boolean'){input.checked=value;continue;}input.value=value;
      $(key+'Out').textContent=typeof value==='string'?value.toUpperCase():value+(input.dataset.unit||'%');
      if(input.type==='range')input.style.setProperty('--range-fill',100*(value-Number(input.min))/(Number(input.max)-Number(input.min))+'%');
    }
    syncDockWave();
  }
  function syncDockWave(){ $('dockWave').checked=mode==='floating'?floatPrefs.floatWave:projectedWavePrefs.projectedWave; }
  $('dockWave').oninput=()=>{
    const control=$(mode==='floating'?'floatWave':'projectedWave');
    control.checked=$('dockWave').checked;
    control.dispatchEvent(new Event('input',{bubbles:true}));
  };
  for(const prefs of [floatPrefs,projectedWavePrefs,rowPrefs])for(const key of Object.keys(prefs))$(key).oninput=()=>{prefs[key]=typeof prefs[key]==='boolean'?$(key).checked:typeof prefs[key]==='string'?$(key).value:Number($(key).value);showFloating();};
  document.querySelectorAll('[data-float-reset]').forEach(button=>button.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    const group=button.closest('[data-float-group]');
    group.querySelectorAll('input').forEach(input=>{if(input.id in floatingDefaults)floatPrefs[input.id]=floatingDefaults[input.id];if(input.id in projectedWaveDefaults)projectedWavePrefs[input.id]=projectedWaveDefaults[input.id];});
    showFloating();presetControl.remember();toast('已恢复'+button.dataset.floatReset+'默认值');
  }));
  let mode = "pure", fontId = "misans", weight = 700;
  function showFaceControls(){
    syncDockWave();
    $('faceColors').hidden=mode==='pure';
    $('rowOpacityControls').hidden=mode!=='pure';$('rowBrightnessControls').hidden=mode==='pure';
    $('rowAppearanceNote').textContent=mode==='pure'?'仅调整投影浓淡，当前行与其他行平滑交接。':'100% 为原色，向左压暗、向右提亮；字面保持不透明。';
    for(const option of $('faceFinish').options){option.textContent=(mode==='floating'?{dark:'深墨色',darkTint:'浅魔法色 · 随封面',light:'柔白色',custom:'自定义'}:{dark:'暗',darkTint:'暗魔法色 · 随封面',light:'亮 · 跟随灯色',custom:'自定义'})[option.value];}
    $('floatingSettings').hidden=mode!=='floating';
    $('projectedSettings').hidden=mode==='floating';
    $('projectedWaveSettings').hidden=mode==='floating';
    $('projectedWaveAmplitudeLabel').textContent='上浮幅度';
    $('customColorRow').hidden=$('faceFinish').value!=='custom';
    $('lyricColorOut').textContent=$('lyricColor').value.toUpperCase();
  }
  $('faceFinish').onchange=$('lyricColor').oninput=$('lyricColor').onchange=showFaceControls;
  const albums = [
    {title:'夜航',color:[221,199,155],name:'暖沙',ink:'#e5c58f',base:'#252b29',lines:['THE WATER STILLS','BENEATH THE QUAY','ONE WINDOW WAKES','ACROSS THE BAY','A LANTERN DRIFTS','THE TIDE TURNS HOME']},
    {title:'潮汐',color:[152,200,193],name:'雾青',ink:'#afd1c7',base:'#152d32',lines:['海风经过无人的站台','你在潮声里慢慢走来','月光把名字写进深海','等一朵浪花替我告白','天色沉入安静的窗外','我们把时间轻轻打开']},
    {title:'暮色',color:[187,171,207],name:'灰紫',ink:'#ccbadb',base:'#2d283b',lines:['暮色落在你的肩上','风替我们收起了远方','留一扇窗等星光','也留一盏灯给过往','街道慢慢停止了回响','你是夜里温柔的方向']}
  ];
  let W=0,H=0,dpr=1,cx=0,pivotY=-15,L=180,theta=0,time=0,last=0;
  let dragging=false, dragMoved=false, dragStartX=0, grabOffset=0, pointerTime=0;
  let beatLevel=0, lightPower=1, lastAudioEnergy=0, pulse=0;
  let audioContext, analyser, spectrum, audioNode;
  const audio = new Audio();
  audio.loop = false;
  const surface = {};
  for (const [name,file] of Object.entries({floor:'receiver-grit',metal:'anodised-metal',lens:'lens-rings'})) {
    const img = new Image();
    img.onload=()=>{ surface[name] = img; };
    img.src=siteAsset('materials/'+file+'.png');
  }
  let albumIndex=0,lines=DemoLyrics.lines.slice(),current=1,transition=1,lineClock=0;
  let rgb=albums[0].color.slice(),target=rgb.slice(),coverInkRgb=rgb.slice(),lightDirty=true,colorTick=0;
  let lampX=0,lampY=0,lampHover=false,toastTimer;
  const light=document.createElement('canvas'); light.width=480;light.height=640;
  const lc=light.getContext('2d'), lightPixels=lc.createImageData(480,640), envelopes=new Float32Array(480*640);
  // Two cached half-exposure passes retain headroom through spatial attenuation.
  // The normal bitmap remains available for faint secondary cones.
  const radiance=document.createElement('canvas');radiance.width=480;radiance.height=640;
  const rc=radiance.getContext('2d'),radiancePixels=rc.createImageData(480,640);
  const smooth = n => { const u = Math.max(0, Math.min(1, n)); return u * u * (3 - 2 * u); };
  // Position and opacity share zero endpoint velocity and acceleration.
  // Bias below one puts peak speed earlier, giving the landing more time.
  function easeMotion(progress,bias=1) {
    const clamped=Math.max(0,Math.min(1,progress));
    const t=clamped/(bias+(1-bias)*clamped);
    return t*t*t*(10+t*(-15+6*t));
  }
  // Extra texture space lets the penumbra reach black beyond the visible core.
  const beamPaddingX=1.42,beamPaddingY=1.45;
  const quantizationNoise=new Float32Array(envelopes.length);
  let displayedRange=1,beamProfile='dome',beamFrom=null,beamTo=LampBeam.buffer('dome'),beamBlend=1,beamRevision=0,shapeTick=0;
  envelopes.set(beamTo);
  for(let y=0;y<640;y++)for(let x=0;x<480;x++){
    const random=Math.sin(x*12.9898+y*78.233)*43758.5453;
    quantizationNoise[y*480+x]=random-Math.floor(random)-.5;
  }
  function updateBeamProfile(dt){
    const key=previewLamp||scene.lampStyle;
    if(key!==beamProfile){beamProfile=key;beamFrom=envelopes.slice();beamTo=LampBeam.buffer(key);beamBlend=0;}
    if(beamBlend===1)return;
    beamBlend=reduce.matches?1:Math.min(1,beamBlend+dt/.55);shapeTick+=dt;
    if(shapeTick<1/30&&beamBlend<1)return;
    shapeTick=0;const t=smooth(beamBlend);
    for(let i=0;i<envelopes.length;i++)envelopes[i]=beamFrom[i]+(beamTo[i]-beamFrom[i])*t;
    beamRevision++;lightDirty=true;
  }
  // Prepare the remaining footprints during idle gaps, never a loading gate.
  const warmBeams=Object.keys(LampBeam.profiles).filter(k=>k!=='dome');
  function warmNextBeam(){const key=warmBeams.shift();if(!key)return;LampBeam.buffer(key);if(warmBeams.length)scheduleBeamWarm();}
  function scheduleBeamWarm(){if(window.requestIdleCallback)window.requestIdleCallback(warmNextBeam,{timeout:1500});else setTimeout(warmNextBeam,180);}
  scheduleBeamWarm();
  function buildLight() {
    const pixels = lightPixels.data,energy=radiancePixels.data;
    const peakColor=Math.max(...rgb);
    for (let i = 0; i < envelopes.length; i++) {
      const lightLevel = envelopes[i] * state.brightness / 80 * 1.20;
      const hotCenter = Math.pow(envelopes[i], 5) * 55 * 1.20;
      // Keep the dim reference/secondary bitmap, but do not use its clipped
      // peak for the main beam. At 100%, raw energy is at most 448.5 / channel.
      const peak=peakColor*lightLevel+hotCenter;
      const highlightScale=peak>255?255/peak:1;
      for (let channel = 0; channel < 3; channel++) {
        const raw=rgb[channel] * lightLevel + hotCenter;
        pixels[i * 4 + channel] = raw*highlightScale + quantizationNoise[i];
        energy[i * 4 + channel] = raw*.5 + quantizationNoise[i]*.5;
      }
      pixels[i * 4 + 3] = energy[i * 4 + 3] = 255;
    }
    lc.putImageData(lightPixels, 0, 0);
    rc.putImageData(radiancePixels, 0, 0);
    lightDirty = false;
  }
  function paintMainBeam(g,source,slope,width,height,gain){
    g.save();g.globalCompositeOperation='lighter';g.globalAlpha=Math.max(0,Math.min(1,gain));
    g.translate(source.x,source.y);g.transform(1,0,slope,1,0,0);
    // Clip only after attenuation and addition. No per-frame pixel loops, blur,
    // texture allocation, or exposure crossfade during lamp sway.
    g.drawImage(radiance,-width*.5,0,width,height);
    g.drawImage(radiance,-width*.5,0,width,height);
    g.restore();
  }
  const particles=Array.from({length:390},(_,i)=>({x:Math.random(),y:Math.random(),z:Math.random(),vx:0,phase:i*2.399}));
  const albumsArt = [
    ['Now or Never','Purrple Cat','night','Purrple_Cat_-_Now_or_Never_(album_cover).jpg'],
    ['In Search of Gold','Mouraine','isog','Mouraine_Isog_cover.jpg'],
    ['Nostalgia Moving\u00a0On','Purrple Cat','nostalgia','Purrple_Cat_-_Nostalgia_and_Moving_On_(album_cover).jpg'],
    ["Up All Night", "Purrple Cat", 'up-all-night', "Purrple_Cat_-_Up_All_Night_(album_cover).jpg"],
    ["Just Relax", "Purrple Cat", 'just-relax', "Purrple_Cat_-_Just_Relax_(album_cover).jpg"],
    ["Meet Me in St. Louis", "Judy Garland", 'st-louis', "St._Louis_Judy.jpg"],
    ["Blue Skies", "Bing Crosby", 'blue-skies', "A-481_Blue_Skies.jpg"]
  ];
  const additionalVerses=[
    ['The clock keeps quiet','Light slips through the blinds','One window is still awake','Rain beads on the sill','The eastern sky grows pale','I leave the lamp for you'],
    ['云停在低低的屋檐','风从书页间经过','杯底还留着午后的暖','我们把脚步放慢','远处的车声渐渐淡去','一整条街都在呼吸'],
    ['Tram wires hum above the street','A corner window catches gold','The evening train rolls in','Your coat is on the chair','The last door opens slowly','And all the dark feels close'],
    ['雨后的窗沿还很凉','一只鸟掠过屋脊','你抬头的那一刻','云影从墙上移开','蓝色越过整条街','晨光停在你的袖口']
  ];
  let albumRevision=0,coverPalette=[],discoColorClock=0,discoColorIndex=-1;
  function coverColor(image) {
    coverBackground.setImage(image);
    const swatch=document.createElement('canvas'); swatch.width=swatch.height=48;
    const g=swatch.getContext('2d'); g.drawImage(image,0,0,48,48);
    const pixels=g.getImageData(0,0,48,48).data;
    coverPalette=[];
    for(let y=4;y<48;y+=8)for(let x=4;x<48;x+=8){const i=(y*48+x)*4,c=Array.from(pixels.slice(i,i+3)),hi=Math.max(...c),lo=Math.min(...c);if(hi>45&&lo<230)coverPalette.push(c.map(v=>Math.round(65+175*v/Math.max(1,hi))));}
    discoColorClock=0;discoColorIndex=-1;
    const bins=new Map();
    for(let i=0;i<pixels.length;i+=4) {
      const c=[pixels[i],pixels[i+1],pixels[i+2]], hi=Math.max(...c),lo=Math.min(...c);
      if(pixels[i+3]<180||hi<38||lo>233)continue;
      const key=c.map(v=>v>>5).join(','),w=.3+(hi-lo)/Math.max(1,hi);
      const bin=bins.get(key)||[0,0,0,0];
      for(let j=0;j<3;j++)bin[j]+=w*c[j]; bin[3]+=w;bins.set(key,bin);
    }
    const best=[...bins.values()].sort((a,b)=>b[3]-a[3])[0];
    if(!best)return [210,208,200];
    const hi=Math.max(...best.slice(0,3));
    return best.slice(0,3).map(v=>Math.round(120+110*v/hi));
  }
  const artURL=file=>siteAsset(file.startsWith('https://')?file:'covers/'+file+'.jpg');
  const strip=document.querySelector('.album-choices');
  albumsArt.forEach((_,i)=>{
    const button=document.createElement('button');button.className='album-choice';
    button.dataset.album=i;strip.insertBefore(button,strip.querySelector('.upload'));
  });
  const choices=strip.querySelectorAll('.album-choice');
  choices.forEach((button,i)=>{
    button.style.backgroundImage='url('+artURL(albumsArt[i][2])+')';
    button.setAttribute('aria-label',albumsArt[i][0]+' / '+albumsArt[i][1]);
    button.onclick=()=>selectAlbum(i);
  });
  let pageOffset=0,previousPage=null;
  const lyricSessions=new Map(),coverDefaults=new Map();
  let personalLyrics=false;
  function installCoverDefault(i,doc){
    coverDefaults.set(i,doc);
    if(i!==albumIndex||!doc.lines||personalLyrics)return;
    const before=lines.join('\n'),draft=$('customLyrics').value;
    if(before===doc.lines.join('\n'))return;
    lines=doc.lines.slice();current=1;pageOffset=0;transition=1;pendingLine=0;lineClock=0;
    if(draft===before)$('customLyrics').value=lines.join('\n');
    updateA11y();refreshFont();rememberLyrics();
  }
  const readRequests=new Map();
  async function fetchCover(i){
    if(readRequests.has(i))return readRequests.get(i);
    const request=(async()=>{
      const response=await fetch('/api/cover-lyrics/'+i,{cache:'no-store',signal:AbortSignal.timeout(6000)});
      if(!response.ok)throw Error('无法读取这张封面的默认歌词');
      const doc=await response.json();
      installCoverDefault(i,doc);return doc;
    })();
    readRequests.set(i,request);
    try{return await request;}finally{readRequests.delete(i);}
  }
  const coverEditor={
    refresh(){fetchCover(albumIndex).catch(()=>{});},
    async prepare(){
      const i=albumIndex,title=albumsArt[i][0];
      const edited=$('customLyrics').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if(edited.length<2||edited.length>600||edited.some(s=>Array.from(s).length>2000))throw Error('请输入 2 至 600 句歌词，每句最多 2000 字');
      const doc=coverDefaults.get(i)||await fetchCover(i);
      if(i!==albumIndex)throw Error('封面已切换，请重新确认');
      return {i,title,lines:edited,revision:doc.revision};
    },
    async publish(doc,password){
      const response=await fetch('/api/cover-lyrics/'+doc.i,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lines:doc.lines,password,revision:doc.revision}),signal:AbortSignal.timeout(12000)});
      const result=await response.json();
      if(!response.ok){if(response.status===409)await fetchCover(doc.i);throw Error(result.error||'保存失败');}
      if(doc.i===albumIndex)personalLyrics=false;
      installCoverDefault(doc.i,{revision:result.revision,lines:doc.lines});
      if(doc.i===albumIndex)rememberLyrics();
    }
  };
  let lyricsReady=false;
  function lyricKey(){return 'shadowLyrics.text.v2.'+mode+'.'+albumIndex;}
  function rememberLyrics(){
    if(!lyricsReady)return;
    const data={personalLyrics,lines:lines.slice(),current,pageOffset,draft:$('customLyrics').value,clock:lineClock};
    lyricSessions.set(lyricKey(),data);
    try{localStorage.setItem(lyricKey(),JSON.stringify(data));}catch{}
  }
  function loadLyrics(){
    let saved=lyricSessions.get(lyricKey()),sharedKey=null;
    if(!saved)try{
      let raw=localStorage.getItem(lyricKey());
      if(!raw){
        // A personal draft from the shared-corpus release belongs only to
        // the last selected cover. Other covers recover their own old session.
        const lastAlbum=Number(localStorage.getItem('shadowLyrics.album'));
        const shared=lastAlbum===albumIndex?localStorage.getItem('shadowLyrics.text.'+mode):null;
        raw=shared||localStorage.getItem('shadowLyrics.text.'+mode+'.'+albumIndex);
        if(shared)sharedKey='shadowLyrics.text.'+mode;
      }
      saved=JSON.parse(raw);
    }catch{}
    if(saved?.personalLyrics!==false)saved=DemoLyrics.migrate(saved,albumIndex);
    const valid=saved&&Array.isArray(saved.lines)&&saved.lines.length>=2&&saved.lines.length<=600&&saved.lines.every(t=>typeof t==='string'&&Array.from(t).length<=2000)&&Number.isInteger(saved.current)&&saved.current>=0&&saved.current<saved.lines.length;
    lines=valid?saved.lines.slice():DemoLyrics.forAlbum(albumIndex).lines.slice();
    personalLyrics=Boolean(valid&&(saved.personalLyrics??!DemoLyrics.isBuiltIn(saved.lines)));
    const server=coverDefaults.get(albumIndex);
    const oldText=lines.join('\n');
    if(server?.lines&&!personalLyrics)lines=server.lines.slice();
    current=valid?saved.current%lines.length:1;pageOffset=valid?Math.max(0,Number(saved.pageOffset)||0):0;lineClock=valid&&Number.isFinite(saved.clock)?saved.clock:0;
    $('customLyrics').value=valid&&typeof saved.draft==='string'&&saved.draft!==oldText?saved.draft:lines.join('\n');
    transition=1;pendingLine=0;updateA11y();
    if(sharedKey)try{
      localStorage.setItem(lyricKey(),JSON.stringify({lines,current,pageOffset,draft:$('customLyrics').value,clock:lineClock}));
      localStorage.removeItem(sharedKey);
    }catch{}
  }
  function selectAlbum(i) {
    rememberLyrics();
    const revision=++albumRevision;
    albumIndex=i;
    const [name,artist,file,page]=albumsArt[i];
    const img=$('cover');
    img.crossOrigin='anonymous';
    img.onload=()=>{ if(revision===albumRevision){try{target=coverColor(img);}catch{}} };
    img.onerror=()=>{if(revision===albumRevision){img.alt=name+' · 封面暂未载入';$('colorName').textContent='封面暂未载入';}};
    img.src=artURL(file);img.alt=name+' 专辑封面';
    $('sleeveTitle').textContent=name;$('trackTitle').textContent=name;$('trackSub').textContent=artist+' · 示例歌词';
    $('artCredit').href='https://commons.wikimedia.org/wiki/File:'+page;
    $('artCredit').textContent=artist+' · 封面来源';$('artCredit').hidden=false;
    $('colorName').textContent=name;
    loadLyrics();lyricsReady=true;rememberLyrics();coverEditor.refresh();
    try{localStorage.setItem("shadowLyrics.album",String(i));}catch{}
    choices.forEach((b,j)=>b.setAttribute('aria-pressed',i===j));
    updateA11y();refreshFont();
  }
  function updateA11y(){$('accessibleLyrics').textContent=lines[(current-1+lines.length)%lines.length];}
  function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
  function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingQuality='high';cx=W*(document.body.classList.contains('scene-only')?.5:.64);document.documentElement.style.setProperty('--lamp-axis',cx+'px');pivotY=-14;L=H*scene.lampHeight/100-Math.min(8,H*.008);lightDirty=true;}
  window.addEventListener('resize',resize);
  let manualLamp=false,wasPlaying=false;
  function impulse(sign=1) {
    manualLamp=true;
    pendulum.kick(sign*(.27+state.swing*.003)*(reduce.matches?.4:1));
    foreAft.kick(sign*depthImpulse()*(.64+state.swing*.006)*(reduce.matches?.4:1));
  }
  const lamp=$('lamp');
  lamp.onpointerenter=()=>{lampHover=true;};
  lamp.onpointerleave=()=>{lampHover=false;};
  // Only unpressed mouse travel supplies a brush impulse. A shared budget
  // bounds repeated strokes regardless of pointer event frequency.
  let brushPoint=null,brushBudget=1;
  document.addEventListener('pointermove',e=>{
    if(!rest.on||reduce.matches||e.pointerType!=='mouse'||e.buttons||dragging||coverSleeve.grip){
      brushPoint=null;return;
    }
    const previous=brushPoint;
    brushPoint={x:e.clientX,y:e.clientY,t:e.timeStamp};
    const elapsed=previous?Math.max(1,e.timeStamp-previous.t):16;
    brushBudget=previous?Math.min(1,brushBudget+elapsed/550):1;
    const target=e.target.closest?.('#lamp,#coverHandle');
    if(!target||e.target.closest('.audition button,.audition-picker'))return;
    const tracked=previous&&elapsed<200;
    const dx=tracked?e.clientX-previous.x:e.movementX||0;
    const dy=tracked?e.clientY-previous.y:e.movementY||0;
    const travel=Math.hypot(dx,dy);
    if(!travel)return;
    const dose=Math.min(brushBudget,travel/36);
    brushBudget-=dose;
    const strength=dose*(.52+.48*Math.min(1,travel/Math.max(8,elapsed)));
    if(target===lamp){
      manualLamp=true;
      if(dx)pendulum.kick(.14*strength*dx/travel*(.55+state.swing/100));
      if(dy)foreAft.kick(.12*strength*dy/travel*(.55+state.swing/100));
    }else coverSleeve.brush(e.clientX,e.clientY,dx/travel,dy/travel,strength);
  },{passive:true});
  const pointerAngle=e=>Math.atan2(e.clientX-cx,Math.max(10,e.clientY-pivotY));
  lamp.onpointerdown=e=>{
    if(e.button!==0 || !e.isPrimary)return;
    manualLamp=true;dragging=true;dragMoved=false;dragStartX=e.clientX;pointerTime=e.timeStamp;
    startY=e.clientY;grabbedYaw=pendulum.angle;gripDepth=depthImpulse();grabbedPitch=foreAft.angle;foreAft.grab(grabbedPitch);
    grabOffset=pendulum.angle-pointerAngle(e);
    pendulum.grab(pendulum.angle);lamp.setPointerCapture(e.pointerId);
  };
  lamp.onpointermove=e=>{
    if(!dragging || !e.isPrimary)return;
    const limit=.48+state.swing*.0065;
    const targetAngle=Math.max(-limit,Math.min(limit,pointerAngle(e)+grabOffset));
    const dt=Math.max(.008,(e.timeStamp-pointerTime)/1000);
    pendulum.handSpeed=Math.max(-3,Math.min(3,(targetAngle-pendulum.target)/dt));
    const pitch=Math.max(-.7,Math.min(.7,grabbedPitch+(e.clientY-startY)/Math.max(90,L)*.86+(targetAngle-grabbedYaw)*gripDepth));
    foreAft.handSpeed=Math.max(-2.6,Math.min(2.6,(pitch-foreAft.target)/dt));
    foreAft.target=pitch;
    pendulum.target=targetAngle;pointerTime=e.timeStamp;
    if(Math.hypot(e.clientX-dragStartX,e.clientY-startY)>3){dragMoved=true;}
  };
  function release(e) {
    if(!dragging)return;
    if(e.type==='pointerup'&&dragMoved){
      const finalStep=Math.max(0,Math.min(.016,(performance.now()-last)/1000));
      pendulum.advance(finalStep,0);foreAft.advance(finalStep,0);last=performance.now();
    }
    dragging=false;pendulum.release();foreAft.release();
    if(e.type==='pointerup'&&!dragMoved){impulse(e.clientX>=cx?1:-1);}
    if(lamp.hasPointerCapture(e.pointerId))lamp.releasePointerCapture(e.pointerId);
  }
  lamp.onpointerup=lamp.onpointercancel=lamp.onlostpointercapture=release;
  lamp.onkeydown=e=>{
    if(['ArrowLeft','ArrowRight','Enter'].includes(e.key)){
      e.preventDefault();impulse(e.key==='ArrowLeft'?-1:1);
    }
  };
  let pendingLine=0;
  function slideChunks(layout,index){
    // All visible rows use one wrapping width before and after becoming active.
    return layout.wrap(lines[index],typePrefs.activeSize>=typePrefs.regularSize);
  }
  function lyricRowsAt(layout,index,offset,sliding){
    const {count,wrap}=layout;
    const chunks=sliding?slideChunks(layout,index):wrap(lines[index]);
    const lastOffset=sliding?chunks.length-1:Math.floor((chunks.length-1)/count)*count;
    offset=Math.max(0,Math.min(offset,lastOffset));
    const rows=chunks.slice(offset,offset+count).map((text,i)=>({
      text,index,part:offset+i,active:sliding?(i===0?1:0):1
    }));
    for(let n=1;n<=lines.length&&rows.length<count;n++){
      const nextIndex=(index+n)%lines.length;
      const next=sliding?slideChunks(layout,nextIndex):wrap(lines[nextIndex],false);
      if(!sliding&&next.length>count-rows.length)break;
      const available=next.slice(0,count-rows.length);
      available.forEach((text,i)=>rows.push({text,index:nextIndex,part:i,active:0}));
    }
    return rows.map((row,slot)=>({...row,slot,edge:1}));
  }
  function stepLine(step){
    if(transition<1){pendingLine+=step;return;}
    const layout=lyricLayout(),sliding=$('lyricMotion').value==='slide';
    const index=(current-1+lines.length)%lines.length;
    const chunks=sliding?slideChunks(layout,index):layout.wrap(lines[index]);
    const increment=sliding?1:layout.count;
    const lastOffset=sliding?chunks.length-1:Math.floor((chunks.length-1)/layout.count)*layout.count;
    pageOffset=Math.max(0,Math.min(pageOffset,lastOffset));
    previousPage={index,offset:pageOffset,step,waveClock:lineClock};
    if(step>0 && pageOffset+increment<chunks.length)pageOffset+=increment;
    else if(step<0 && pageOffset>0)pageOffset=Math.max(0,pageOffset-increment);
    else {
      current=(current+step+lines.length)%lines.length;
      const nextIndex=(current-1+lines.length)%lines.length;
      const next=sliding?slideChunks(layout,nextIndex):layout.wrap(lines[nextIndex]);
      pageOffset=step>0?0:sliding?next.length-1:Math.floor((next.length-1)/layout.count)*layout.count;
    }
    transition=reduce.matches?1:0;
    lineClock=0;updateA11y();rememberLyrics();
  }
  $('nextLine').onclick=$('advanceLine').onclick=()=>stepLine(1);
  $('backLine').onclick=$('previousLine').onclick=()=>stepLine(-1);
  function panel(open){UiMotion.show($('panel'),open,{duration:220,offset:8});$('settings').setAttribute('aria-expanded',open);if(open)$('closePanel').focus();else $('settings').focus();}
  $('settings').onclick=()=>panel(!UiMotion.isOpen($('panel')));$('closePanel').onclick=()=>panel(false);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('adminDialog').open&&!$('guideDialog').open){if(UiMotion.isOpen($('panel')))panel(false);}});
  function updateControls(){['brightness','swing'].forEach(id=>{$(id).value=state[id];});['protect','dust','moths','breath','auto','rhythmSwing'].forEach(id=>{$(id).checked=state[id];});$('brightnessOut').textContent=state.brightness+'%';$('swingOut').textContent=state.swing<40?'克制':state.swing<75?'适中':'明显';}
  ['brightness','swing'].forEach(id=>$(id).oninput=()=>{state[id]=+$(id).value;lightDirty=true;updateControls();});
  ['protect','dust','moths','breath','auto','rhythmSwing'].forEach(id=>$(id).onchange=()=>{state[id]=$(id).checked;if(id==='auto')lineClock=0;if(id==='rhythmSwing'){musicSway.reset();if(state.rhythmSwing){manualLamp=true;pendulum.stopped=false;pendulum.calming=false;}}});
  $('settle').onclick=()=>{state.rhythmSwing=false;$('rhythmSwing').checked=false;musicSway.reset();$('rhythmSwing').dispatchEvent(new Event('change',{bubbles:true}));manualLamp=true;pendulum.calm();foreAft.calm();toast('节奏摇摆已关闭，灯正在回稳');};
  $('reset').onclick=async()=>{const button=$('reset');button.disabled=true;try{await presetControl.reset();pendulum.stop();foreAft.stop();pendulum.stopped=foreAft.stopped=false;lightDirty=true;toast('已恢复当前模式的系统默认参数');}catch(error){toast(error.message);}finally{button.disabled=false;}};
  $('applyLyrics').onclick=()=>{const input=$('customLyrics').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(input.length<2){toast('请至少输入两句歌词');return;}if(input.some(s=>Array.from(s).length>2000)){toast('单句请控制在 2000 字内');return;}personalLyrics=true;pageOffset=0;lines=input.slice(0,600);current=1;transition=1;lineClock=0;pendingLine=0;refreshFont();updateA11y();rememberLyrics();toast('歌词已替换');};
  $('customLyrics').oninput=rememberLyrics;
  $('uploadButton').onclick=()=>$('coverFile').click();
  $('coverFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>15*1024*1024){toast('请选择 15 MB 以内的封面');return;}let url=URL.createObjectURL(file);try{++albumRevision;const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.drawImage(img,0,0,64,64);const pixels=g.getImageData(0,0,64,64).data,bins=new Map();for(let i=0;i<pixels.length;i+=4){const r=pixels[i],gr=pixels[i+1],b=pixels[i+2],max=Math.max(r,gr,b),min=Math.min(r,gr,b);if(pixels[i+3]<180||max<35||min>235)continue;const key=(r>>5)+','+(gr>>5)+','+(b>>5);const sat=(max-min)/Math.max(1,max),weight=.4+sat;let bin=bins.get(key)||{r:0,g:0,b:0,w:0};bin.r+=r*weight;bin.g+=gr*weight;bin.b+=b*weight;bin.w+=weight;bins.set(key,bin);}const best=[...bins.values()].sort((a,b)=>b.w-a.w)[0];const col=best?[best.r/best.w,best.g/best.w,best.b/best.w]:[195,191,179];const max=Math.max(...col);coverColor(img);target=col.map(v=>Math.round(Math.max(105,Math.min(238,(v/Math.max(1,max)*.65+.35)*223))));const out=document.createElement('canvas');out.width=out.height=600;const og=out.getContext('2d'),side=Math.min(img.width,img.height);og.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,600,600);$('cover').onload=null;$('artCredit').hidden=true;$('cover').src=out.toDataURL('image/jpeg',.90);$('cover').alt='上传的专辑封面';$('trackTitle').textContent=file.name.replace(/\.[^.]+$/,'').slice(0,18);$('sleeveTitle').textContent=$('trackTitle').textContent;$('trackSub').textContent='你的封面 / 示例歌词';$('colorName').textContent='从当前封面提取';document.querySelectorAll('.album-choice').forEach(b=>b.setAttribute('aria-pressed',false));toast('已提取封面颜色，灯光将缓慢过渡');}catch{toast('暂时无法读取这张图片，请尝试 JPG 或 PNG');}finally{URL.revokeObjectURL(url);e.target.value='';}};
  // The MiSans variable file's named instances use a 150–700 internal axis.
  // Regular and Bold retain their existing local static faces and preset keys.
  const miSansAxis={100:150,200:200,300:250,350:305,400:330,500:380,600:450,650:520,700:630,900:700};
  const founderFonts={
    'fz-lanting-bold':{family:'FZ Lanting Bold',label:'方正兰亭粗黑',weight:400},
    'fz-lanting-round':{family:'FZ Lanting Round',label:'方正兰亭圆 · 中粗',weight:400},
    'fz-ya-song':{family:'FZ Ya Song',label:'方正粗雅宋',weight:400},
    'fz-yue-song':{family:'FZ Yue Song',label:'方正清刻本悦宋',weight:400},
    'fz-qingyan-song':{family:'FZ Qingyan Song',label:'方正轻妍宋 · 粗体',weight:700},
    'fz-vdl-jianzhu-eb':{family:'FZ VDL Jianzhu ExtraBold',label:'方正VDL建筑黑 · 特粗',weight:800},
    'fz-vdl-jianzhu-sb':{family:'FZ VDL Jianzhu SemiBold',label:'方正VDL建筑黑 · 半粗',weight:650},
    'fz-da-ya-song':{family:'FZ Da Ya Song',label:'方正大雅宋',weight:400},
    'fz-te-ya-song':{family:'FZ Te Ya Song',label:'方正特雅宋',weight:400},
    'fz-fengya-song':{family:'FZ Fengya Song',label:'方正风雅宋',weight:400},
    'fz-lanting-extra-bold':{family:'FZ Lanting ExtraBold',label:'方正兰亭大黑',weight:400}
  };
  let fontLoadRevision=0;
  function refreshFont() {
    const fontTicket=++fontLoadRevision;
    const families={misans:'"MiSans", sans-serif',sans:'system-ui,sans-serif',serif:'"Songti SC","Times New Roman",serif',mono:'ui-monospace,monospace'};
    const variable=fontId==='misans'&&weight!==400&&weight!==700;
    const fixed=founderFonts[fontId];
    $('fontWeight').disabled=!!fixed;
    const face=fixed?fixed.weight+' 96px "'+fixed.family+'", sans-serif':variable?miSansAxis[weight]+' 96px "MiSans VF", sans-serif':weight+' 96px '+families[fontId];
    projector.font=face;
    wrapped.clear();projector.masks.clear();projector.cache.clear();
    if(fixed)$('fontStatus').textContent='正在加载 '+fixed.label+'…';
    document.fonts.load(face,'国Hx'+lines.join('')).then(fonts=>{
      if(projector.font!==face||fontTicket!==fontLoadRevision)return;
      wrapped.clear();projector.masks.clear();projector.cache.clear();
      $('fontStatus').textContent=fixed?(fonts.length?fixed.label+' · 原始字重':'字库未载入，暂用系统备用字体'):fontId==='misans'?(fonts.length?'MiSans · '+$('fontWeight').selectedOptions[0].textContent:'当前使用系统备用字体'):'使用设备字体';
    }).catch(()=>{$('fontStatus').textContent='字库暂不可用，使用系统备用字体';});
  }
  function setMode(m) {
    if(m!==mode){
      const index=(current-1+lines.length)%lines.length,clock=lineClock,oldOffset=pageOffset;
      rememberLyrics();mode=m;loadLyrics();
      current=(Math.min(index,lines.length-1)+1)%lines.length;pageOffset=oldOffset;lineClock=clock;updateA11y();
    }
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>presetControl.switchTo(b.dataset.mode));
  $('fontChoice').onchange=e=>{fontId=e.target.value;refreshFont();};
  $('fontWeight').onchange=e=>{weight=Number(e.target.value);refreshFont();};
  const auditionTempo=installAudition(audio,async ()=>{
    audioContext ||= new AudioContext();
    if(!analyser){
      analyser=audioContext.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.18;
      audioNode=audioContext.createMediaElementSource(audio);
      audioNode.connect(analyser);analyser.connect(audioContext.destination);
      spectrum=new Uint8Array(analyser.frequencyBinCount);
    }
    await audioContext.resume();
  },()=>{lastAudioEnergy=0;pulse=0;});
  const musicActive=()=>Boolean(analyser&&!audio.paused&&!audio.ended&&audio.readyState>=2);
  let discoBeat=0,discoLightLevel=.56;
  let rhythmLightEnabled=false,rhythmLightElapsed=.45,rhythmLightFrom=1;
  function updateRhythm(dt,ambientLevel) {
    if(!musicActive()){
      beatLevel=0;pulse=0;lastAudioEnergy=0;discoBeat=0;musicSway.reset();
      rhythmLightEnabled=false;
      lightPower+=(ambientLevel-lightPower)*(-Math.expm1(-dt*4));
      return 0;
    }
    const beatTime=audio.currentTime*auditionTempo()/60;
    let drive,attack=0,measuredEnergy=0;
    {
      analyser.getByteFrequencyData(spectrum);
      const bins=Math.max(2,Math.ceil(180*analyser.fftSize/audioContext.sampleRate));
      let energy=0;
      for(let i=1;i<=bins;i++)energy+=spectrum[i]/(255*bins);
      // Include accented piano, plucked notes and snare attacks on lighter tracks.
      const midEnd=Math.min(spectrum.length-1,Math.ceil(1800*analyser.fftSize/audioContext.sampleRate));
      let mid=0;
      for(let i=bins+1;i<=midEnd;i++)mid+=spectrum[i]/(255*(midEnd-bins));
      energy=.72*energy+.28*mid;
      const onset=Math.max(0,energy-lastAudioEnergy);
      attack=onset;measuredEnergy=energy;
      drive=Math.min(1,onset*5+energy*.45);
      const accent=Math.min(1,onset/(.038+.18*lastAudioEnergy));
      pulse=Math.max(accent,pulse*Math.exp(-dt/.16));
      lastAudioEnergy+= (energy-lastAudioEnergy)*(1-Math.exp(-dt*8));
    }
    beatLevel+=(drive-beatLevel)*(1-Math.exp(-dt*(drive>beatLevel?6:2.4)));
    const breathCycle=time/10+.14*Math.sin(time*.19);
    const envelope=Math.pow(.5+.5*Math.cos(breathCycle*2*Math.PI),3);
    const phase=beatTime-Math.floor(beatTime);
    const clockPulse=Math.exp(-phase*5.6);
    const audible=Math.min(1,lastAudioEnergy*4);
    // Real accents take precedence. The quieter metrical pulse keeps sustained
    // passages legible during playback.
    const accent=Math.max(pulse,.90*audible*clockPulse);
    discoBeat=accent;
    // v113: accents brighten, then fall back between beats. Keep its contrast
    // and fast attack/release; the light texture retains the higher ceiling.
    const glow=.45+.55*accent-.025*envelope;
    const contrast=.06+.94*scene.lightContrast/100;
    // Silence is the chosen brightness, not the old curve's dim idle plateau.
    const enabled=state.breath&&(measuredEnergy>1/255||lastAudioEnergy>.008);
    if(enabled!==rhythmLightEnabled){rhythmLightEnabled=enabled;rhythmLightFrom=lightPower;rhythmLightElapsed=0;}
    rhythmLightElapsed=Math.min(.45,rhythmLightElapsed+dt);
    const t=rhythmLightElapsed/.45,blend=t*t*(3-2*t);
    const rhythmTarget=ambientLevel*(enabled?1-(1-glow)*contrast:1);
    const target=Math.min(ambientLevel,rhythmLightFrom+(rhythmTarget-rhythmLightFrom)*blend);
    lightPower+=(target-lightPower)*(1-Math.exp(-dt*(target>lightPower?36:14)));
    if(reduce.matches||!state.rhythmSwing){musicSway.reset();return 0;}
    return musicSway.advance(dt,{time:audio.currentTime,tempo:auditionTempo(),energy:measuredEnergy,onset:attack,strength:scene.rhythmStrength??50},pendulum);
  }
  const fixtureScale=key=>({gubi1965:.85,tube:.9,jazz:1.1,ph5:1.1}[key]||1);
  function lampPose() {
    L=H*scene.lampHeight/100-Math.min(8,H*.008);
    const depth=Math.sin(foreAft.angle);
    const scale=1/(1-.13*depth);
    const along=scale*Math.cos(foreAft.angle);
    const dx=Math.sin(theta)*along,dy=Math.cos(theta)*along;
    return {x:cx+L*dx,y:pivotY+L*dy,dx,dy,scale,
      wallDistance:1+.90*depth};
  }
  const restLamp=document.createElement('canvas');
  function drawLamp(pose,visibility=1){
    const unlit=visibility<1;
    lampX=pose.x;lampY=pose.y;
    ctx.save();ctx.lineWidth=1;ctx.strokeStyle=unlit?'#26292c':'#51534d';ctx.beginPath();
    const cordTop=-Math.max(64,H*.12),cordX=cx+(cordTop-pivotY)*pose.dx/Math.max(.1,pose.dy);
    ctx.moveTo(cordX,cordTop);ctx.lineTo(lampX,lampY);ctx.stroke();
    ctx.translate(lampX,lampY);ctx.rotate(-theta);ctx.scale(pose.scale,pose.scale);
    const visibleLamp=previewLamp||scene.lampStyle;
    let body=ctx;
    if(unlit){
      // Dim the finished material once: fixture internals set their own alpha.
      // A bounded reusable surface keeps the complete body, without a lit rim.
      const size=Math.round(256*dpr);
      if(restLamp.width!==size||restLamp.height!==size){restLamp.width=restLamp.height=size;}
      body=restLamp.getContext('2d');body.setTransform(1,0,0,1,0,0);body.clearRect(0,0,size,size);
      body.setTransform(dpr,0,0,dpr,128*dpr,64*dpr);
    }
    for(const [key,opacity] of Object.entries(fixtureWeights||{[visibleLamp]:1})){
      if(opacity<.001)continue;
      body.save();body.globalAlpha=opacity;
      const bodyScale=fixtureScale(key);body.scale(bodyScale,bodyScale);
      const fixture=drawFixture(body,key,surface.metal,{realistic:true,yaw:theta,pitch:foreAft.angle,color:unlit?[186,192,200]:rgb,power:visibility===0?1:lightPower,time:reduce.matches?0:time,phase:discoLight.phase});
      if(visibility>0)drawFixtureLight(body,fixture,{color:'rgb('+rgb.map(Math.round).join(',')+')',power:lightPower,hover:lampHover,texture:surface.lens});
      body.restore();
    }
    if(unlit){ctx.globalAlpha=.16+.84*visibility;ctx.drawImage(restLamp,-128,-64,256,256);}
    ctx.restore();
    $('lamp').style.width=Math.max(76,visibleLamp==='red'?102:(fixtures[visibleLamp]?.width||54)+22)+'px';
    $('lamp').style.left=(lampX+20*pose.dx)+'px';$('lamp').style.top=(lampY+20*pose.dy)+'px';
  }
  function stageWidth() {
    return Math.min(W * .61, H * .80);
  }
  const typePrefs={lyricRows:3,tracking:0,regularSize:100,activeSize:112,lyricPosition:53,lineGap:100,lyricWidth:100,lyricHeight:100};
  function setTypography(id,value){
    const control=$(id);
    const low=id==='lyricRows'?2:Number(control.min);
    const high=id==='lyricRows'?6:Number(control.max);
    if(!Number.isInteger(value)||value<low||value>high)return;
    typePrefs[id]=value;control.value=String(value);
    if(id!=='lyricRows')$(id+'Out').textContent=value+'%';
    if(id==='lyricWidth'||id==='lyricHeight'){pageOffset=0;previousPage=null;transition=1;pendingLine=0;}
    if(id==='tracking'){
      // Express tracking relative to the source font's 96 px em.
      projector.tracking=value*.96;
      projector.cache.clear();projector.masks.clear();
    }
  }
  for(const id of Object.keys(typePrefs)){
    const key=id==='lyricRows'?'shadowLyrics.rows':'shadowLyrics.'+id;
    let saved=null;try{saved=localStorage.getItem(key);}catch{}
    setTypography(id,typePrefs[id]);
    if(saved!==null)setTypography(id,Number(saved));
    $(id).oninput=()=>{
      setTypography(id,Number($(id).value));
      try{localStorage.setItem(key,typePrefs[id]);}catch{}
    };
  }
  const shadeDefaults={projection:'parallel',contact:-2,fan:145,lean:0,trail:110,density:88,softness:100,blurStart:14,blurSpan:74,fadeStrength:45};
  const shade={...shadeDefaults};
  const units={contact:' px',fan:'%',lean:'°',trail:'%',density:'%',softness:'%',blurStart:'%',blurSpan:'%',fadeStrength:'%'};
  function showShade(){
    $('projection').value=shade.projection;
    $('blurStart').disabled=$('blurSpan').disabled=shade.softness===0;
    for(const key of Object.keys(units)){
      const value=shade[key];
      $(key).value=value;$(key+'Out').textContent=value+units[key];
    }
  }
  showShade();
  $('projection').onchange=e=>{shade.projection=e.target.value;showShade();};
  for(const key of Object.keys(units))$(key).oninput=()=>{shade[key]=Number($(key).value);showShade();};
  for(const id of ['wrapLyrics','lyricMotion']){
    const control=$(id),checkbox=control.type==='checkbox',key='shadowLyrics.shared.'+id;
    try{
      const value=localStorage.getItem(key);
      if(checkbox)control.checked=value!=='false';
      else control.value=value==='fade'?'fade':'slide';
    }catch{}
    control.onchange=()=>{
      pageOffset=0;transition=1;pendingLine=0;
      try{localStorage.setItem(key,checkbox?String(control.checked):control.value);}catch{}
    };
  }
  function lyricArea(width){
    const center=H*(typePrefs.lyricPosition??53)/100;
    const baseHeight=H*.58;
    const half=Math.max(1,Math.min(baseHeight*(typePrefs.lyricHeight??100)/200,center-H*.02,H*.98-center));
    return {left:cx-width/2,right:cx+width/2,top:center-half,bottom:center+half,center,heightRatio:half*2/baseHeight};
  }
  // Pure lyrics are the projected ink itself. Fit its cached ink envelope,
  // not the upright face's height; keep roots fixed while the lamp sways.
  function pureLyricPlacement(rows,typeSize,rowGap,area){
    const referenceDistance=H*.30;
    const plateLength=typeSize*(typePrefs.regularSize/100)*1.89*(state.protect?1:1.22);
    const anchorRatio=plateLength/(referenceDistance+plateLength);
    const lampKey=scene.lampStyle;
    const mouth=(lampKey==='disco'?69:(fixtures[lampKey]?.lensY||40))*fixtureScale(lampKey);
    const lightY=pivotY+H*scene.lampHeight/100-Math.min(8,H*.008)+mouth;
    const measures=rows.map(row=>{
      const dimensions=projector.dimensions(row.text,typeSize,Infinity);
      const band=projector.shadowBand(row.text,{dimensions,anchorHeight:typeSize,anchorRatio,bakeMaxWidth:Infinity,mode:'pure',shade});
      return {slot:row.slot,inkScale:dimensions.inkScale,band};
    });
    function bounds(first){
      let top=Infinity,bottom=-Infinity;
      for(const row of measures){
        const root=first+row.slot*rowGap;
        const throwRatio=Math.max(0,root-lightY)/Math.max(1,referenceDistance);
        const reach=throwRatio/(.8+.35*throwRatio);
        const height=plateLength*1.22*reach*shade.trail/100*row.inkScale;
        top=Math.min(top,root+shade.contact+height*row.band[0]);
        bottom=Math.max(bottom,root+shade.contact+height*row.band[1]);
      }
      return {top,bottom};
    }
    if(!measures.length)return {first:area.center,top:area.center,bottom:area.center};
    let low=-H*8,high=H*2;
    for(let i=0;i<24;i++){
      const middle=(low+high)/2,b=bounds(middle);
      if((b.top+b.bottom)/2<area.center)low=middle;else high=middle;
    }
    const first=(low+high)/2;
    return {first,...bounds(first)};
  }
  const boundaryGuide=$('lyricBoundaryGuide');
  let boundaryPointer=null;
  function hideBoundaryGuide(){boundaryPointer=null;boundaryGuide.hidden=true;}
  for(const [id,axis] of [['lyricWidth','x'],['lyricHeight','y']]){
    $(id).addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      boundaryPointer=e.pointerId;boundaryGuide.dataset.axis=axis;boundaryGuide.hidden=false;
    });
    $(id).addEventListener('lostpointercapture',hideBoundaryGuide);
  }
  for(const event of ['pointerup','pointercancel'])window.addEventListener(event,e=>{
    if(e.pointerId===boundaryPointer)hideBoundaryGuide();
  });
  window.addEventListener('blur',hideBoundaryGuide);
  window.addEventListener('presetsapplied',hideBoundaryGuide);
  function updateBoundaryGuide(area){
    if($('panel').hidden){hideBoundaryGuide();return;}
    if(boundaryPointer===null)return;
    Object.assign(boundaryGuide.style,{left:area.left+'px',top:area.top+'px',width:(area.right-area.left)+'px',height:(area.bottom-area.top)+'px'});
  }
  const wordBreaker=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'word'}):null;
  const lineMeasure=document.createElement('canvas').getContext('2d');
  let wrapKey='',wrapped=new Map();
  const albumArea=document.querySelector('.album-area');
  let layoutBounds='',usableWidth=0;
  function lyricLayout(){
    const requestedCount=Math.min(3,typePrefs.lyricRows);
    const baseGap=requestedCount===2?.147:.14;
    const typeSize=Math.min(44,H*.052,H*baseGap*.32);
    const immersive=document.body.classList.contains('scene-only');
    const bounds=[W,H,immersive].join('|');
    if(layoutBounds!==bounds){
      const axis=W*(immersive?.5:.64);
      const gutter=Math.max(12,W*.034);
      const left=immersive?0:albumArea.getBoundingClientRect().right;
      usableWidth=Math.max(1,2*(Math.min(axis-left,W-axis)-gutter));
      layoutBounds=bounds;
    }
    const width=Math.max(1,Math.min(usableWidth*(typePrefs.lyricWidth??100)/100,2*(Math.min(W*(immersive?.5:.64),W*(immersive?.5:.36))-12)));
    const area=lyricArea(width);
    const rowHeight=typeSize*Math.max(typePrefs.activeSize,typePrefs.regularSize)/100;
    const room=Math.max(0,area.bottom-area.top-rowHeight*1.8);
    let count=Math.max(1,Math.min(requestedCount,1+Math.floor(room/Math.max(1,H*baseGap*typePrefs.lineGap/100))));
    if(typeof mode!=='undefined'&&mode==='pure'){
      // A fixed font reference makes capacity independent of each lyric's words.
      // This affects only the number of rows, never glyph size or row spacing.
      for(count=requestedCount;count>1;count--){
        const reference=Array.from({length:count},(_,slot)=>({text:'国Hg',slot}));
        const fit=pureLyricPlacement(reference,typeSize,H*baseGap*typePrefs.lineGap/100,area);
        if(fit.top>=area.top-.01&&fit.bottom<=area.bottom+.01)break;
      }
    }
    const key=[mode,width,typeSize,typePrefs.activeSize,typePrefs.regularSize,projector.font,projector.tracking].join('|');
    if(key!==wrapKey){wrapped.clear();wrapKey=key;}
    function wrap(text,active=true){
      if(!$('wrapLyrics').checked)return [text];
      const size=active?typePrefs.activeSize:typePrefs.regularSize;
      const cacheKey=size+'|'+text;
      if(wrapped.has(cacheKey))return wrapped.get(cacheKey);
      function measure(row){
        lineMeasure.letterSpacing='0px';
        const m=projector.layoutRuns(lineMeasure,row);
        return (m.right-m.left+(mode==='pure'?m.totalSpacing*(typePrefs.regularSize/size-1):0))*typeSize*size/100*.48/m.referenceHeight;
      }
      const chunks=[];
      // Keep contractions, compounds, opening quotes and trailing punctuation attached.
      const groups=text.match(/(?:[“‘「『（(]*)(?:[A-Za-z0-9À-ž]+(?:['’-][A-Za-z0-9À-ž]+)*|[\p{Script=Han}]+|[^\s])(?:[，。！？、；：,.!?:;”’」』）)]*)|\s+/gu)||[];
      let row=[],space='';
      const value=parts=>parts.join('').trim();
      for(const group of groups){
        if(!group.trim()){space=' ';continue;}
        const units=wordBreaker&&/\p{Script=Han}/u.test(group)?Array.from(wordBreaker.segment(group),x=>x.segment):[group];
        const tokens=[];
        let opening='';
        for(const unit of units){
          if(/^[“‘「『（(]+$/u.test(unit)){opening+=unit;continue;}
          if(tokens.length&&(/^[呢吗吧呀啊嘛啦哦着了的]$/u.test(unit)||/^[，。！？、；：,.!?:;”’」』）)]+$/u.test(unit)))tokens[tokens.length-1]+=unit;
          else {tokens.push(opening+unit);opening='';}
        }
        if(opening)tokens.push(opening);
        for(const token of tokens){
          const part=space+token;
          if(row.length && measure(value([...row,part]))>width){
            chunks.push(row);row=[];
          }
          row.push(part);
          space='';
        }
      }
      if(row.length)chunks.push(row);
      if(chunks.length>=2){
        const last=chunks.pop(),previous=chunks.pop();
        let split=previous.length;
        const pair=[...previous,...last];
        if(measure(value(last))<width*.42){
          let best=Infinity;
          for(let i=previous.length;i>0;i--){
            const top=value(pair.slice(0,i)),bottom=value(pair.slice(i));
            const b=measure(bottom);
            if(b>width)break;
            const a=measure(top);
            const awkward=/[的地得把被与和在]$/u.test(top)||/^[的地得了着]/u.test(bottom);
            const score=Math.abs(a-b)+(awkward?width:0)-(/[，。！？,;:]$/u.test(top)?width*.3:0);
            if(score<best){best=score;split=i;}
          }
        }
        chunks.push(pair.slice(0,split),pair.slice(split));
      }
      const result=chunks.map(value);
      wrapped.set(cacheKey,result);
      return result;
    }
    return {count,baseGap,typeSize,width,area,wrap};
  }
  function drawLyrics(source,dt) {
    const motion=mode==='floating'?{on:floatPrefs.floatWave,amplitude:floatPrefs.floatWaveAmplitude,range:floatPrefs.floatWaveRange,softness:floatPrefs.floatWaveSoftness,speed:floatPrefs.floatWaveSpeed}:{on:projectedWavePrefs.projectedWave,amplitude:projectedWavePrefs.projectedWaveAmplitude,range:projectedWavePrefs.projectedWaveRange,softness:projectedWavePrefs.projectedWaveSoftness,speed:projectedWavePrefs.projectedWaveSpeed};
    const finish=$('faceFinish').value;
    let faceColor=mode==='floating'&&finish==='dark'?'#242622':$('lyricColor').value;
    if(mode==='floating'&&finish!=='custom')faceColor=projector.floatingInkColor(coverInkRgb,finish);
    else if(finish==='light'||finish==='darkTint'){
      const luma=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
      faceColor='#'+rgb.map(v=>{
        const channel=finish==='light'?139+v*.22:Math.max(6,Math.min(39,22+(v-luma)*.24));
        return Math.round(channel).toString(16).padStart(2,'0');
      }).join('');
    }
    const phase=easeMotion(transition,.82);
    const layout=lyricLayout();
    const {count,baseGap,typeSize}=layout;
    const area=layout.area;
    const requestedGap=baseGap*typePrefs.lineGap/100;
    const rowGap=count>1?requestedGap:0;
    const glyphHeight=typeSize*Math.max(typePrefs.activeSize,typePrefs.regularSize)/100*.61;
    let firstRoot=area.center/H-rowGap*(count-1)/2-glyphHeight/(2*H);
    updateBoundaryGuide(area);
    const sliding=$('lyricMotion').value==='slide';
    let rows=lyricRowsAt(layout,(current-1+lines.length)%lines.length,pageOffset,sliding);
    if(mode==='pure')firstRoot=pureLyricPlacement(rows,typeSize,H*rowGap,area).first/H;
    if(previousPage&&transition<1){
      const old=lyricRowsAt(layout,previousPage.index,previousPage.offset,sliding);
      if(mode==='pure'){
        const previousRoot=pureLyricPlacement(old,typeSize,H*rowGap,area).first/H;
        firstRoot=sliding?previousRoot+(firstRoot-previousRoot)*phase:(phase<.5?previousRoot:firstRoot);
      }
      if($('lyricMotion').value==='fade'){
        rows=(phase<.5?old:rows).map(r=>({...r,edge:Math.abs(2*phase-1)}));
      }else{
        const step=previousPage.step;
        const distance=step;
        const same=(a,b)=>a.index===b.index&&a.part===b.part&&a.text===b.text;
        const incoming=rows.map(r=>{
          const from=old.find(o=>same(o,r));
          const start=from?.slot??r.slot+distance;
          return {...r,slot:start+(r.slot-start)*phase,active:from?from.active+(r.active-from.active)*phase:r.active,edge:from?1:phase};
        });
        const outgoing=old.filter(o=>!rows.some(r=>same(o,r))).map(o=>({...o,slot:o.slot-distance*phase,edge:1-phase}));
        rows=[...outgoing,...incoming];
      }
    }
    // The projector uses one standing-letter height and the actual throw
    // to each row. Highlighting a lyric changes the face, not its light cone.
    const referenceDistance=H*.30;
    const plateLength=typeSize*(typePrefs.regularSize/100)*1.89*(state.protect?1:1.22);
    const anchorRatio=plateLength/(referenceDistance+plateLength);
    const jobs=rows.map(({text,active,slot,edge,index,part})=>{
      const bodyHeight=typeSize*(typePrefs.regularSize+active*(typePrefs.activeSize-typePrefs.regularSize))/100;
      const dimensions=projector.dimensions(text,bodyHeight,Infinity,mode==='pure'?typeSize*typePrefs.regularSize/100:bodyHeight);
      const rootY=H*(firstRoot+rowGap*slot);
      return {text,rootY,layout:{anchorHeight:typeSize,anchorRatio,referenceDistance,plateLength,
        mode,shade,floatPrefs,wave:motion.on&&!reduce.matches?{elapsed:index===(current-1+lines.length)%lines.length&&part===pageOffset?lineClock:previousPage&&transition<1&&index===previousPage.index&&part===previousPage.offset?(previousPage.waveClock||0)+lineClock:Infinity,amplitude:motion.amplitude,range:motion.range,softness:motion.softness,duration:6.2}:null,opacity:.97*edge*(mode==='pure'?(rowPrefs.rowOtherOpacity+active*(rowPrefs.rowCurrentOpacity-rowPrefs.rowOtherOpacity))/100:1),edge,tone:0,faceBrightness:(rowPrefs.rowOtherBrightness+active*(rowPrefs.rowCurrentBrightness-rowPrefs.rowOtherBrightness))/100,finish,faceColor,
        illumination:Math.min(1,dustIllumination(cx,rootY,source)),bodyHeight,dimensions,bakeMaxWidth:Infinity,fanReferenceWidth:stageWidth()*.58}};
    });
    projector.drawRows(ctx,jobs,cx,source,dpr);
  }
  function drawCats(source,dt,advance=true){
    if(advance)catMenu.sync();
    if((advance||!paw.pending)&&(paw.pending||paw.path))paw.update(ctx,source,W,H,cx,stageWidth(),dustIllumination,paw.sizeInRange(scene.catMinSize,scene.catMaxSize),scene.catDarkness,scene.catFar,scene.catOpacity,dt,paw.entryInRange(scene.catEntryMin,scene.catEntryMax),reduce.matches,scene.catStayMin,scene.catStayMax,scene.catFollowLight);
  }

  function dustIllumination(x,y,beam) {
    // Invert the same translation and shear used by the illuminated surface.
    const dy=y-beam.y;
    const u=(x-beam.x-beam.slope*dy)/beam.width+.5;
    const v=dy/beam.height;
    if(u<0||u>=1||v<0||v>=1)return 0;
    const ix=Math.round(u*(light.width-1)),iy=Math.round(v*(light.height-1));
    return envelopes[iy*light.width+ix]*beam.gain*state.brightness/80*1.20;
  }
  function drawDust(beam,dt) {
    if(!state.dust)return;
    const width=stageWidth()*1.6;
    ctx.save();
    ctx.fillStyle='rgb('+rgb.map(v=>Math.min(255,Math.round(v+36))).join(',')+')';
    const count=Math.round(particles.length*scene.dustDensity/200);
    for(let i=0;i<count;i++) {
      const p=particles[i];
      if(!reduce.matches){
        const dx=cx+(p.x-.5)*width-beam.x,dy=p.y*H-beam.y;
        const radius=Math.max(50,H*.15);
        const nearLamp=Math.exp(-(dx*dx+dy*dy)/(radius*radius));
        const wake=nearLamp*pendulum.speed*(L+40)*.40;
        p.vx+=(wake-p.vx)*(1-Math.exp(-dt*1.8));
        p.x=(p.x+dt*(p.vx+Math.sin(time*.35+p.phase)*(3+5*p.z))/width+1)%1;
        p.y=(p.y-dt*(3+10*p.z)/H+1)%1;
      }
      const x=cx+(p.x-.5)*width,y=p.y*H;
      const lit=dustIllumination(x,y,beam);
      if(lit<.012)continue;
      ctx.globalAlpha=Math.min(.72,lit*(.20+.56*p.z));
      const size=scene.dustSize/100;
      const radius=(.42+1.25*p.z)*size;
      const defocus=Math.min(1,Math.abs(p.z-.46)*2);
      if(defocus<.25){
        ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      }else{
        const r=radius*(1+defocus*2.3);
        const color=rgb.map(v=>Math.round(Math.min(255,v+36))).join(',');
        const haze=ctx.createRadialGradient(x,y,0,x,y,r);
        haze.addColorStop(0,'rgba('+color+',.72)');haze.addColorStop(.45,'rgba('+color+',.24)');haze.addColorStop(1,'rgba('+color+',0)');
        ctx.save();ctx.fillStyle=haze;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawForegroundDust(beam) {
    if(!state.dust)return;
    const spots=[[-.36,.31,.049],[.33,.20,.055],[-.42,.72,.072],[.40,.59,.045],[.29,.81,.06]];
    const width=stageWidth(),drift=reduce.matches?0:time;
    for(const [side,depth,radius] of spots.slice(0,Math.ceil(spots.length*Math.min(1,scene.dustDensity/100)))) {
      const x=cx+side*width+Math.sin(drift*.15+depth*9)*11;
      const y=H*depth+Math.cos(drift*.18+side)*9;
      const lit=dustIllumination(x,y,beam),r=width*radius*scene.dustSize/100;
      if(lit<.01)continue;
      ctx.save();ctx.globalAlpha=Math.min(1,lit*.55*Math.min(1,scene.dustDensity/100));
      const haze=ctx.createRadialGradient(x,y,0,x,y,r);
      const tint=rgb.map(Math.round).join(',');
      haze.addColorStop(0,'rgba('+tint+',.30)');
      haze.addColorStop(.52,'rgba('+tint+',.16)');
      haze.addColorStop(1,'rgba('+tint+',0)');
      ctx.fillStyle=haze;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();
    }
  }
  function drawInsects(beam) {
    if(!state.moths)return;
    const t=reduce.matches?0:time,width=stageWidth();
    const butterfly=scene.insectKind==='butterfly';
    for(let i=0;i<scene.butterflies;i++){
      const seed=i*2.399,phase=t*(.29+.04*(i%3))+seed;
      const drift=butterfly?0:Math.sin(t*2.7+seed)*width*.026;
      const x=cx+width*(.29*Math.sin(phase)+.13*Math.sin(1.73*phase+seed))+drift;
      const y=H*(.44+.22*Math.cos(phase*.91+seed)+.12*Math.sin(1.62*phase));
      const lit=Math.min(1,dustIllumination(x,y,beam));
      const size=1.02+.35*Math.cos(seed);
      ctx.save();ctx.translate(x,y);ctx.rotate(.48*Math.sin(phase+seed));ctx.scale(size,size);
      ctx.globalAlpha=.40+.60*lit;
      ctx.fillStyle=butterfly?'#fff':'#c3b398';
      const flap=.22+.78*Math.abs(Math.sin(t*((butterfly?5.2:11)+i*.17)+seed+.6));
      for(const sign of [-1,1]){
        ctx.save();ctx.scale(sign*flap,1);
        ctx.beginPath();ctx.moveTo(0,0);
        if(butterfly){
          ctx.bezierCurveTo(2,-3,7,-8,10,-7);ctx.bezierCurveTo(12,-5,9,-1,6,1);
          ctx.bezierCurveTo(10,3,6,7,3,6);ctx.quadraticCurveTo(1,5,0,1);
        }else{
          ctx.lineTo(7,-2);ctx.quadraticCurveTo(6,1,2,4);ctx.lineTo(0,2);
        }
        ctx.closePath();ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();ctx.ellipse(0,.7,.72,3,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  let captureRequested=false,captureBusy=false;
  window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'&&!e.altKey&&!e.shiftKey){e.preventDefault();if(!e.repeat&&!e.isComposing&&!captureBusy){captureBusy=true;captureRequested=true;}}});
  function captureScene(){
    // Snapshot the completed scene once, including lyrics and their shadows.
    // DOM interface/cover panels are outside this canvas and never exported.
    if(captureRequested){
      const shot=document.createElement('canvas');shot.width=canvas.width;shot.height=canvas.height;
      shot.getContext('2d').drawImage(canvas,0,0);captureRequested=false;
      shot.toBlob(blob=>{if(!blob){captureBusy=false;toast('画面保存失败，请重试');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
        const now=new Date(),pad=n=>String(n).padStart(2,'0');a.download='灯下词-'+now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'-'+pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds())+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);captureBusy=false;toast(rest.on?'已保存含歌词的氛围画面':'已保存关灯画面');},'image/png');
    }
  }
  function advanceRestLamp(dt,stamp){
    if(reduce.matches||document.hidden)windowMotion.reset();
    else windowMotion.sample(window,stamp,Math.max(80,L/pendulum.arm));
    if(document.hidden)return;
    for(const [bob,axis] of [[pendulum,'lateral'],[foreAft,'depth']]){
      const torque=windowMotion.torque(bob,axis);
      if(Math.abs(torque)>.02&&!dragging){bob.stopped=false;bob.calming=false;}
      bob.advance(dt,torque);
      if(bob.target===null&&Math.abs(torque)<.002&&Math.abs(bob.angle)+Math.abs(bob.speed)<.001)bob.stop();
    }
    theta=pendulum.angle;
  }
  $('lightToggle').onclick=()=>{
    if(!lastScene)return;
    rest.setOn(!rest.on,performance.now());
    document.body.classList.toggle('lights-out',!rest.on);
    $('lightToggle').setAttribute('aria-pressed',String(rest.on));
    const label=rest.on?'关灯':'开灯';$('lightToggle').setAttribute('aria-label',label);$('lightToggle').dataset.tooltip=label;
    brushPoint=null;
    lampHover=false;windowMotion.reset();musicSway.reset();manualLamp=true;
    if(dragging){dragging=false;pendulum.release();foreAft.release();}
    // Keep the current lyric phase and cat pose while the lamp is off.
    if(rest.on){last=performance.now();wasPlaying=musicActive();lastAudioEnergy=0;refreshCatChoices();if(paw.awaitingReady)paw.select(paw.choice);}
  };
  function renderScene(dt,stamp,unlit=false){
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    const pose=lampPose();
    const visibleLamp=previewLamp||scene.lampStyle;
    const mouth=Object.entries(fixtureWeights).reduce((sum,[key,w])=>sum+w*(key==='disco'?69:(fixtures[key]?.lensY||40))*fixtureScale(key),0);
    const source={x:pose.x+mouth*pose.dx,y:pose.y+mouth*pose.dy,
      heightScale:1/pose.wallDistance};
    // A fixed cone angle gives a footprint proportional to throw distance.
    const incidence=Math.max(.72,Math.cos(theta)*Math.cos(foreAft.angle));
    const spread=pose.wallDistance/Math.sqrt(incidence);
    const irradiance=.85/Math.pow(spread,1.32);
    const beamAngle=Math.sin(theta)*(state.protect?.54:.78)+(visibleLamp==='disco'?Math.sin(discoLight.phase*2)*.035:0);
    const requestedRange=scene.beamRange/100;
    displayedRange+=(requestedRange-displayedRange)*(reduce.matches?1:1-Math.exp(-dt*14));
    const footprint=spread*displayedRange;
    const discoWidth=visibleLamp==='disco'?.96+.04*Math.cos(discoLight.phase*4):1;
    const beamW=stageWidth()*1.42*footprint*beamPaddingX*discoWidth;
    const beamH=(H-source.y+H*.02)*footprint*beamPaddingY;
    const colorBreath=1;
    const fixtureGain=1-(1-discoLightLevel)*(fixtureWeights.disco||0);
    const renderingPower=unlit?1:lightPower;
    const baseBeamGain=Math.min(1,irradiance)*renderingPower*colorBreath;
    const beamGain=baseBeamGain*fixtureGain;
    // Secondary reflected cones share the ball phase, but never enlarge the cat's main-beam hit area.
    const discoMix=unlit?0:fixtureWeights.disco||0;
    // Apply the original rhythm once, after highlight clipping and material.
    // Otherwise headroom would swallow the beat peaks, weakening the contrast.
    const compositeRhythm=Math.max(.0001,renderingPower);
    const beamPaintGain=beamGain/compositeRhythm;
    paintMainBeam(ctx,source,beamAngle,beamW,beamH,beamPaintGain);
    if(discoMix>.001)for(let layer=2;layer>=1;layer--){
      const phase=discoLight.phase*2+layer*1.9;
      const width=beamW*((layer===1?1.8:2.65)+.035*Math.sin(phase));
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=beamPaintGain*discoMix*(layer===1?.14:.06);
      ctx.translate(source.x,source.y-beamH*(layer===1?.08:.15));ctx.transform(1,0,beamAngle+Math.sin(phase)*.07,1,0,0);
      ctx.drawImage(light,-width*.5,0,width,beamH*(layer===1?1.3:1.6));ctx.restore();
    }
    if(surface.floor){
      ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.33;
      ctx.fillStyle=ctx.createPattern(surface.floor,'repeat');ctx.fillRect(0,0,W,H);ctx.restore();
    }
    const beam={...source,slope:beamAngle,width:beamW,height:beamH,gain:beamGain,profileRevision:beamRevision};

    coverSleeve.update(dt,windowMotion,beam,rgb,state.brightness/80*1.20,target);
    if(!unlit)discoLight.draw(ctx,{active:(previewLamp||scene.lampStyle)==='disco',dt,reduce:reduce.matches,width:W,height:H,source,power:baseBeamGain/compositeRhythm*state.brightness/80,strength:scene.discoStrength/100,color:rgb});
    DiscoLight.finishRhythm(ctx,compositeRhythm,W,H);
    coverBackground.draw(ctx,W,H,dt,scene.coverBackground,reduce.matches,scene.coverBlur,scene.coverDim);
    // Pause lyric/animal time, but keep projection geometry tied to the live lamp.
    drawLyrics(beam,unlit?0:dt);
    drawCats(beam,unlit?0:dt,!unlit);drawDust(beam,unlit?0:dt);drawInsects(beam);drawForegroundDust(beam);
    lastScene={pose,beam};
    rest.present(ctx,stamp,reduce.matches);
    drawLamp(pose,rest.level(stamp,reduce.matches));
    captureScene();
  }
  function frame(stamp){
    const dt=Math.min(.1,Math.max(0,(stamp-(last||stamp))/1000));last=stamp;
    if(!rest.on){
      advanceRestLamp(dt,stamp);
      discoLight.coast(document.hidden?0:dt,{reduced:reduce.matches});
      // Explicit fixture selection/preview remains interactive while paused.
      updateFixtureBlend(dt);updateBeamProfile(dt);if(lightDirty)buildLight();
      renderScene(document.hidden?0:dt,stamp,true);
      requestAnimationFrame(frame);return;
    }
    time+=dt;
    const axisTarget=W*(document.body.classList.contains('scene-only')?.5:.64);
    if(Math.abs(cx-axisTarget)>.05){cx=reduce.matches?axisTarget:cx+(axisTarget-cx)*(1-Math.exp(-dt*7));document.documentElement.style.setProperty('--lamp-axis',cx+'px');lightDirty=true;}
    const playing=musicActive();
    playbackStarted=playbackStarted||playing;
    const ambient=!reduce.matches&&!document.hidden&&(playing||!playbackStarted);
    const gust=ambient?breeze.advance(dt):0;
    const dim=ambient?faintBreath.advance(dt):0;
    const torque=updateRhythm(dt,1-dim);
    const discoOperating=DiscoLight.operatingPoint({automatic:scene.discoAutoRotation,playing,tempo:auditionTempo(),beat:discoBeat,speed:scene.discoSpeed,rhythmLight:state.breath});
    discoLightLevel+=(discoOperating.level-discoLightLevel)*(1-Math.exp(-dt*2));
    discoLight.advance(dt,scene.discoRotation,discoOperating.speed,{...discoOperating,reduced:reduce.matches});
    if(reduce.matches || document.hidden)windowMotion.reset();
    else windowMotion.sample(window,stamp,Math.max(80,L/pendulum.arm));
    const supportTorque=windowMotion.torque(pendulum);
    const depthSupportTorque=windowMotion.torque(foreAft,'depth');
    if(Math.abs(supportTorque)>.02 && !dragging){
      manualLamp=true;pendulum.stopped=false;pendulum.calming=false;
    }
    if(Math.abs(depthSupportTorque)>.02&&!dragging){manualLamp=true;foreAft.stopped=false;foreAft.calming=false;}
    if(playing&&!wasPlaying&&!reduce.matches&&state.rhythmSwing){pendulum.stopped=false;pendulum.calming=false;}
    if(!playing&&wasPlaying&&!dragging){
      manualLamp=true;musicSway.reset(); // Release the driving hand; retain physical momentum.
    }
    if(gust){
      for(const bob of [pendulum,foreAft])if(bob.stopped&&!bob.calming)bob.stopped=false;
    }
    if(ambient||playing||manualLamp||dragging){
      pendulum.advance(dt,torque+supportTorque+gust);
      foreAft.advance(dt,depthSupportTorque+gust*.22);
    }
    wasPlaying=playing;theta=pendulum.angle;
    if(!dragging&&!document.hidden){
      const floating=mode==='floating';
      lineClock+=lyricTempo.advance(dt,{enabled:floating?floatPrefs.floatWave:projectedWavePrefs.projectedWave,
        speed:floating?floatPrefs.floatWaveSpeed:projectedWavePrefs.projectedWaveSpeed,
        follow:floating?floatPrefs.floatWaveMusic:projectedWavePrefs.projectedWaveMusic,
        playing:musicActive(),bpm:auditionTempo(),beat:discoBeat,reduced:reduce.matches});
    }
    const rowDuration=6.2;
    if(state.auto&&!dragging&&lineClock>=rowDuration&&transition===1)stepLine(1);transition=Math.min(1,transition+dt/1.2*rowPrefs.rowTransitionSpeed/100);
    if(transition===1&&pendingLine){const step=Math.sign(pendingLine);pendingLine-=step;stepLine(step);}
    updateFixtureBlend(dt);updateBeamProfile(dt);
    const colorCycle=(previewLamp||scene.lampStyle)==='disco'&&scene.discoColorCycle&&coverPalette.length>0;
    if(colorCycle&&!reduce.matches){discoColorClock+=dt;if(discoColorIndex<0||discoColorClock>=5){discoColorClock=0;const step=1+Math.floor(Math.random()*Math.max(1,coverPalette.length-1));discoColorIndex=(discoColorIndex+step)%coverPalette.length;}}
    const lightTarget=colorCycle?coverPalette[Math.max(0,discoColorIndex)]:(scene.magicColor?target:[236,231,216]);
    let colorChange=false;for(let i=0;i<3;i++){if(Math.abs(rgb[i]-lightTarget[i])>.2){rgb[i]+=(lightTarget[i]-rgb[i])*(1-Math.exp(-dt*.55));colorChange=true;}else rgb[i]=lightTarget[i];}
    for(let i=0;i<3;i++)coverInkRgb[i]+=(target[i]-coverInkRgb[i])*(1-Math.exp(-dt*.8));
    colorTick+=dt;if(colorChange&&colorTick>.06){lightDirty=true;colorTick=0;document.documentElement.style.setProperty('--accent',`rgb(${rgb.map(Math.round).join(',')})`);}if(lightDirty)buildLight();
    renderScene(dt,stamp);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{windowMotion.reset();if(!rest.on){last=performance.now();if(document.hidden){dragging=false;pendulum.release();foreAft.release();}return;}if(document.hidden){paw.reset();dragging=false;pendulum.release();foreAft.release();}else{last=performance.now();}});
  reduce.addEventListener('change',()=>{if(reduce.matches){pendulum.stop();foreAft.stop();state.auto=false;updateControls();}});
  let initialAlbum=0;
  try{const i=Number(localStorage.getItem("shadowLyrics.album"));if(Number.isInteger(i)&&albumsArt[i])initialAlbum=i;}catch{}
  selectAlbum(initialAlbum);
  const presetControl=await installPresets(
    ()=>({brightness:state.brightness,swing:state.swing,protect:state.protect,dust:state.dust,
      moths:state.moths,breath:state.breath,auto:state.auto,rhythmSwing:state.rhythmSwing,...typePrefs,...shade,...scene,...floatPrefs,...projectedWavePrefs,...rowPrefs,
      mode,wrapLyrics:$('wrapLyrics').checked,lyricMotion:$('lyricMotion').value,faceFinish:$('faceFinish').value,lyricColor:$('lyricColor').value,fontChoice:fontId,fontWeight:String(weight)}),
    settings=>{
      const playbackChanged=$('wrapLyrics').checked!==settings.wrapLyrics||$('lyricMotion').value!==settings.lyricMotion;
      $('wrapLyrics').checked=settings.wrapLyrics;$('lyricMotion').value=settings.lyricMotion;
      if(playbackChanged){pageOffset=0;previousPage=null;transition=1;pendingLine=0;}
      for(const key of Object.keys(scene))scene[key]=settings[key];showScene();
      for(const key of Object.keys(typePrefs)){setTypography(key,settings[key]);}
      for(const key of Object.keys(shade))shade[key]=settings[key];
      for(const prefs of [floatPrefs,projectedWavePrefs,rowPrefs])for(const key of Object.keys(prefs))prefs[key]=settings[key];showFloating();
      for(const key of ['brightness','swing','protect','dust','moths','breath','auto','rhythmSwing'])state[key]=settings[key];
      musicSway.reset();if(state.rhythmSwing&&!reduce.matches){manualLamp=true;pendulum.stopped=false;pendulum.calming=false;}
      $('faceFinish').value=settings.faceFinish||'dark';$('lyricColor').value=settings.lyricColor||'#d9c9ad';fontId=settings.fontChoice;weight=Number(settings.fontWeight);
      $('fontChoice').value=fontId;$('fontWeight').value=String(weight);setMode(settings.mode);showFaceControls();
      showShade();updateControls();refreshFont();lightDirty=true;
    },toast,()=>({lines:lines.slice(),current}),saved=>{
      saved=DemoLyrics.migrate(saved,albumIndex);personalLyrics=true;pageOffset=0;lines=saved.lines.slice();current=saved.current;transition=1;pendingLine=0;lineClock=0;
      $('customLyrics').value=lines.join('\n');updateA11y();refreshFont();rememberLyrics();
    });
  installConsoleUI(presetControl,()=>scene,showScene,toast,setLampPreview,coverEditor);
  const lampQuery=new URLSearchParams(location.search);
  if(Object.hasOwn(fixtures,lampQuery.get('lamp'))){scene.lampStyle=lampQuery.get('lamp');}
  showScene();
  paw.preloadNext().catch(()=>{});
  updateControls();resize();requestAnimationFrame(frame);
  requestAnimationFrame(()=>auditionTempo.start());
})();
