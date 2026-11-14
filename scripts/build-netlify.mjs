import fs from 'node:fs';
const seed=JSON.parse(fs.readFileSync('netlify/seed.json','utf8'));
for(const mode of ['pure','combined','floating'])if(seed.defaults?.[mode]?.settings?.mode!==mode)throw Error('Missing migrated default '+mode);
for(const mode of ['pure','combined','floating']){const s=seed.defaults[mode].settings;s.coverBackground??=true;s.coverBlur??=24;s.coverDim??=86;}
let worker=fs.readFileSync('dist/server/index.js','utf8');
worker=worker.replace(/^const SEED=.*;$/m,'const SEED='+JSON.stringify(seed.defaults)+';');
fs.mkdirSync('.netlify/generated',{recursive:true});
fs.writeFileSync('.netlify/generated/worker.mjs',worker);
// This changes only the initial fallback, never overwrites a Netlify saved default.
console.log('Prepared Netlify API with three migrated modes and independent persistent storage.');
