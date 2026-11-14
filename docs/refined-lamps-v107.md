# Refined lamp assets — CATLIGHT06 v107

## Scope and rendering

Four retained additions replace the v106 procedural placeholders with independent transparent photographic material renders. The original seven lamps are unchanged. The product key `gubi1965` remains compatible with stored settings, but the depicted model is **GUBI Semi**, not the GUBI 1965 model.

| Stored key | Depicted model | Manufacturer body dimensions | Display dimensions | Material |
| --- | --- | --- | --- | --- |
| ph5 | Louis Poulsen PH 5, Hues of Orange / coral reference | Ø500 × H267 mm | 80 × 42.72 | Satin painted spun metal; separate warm reflectors |
| caravaggio | Fritz Hansen Caravaggio P2 | Ø258 × H337 mm | 33.685 × 44 | High-gloss black lacquer, precise studio reflections |
| gubi1965 | GUBI Semi | Ø470 × H235 mm | 76 × 38 | Matte off-white powder coat, softly shaded concave quarter-circle volume |
| jazz | Vibia Jazz 1336 | Ø260 × H640 mm | 17.875 × 44 | Gloss white lacquer, narrow chrome diffuser ring |

These are image-generated material assets guided by the uploaded reference sheets and existing realistic fixture atlas, **not official manufacturer photographs or engineering models**. The renderer enforces the measured rest width/height ratios independently of transparent image padding. A small continuous pose response matches the existing scene. The lamp emission is masked separately from the material, so changing light colour does not recolour the entire white Jazz body or black lacquer.

Source artwork is preserved at full resolution as lossless WebP. Initial decode creates one 640 px body texture and 192 px light/reflection masks per lamp. Subsequent draws reuse these surfaces; images are not decoded every frame. No generic thick glowing ellipse is appended below the product.

## Reference sources checked November 5, 2026

- Louis Poulsen official PH 5: https://www.louispoulsen.com/en/c/indoor-lighting/pendants/90293?v=90293-5741944860-03 — body size 500 × 267 mm; spun copper/brass/aluminium shades, steel lower shade, frosted glass diffuser; painted Hues variants.
- Fritz Hansen official Caravaggio P2: https://www.fritzhansen.com/en/categories/by-series/caravaggio/caravaggio-p2 — Cecilie Manz curved pendant; high-gloss finish.
- Fritz Hansen manufacturer product fact sheet (2023, distributor-hosted copy): https://andlight.fi/images/pdf%20filer%20til%20produkter/FH_Product%20fact%20sheet_Caravaggio_2023.pdf — P2 Ø258 × H337 mm, high-gloss black/BlackBlack, steel/aluminium body.
- GUBI official Semi Pendant: https://gubi.com/en/us/products/semi-pendant?variant=10115813 — two quarter-circles back to back; enamelled metal; Ø470 × H235 mm option; shape and proportions reference; final owner-selected finish is matte white.
- Vibia official Jazz 1336 assembly instructions: https://vibia.com/workspace/img/attachments/article/1336/1336_col_man_eur.pdf — model 1336, glass diffuser and retaining ring construction.
- Vibia manufacturer 2016 catalogue (distributor-hosted copy): https://www.eikelenboom.nl/wp-content/uploads/2016/03/Vibia-Catalogus-2016_Small1.pdf — Jazz 1336 profile/proportions, high-gloss white family.

## Asset generation

Built-in image generation was used, with the supplied contact sheet and existing lamp atlas as explicit references. Each prompt required a single photorealistic transparent cutout, no cable/canopy, no outside halo or background, a restrained warm inner diffuser, measured body proportions, and refined material detail. Model-specific requirements:

- PH 5: pale coral small upper dish, broad orange/copper middle shade, off-white reflector, ochre lower bowl; slender visible supports and realistic self-occlusion.
- Caravaggio: tall 258:337 bell; deep black high-gloss lacquer with ceramic-glaze-like narrow curved highlights; small steel suspension bracket; no matte gradient finish.
- Semi: exact 2:1 body ratio and concave quarter-circle sides; one geometry refinement increased the neck-to-rim height. Following the owner’s latest direction, a separate material edit replaced green gloss with fine matte off-white powder coat, broad soft lighting, subtle inner occlusion, and a shaded thin rim. The material edit preserved the geometry and transparent background; dynamic reflection strength was reduced from 0.10 to 0.015.
- Jazz: tall narrow 260:640 body; white lacquer long concave neck and rounded lower bell; thin chrome ring and frosted diffuser.

Files: `dist/refined-fixtures.js` and `dist/materials/refined/{ph5,caravaggio,gubi-semi,jazz}.webp`.
