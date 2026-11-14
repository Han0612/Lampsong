# CATLIGHT06 v107 — cat contour and penumbra correction

## Faults corrected

1. v106 selected the preceding authored drawing for the first half of an interval and the following drawing for the second half. Optical-flow errors therefore became an instantaneous silhouette replacement at `t=.5`. It also rounded animation poses to six steps per authored interval.
2. Cat shadows averaged eight displaced copies with additive alpha. That sparse aperture made visible alpha terraces under a bright lamp.
3. A completed worker image could lag the requested motion phase while its supporting paw was positioned using the newer phase, producing a small vertical mismatch.

## Resulting pipeline

- All 27 original WebP atlases remain unchanged in this release.
- Each interval now uses bidirectional geometric correspondences and a **single continuously interpolated signed-distance contour**. RGB detail is sampled in the corresponding geometry; alpha is reconstructed from that one contour. There is no nearest-source midpoint switch and no stack of two faded outlines.
- Re-measured 48×32 vector fields. A bounded horizontal registration correction removes high-frequency torso alignment jitter (maximum three logical pixels at 384-pixel sampling). It does not normalize away intentional foreshortening, body poses or supporting-paw height.
- Runtime phase precision increased from 1/6 to 1/60 of an authored interval. A smaller, continuous tail displacement tapers to zero before the hip.
- Supporting-paw placement now uses the **rendered** worker phase in both the main scene and the material gallery.
- Cat light-following projection now draws one affine silhouette and applies a continuous Gaussian penumbra. Removed the eight additive shadow copies.
- A pending first bake holds one authored pose. Returning gallery clips retain a small last interpolated bitmap while their source is restored; temporary buffer gaps do not alternate between smooth and raw frame playback. Full source caches stay bounded at three/main and eight/gallery; at most 32 small held output bitmaps.
- Flow requests revalidate the static binary files so an older cached metadata format cannot be paired with the new worker.

## Verification

`node tests/cat-motion-quality.cjs` executes the real worker drawing functions with a native Canvas backend and checks every interval in all 27 clips: **592 intervals**.

- Maximum alpha change across `.499 → .501`: **0.0376% of the frame**.
- Maximum alpha change across authored-interval endpoints: **0.0372% of the frame**.
- A penumbra scan contains **38 intermediate alpha levels**, rather than eight discrete aperture layers.
- Against the v106 midpoint replacement, median per-clip discontinuity falls by **99.24%**. The before/after contact sheet includes turns, jumping, walking, stretching and washing. These numerical checks target discontinuities; they do not claim that generated drawings have perfect anatomy.

Cloud Chrome, one cat, 60 timer-scheduled samples with the first 15 warmup:

- Complete main-thread cat shadow draw P95: **6.6 ms**.
- Worker contour/texture synthesis P95: **15.3 ms**.
- No application errors during this check. Canvas filtering is active in this browser.

The browser's background rAF is throttled, so these are local draw costs, **not device or full-scene FPS**. More faithful contour reconstruction costs more worker time than the v106 nearest-frame warp. Older browsers without Worker/OffscreenCanvas use the authored-keyframe fallback. Very fine translucent fur/whiskers are softened by contour reconstruction; the body silhouette, scale and source artwork are retained.

Other checks: `tests/cat-motion-cache.cjs` (stable first bake, held image, blob keys, stale generations, bitmap release), `tests/cat-motion-continuity.cjs`, `tests/cat-random.cjs`, changed JavaScript syntax, and `git diff --check`.

Temporary browser harness: `dist/qa-cat-v107.html` (exclude from deployment).
Reproducible motion measurement: `scripts/measure-cat-flow.py` (OpenCV/Pillow/NumPy build-time only).
