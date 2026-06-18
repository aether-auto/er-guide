# Build Optimizer

**Date:** 2026-06-18
**Status:** Approved (design)
**Feature:** #4 of a four-feature batch

## Problem

The guide tells you *where* every item is, but offers no help deciding *what to
use*. Players routinely tab out to ThomasJClark's weapon calculator to find the
best weapon/affinity for their stats. There's an opportunity to bring that in —
and tie it back to the route (where to find each recommendation).

## Goal

A `/build` page where the user enters their character stats (and optionally
level + talismans) and gets, ranked by computed **Attack Rating (AR)**:
- best weapons overall, and best per damage type;
- best weapons per status-effect buildup;
- best sorceries and incantations.

Everything respects the user's stats (requirement-gated by default), and each
recommendation links back into the route — "where to find it."

## Ranking metric (set expectations)

Results rank by **Attack Rating**, the standard community/calculator metric.
Per-move *motion values* (damage-per-swing) are **out of scope** — the UI states
this plainly so nobody mistakes AR for per-hit damage.

## Data sources & licensing

- **Weapons (core):** `ThomasJClark/elden-ring-weapon-calculator`'s
  `public/regulation-vanilla-v1.14.js` — **MIT**, ~1.07 MB (~380 KB gzipped),
  raw JSON. Covers all 3,216 weapon variants **including all SotE DLC**. Single
  self-contained file with every table needed (calcCorrectGraphs,
  attackElementCorrects, reinforceTypes, statusSpEffectParams, scalingTiers).
  Vendored into the repo with its MIT LICENSE + attribution.
- **Spells:** spell damage is `spellBaseAR × (tool spellScaling ÷ 100)`, a
  different path from weapons. Spell **base-AR/requirement/FP data** is sourced
  as factual game data (the same footing as our existing `items.json` sources —
  we use *data only*, never GPL-licensed code). The readily-available community
  spell dataset is base-game-complete but **missing ~30+ DLC spells**; per the
  approved decision we **fill the DLC gap** so sorceries + incantations are
  complete. Staff/seal scaling is computed by the same weapon engine (staves and
  seals are weapons in the regulation data).
- **Talismans:** not present in any source. A small hand-authored
  `talismans.ts` table (~20–30 damage-relevant talismans) encodes stat bonuses
  and post-calc AR multipliers (e.g. Shard of Alexander, Ritual Sword Talisman,
  Godfrey Icon, Magic-/Fire-/etc.-Scorpion Charms).

## Architecture

### `src/lib/weaponCalc/` — ported MIT engine (~400 lines, zero deps)
Port verbatim (with light renaming + an attribution header pointing at the MIT
source), preserving the upstream LICENSE in the directory:
- `attackPowerTypes.ts`, `attributes.ts`, `weaponTypes.ts` — enums/types.
- `weapon.ts` — `Weapon` / `AttackElementCorrect` interfaces.
- `regulationData.ts` — `evaluateCalcCorrectGraph()` (builds the 149-element
  softcap lookup per graph id) and `decodeRegulationData()` (expands the compact
  JSON into a `Weapon[]`, applying reinforcement multipliers to produce
  per-upgrade-level attack + scaling arrays, and the status param ID offsets).
- `calculator.ts` — `getWeaponAttack()` and `adjustAttributesForTwoHanding()`
  (two-handing = `floor(STR × 1.5)`; bows always two-handed; status types never
  get the STR bonus).

**AR formula (per attackPowerType):**
`baseAP × totalScaling`, where `totalScaling` starts at 1 (or `1 − 0.4` if
requirements unmet) and adds, per scaling attribute,
`calcCorrectGraph[type][statValue] × weapon.attributeScaling[level][attr]`.
Status buildup uses `statusSpEffectParams[baseId + levelOffset]` amplified by
arcane through the same curve (graph id 6).

### `src/lib/buildOptimizer.ts` — ranking layer (written fresh)
- `rankWeapons(stats, { twoHanding, upgrade='max', talismans, metRequirementsOnly })`:
  for each **base weapon name**, evaluate every affinity variant via
  `getWeaponAttack()` at max upgrade (+25 standard / +10 somber), pick the
  **best affinity for this build**, apply talisman effects, return entries
  sorted by total AR.
- `rankByDamageType(...)` → physical / magic / fire / lightning / holy.
- `rankByStatus(...)` → bleed / frost / poison / scarlet-rot / sleep / madness,
  ranked by buildup value.
- `rankSorceries(...)` / `rankIncantations(...)`: pick the user's best
  staff/seal (highest spellScaling for the relevant school), then rank spells by
  `spellBaseAR × scaling`, requirement-gated.
- Filtering: exclude non-weapons (shields/torches/unarmed) by `weaponType`;
  `metRequirementsOnly` defaults true with a show-all toggle in the UI.

### `src/lib/talismans.ts` — curated effects table (written fresh)
`{ id, name, statBonus?, arMultiplier?, condition? }`. Stat-bonus talismans feed
into the stat block before calc; multiplier talismans apply post-calc. Condition
text (e.g. "at full HP") is shown but assumed active.

### `src/pages/BuildPage.tsx` — UI (new route `/build`)
- **Input:** level + the 5 damage stats (STR/DEX/INT/FAI/ARC). A note clarifies
  VIG/MIND/END don't affect AR (collected only if useful for level display).
  Two-hand toggle. Optional talisman multiselect. "Show items I can't use yet"
  toggle (off by default).
- **Results:** tabbed sections (Weapons · By damage type · By status · Sorceries
  · Incantations), each a ranked list showing name, best affinity, AR (and
  per-type / buildup breakdown), requirements, and a **"where to find it"** link.
- Styling consistent with existing pages (Tailwind tokens, `font-display`, etc.).

### Route integration — "where to find it"
`src/lib/buildLinks.ts`: normalize a regulation/spell name → match against
`items.json` (via `itemsById` / a normalized-name index) → return the route
position (`itemPosition`) when matched. Results render a link to the
region/leg + map focus when found; gracefully omit the link when not.

## Performance / bundling
- The ~380 KB-gzipped regulation data and the engine load **only on `/build`**:
  lazy-load the route (`React.lazy`) and fetch/import the data as a separate
  chunk so the map experience is unaffected.
- Decoding `regulationData` once on page mount (memoized) is sufficient; ranking
  is O(weapons) per stat change and fine to run on input.

## Testing
- `weaponCalc`: a handful of golden-value tests — pick known weapons at known
  stats/upgrades and assert AR matches the upstream calculator's published
  numbers (e.g. a +25 Heavy weapon at a given STR; a status weapon's buildup at
  max). This validates the port.
- `buildOptimizer`: ranking returns expected ordering for a sample build;
  requirement-gating filters correctly; best-affinity selection works.
- `talismans`: multiplier + stat-bonus application.
- `buildLinks`: name normalization matches representative items.

## Files touched
- **Add:** `src/lib/weaponCalc/*` (ported + LICENSE), `src/lib/buildOptimizer.ts`,
  `src/lib/talismans.ts`, `src/lib/spellData.ts` (+ DLC backfill),
  `src/lib/buildLinks.ts`, `src/pages/BuildPage.tsx`, vendored `public/regulation*.js`
  (or a `src/data` module), plus tests.
- **Edit:** `src/App.tsx` (lazy `/build` route), `src/components/TopBar.tsx`
  (nav link), `README.md` (attribution for the MIT calc data).

## Risks
- **Golden-value accuracy:** the port must match the source calculator; covered
  by golden tests. Mitigate by porting verbatim rather than reinterpreting.
- **DLC spell backfill** is hand-sourced data — the one piece without a
  single clean upstream; validate counts against a known DLC spell list.
- **Name matching** for "where to find it" is best-effort; unmatched results
  simply omit the link (no hard failure).
- **Bundle size** is contained by lazy-loading; verify `/build` is a separate
  chunk and the map bundle is unchanged.
