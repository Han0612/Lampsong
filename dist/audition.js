function installAudition(audio,connect,resetEnergy){
  const $=id=>document.getElementById(id);
  const tracks=[
    {title:'Dream Culture',file:'dream',style:'氛围钢琴',bpm:70},
    {title:'Sneaky Snitch',file:'snitch',style:'拨弦小品',bpm:87},
    {title:'Big Rock',file:'rock',style:'吉他摇滚',bpm:108},
    {title:'Casa Bossa Nova',file:'casa',style:'波萨诺瓦',bpm:116},
    {title:'Cipher',file:'cipher',style:'电子律动',bpm:150}
  ].map(t=>({...t,src:siteAsset('audio/'+t.file+'.m4a'),artist:'Kevin MacLeod'}));
  let index=0,local=null,wanted=false,epoch=0,loaded='',status='ready';
  const track=()=>local||tracks[index];
  const clock=t=>Number.isFinite(t)?Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'):'0:00';
  audio.preload='none';
  const picker=$('auditionTrack');
  tracks.forEach((t,i)=>picker.add(new Option(t.title+' · '+t.bpm+' BPM',String(i))));
  picker.onchange=()=>skip(Number(picker.value)-index,wanted);

  function paint(){
    const t=track(),playing=wanted&&status==='playing';
    $('auditionTitle').textContent=t.title;
    picker.value=local?'':String(index);
    $('auditionArtist').textContent=status==='blocked'?'点击页面开始播放':status==='error'?'载入失败 · 点播放重试':status==='loading'?'正在载入…':local?t.artist:t.style+' · '+t.bpm+' BPM';
    $('auditionTime').textContent=clock(loaded?audio.currentTime:0);
    $('auditionPlay').setAttribute('aria-label',wanted?'暂停试听':'播放试听');
    $('auditionPlay').dataset.playing=String(wanted);
    $('clearSong').hidden=!local;
    $('rhythmSource').textContent=playing?'跟随音乐 · '+t.title:'未播放 · 灯光静止';
  }
  function pause(){
    ++epoch;wanted=false;status='ready';audio.pause();resetEnergy();paint();
  }
  function selectSource(){
    const src=track().src;
    if(loaded!==src||audio.error){loaded=src;audio.src=src;resetEnergy();}
  }
  async function play(){
    const request=++epoch;wanted=true;status='loading';selectSource();paint();
    try{
      await Promise.all([connect(),audio.play()]);
      if(request===epoch && wanted){status='playing';paint();}
    }catch(error){
      if(request!==epoch)return;
      wanted=false;status=error?.name==='NotAllowedError'?'blocked':'error';audio.pause();paint();
    }
  }
  function unload(){
    ++epoch;audio.pause();audio.removeAttribute('src');audio.load();loaded='';
    if(local){URL.revokeObjectURL(local.src);local=null;}
    resetEnergy();
  }
  function skip(dir,playAfter=wanted){
    unload();index=(index+dir+tracks.length)%tracks.length;
    wanted=false;status='ready';paint();if(playAfter)play();
  }
  $('auditionPrev').onclick=()=>skip(-1);
  $('auditionNext').onclick=()=>skip(1);
  $('auditionPlay').onclick=()=>wanted?pause():play();
  $('songFile').onchange=e=>{
    const file=e.target.files[0];if(!file)return;
    unload();local={title:file.name,artist:'本地音乐',src:URL.createObjectURL(file)};
    e.target.value='';play();
  };
  $('clearSong').onclick=()=>{unload();pause();};
  audio.ontimeupdate=()=>{$('auditionTime').textContent=clock(audio.currentTime);};
  audio.onended=()=>{if(wanted&&audio.ended)skip(1,true);};
  audio.onerror=()=>{if(loaded&&audio.error){++epoch;wanted=false;status='error';audio.pause();paint();}};
  audio.onwaiting=()=>{if(wanted){status='loading';paint();}};
  audio.onplaying=()=>{if(wanted&&!audio.paused){status='playing';paint();}};
  paint();
  const tempo=()=>track().bpm||72;
  // Called only after the first scene frame; audio must never block the UI.
  tempo.start=()=>{if(epoch===0)void play();};
  const retryBlocked=e=>{
    if(status!=='blocked'||e.defaultPrevented)return;
    if(e.target?.closest?.('#auditionPlay,#auditionPrev,#auditionNext,#auditionTrack,#songFile,#clearSong'))return;
    if(e.type==='keydown'&&['Shift','Control','Alt','Meta','Escape'].includes(e.key))return;
    void play();
  };
  document.addEventListener('click',retryBlocked);document.addEventListener('keydown',retryBlocked);
  return tempo;
}
