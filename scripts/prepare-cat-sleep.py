"""Package generated kitten alpha cells; no anatomical deformation or contour blending.
Each source is an eight-frame 2x4 plate. Connected components locate whole
silhouettes even where a generated grid baseline drifts across a nominal cell.
A single scale per source plate normalizes its drawing scale at the seam.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from scipy.ndimage import label,find_objects
import numpy as np,json
root=Path(__file__).resolve().parents[1]
outdir=root/'dist/cat-sleep';cw,ch=640,400;base=360

def extract(path):
    im=Image.open(path).convert('RGBA');aa=np.asarray(im)[:,:,3]
    lab,n=label(aa>32);objects=[]
    for j,s in enumerate(find_objects(lab)):
        count=np.count_nonzero(lab[s]==j+1)
        if count>3000:
            objects.append((s,count))
    assert len(objects)==8,(path,len(objects))
    objects.sort(key=lambda item:(round((item[0][0].start+item[0][0].stop)/2/(im.height/4)-.5),item[0][1].start))
    frames=[]
    for s,_ in objects:
        x0=max(0,s[1].start-4);x1=min(im.width,s[1].stop+4)
        y0=max(0,s[0].start-4);y1=min(im.height,s[0].stop+4)
        frame=im.crop((x0,y0,x1,y1))
        a=np.asarray(frame)[:,:,3]/255.;yy,xx=np.indices(a.shape)
        frames.append({'im':frame,'mass':float(a.sum()),'cx':float((xx*a).sum()/a.sum()),'foot':s[0].stop-y0})
    return frames

meta={'variants':{}};report={}
for key in ['curl','side']:
    groups=[extract(outdir/'source'/f'{key}-{part}.png') for part in ['settle','rest','wake']]
    # Preserve true scale within each authored motion segment.
    scales=[1.0]
    for i in [1,2]:
        ratio=(groups[i-1][-1]['mass']/groups[i][0]['mass'])**.5
        scales.append(scales[-1]*ratio)
    fit=min(1.,min(574/(f['im'].width*s) for g,s in zip(groups,scales) for f in g),min(326/(f['im'].height*s) for g,s in zip(groups,scales) for f in g))
    sheet=Image.new('RGBA',(cw*4,ch*6));frames=[];masks=[]
    for gi,(group,s) in enumerate(zip(groups,scales)):
        for j,f in enumerate(group):
            scale=s*fit;i=gi*8+j
            w=round(f['im'].width*scale);h=round(f['im'].height*scale)
            tile=f['im'].resize((w,h),Image.Resampling.LANCZOS)
            x=round(cw*.5-f['cx']*scale);y=round(base-f['foot']*scale)
            assert x>=0 and y>=0 and x+w<cw and y+h<ch,(key,i,x,y,w,h)
            canvas=Image.new('RGBA',(cw,ch));canvas.paste(tile,(x,y))
            a=np.asarray(canvas)[:,:,3];ys,xs=np.where(a>32)
            bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
            # Find top of the head in the forward quarter of the body, then
            # choose a forehead point to the right of the ear tip.
            xx0=int(bounds[0]+.67*(bounds[2]-bounds[0]));xx1=int(bounds[0]+.88*(bounds[2]-bounds[0]))
            top=[]
            for xx in range(xx0,xx1):
                yy=np.where(a[:,xx]>96)[0]
                if len(yy):top.append((int(yy[0]),xx))
            earY,earX=min(top)
            hx=round(bounds[0]+.78*(bounds[2]-bounds[0]))
            hy=int(np.where(a[:,hx]>96)[0][0])+2
            chinY=min(base-12,hy+round((bounds[2]-bounds[0])*.23))
            # A smoothed row profile excludes single-whisker spikes.
            profile=np.mean(a[max(0,chinY-3):chinY+4],axis=0)
            candidates=np.where(profile>190)[0]
            chinX=int(candidates.max()) if len(candidates) else bounds[2]-12
            frames.append({'bounds':bounds,'baseline':base,'anchorX':cw*.5,'head':[hx,hy], 'chin':[chinX,chinY], 'mass':round(float((a/255.).sum()),2)})
            sheet.paste(canvas,(i%4*cw,i//4*ch));masks.append(a>96)
    sheet.save(outdir/f'{key}.webp',lossless=True,method=6)
    ious=[]
    for a,b in zip(masks,masks[1:]):ious.append(round(float(np.logical_and(a,b).sum()/np.logical_or(a,b).sum()),4))
    meta['variants'][key]={'file':f'cat-sleep/{key}.webp','label':'蜷卧入睡' if key=='curl' else '侧卧入睡','columns':4,'rows':6,'cellWidth':cw,'cellHeight':ch,'referenceWidth':frames[0]['bounds'][2]-frames[0]['bounds'][0],'frames':frames,'settle':list(range(12)),'sleep':[12,13,14,15,14,13],'wake':list(range(16,24)),'pet':[12,16,17,18,17,16,12],'headMeaning':'forehead outer-contour contact, source-cell pixels','facing':'right'}
    report[key]={'nativeSources':3,'frameCount':24,'segmentScales':[round(s*fit,4) for s in scales],'adjacentIoU':ious,'lowestAdjacentIoU':min(ious),'seamIoU':{'7to8':ious[7],'15to16':ious[15]}}
    preview=Image.new('RGB',sheet.size,(185,187,177));preview.paste(sheet,mask=sheet.getchannel('A'));draw=ImageDraw.Draw(preview)
    for i,f in enumerate(frames):
        xx=i%4*cw;yy=i//4*ch
        draw.text((xx+8,yy+8),str(i),fill=(60,60,55));draw.line((xx,yy+base,xx+cw,yy+base),fill=(140,150,125),width=1)
        hx,hy=f['head'];draw.ellipse((xx+hx-3,yy+hy-3,xx+hx+3,yy+hy+3),fill=(195,115,70))
    preview.resize((1280,1200)).save(outdir/f'{key}-contact.jpg',quality=92)
(outdir/'metadata.json').write_text(json.dumps(meta,separators=(',',':')))
(outdir/'quality.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
