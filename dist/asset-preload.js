'use strict';
(() => {
  const assets=new Map(),complete=new Set(),revisions=new Map();
  let files,running=false;
  window.siteAsset=path=>assets.get(path)||(revisions.has(path)?path+'?v='+revisions.get(path):path);
  window.siteAssetReady=path=>complete.has(path);
  const params=new URLSearchParams(location.search);
  const firstKey=params.get('cat')||'sneak';
  const firstClip='cat-motion/'+firstKey+(params.get('variant')==='b'?'-b':'')+'.webp';
  function priority(file){
    if(file.path===firstClip)return 0;
    return file.path.startsWith('cat-motion/')?1:2;
  }
  async function download(file){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try{
      // Font CSS uses relative URLs. Reuse those requests in the HTTP cache.
      const path=file.type.startsWith('font/')?file.path:siteAsset(file.path);
      const response=await fetch(path,{signal:controller.signal,cache:'force-cache'});
      if(!response.ok)throw Error(file.path);
      const blob=new Blob([await response.arrayBuffer()],{type:file.type});
      const url=URL.createObjectURL(blob);
      try{
        if(file.type.startsWith('image/')){
          const image=new Image();image.src=url;await image.decode();
        }
      }catch(error){URL.revokeObjectURL(url);throw error;}
      assets.set(file.path,url);complete.add(file.path);
      window.dispatchEvent(new CustomEvent('siteassetready',{detail:file.path}));
    }finally{clearTimeout(timeout);}
  }
  async function run(){
    if(running)return;running=true;
    try{
      for(let attempt=0;attempt<4;attempt++){
        try{
          if(!files){
            const response=await fetch('preload.json',{cache:'no-cache',signal:AbortSignal.timeout(30000)});
            if(!response.ok)throw Error('preload.json');
            const manifest=await response.json();
            files=manifest.files.filter(file=>/^(image|audio|font)\//.test(file.type)&&!file.path.startsWith('cat-sleep/'));
            for(const file of files)revisions.set(file.path,file.revision);
          }
          const pending=files.filter(file=>!complete.has(file.path)).sort((a,b)=>priority(a)-priority(b));
          async function worker(){
            while(pending.length){
              const file=pending.shift();
              try{await download(file);}catch{console.warn('素材稍后重试',file.path);}
            }
          }
          await Promise.all(Array.from({length:4},worker));
          if(complete.size===files.length)break;
        }catch(error){console.warn('后台素材准备暂缓',error);}
        if(attempt<3)await new Promise(resolve=>setTimeout(resolve,2000*2**attempt));
      }
    }finally{running=false;}
  }
  window.addEventListener('online',()=>{if(!files||complete.size<files.length)run();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();
