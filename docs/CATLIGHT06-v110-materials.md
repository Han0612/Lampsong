# v110 material refinement

## GUBI Semi
- Verified official white Semi Ø47 × H23.5 cm product source: https://gubi.com/en/us/products/semi-pendant?variant=10015264
- Official manufacturer reference image: https://cdn.thorcommerce.io/gubi/6e1389a22a880756cbe0137ddf47b950/10015264_FRT_Semi-Pendant_%C3%9847_White-Semi-Matt.png?format=webp&upscale=false&width=1920
- New generated material asset corrects the prior thick cylindrical neck to the product's slender quarter-circle concave shape, a wafer-thin flared rim and a tiny white cable strain relief. Matte white broad highlight/shadow preserved; no counterweight. Draw dimensions unchanged here; scene scaling is handled by the main integration.
- Built-in image generation, using prior asset as edit target and official image as shape reference. Prompt requested 2:1 body, slender high neck and two concave quarter-circle profiles, thin underside ellipse, tiny white cable sleeve, matte ivory powder-coated metal, upper-left highlight and right shade, restrained warm underside; transparent background, no canopy/counterweight/long cord/text/external shadow.
- Generated original: /workspace/scratch/26573d1c1176/generated_images/exec-642c884c-ab8b-4f2a-b7b6-40e489dbad93.png. Converted losslessly to dist/materials/refined/gubi-semi.webp. Alpha threshold checks found a single connected body with 96-level bbox (113,71)-(1660,831), no stray opaque components. This remains a generated reference-guided asset, not an official engineering model.

## Disco
- Same real-time rotating mesh and public draw API. Colored reflected room sources (cyan, magenta, amber, violet), narrow white glints, angle-dependent rim response and stronger front-to-edge volume replace nearly monochrome mirror lighting.
- Planar tile normal variation and fixed per-tile reflectivity variation remain attached to physical facets as the ball turns, avoiding frame-random glitter. CPU fallback and GPU shader use equivalent material formulas.
- Mesh counts tuned for readability at 64px visible diameter: GPU 24×48, Canvas fallback 20×40. The small reusable render surfaces and pose cache remain unchanged. No sequence frames or added shadow overlays.
- GUBI and ball inspected in browser at 3.5×/4.5× enlarged view and scene scale, three ball phases. Cloud uses Canvas fallback; native WebGL appearance still requires device acceptance.

## Checks
- JavaScript syntax checks passed both modified renderer files.
- Existing lamp-styles tests passed (style draw paths, geometry, missing-image handling, presets, integrated emission).
- No changes to shared UI, scene dimensions, rotation phase logic, or light color presets in this material subtask.
