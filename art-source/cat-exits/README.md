# Natural cat departures

Three independent transparent 16-drawing atlases generated on 2026-11-04.
Original PNG outputs are retained here. `scripts/prepare-cat-exits.py` uniformly
resamples and packs cells; it does not warp anatomy or remove fur contours.
Runtime WebP files retain alpha and the same dark-plum fur treatment.

Art brief: one plump fluffy kitten matching the existing cat, complete body,
transparent background, no ground or cast shadow, no labels or cell borders.
4 × 4 sequential animation drawings with equal cell dimensions and room around
the fur. Head, shoulders and hips turn in sequence, without stretched necks or
limbs. First eight drawings retract and turn; final eight make a forward gait.

- low: crouched reaching kitten, retract paw, look over shoulder, pivot to face
  left, then walk left. Used for reaching, tapping and stretching visitors.
- sit: seated kitten, lower raised paw, glance left, shift weight, rise and turn,
  then walk left. Used for listening, high tapping and washing visitors.
- upper: overhead hanging kitten, gather dangling paws, climb back and turn
  away, then crawl diagonally upward. Used for the upper-edge visitor.

Runtime matches incoming alpha mass and paw contact at the splice, retains a
uniform scale throughout the turn and uses distance-driven gait after turning.
Both A/B idle variants share the appropriate departure family. No crossfade,
backwards translation or geometry morph is used for the turn.

Validation: 28 combinations (7 postures × A/B × 25/45 size) were advanced through
arrival, hold, retraction and full departure with the native canvas renderer;
all completed with finite transforms. Transparent alpha and uncut cell borders
were checked during packing. Browser preview checked for script errors.

2026-11-04 behavior update: listen, swat and wash keep their lower body hidden
and retract below the viewport after gathering the paw/head. The sit atlas is
retained as source material but is no longer selected for these departures.
All twelve poses now draw left/right from per-pose shuffled pairs. Edge placement
optimizes height only within the selected side. Random pose selection validates
against the last shown pose, including stale prefetched candidates and late loads.
