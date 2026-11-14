function installConsoleUI(presets,readScene,refreshScene,notify,setLampPreview,coverEditor){
  const $=id=>document.getElementById(id),picker=$('lampPicker'),tray=$('lampTray'),trigger=$('lampPickerButton');
  function ranges(){document.querySelectorAll('#panel input[type=range]').forEach(input=>input.style.setProperty('--range-fill',100*(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))+'%'));}
  ranges();document.addEventListener('input',ranges);document.addEventListener('change',ranges);window.addEventListener('presetsapplied',ranges);
  let leaveTimer=0,focusTimer=0,releaseTimer=0,hoverOpened=false,pickerPress=null;
  function close(){
    hoverOpened=false;pickerPress=null;
    clearTimeout(leaveTimer);clearTimeout(focusTimer);clearTimeout(releaseTimer);
    UiMotion.show(tray,false);trigger.setAttribute('aria-expanded','false');setLampPreview(null);
  }
  const thumbnails=new Map();
  function thumbnail(key){
    if(thumbnails.has(key))return thumbnails.get(key);
    const raw=document.createElement('canvas');raw.width=raw.height=256;
    const g=raw.getContext('2d',{willReadFrequently:true});g.translate(128,28);g.scale(2.6,2.6);
    drawFixture(g,key,null,{realistic:true,pitch:0,color:[236,231,216],power:1,phase:.5});
    const data=g.getImageData(0,0,256,256).data,rows=[];let widest=0;
    for(let y=0;y<256;y++){let left=256,right=-1;for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]>60){left=Math.min(left,x);right=Math.max(right,x);}const width=right-left+1;rows.push({left,right,width});widest=Math.max(widest,width);}
    let x0=256,x1=-1,y0=256,y1=-1;
    for(let y=0;y<256;y++)if(rows[y].width>Math.max(4,widest*.10)){x0=Math.min(x0,rows[y].left);x1=Math.max(x1,rows[y].right);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    const result={raw,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
    if(result.w>0&&result.h>0)thumbnails.set(key,result);
    return result;
  }
  function paint(){document.querySelectorAll('[data-lamp]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.lamp===readScene().lampStyle));
    const canvas=button.querySelector('canvas'),g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);
    const t=thumbnail(button.dataset.lamp);if(t.w<=0||t.h<=0)return;
    const scale={red:1.27,tube:.9,capsule:.9,caravaggio:.9,modern:1.2,ph5:1.27,gubi1965:1.2,jazz:1.1}[button.dataset.lamp]||1;
    const fit=Math.min(116/t.w,108/t.h)*scale,w=t.w*fit,h=t.h*fit,x=(canvas.width-w)/2,y=(canvas.height-h)/2;
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.strokeStyle='#77766b';g.lineWidth=1.2;g.beginPath();g.moveTo(canvas.width/2,8);g.lineTo(canvas.width/2,y+2);g.stroke();
    g.drawImage(t.raw,t.x,t.y,t.w,t.h,x,y,w,h);
  });}
  function open(){clearTimeout(leaveTimer);UiMotion.show(tray,true);trigger.setAttribute('aria-expanded','true');paint();}
  picker.addEventListener('focusout',()=>{
    clearTimeout(focusTimer);
    focusTimer=setTimeout(()=>{if(!pickerPress&&!picker.contains(document.activeElement))close();},0);
  });
  // Pointer-down can blur the trigger before the browser delivers click (notably
  // when clicking a label/canvas on Safari). Keep the tray interactive throughout
  // that gesture; only click commits. A drag/cancel never selects a fixture.
  document.addEventListener('pointerdown',e=>{
    if(!picker.contains(e.target)){close();return;}
    if(e.button!==undefined&&e.button!==0)return;
    clearTimeout(leaveTimer);clearTimeout(focusTimer);clearTimeout(releaseTimer);
    pickerPress={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  },true);
  document.addEventListener('pointermove',e=>{
    if(!pickerPress||pickerPress.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-pickerPress.x,e.clientY-pickerPress.y)>10)pickerPress.moved=true;
  },true);
  document.addEventListener('pointerup',e=>{
    if(!pickerPress||pickerPress.id!==e.pointerId)return;
    if(pickerPress.moved||!picker.contains(e.target)){close();return;}
    // Native click normally follows immediately; allow delayed touch clicks too.
    // Selection/close clears this guard. No click means no selection is saved.
    releaseTimer=setTimeout(()=>{
      pickerPress=null;
      if(!picker.matches(':hover')&&!picker.contains(document.activeElement))close();
    },350);
  },true);
  document.addEventListener('pointercancel',e=>{if(pickerPress&&pickerPress.id===e.pointerId)close();},true);
  window.addEventListener('blur',close);
  const enter=e=>{if(e.pointerType==='touch'||!$('panel').hidden)return;clearTimeout(leaveTimer);if(!UiMotion.isOpen(tray)){hoverOpened=true;open();}};
  const leave=e=>{if(e.pointerType==='touch')return;clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>{if(!pickerPress)close();},220);};
  trigger.addEventListener('pointerenter',enter);trigger.addEventListener('pointerleave',leave);
  tray.addEventListener('pointerenter',e=>{clearTimeout(leaveTimer);});tray.addEventListener('pointerleave',leave);
  trigger.onclick=()=>{pickerPress=null;clearTimeout(releaseTimer);clearTimeout(focusTimer);if(hoverOpened&&UiMotion.isOpen(tray)){hoverOpened=false;clearTimeout(leaveTimer);return;}UiMotion.isOpen(tray)?close():open();};
  trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();tray.querySelector('button').focus();}});
  tray.addEventListener('keydown',e=>{const list=[...tray.querySelectorAll('button')],i=list.indexOf(document.activeElement);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();list[e.key==='Home'?0:e.key==='End'?list.length-1:(i+({ArrowDown:2,ArrowUp:-2,ArrowLeft:-1,ArrowRight:1}[e.key])+list.length)%list.length].focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&UiMotion.isOpen(tray)){close();trigger.focus();}});
  const preview=button=>{if(UiMotion.isOpen(tray))setLampPreview(button.dataset.lamp);};
  document.querySelectorAll('[data-lamp]').forEach(button=>{
    button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')preview(button);});
    // Keep the current preview across gaps between cards; tray close restores selection.
    button.addEventListener('focus',()=>preview(button));

    button.onclick=()=>{
      if(!UiMotion.isOpen(tray)||pickerPress?.moved)return;
      const select=$('lampStyle');select.value=button.dataset.lamp;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      close();trigger.focus({preventScroll:true});
    };
  });
  window.addEventListener('presetsapplied',close);
  window.addEventListener('sceneonlychange',close);
  $('settings').addEventListener('click',close);
  // A transparent bottom hit area reveals the panel; the full path up to the
  // panel stays interactive. Only an actual pointer/focus exit starts the timer.
  const dock=$('lyricDock'),dockPanel=$('lyricDockPanel'),reveal=$('lyricDockReveal');
  let dockTimer=0,dockOpen=false;
  function showDock(){clearTimeout(dockTimer);dockOpen=true;dock.classList.add('is-open');dockPanel.inert=false;dockPanel.setAttribute('aria-hidden','false');reveal.setAttribute('aria-expanded','true');}
  function hideDock(){clearTimeout(dockTimer);dockOpen=false;dock.classList.remove('is-open');dockPanel.inert=true;dockPanel.setAttribute('aria-hidden','true');reveal.setAttribute('aria-expanded','false');}
  function deferDock(){clearTimeout(dockTimer);dockTimer=setTimeout(()=>{if(!dock.contains(document.activeElement))hideDock();},1000);}
  dock.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showDock();});
  dock.addEventListener('pointerleave',()=>{if(dock.contains(document.activeElement))document.activeElement.blur();deferDock();});
  dock.addEventListener('focusin',showDock);
  dock.addEventListener('focusout',()=>{if(!dock.matches(':hover'))deferDock();});
  reveal.addEventListener('click',showDock);
  document.addEventListener('pointerdown',e=>{if(dockOpen&&!dock.contains(e.target)){if(dock.contains(document.activeElement))document.activeElement.blur();deferDock();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dockOpen){document.activeElement?.blur();hideDock();}});
  window.addEventListener('sceneonlychange',hideDock);
  document.addEventListener('change',()=>{if(UiMotion.isOpen(tray))paint();});
  window.addEventListener('lamptexturesready',()=>{thumbnails.clear();if(UiMotion.isOpen(tray))paint();});
  const dialog=$('adminDialog'),form=$('adminForm'),password=$('adminPassword'),error=$('adminError');
  let pending=null,opener=null;
  const note=$('adminNote'),normalNote=note.textContent;
  $('publishLyrics').onclick=async()=>{
    opener=document.activeElement;
    try{pending=await coverEditor.prepare();}catch(err){notify(err.message);return;}
    $('adminTitle').textContent='设为此封面默认歌词';
    $('adminSummary').textContent=pending.title+' · '+pending.lines.length+' 句';
    note.textContent='三种歌词模式共用这份默认歌词。';
    password.value='';error.textContent='';UiMotion.show(dialog,true);password.focus();
  };
  $('saveSystemDefault').onclick=async()=>{
    const button=$('saveSystemDefault');if(button.disabled)return;
    opener=document.activeElement;button.disabled=true;button.setAttribute('aria-busy','true');
    try{pending=await presets.prepareSystemDefaults();}
    catch(err){notify(err.message);return;}
    finally{button.disabled=false;button.removeAttribute('aria-busy');}
    $('adminTitle').textContent='保存三种模式的默认参数';note.textContent=normalNote;
    $('adminSummary').textContent=[['pure','投影'],['combined','立体'],['floating','悬浮']].map(([mode,name])=>name+' '+pending.defaults[mode].settings.lyricRows+' 行').join(' · ');
    password.value='';error.textContent='';UiMotion.show(dialog,true);password.focus();
  };
  $('cancelAdmin').onclick=()=>UiMotion.show(dialog,false);
  dialog.addEventListener('close',()=>{password.value='';pending=null;opener?.focus();});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!pending||$('confirmAdmin').disabled)return;
    const button=$('confirmAdmin');button.disabled=true;$('cancelAdmin').disabled=true;error.textContent='';button.textContent='正在保存…';
    try{
      const isCover=Array.isArray(pending.lines);
      if(isCover)await coverEditor.publish(pending,password.value);
      else await presets.saveSystemDefault(pending,password.value);
      password.value='';UiMotion.show(dialog,false);notify(isCover?'此封面的默认歌词已更新':'三种模式的系统默认值已一起保存');
    }
    catch(err){error.textContent=err.message;password.value='';password.focus();}
    finally{button.disabled=false;$('cancelAdmin').disabled=false;button.textContent='确认保存';}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(!$('confirmAdmin').disabled)UiMotion.show(dialog,false);});
}
