"""Pack generated transparent cells without changing their anatomy or fur alpha."""
from PIL import Image
from pathlib import Path
import numpy as np, json
root=Path(__file__).resolve().parents[1]
meta={}
for name in ('low','sit','upper'):
    source=root/'art-source/cat-exits'/f'{name}.png'
    if not source.exists():continue
    im=Image.open(source).convert('RGBA');cw,ch=im.width//4,im.height//4
    out=Image.new('RGBA',(2304,1536));frames=[]
    for i in range(16):
        crop=im.crop((i%4*cw,i//4*ch,(i%4+1)*cw,(i//4+1)*ch))
        frame=crop.resize((576,384),Image.Resampling.LANCZOS)
        out.paste(frame,(i%4*576,i//4*384))
        a=np.asarray(frame.getchannel('A'),dtype=float)/255
        ys,xs=np.where(a>.12)
        assert len(xs)>100 and min(xs)>0 and max(xs)<575 and min(ys)>0 and max(ys)<383,(name,i,'clipped')
        total=a.sum();xx,yy=np.meshgrid(np.arange(576),np.arange(384))
        frames.append({'foot':round((ys.max()+1)/.375,2),'cx':round((xx*a).sum()/total/.375,2),'cy':round((yy*a).sum()/total/.375,2),'mass':round(total**.5/.375,2),'bounds':[round(xs.min()/.375),round(ys.min()/.375),round((xs.max()+1)/.375),round((ys.max()+1)/.375)]})
    out.save(root/'dist/cat-motion'/f'exit-{name}.webp',lossless=True,method=6)
    # Reference mass of entry frames preserves the size at the splice; do not
    # independently resize foreshortened turn drawings.
    meta[name]={'file':f'cat-motion/exit-{name}.webp','frames':frames,'reference':round(float(np.median([f['mass'] for f in frames[:3]])),2)}
(root/'dist/cat-exit-meta.js').write_text('const catExitArt='+json.dumps(meta,separators=(',',':'))+';\n')
print('Prepared:',', '.join(meta))
