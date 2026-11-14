# Sleep kitten redraw — current CATLIGHT06

The sleep animation is fully redrawn against `cat-stills/kitten-original.png` as the character reference. Two compact opaque silhouette atlases retain the fluffy neck, short muzzle, rounded head and small paws:

- `curl-redrawn.webp`: 24 source poses, from crouch to grounded sleep and a separate matched continuation curling into a round sleeping ball.
- `side-redrawn.webp`: 16 source poses, from crouch to relaxed elongated sleep, cheek on forepaws and tail resting on the floor.

Only actual source poses are sampled. There are no optical-flow or generated contour interpolation frames. Waking reverses each matching settling route so the first wake silhouette equals the last sleep silhouette. Clicking uses a brief subset of that matched route and returns to the exact resting pose. A tiny floor-anchored breathing cycle preserves the rest outline; periods differ between sleep styles.

## Scale and alignment

Runtime uses the same `min(stage, width*.54) * 1.26 * ratio/100` size basis as `CatPaw`. The unchanged native run sprites use their original `pose.sizeReference`; the new sheets use standing-frame alpha-area square root as their consistent reference. A fixed percentile is chosen once per visit and evaluated against the current size range on every layout, so slider edits apply while the cat sleeps. No independent sleep-only clamp is applied.

Packing crops only transparent padding, aligns every frame to the same floor baseline, preserves one source scale per action, and aligns the curled continuation by alpha mass and center. It does not stretch individual heads or limbs. The source sheets are in `source/*redrawn-v124.png`; `scripts/pack-sleep-redraw.mjs` rebuilds the packed atlases. The source generation prompt requested mother-identical kitten anatomy, black opaque side-profile silhouettes, transparent background, equal cells and natural grounded sleep transitions.

## Validation

All frames stay inside the atlas cells. Native and sleep percentage formulas, live slider response, stable random percentile, and settle/sleep/wake/pet route validity are checked. The native-run to first redrawn settle pose remains a transition between two independently authored actions and should be visually assessed at runtime; numerical normalization alone does not guarantee a perfect anatomical match.
