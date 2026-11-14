"""Measure motion vectors; no artwork pixels are modified by this script.
Original keyframes remain the source of truth. Browser interpolation morphs
one continuous signed-distance silhouette using bidirectional motion vectors.
Requires opencv-python-headless, Pillow, NumPy (build-time only).
"""
from pathlib import Path
from PIL import Image
import cv2,numpy as np,struct,json
root=Path(__file__).resolve().parents[1];out=root/'dist/cat-motion-flow';out.mkdir(exist_ok=True)
GW,GH=48,32;W,H=192,128
summary={}
for path in sorted((root/'dist/cat-motion').glob('*.webp')):
 im=Image.open(path).convert('RGBA');count=(im.height//384)*4
 frames=[];anchors=[]
 for i in range(count):
  a=np.asarray(im.crop((i%4*576,i//4*384,(i%4+1)*576,(i//4+1)*384)).resize((W,H),Image.Resampling.LANCZOS))
  # Alpha provides stable shape correspondence even for a black silhouette.
  lum=cv2.cvtColor(a[:,:,:3],cv2.COLOR_RGB2GRAY)
  alpha=a[:,:,3]
  body=cv2.distanceTransform((alpha>180).astype(np.uint8),cv2.DIST_L2,3)
  weight=np.maximum(body-9,0)**2
  xx=np.arange(W)[None,:]
  anchors.append(float((xx*weight).sum()/max(1,weight.sum())))
  frames.append((alpha*.75+lum*(alpha/255)*.25).astype(np.uint8))
 # Correct only high-frequency horizontal registration jitter. Vertical support
 # paws and intentional changes of scale/foreshortening stay in the drawings.
 # Median correction is capped at 1.5 source pixels, never rigidly locks a turn.
 padded=np.pad(anchors,(2,2),mode='edge')
 smooth=[float(np.median(padded[i:i+5])) for i in range(count)]
 shifts=[max(-1.5,min(1.5,(b-a)*.75)) for a,b in zip(anchors,smooth)]
 frames=[cv2.warpAffine(f,np.float32([[1,0,dx],[0,1,0]]),(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT) for f,dx in zip(frames,shifts)]
 registration=np.array([[round(dx*32),0] for dx in shifts],dtype='<i2')
 nexts=[];vectors=[]
 for i in range(count):
  nxt=i+1
  if path.stem=='exit-upper' and i==count-1:nxt=i
  elif path.stem.startswith('exit-') and i==count-1:nxt=8
  elif path.stem.split('-')[0] in ('leap','arch','land') and i in (23,31):nxt=i-7
  elif path.stem.split('-')[0]=='kick' and i==count-1:nxt=16
  elif nxt==count:nxt=0
  nexts.append(nxt)
  fs=[]
  for a,b in [(frames[i],frames[nxt]),(frames[nxt],frames[i])]:
   flow=cv2.calcOpticalFlowFarneback(a,b,None,.5,4,25,5,7,1.5,0)
   flow=cv2.resize(flow,(GW,GH),interpolation=cv2.INTER_AREA)
   fs.append(np.clip(np.rint(flow*32),-32767,32767).astype('<i2')) # 2x source scale, 1/16 render pixel
  vectors.append(np.concatenate(fs,axis=2))
 data=struct.pack('<4sHHHH',b'CMF2',GW,GH,count,384)+bytes(nexts)
 if len(data)%2:data+=b'\0'
 data+=registration.tobytes()+np.stack(vectors).tobytes()
 (out/(path.stem+'.bin')).write_bytes(data)
 summary[path.stem]={'frames':count,'intermediateSamples':6,'bytes':len(data),'maxRegistrationPixels':round(max(map(abs,shifts))*2,2)}
 print(path.stem,count,len(data),flush=True)
(out/'manifest.json').write_text(json.dumps(summary,separators=(',',':')))
