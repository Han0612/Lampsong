from pathlib import Path
import json,mimetypes,hashlib
root=Path(__file__).resolve().parents[1]/'dist'
extensions={'.js','.css','.woff2','.png','.jpg','.webp','.m4a'}
files=[]
for p in sorted(root.rglob('*')):
    if any(part in {'client','server','.openai','_appgen_meta'} for part in p.relative_to(root).parts):continue
    if p.name.startswith('qa-'):continue
    if p.suffix not in extensions or p.name in ('asset-preload.js','review.js','review.css'):continue
    files.append({'path':p.relative_to(root).as_posix(),'revision':hashlib.sha256(p.read_bytes()).hexdigest()[:12],'bytes':p.stat().st_size,'type':mimetypes.guess_type(p)[0] or 'application/octet-stream'})
files.sort(key=lambda f: f['path']!='cat-motion/sneak.webp')
(root/'preload.json').write_text(json.dumps({'files':files},ensure_ascii=False,separators=(',',':')))
print(len(files),'assets',round(sum(f['bytes'] for f in files)/1024**2,1),'MiB')
