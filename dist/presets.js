// A preset describes the look and behaviour. Media files are not part of the settings.
async function installPresets(read,apply,notify,readLyrics,applyLyrics){
  const $=id=>document.getElementById(id);
  const storageKey='shadowLyrics.local148.user20261113.presets.v1', currentKey='shadowLyrics.local148.user20261113.current.v1';
  const defaults=read();
  const modes=['pure','combined','floating'];
  const sharedKeys=[...sharedLightKeys,...sharedPlaybackKeys,'dust','dustSize','dustDensity','moths','insectKind','butterflies'];
  const withShared=(doc,settings)=>validate({...doc,settings:{...doc.settings,...Object.fromEntries(sharedKeys.map(key=>[key,settings[key]]))}});
  let remoteDefaults={},remoteRevisions={},remoteRevision=null;
  async function refreshSystemDefaults(strict=false,requireAll=false){
    try{
      const response=await fetch('/api/system-defaults',{cache:'no-store',signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw Error('暂时无法读取系统默认参数，请稍后重试');
      const body=await response.json(),next={};
      for(const mode of ['pure','combined','floating'])if(body.defaults?.[mode]){
        const doc=validate(body.defaults[mode]);if(doc.settings.mode!==mode)throw Error('系统默认参数模式不匹配');next[mode]=doc;
      }
      if(requireAll&&Object.keys(next).length!==3)throw Error('系统默认参数不完整');
      remoteDefaults=next;remoteRevisions=body.revisions||{};remoteRevision=body.revision||null;
    }catch(error){
      // Static local preview uses the bundled user defaults when no API is present.
      if(typeof bundledLocalPresets!=='undefined'){remoteDefaults={};for(const mode of modes)remoteDefaults[mode]=validate(approvedModeDefaults(mode));remoteRevisions={};remoteRevision=null;return;}
      if(strict)throw Error('未能读取最新系统默认参数，请稍后再试');
    }
  }

  function systemDefault(mode){
    const doc=remoteDefaults[mode]||approvedModeDefaults(mode);
    return validate({...doc,settings:{...defaults,...doc.settings}});
  }
  const book=new Map();
  const sessions=new Map();
  const keyOf=doc=>doc.settings.mode+"/"+doc.name;
  function validate(doc,legacyProjection='perspective'){
    if(!doc || doc.version!==1 || typeof doc.name!=='string' || !doc.name.trim() || doc.name.length>48 || !doc.settings)throw Error('无效的预设文件');
    doc={...doc,settings:normalizePlaybackSettings(doc.settings)};
    const settings={};
    const sizes=catPlacementDefaults(doc.settings.mode);
    if(doc.settings.catRatio!==undefined)sizes.catMinSize=sizes.catMaxSize=doc.settings.catRatio;
    for(const [key,sample] of Object.entries(defaults)){
      if(doc.settings.mode==='pure' && (key==='faceFinish'||key==='lyricColor'))continue;
      const legacyDefaults={...floatingDefaults,...projectedWaveDefaults,...lyricRowDefaults(doc.settings.mode),projection:legacyProjection,softness:100,fadeStrength:45,lyricWidth:100,lyricHeight:100,...sizes,catFollowLight:true,catDarkness:100,...catOpacityDefaults(doc.settings.mode),catFar:Math.min(catOpacityDefaults(doc.settings.mode).catFar,doc.settings.catOpacity??100),...lightModeDefaults(doc.settings.mode),insectKind:'butterfly',lampStyle:doc.settings.mode==='combined'?'dome':'modern',lampRealistic:true,lampHeight:10,lyricPosition:Math.min(90,Math.max(10,(doc.settings.lampGap??16)+33)),coverBackground:true,coverBlur:24,coverDim:86,magicColor:true,discoColorCycle:true,discoRotation:true,discoAutoRotation:true,discoSpeed:35,discoStrength:70,rhythmSwing:false,rhythmStrength:50,dustSize:100,dustDensity:100,butterflies:2,blurStart:14,blurSpan:74,lampGap:16,faceFinish:'dark',lyricColor:'#d9c9ad'};
      let value=Object.hasOwn(doc.settings,key)?doc.settings[key]:legacyDefaults[key];
      if(key==='fadeStrength'&&doc.settings.shadowFade===false)value=0;
      if(key==='lampStyle'&&value==='bauhaus')value='tube';
      if(key==='lampStyle'&&['concert','gubiA1965','romeo','mayfair','flamingo','skan'].includes(value))value=({concert:'ph5',gubiA1965:'gubi1965',romeo:'vintage',mayfair:'modern',flamingo:'glass',skan:'modern'})[value];
      if(key==='fontChoice')value=({'fz-lanting-bold':'fz-lanting-extra-bold','fz-vdl-jianzhu-eb':'fz-vdl-jianzhu-sb','fz-ya-song':'fz-te-ya-song','fz-da-ya-song':'fz-fengya-song'})[value]||value;
      if(key==='lampRealistic')value=true;
      if(key==='beamRange'&&Number.isInteger(value)&&value>=50&&value<90)value=90;
      if(typeof value!==typeof sample)throw Error('缺少或无效的参数：'+key);
      if(typeof value==='number'){
        const ctrl=$(key);
        const min=ctrl.tagName==='SELECT'?2:Number(ctrl.min);
        const max=ctrl.tagName==='SELECT'?6:Number(ctrl.max);
        if(!Number.isInteger(value)||value<min||value>max)throw Error('参数超出范围：'+key);
      }
      if(key==='lyricColor'||key==='floatShadowColor'){
        if(!/^#[0-9a-f]{6}$/i.test(value))throw Error('无效的歌词颜色');
      }else if(typeof value==='string'){
        const ok=key==='mode'?['combined','pure','floating']:Array.from($(key).options,o=>o.value);
        if(!ok.includes(value))throw Error('未知选项：'+key);
      }
      settings[key]=value;
    }
    if(settings.catStayMin>settings.catStayMax)throw Error('停留下限不能高于上限');
    if(settings.catEntryMin>settings.catEntryMax)throw Error('探入光心下限不能高于上限');
    if(settings.catMinSize>settings.catMaxSize)throw Error('猫影比例下限不能高于上限');
    if(settings.catFar>settings.catOpacity)throw Error('远处不透明度不能高于近处');
    let lyrics;
    if(doc.lyrics!==undefined){
      const l=doc.lyrics;
      if(!l || !Array.isArray(l.lines)||l.lines.length<2||l.lines.length>600 ||
        l.lines.some(t=>typeof t!=='string'||!t.trim()||Array.from(t).length>2000) ||
        !Number.isInteger(l.current)||l.current<0||l.current>=l.lines.length)throw Error('歌词格式无效');
      lyrics={lines:l.lines.slice(),current:l.current};
    }
    return {version:1,name:doc.name.trim(),settings,...(lyrics?{lyrics}:{})};
  }
  function readSession(raw){
    const doc=JSON.parse(raw);
    // Migrate the previously standalone global layout controls without resetting them.
    for(const key of ['wrapLyrics','lyricMotion'])if(doc.settings&&!Object.hasOwn(doc.settings,key)){
      const legacy=localStorage.getItem('shadowLyrics.shared.'+key);
      if(legacy!==null)doc.settings[key]=key==='wrapLyrics'?legacy!=='false':legacy==='fade'?'fade':'slide';
    }
    // Earlier sessions had a fixed-opacity cat. Start their distance range
    // from the approved scene calibration; named presets retain their values.
    if(doc.settings&&!Object.hasOwn(doc.settings,'catFar')){
      Object.assign(doc.settings,{catDarkness:100,...catOpacityDefaults(doc.settings.mode)});
    }
    if(doc.settings&&!Object.hasOwn(doc.settings,'catMinSize'))Object.assign(doc.settings,catPlacementDefaults(doc.settings.mode));
    return validate(doc,'parallel');
  }
  const current=()=>validate({version:1,name:$('presetName').value.trim()||'当前效果',settings:read(),lyrics:readLyrics()});
  function remember(){
    const doc=current();
    sessions.set(doc.settings.mode,doc);
    try{
      const snapshot=JSON.stringify({...doc,lyrics:undefined});
      localStorage.setItem(currentKey+'.'+doc.settings.mode,snapshot);
      localStorage.setItem(currentKey,snapshot);
    }catch{}
  }
  function list(selected=''){
    $('presetList').replaceChildren(new Option('选择已保存的预设',''));
    for(const doc of book.values())if(doc.settings.mode===read().mode)$('presetList').add(new Option(doc.name,doc.name));
    $('presetList').value=selected;
  }
  function save(doc){
    const next=new Map(book);next.set(keyOf(doc),doc);
    localStorage.setItem(storageKey,JSON.stringify(Array.from(next.values())));
    book.set(keyOf(doc),doc);list(doc.name);
  }
  function use(doc,withLyrics=true,savePrevious=true){if(savePrevious&&doc.settings.mode!==read().mode)remember();apply(normalizePlaybackSettings(doc.settings));if(withLyrics&&doc.lyrics)applyLyrics(doc.lyrics);$('presetName').value=doc.name;list(doc.name);remember();if(typeof window!=='undefined')window.dispatchEvent(new Event('presetsapplied'));}
  try{for(const raw of JSON.parse(localStorage.getItem(storageKey)||'[]')){const doc=validate(raw);book.set(keyOf(doc),doc);}}catch{}
  for(const mode of ['pure','combined','floating']){
    try{const raw=localStorage.getItem(currentKey+'.'+mode);if(raw)sessions.set(mode,readSession(raw));}catch{}
  }
  list();
  let lastDoc=null;
  try{const last=localStorage.getItem(currentKey);if(last)lastDoc=readSession(last);}catch{}
  // Only a new visitor waits for shared defaults. Existing sessions render
  // immediately; reset fetches the authoritative values on every click.
  if(lastDoc){use(lastDoc,false,false);}
  else{await refreshSystemDefaults();use(systemDefault(defaults.mode),false,false);}
  $('presetList').onchange=e=>{const doc=book.get(read().mode+'/'+e.target.value);if(doc)use(doc);};
  $('savePreset').onclick=()=>{
    if(!$('presetName').value.trim()){notify('请先给这组参数起个名字');$('presetName').focus();return;}
    try{const doc=current();save(doc);remember();notify('已保存 '+doc.name);}catch(err){notify('无法保存：'+err.message);}
  };
  $('exportPreset').onclick=async()=>{
    const button=$('exportPreset');button.disabled=true;
    try{
      remember();
      // Unvisited modes must use the actual administrator defaults, not stale seeds.
      if(modes.some(mode=>!sessions.has(mode)))await refreshSystemDefaults(true,true);
      const active=current(),all={};
      for(const mode of modes)all[mode]=withShared(sessions.get(mode)||systemDefault(mode),active.settings);
      const doc={version:2,type:'catlight-presets',name:active.name,modes:all};
      const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download=doc.name.replace(/[\\/:*?"<>|]/g,'-')+'-全部模式.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
      notify('已导出投影、立体、悬浮三个模式');
    }catch(err){notify('导出失败：'+err.message);}finally{button.disabled=false;}
  };
  $('importPreset').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>16*1024*1024)throw Error('文件过大');
      const raw=JSON.parse(await file.text()),active=current(),all={};
      if(raw.version===2){
        if(raw.type!=='catlight-presets'||!raw.modes)throw Error('无效的合并预设文件');
        for(const mode of modes){
          const doc=validate(raw.modes[mode]);
          if(doc.settings.mode!==mode)throw Error('预设模式不匹配');
          all[mode]=doc;
        }
        // Reject inconsistent global settings rather than silently choosing a mode.
        for(const key of sharedKeys)if(modes.some(mode=>all[mode].settings[key]!==all.pure.settings[key]))throw Error('共用参数不一致：'+key);
      }else{
        const doc=validate(raw);all[doc.settings.mode]=doc;
      }
      const imported=Object.values(all),shared=imported[0].settings;
      const nextSessions=new Map(sessions);nextSessions.set(active.settings.mode,active);
      for(const doc of imported)nextSessions.set(doc.settings.mode,doc);
      for(const [mode,doc] of nextSessions)nextSessions.set(mode,withShared(doc,shared));
      const nextBook=new Map(book);
      for(const doc of imported)nextBook.set(keyOf(doc),doc);
      const selected=nextSessions.get(active.settings.mode);
      const writes=new Map([[storageKey,JSON.stringify(Array.from(nextBook.values()))]]);
      for(const [mode,doc] of nextSessions)writes.set(currentKey+'.'+mode,JSON.stringify({...doc,lyrics:undefined}));
      writes.set(currentKey,JSON.stringify({...selected,lyrics:undefined}));
      const previous=new Map(Array.from(writes.keys(),key=>[key,localStorage.getItem(key)]));
      // Validate the whole file first; rollback persisted settings on quota errors.
      try{for(const [key,value] of writes)localStorage.setItem(key,value);}
      catch(error){for(const [key,value] of previous)try{value===null?localStorage.removeItem(key):localStorage.setItem(key,value);}catch{}throw error;}
      book.clear();for(const [key,doc] of nextBook)book.set(key,doc);
      sessions.clear();for(const [mode,doc] of nextSessions)sessions.set(mode,doc);
      use(selected,!!all[active.settings.mode],false);
      notify(raw.version===2?'已载入三个模式，保持当前模式':'已载入单模式预设，保持当前模式');
    }catch(err){notify('导入失败：'+err.message);}finally{e.target.value='';}
  };
  document.addEventListener('input',e=>{if(e.target.id in defaults)remember();});
  document.addEventListener('change',e=>{if(e.target.id in defaults)remember();});

  return {
    snapshot(){return current();},
    async prepareSystemDefaults(){
      remember();
      await refreshSystemDefaults(true,true);
      const active=current(),all={};
      for(const mode of ['pure','combined','floating']){
        const original=systemDefault(mode),saved=sessions.get(mode)||original;
        const settings={...saved.settings};
        for(const key of [...sharedLightKeys,...sharedPlaybackKeys,'dust','dustSize','dustDensity','moths','insectKind','butterflies'])settings[key]=active.settings[key];
        // Cover lyrics have their own save action. Keep their default data intact.
        all[mode]=validate({...saved,settings,lyrics:original.lyrics});
      }
      // The modal confirms this exact snapshot/revision; do not refresh it on submit.
      return {defaults:all,revision:remoteRevision,revisions:{...remoteRevisions}};
    },
    async saveSystemDefault(snapshot,password){
      const all={};
      for(const mode of ['pure','combined','floating']){
        const doc=validate(snapshot.defaults?.[mode]);
        if(doc.settings.mode!==mode)throw Error('系统默认参数模式不匹配');
        all[mode]=doc;
      }
      const response=await fetch('/api/system-defaults',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,defaults:all,revision:snapshot.revision,revisions:snapshot.revisions}),signal:AbortSignal.timeout(12000)});
      const result=await response.json();if(!response.ok)throw Error(result.error||'保存失败，请重试');
      remoteDefaults=all;remoteRevision=result.revision;remoteRevisions={};
    },
    async reset(){await refreshSystemDefaults(true);use(systemDefault(read().mode),false,false);},
    remember,
    switchTo(mode){
    if(read().mode===mode)return;
    remember();
    const saved=sessions.get(mode)||systemDefault(mode);
    // setMode restores lyrics for the selected cover; mode snapshots only restore settings.
    const settings={...saved.settings},active=normalizePlaybackSettings(read());
    for(const key of [...sharedLightKeys,...sharedPlaybackKeys,'dust','dustSize','dustDensity','moths','insectKind','butterflies'])settings[key]=active[key];
    use({...saved,settings},false,false);
  }};
}
