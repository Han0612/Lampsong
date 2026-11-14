// Server-only defaults store. Secrets are injected by Sites at deployment.
const SEED=/*__DEFAULTS__*/null;
const RULES=/*__RULES__*/null;
const SHARED_LIGHT=/*__SHARED_LIGHT__*/null;
const SHARED_PLAYBACK=/*__SHARED_PLAYBACK__*/null;
/*__PLAYBACK_NORMALIZE__*/
const INDEX=/*__INDEX__*/'';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const keyFor=mode=>'system-defaults/v1/'+mode+'.json';
const MODES=['pure','combined','floating'];
const bundleKey='system-defaults/v2/all.json';
const sharedKeys=[...SHARED_LIGHT,...SHARED_PLAYBACK,'dust','dustSize','dustDensity','moths','insectKind','butterflies'];
function clean(doc){
  if(!doc||doc.version!==1||!['pure','combined','floating'].includes(doc.settings?.mode))throw Error('参数格式无效');
  doc={...doc,settings:normalizePlaybackSettings(doc.settings)};
  const mode=doc.settings.mode,settings={};
  for(const [key,rule] of Object.entries(RULES)){
    if(mode==='pure'&&['faceFinish','lyricColor'].includes(key))continue;
    const value=(key.startsWith('float')||key.startsWith('projectedWave')||key.startsWith('row'))?(doc.settings[key]??SEED[mode].settings[key]):['coverBackground','discoColorCycle','discoAutoRotation'].includes(key)?(doc.settings[key]??true):key==='coverBlur'?(doc.settings[key]??24):key==='coverDim'?(doc.settings[key]??86):key==='lampHeight'?(doc.settings[key]??10):key==='lyricPosition'?(doc.settings[key]??Math.min(90,Math.max(10,(doc.settings.lampGap??16)+33))):['lyricWidth','lyricHeight'].includes(key)?(doc.settings[key]??100):key==='fadeStrength'?(doc.settings.shadowFade===false?0:(doc.settings[key]??45)):key==='rhythmSwing'?(doc.settings[key]??false):key==='rhythmStrength'?(doc.settings[key]??50):doc.settings[key];
    if(typeof value!==rule.type)throw Error('缺少或无效的参数：'+key);
    if(rule.type==='number'&&(!Number.isInteger(value)||value<rule.min||value>rule.max))throw Error('参数超出范围：'+key);
    if(rule.values&&!rule.values.includes(value))throw Error('未知选项：'+key);
    if(['lyricColor','floatShadowColor'].includes(key)&&!/^#[0-9a-f]{6}$/i.test(value))throw Error('颜色格式无效');
    settings[key]=key==='lampRealistic'?true:value;
  }
  for(const [min,max]of [['catStayMin','catStayMax'],['catEntryMin','catEntryMax'],['catMinSize','catMaxSize'],['catFar','catOpacity']])if(settings[min]>settings[max])throw Error('参数上下限不正确');
  const l=doc.lyrics;
  if(!l||!Array.isArray(l.lines)||l.lines.length<2||l.lines.length>600||l.lines.some(t=>typeof t!=='string'||!t.trim()||Array.from(t).length>2000)||!Number.isInteger(l.current)||l.current<0||l.current>=l.lines.length)throw Error('歌词格式无效');
  return {version:1,name:mode==='pure'?'纯投影 · 系统默认':mode==='floating'?'悬浮歌词 · 系统默认':'字＋投影 · 系统默认',settings,lyrics:{lines:l.lines,current:l.current}};
}
async function sameSecret(actual,expected){
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([actual,expected].map(v=>crypto.subtle.digest('SHA-256',encoder.encode(String(v)))));
  const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}
async function limitAttempts(request,bucket){
  const identity=request.headers.get('cf-connecting-ip')||request.headers.get('oai-authenticated-user-id')||'unknown';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
  const id=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const key='admin-attempts/'+id,old=await bucket.get(key),now=Date.now();
  const saved=old?await old.json():null;
  const state=saved&&saved.until>now?saved:{until:now+15*60*1000,count:0};
  if(state.count>=5)return false;state.count++;
  // R2 conditional writes prevent racing requests from bypassing the limit.
  const result=await bucket.put(key,JSON.stringify(state),{onlyIf:old?{etagMatches:old.etag}:{etagDoesNotMatch:'*'}});
  return result?key:null;
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const cover=url.pathname.match(/^\/api\/cover-lyrics\/([0-6])$/);
    const coverKey=cover && 'cover-lyrics/v1/'+cover[1]+'.json';
    if(!cover && url.pathname!=='/api/system-defaults'){
      if(env.ASSETS)return env.ASSETS.fetch(request);
      if(url.pathname==='/')return new Response(INDEX,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
      return new Response('Not found',{status:404});
    }
    if(!['GET','POST'].includes(request.method))return json({error:'不支持此操作'},405);
    if(!env.BUCKET)return json({error:'系统默认参数服务暂不可用'},503);
    try{
      if(request.method==='GET'){
        if(cover){
          const item=await env.BUCKET.get(coverKey);
          return json({lines:item?await item.json():null,revision:item?.etag||null});
        }
        const bundle=await env.BUCKET.get(bundleKey),bundleData=bundle?await bundle.json():null;
        const result={defaults:{},revisions:{},revision:bundle?.etag||null},saved=[];
        await Promise.all(['pure','combined','floating'].map(async mode=>{
          const object=bundle?null:await env.BUCKET.get(keyFor(mode));
          const stored=bundleData?{doc:bundleData.defaults[mode],updatedAt:bundleData.updatedAt}:object?await object.json():null;
          const doc=stored?stored.doc:SEED[mode];
          if(stored)saved.push({mode,settings:doc.settings,time:Date.parse(stored.updatedAt)||Number(object?.uploaded)||0});
          result.defaults[mode]={...doc,settings:{...Object.fromEntries(Object.entries(SEED[mode].settings).filter(([key])=>key.startsWith('float')||key.startsWith('projectedWave')||key.startsWith('row'))),...doc.settings,lyricWidth:doc.settings.lyricWidth??100,lyricHeight:doc.settings.lyricHeight??100,fadeStrength:doc.settings.shadowFade===false?0:(doc.settings.fadeStrength??45),rhythmSwing:doc.settings.rhythmSwing??false,rhythmStrength:doc.settings.rhythmStrength??50}};delete result.defaults[mode].settings.catIdleSleep;result.revisions[mode]=object?.etag||null;
        }));
        // The latest administrator save supplies shared lighting. Preserve stored
        // mode documents and their independent lyric, shadow and pet settings.
        saved.sort((a,b)=>b.time-a.time||a.mode.localeCompare(b.mode));
        const lighting={coverBackground:true,...SEED.pure.settings,...saved[0]?.settings};
        for(const mode of ['pure','combined','floating'])for(const key of SHARED_LIGHT)result.defaults[mode].settings[key]=lighting[key];
        const playback=normalizePlaybackSettings(saved[0]?.settings||SEED.pure.settings);
        for(const mode of ['pure','combined','floating'])for(const key of SHARED_PLAYBACK)result.defaults[mode].settings[key]=playback[key];
        for(const mode of ['pure','combined','floating']){const s=result.defaults[mode].settings;if(Number.isInteger(s.beamRange)&&s.beamRange>=50&&s.beamRange<90)s.beamRange=90;}
        return json(result);
      }
      if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'请求来源不正确'},403);
      if(!env.SYSTEM_DEFAULTS_PASSWORD&&!env.VERIFY_ADMIN_PASSWORD)return json({error:'管理员保存尚未配置'},503);
      const maxBytes=cover?131072:524288;
      if(Number(request.headers.get('Content-Length'))>maxBytes)return json({error:'参数文件过大'},413);
      const attemptKey=await limitAttempts(request,env.BUCKET);
      if(!attemptKey)return json({error:'尝试次数过多，请 15 分钟后再试'},429);
      const text=await request.text();if(text.length>maxBytes)return json({error:'参数文件过大'},413);
      let payload;try{payload=JSON.parse(text);}catch{return json({error:'参数格式无效'},400);}
      if(typeof payload.password!=='string'||!(env.VERIFY_ADMIN_PASSWORD?await env.VERIFY_ADMIN_PASSWORD(payload.password):await sameSecret(payload.password,env.SYSTEM_DEFAULTS_PASSWORD)))return json({error:'密码不正确'},401);
      await env.BUCKET.delete(attemptKey);
      if(cover){
        const lines=payload.lines;
        if(!Array.isArray(lines)||lines.length<2||lines.length>600||lines.some(t=>typeof t!=='string'||!t.trim()||t.includes('\n')||Array.from(t).length>2000))
          return json({error:'请输入 2 至 600 句歌词，每句最多 2000 字'},400);
        const result=await env.BUCKET.put(coverKey,JSON.stringify(lines),{onlyIf:payload.revision?{etagMatches:payload.revision}:{etagDoesNotMatch:'*'}});
        return result?json({revision:result.etag}):json({error:'这张封面的歌词已更新，请重新打开编辑器核对'},409);
      }
      if(payload.doc)return json({error:'保存方式已更新，请刷新页面后一起保存三种模式'},409);
      const all={};
      try{
        if(!payload.defaults||Object.keys(payload.defaults).length!==3)throw Error('请一起保存三种模式');
        for(const mode of MODES){
          all[mode]=clean(payload.defaults[mode]);
          if(all[mode].settings.mode!==mode)throw Error('系统默认参数模式不匹配');
        }
        for(const mode of MODES)for(const key of sharedKeys)if(all[mode].settings[key]!==all.pure.settings[key])throw Error('共用参数不一致，请重新打开保存窗口');
      }catch(error){return json({error:error.message},400);}
      const previous=await env.BUCKET.get(bundleKey);
      if((payload.revision||null)!==(previous?.etag||null))return json({error:'系统默认值刚被更新，请重新确认保存'},409);
      const previousText=previous?await previous.text():null;
      if(!previous){
        // First batch save migrates only after checking every legacy source revision.
        for(const mode of MODES){
          const old=await env.BUCKET.get(keyFor(mode));
          if(!payload.revisions||!Object.hasOwn(payload.revisions,mode)||(payload.revisions[mode]||null)!==(old?.etag||null))return json({error:'系统默认值刚被更新，请重新确认保存'},409);
        }
      }
      if(previous)await env.BUCKET.put('system-defaults/history/all/'+previous.etag+'.json',previousText);
      const data={defaults:all,updatedAt:new Date().toISOString()};
      // A single conditional object replacement commits all modes, or none.
      const result=await env.BUCKET.put(bundleKey,JSON.stringify(data),{httpMetadata:{contentType:'application/json'},onlyIf:previous?{etagMatches:previous.etag}:{etagDoesNotMatch:'*'}});
      if(!result)return json({error:'系统默认值刚被更新，请重新确认保存'},409);
      return json({ok:true,revision:result.etag,modes:MODES});
    }catch(error){console.error('System default request failed',error.name);return json({error:'保存服务暂不可用，请稍后重试'},503);}
  }
};
