"""Compile coherent kitten contour sequences with motion-aligned in-betweens.
Dense bidirectional optical flow aligns contour distance fields before blending;
the result is ONE opaque silhouette (not alpha-crossfaded exposure). Original
endpoint alpha, all authored source drawings and precise ground anchors remain.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,cv2
from scipy.ndimage import distance_transform_edt, gaussian_filter1d
root=Path(__file__).resolve().parents[1];out=root/'dist/cat-sleep'
meta=json.loads((out/'source/authored-metadata.json').read_text())
routes={'curl':[0,1,2,3,4,5,6,9,10,11,12],'side':[0,1,2,3,5,6,7,9,10,11]}
reports={};cw,ch=640,400
xx,yy=np.meshgrid(np.arange(cw,dtype=np.float32),np.arange(ch,dtype=np.float32))

def field(a):
    binary=a>.5;d=distance_transform_edt(binary)-distance_transform_edt(~binary)
    return np.where(abs(d)<=1,a-.5,d-np.sign(d)*.5)

def intermediates(a,b,count=3):
    da,db=field(a),field(b)
    # Broad signed-distance gradients provide correspondence inside solid
    # silhouettes without inventing textures or double contours.
    fa=np.uint8(np.clip(da*3+128,0,255));fb=np.uint8(np.clip(db*3+128,0,255))
    dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(0);dis.setGradientDescentIterations(50);dis.setVariationalRefinementIterations(20)
    ab=dis.calc(fa,fb,None);ba=dis.calc(fb,fa,None)
    for step in range(1,count+1):
        t=step/(count+1)
        wa=cv2.remap(a.astype(np.float32),xx-t*ab[:,:,0],yy-t*ab[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
        wb=cv2.remap(b.astype(np.float32),xx-(1-t)*ba[:,:,0],yy-(1-t)*ba[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)
        yield t,np.clip(field(wa)*(1-t)+field(wb)*t+.5,0,1)

def contour_intermediates(a,b,count=3):
    # Large native-gait bridges require an ordered, connected outline: dense
    # flow cannot resolve the tail changing direction and may detach its tip.
    # Match contours monotonically, then interpolate one filled boundary.
    def contour(mask):
        c=max(cv2.findContours(np.uint8(mask>.5),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)[0],key=cv2.contourArea)[:,0,:].astype(float)
        c=gaussian_filter1d(c,2,axis=0,mode='wrap');start=np.argmax(c[:,0]);c=np.concatenate((c[start:],c[:start],c[start:start+1]))
        d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))];r=np.linspace(0,d[-1],700)
        return np.c_[np.interp(r,d,c[:,0]),np.interp(r,d,c[:,1])]
    ca,cb=contour(a),contour(b);n=len(ca)
    cost=np.sum((ca[:,None,:]-cb[None,:,:])**2,axis=2);dp=np.full((n+1,n+1),np.inf);dp[0,0]=0
    for i in range(n):
        for j in range(n):dp[i+1,j+1]=cost[i,j]+min(dp[i,j],dp[i,j+1]+20,dp[i+1,j]+20)
    i=j=n;path=[]
    while i>0 and j>0:
        path.append((i-1,j-1));k=np.argmin([dp[i-1,j-1],dp[i-1,j]+20,dp[i,j-1]+20]);i-=k!=2;j-=k!=1
    path=np.array(path[::-1]);ca=ca[path[:,0]];cb=cb[path[:,1]]
    for step in range(1,count+1):
        t=step/(count+1);c=ca*(1-t)+cb*t;mask=np.zeros((ch*2,cw*2),np.uint8)
        cv2.fillPoly(mask,[np.int32(c*2)],255)
        yield t,np.asarray(Image.fromarray(mask).resize((cw,ch),Image.Resampling.LANCZOS)).astype(float)/255

def anchors(a):
    y,x=np.where(a>.125);bounds=[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
    hx=round(bounds[0]+.78*(bounds[2]-bounds[0]));hy=int(np.where(a[:,hx]>.38)[0][0])+2
    cy=min(348,hy+round((bounds[2]-bounds[0])*.23));profile=np.mean(a[max(0,cy-3):cy+4],axis=0);can=np.where(profile>.74)[0];cx=int(can.max()) if len(can) else bounds[2]-12
    return {'bounds':bounds,'baseline':360,'anchorX':320,'head':[hx,hy],'chin':[cx,cy]}

def native_gait(art,variant):
    im=Image.open(root/'dist/cat-motion'/('sneak'+('-b' if variant=='B' else '')+'.webp')).convert('RGBA')
    w=im.width//4;h=round(w*2/3);cell=im.crop((0,0,w,h));scale=art['referenceWidth']/1250
    foot=(294+1 if variant=='A' else 297+1)*1024/h
    # Exact paw row for the A/B first gait frame is read from JS below.
    foot=(pawrows[variant]+1)*1024/h
    tile=cell.resize((round(1536*scale),round(1024*scale)),Image.Resampling.LANCZOS)
    dst=Image.new('RGBA',(cw,ch));dst.paste(tile,(round(320-768*scale),round(360-foot*scale)))
    return np.asarray(dst.getchannel('A')).astype(float)/255

# Read data through Node, preserving the production authored row definitions.
import subprocess
pawrows=json.loads(subprocess.check_output(['node','-e',"const fs=require('fs'),vm=require('vm');const b={};vm.createContext(b);vm.runInContext(fs.readFileSync('dist/cat-poses.js','utf8')+';this.r={A:catPoses.sneak.pawRow[0],B:catAltPoses.sneak.pawRow[0]};',b);console.log(JSON.stringify(b.r))"],cwd=root))
for key,route in routes.items():
    art=meta['variants'][key];old=Image.open(out/'source'/f'{key}-authored.webp').convert('RGBA')
    source=[old.crop((i%4*cw,i//4*ch,(i%4+1)*cw,(i//4+1)*ch)) for i in range(24)]
    alpha=[np.asarray(im.getchannel('A')).astype(float)/255 for im in source]
    frames=[];textures=[];nativeMap={};derived=[]
    def append(a,info,native=None):
        f=dict(info);f['bounds']=anchors(a)['bounds'];f['mass']=round(float(a.sum()),2);f['authoredFrame']=native
        if native is not None:nativeMap[native]=len(frames)
        canvas=Image.new('RGBA',(cw,ch),(0,0,0,0));canvas.putalpha(Image.fromarray(np.uint8(np.clip(a,0,1)*255)))
        textures.append(canvas);frames.append(f);return len(frames)-1
    def bridge(a,b,fa,fb,label,method=intermediates,count=3):
        ids=[]
        for t,mask in method(a,b,count=count):
            f={name:([round(x+(y-x)*t,2) for x,y in zip(fa[name],fb[name])] if isinstance(fa[name],list) else round(fa[name]+(fb[name]-fa[name])*t,2)) for name in ['baseline','anchorX','head','chin']}
            f['derivedFrom']=[*label,t];ids.append(append(mask,f));derived.append(ids[-1])
        return ids
    append(alpha[route[0]],art['frames'][route[0]],route[0])
    for ia,ib in zip(route,route[1:]):
        bridge(alpha[ia],alpha[ib],art['frames'][ia],art['frames'][ib],[ia,ib])
        append(alpha[ib],art['frames'][ib],ib)
    end=len(frames)-1;settle=list(range(end+1));petEnd=nativeMap[9 if key=='curl' else 7]
    art.update(settle=settle,sleep=[end],sleepStable=[end],wake=list(range(end,-1,-1)),petRise=list(range(end,petEnd-1,-1)),petReturn=list(range(petEnd,end+1)),pet=list(range(end,petEnd-1,-1)),authoredRoute=route,sleepLoop='stable-frame-with-local-breathing',wakeStyle='coherent-reverse-settle')
    for variant in ['A','B']:
        native=native_gait(art,variant);nf=anchors(native);start=append(native,nf)
        middle=bridge(native,alpha[0],nf,art['frames'][0],['native-'+variant,0],method=contour_intermediates,count=9)
        art['arrive'+variant]=[start,*middle,0];art['leave'+variant]=[0,*reversed(middle),start]
    rows=(len(frames)+3)//4;sheet=Image.new('RGBA',(cw*4,ch*rows))
    for i,im in enumerate(textures):sheet.paste(im,(i%4*cw,i//4*ch))
    # Preserve 640px computation/QA and resample once at runtime packaging.
    runtimeSheet=sheet.resize((512*4,320*rows),Image.Resampling.LANCZOS)
    runtimeSheet.save(out/f'{key}.webp',lossless=True,method=6)
    art.update(rows=rows,frames=frames,derivedFrameCount=len(derived))
    masks=[np.asarray(im.getchannel('A'))>127 for im in textures]
    def overlap(seq):return [float((masks[a]&masks[b]).sum()/(masks[a]|masks[b]).sum()) for a,b in zip(seq,seq[1:])]
    ious=overlap(settle)
    reports[key]={'runtimeFrames':len(frames),'authoredFramesUsed':len(route),'contourDerivedFrames':len(derived),'minimumAdjacentIoU':round(min(ious),4),'medianAdjacentIoU':round(float(np.median(ious)),4),'nativeRoute':route,'bridgeAOverlap':[round(v,4) for v in overlap(art['arriveA'])],'bridgeBOverlap':[round(v,4) for v in overlap(art['arriveB'])],'fileBytes':(out/f'{key}.webp').stat().st_size}
    displayRows=[list(range(row*4,row*4+5)) for row in range(len(route)-1)]
    for name in ['arriveA','arriveB']:
        seq=art[name]
        displayRows.extend([seq[0:5],seq[4:9],seq[8:11]])
    strip=Image.new('RGB',(cw*5,ch*len(displayRows)),(185,187,177));g=ImageDraw.Draw(strip)
    for row,seq in enumerate(displayRows):
        for col,i in enumerate(seq):
            im=textures[i];x=col*cw;y=row*ch;strip.paste(im,(x,y),im.getchannel('A'));g.text((x+8,y+8),str(i),fill=(65,65,55))
    strip.resize((1600,strip.height//2)).save(out/f'{key}-continuity.jpg',quality=92)
    contact=Image.new('RGB',sheet.size,(185,187,177));contact.paste(sheet,mask=sheet.getchannel('A'));g=ImageDraw.Draw(contact)
    for i,f in enumerate(frames):
        x=i%4*cw;y=i//4*ch;g.text((x+8,y+8),str(i),fill=(60,60,55));g.line((x,y+360,x+cw,y+360),fill=(140,150,125),width=1)
        hx,hy=f['head'];g.ellipse((x+hx-3,y+hy-3,x+hx+3,y+hy+3),fill=(195,115,70))
    contact.resize((1280,round(contact.height/2))).save(out/f'{key}-contact.jpg',quality=92)
    # Metadata is expressed in final runtime pixels, not calculation pixels.
    for f in frames:
        for name in ['bounds','head','chin']:
            f[name]=[round(v*.8,3) for v in f[name]]
        for name in ['baseline','anchorX']:
            f[name]=round(f[name]*.8,3)
        f['mass']=round(f['mass']*.64,2)
    art['referenceWidth']=round(art['referenceWidth']*.8,3)
    art['cellWidth']=512;art['cellHeight']=320
    if 'baseline' in art:art['baseline']=round(art['baseline']*.8,3)
    if 'anchorX' in art:art['anchorX']=round(art['anchorX']*.8,3)
    reports[key].update(cellWidth=512,cellHeight=320,decodedBytes=runtimeSheet.width*runtimeSheet.height*4,bridgeIntermediateCount=9,measurementResolution='640x400 contour calculation')
(out/'metadata.json').write_text(json.dumps(meta,separators=(',',':')))
(out/'continuity.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports,indent=2))
