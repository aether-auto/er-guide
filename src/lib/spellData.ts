import { AttackPowerType } from './weaponCalc'

/**
 * Spell data for the build optimizer.
 *
 * Spell damage follows a different path from weapons:
 *   effectiveAR ≈ spellBaseAR × (catalyst spellScaling ÷ 100)
 * where the catalyst's spellScaling comes from the weapon engine (staves/seals
 * are weapons in the regulation data), and `spellBaseAR` is the spell's intrinsic
 * base attack power. So this file only needs each spell's base AR, scaling
 * channel, requirements, FP and slots — all factual game data.
 *
 * ── ONE comparable metric (base game + DLC) ──────────────────────────────────
 * `spellBaseAR` = attack power for ONE uncharged cast, summed over the hits that
 * land on a SINGLE target, evaluated at a catalyst spell-scaling of 100 — i.e.
 * effectiveAR == spellBaseAR when the catalyst's spellScaling is exactly 100.
 *
 *   • Base-game values are the datamined `attackRating` from the community
 *     Elden Ring Spell Comparer (jerpdoesgames), summed per single-target cast.
 *   • DLC (Shadow of the Erdtree) values are the datamined "% of spell scaling"
 *     multipliers published on eldenring.wiki.gg / Fextralife (current patch),
 *     converted as spellBaseAR = (total single-target per-cast multiplier) × 100
 *     (e.g. Glintstone Nail 2.16× → 216). The comparer has no DLC entries, so
 *     this is the equivalent native quantity.
 *
 * Both tables are on this same per-cast, single-target, 100-scaling basis, so
 * spells rank consistently within and across the two. (The two derivations use
 * slightly different reference points, so treat cross-table comparisons as
 * roughly ±10–15% rather than exact.)
 *
 * ── EXCLUDES Scadutree Blessing (deliberately) ───────────────────────────────
 * Scadutree Blessing is a Land-of-Shadow-only buff that flatly multiplies ALL of
 * the player's damage — every weapon and every spell, base-game OR DLC — scaling
 * with blessing level (0–20, from Scadutree Fragments). It is NOT a per-spell
 * property and is NOT part of any spell's scaling param, so it is NOT included in
 * `spellBaseAR`. Because it applies uniformly to everything, it never changes the
 * RANKING of spells against each other; it only raises absolute numbers while
 * inside the DLC. Intrinsic AR (what we compute here) is therefore the correct
 * comparable metric for base-game and DLC spells together. The same is true of
 * the weapon AR rankings — all numbers in the optimizer are pre-Scadutree.
 *
 * ── Caveats ──────────────────────────────────────────────────────────────────
 *   • Multi-hit spells assume every hit lands on one target (e.g. Stars of Ruin,
 *     Meteorite of Astel, Rellana's Twin Moons), which favours them vs single-hit
 *     spells — realistic only at point-blank / against large enemies.
 *   • Channeled spells (Comet Azur, Crystal Barrage, Surge O Flame!, dragon-
 *     communion breaths) use a single-tap value, matching the comparer's basis.
 *   • Physical-damage spells that don't scale through an elemental catalyst
 *     channel (Aspects of the Crucible, Divine Bird Feathers, Divine Beast
 *     Tornado, Roar of Rugalea, Furious Blade of Ansbach) are listed with
 *     `damageType: undefined` and excluded from ranking — the engine ranks via
 *     the catalyst's magic/fire/lightning/holy spellScaling channels only.
 *   • `confidence` flags the DLC base-AR sourcing (high = fixed-count hits cleanly
 *     summed; medium = channeled / variable hit count; low = assumed hit count).
 */

export type SpellType = 'sorcery' | 'incantation'

export interface Spell {
  name: string
  type: SpellType
  /** Base attack power for one uncharged single-target cast at 100 catalyst
   *  spell-scaling (pre-Scadutree). See file header for the basis. */
  spellBaseAR: number
  /** Catalyst scaling CHANNEL (selects the catalyst spellScaling used). For
   *  sorceries this is MAGIC (staves scale sorceries through magic) even when the
   *  spell's damage is physical; for incantations it's the primary element. */
  damageType: AttackPowerType
  /** Casting requirements. */
  requirements: { int?: number; fai?: number; arc?: number }
  /** FP cost (uncharged for chargeable spells). */
  fp: number
  /** Memory slots. */
  slots: number
  /** True if from Shadow of the Erdtree. */
  dlc?: boolean
  /** Base-AR sourcing confidence. */
  confidence?: 'high' | 'medium' | 'low'
  /** Short note (e.g. multi-hit / channeled caveat). */
  note?: string
}

const M = AttackPowerType.MAGIC
const F = AttackPowerType.FIRE
const L = AttackPowerType.LIGHTNING
const H = AttackPowerType.HOLY
// Physical-damage spells: no elemental catalyst channel → excluded from ranking.
const PHYS = undefined as unknown as AttackPowerType

// ── Base-game sorceries (datamined per-cast attackRating; see header) ──────────
const baseSorceries: Spell[] = [
  { name: 'Glintstone Pebble', type: 'sorcery', spellBaseAR: 152, damageType: M, requirements: { int: 10 }, fp: 7, slots: 1 },
  { name: 'Great Glintstone Shard', type: 'sorcery', spellBaseAR: 211, damageType: M, requirements: { int: 16 }, fp: 12, slots: 1 },
  { name: 'Glintstone Cometshard', type: 'sorcery', spellBaseAR: 259, damageType: M, requirements: { int: 36 }, fp: 22, slots: 1 },
  { name: 'Comet', type: 'sorcery', spellBaseAR: 292, damageType: M, requirements: { int: 52 }, fp: 30, slots: 1 },
  { name: 'Comet Azur', type: 'sorcery', spellBaseAR: 491, damageType: M, requirements: { int: 60 }, fp: 40, slots: 3, note: 'Sustained beam — single-tap basis' },
  { name: 'Rock Sling', type: 'sorcery', spellBaseAR: 306, damageType: M, requirements: { int: 18 }, fp: 18, slots: 1, note: 'Physical damage; scales off staff magic' },
  { name: "Loretta's Greatbow", type: 'sorcery', spellBaseAR: 270, damageType: M, requirements: { int: 38 }, fp: 22, slots: 1 },
  { name: "Loretta's Mastery", type: 'sorcery', spellBaseAR: 432, damageType: M, requirements: { int: 50 }, fp: 38, slots: 2 },
  { name: 'Stars of Ruin', type: 'sorcery', spellBaseAR: 586, damageType: M, requirements: { int: 43 }, fp: 32, slots: 1, note: 'Multi-hit — all 12 stars on one target' },
  { name: 'Founding Rain of Stars', type: 'sorcery', spellBaseAR: 196, damageType: M, requirements: { int: 52 }, fp: 27, slots: 1, note: "Multi-hit — one target's share" },
  { name: "Ranni's Dark Moon", type: 'sorcery', spellBaseAR: 330, damageType: M, requirements: { int: 68 }, fp: 55, slots: 3, note: 'Excludes frost debuff' },
  { name: 'Rennala’s Full Moon', type: 'sorcery', spellBaseAR: 360, damageType: M, requirements: { int: 60 }, fp: 53, slots: 3 },
  { name: "Adula's Moonblade", type: 'sorcery', spellBaseAR: 322, damageType: M, requirements: { int: 32 }, fp: 26, slots: 1, note: 'Projectile + sword' },
  { name: 'Crystal Barrage', type: 'sorcery', spellBaseAR: 180, damageType: M, requirements: { int: 30 }, fp: 17, slots: 1, note: 'Multi-hit; channeled single-tap basis' },
  { name: 'Shard Spiral', type: 'sorcery', spellBaseAR: 184, damageType: M, requirements: { int: 32 }, fp: 24, slots: 1, note: 'Channeled single-tap basis' },
  { name: 'Gravity Well', type: 'sorcery', spellBaseAR: 140, damageType: M, requirements: { int: 30 }, fp: 22, slots: 1 },
  { name: 'Collapsing Stars', type: 'sorcery', spellBaseAR: 396, damageType: M, requirements: { int: 30 }, fp: 18, slots: 1, note: 'Multi-hit — 9 shards' },
  { name: 'Meteorite of Astel', type: 'sorcery', spellBaseAR: 1450, damageType: M, requirements: { int: 56 }, fp: 30, slots: 2, confidence: 'low', note: 'Multi-hit; assumes all phys+magic rocks land — over-ranks vs realistic' },
  { name: 'Carian Greatsword', type: 'sorcery', spellBaseAR: 268, damageType: M, requirements: { int: 30 }, fp: 18, slots: 1 },
  { name: 'Carian Slicer', type: 'sorcery', spellBaseAR: 180, damageType: M, requirements: { int: 14 }, fp: 8, slots: 1 },
  { name: 'Carian Piercer', type: 'sorcery', spellBaseAR: 287, damageType: M, requirements: { int: 34 }, fp: 18, slots: 1 },
  { name: 'Magic Glintblade', type: 'sorcery', spellBaseAR: 182, damageType: M, requirements: { int: 18 }, fp: 13, slots: 1 },
  { name: 'Glintblade Phalanx', type: 'sorcery', spellBaseAR: 300, damageType: M, requirements: { int: 18 }, fp: 16, slots: 1, note: 'Multi-hit — 5 blades' },
  { name: 'Night Comet', type: 'sorcery', spellBaseAR: 230, damageType: M, requirements: { int: 28 }, fp: 23, slots: 1 },
  { name: 'Ambush Shard', type: 'sorcery', spellBaseAR: 146, damageType: M, requirements: { int: 23 }, fp: 16, slots: 1 },
  { name: 'Scholar’s Armament', type: 'sorcery', spellBaseAR: 0, damageType: M, requirements: { int: 18 }, fp: 17, slots: 1, note: 'Weapon buff, not direct damage' },
]

// ── Base-game incantations (datamined per-cast attackRating; see header) ───────
const baseIncantations: Spell[] = [
  { name: 'Catch Flame', type: 'incantation', spellBaseAR: 225, damageType: F, requirements: { fai: 10 }, fp: 8, slots: 1 },
  { name: 'Flame Sling', type: 'incantation', spellBaseAR: 202, damageType: F, requirements: { fai: 14 }, fp: 14, slots: 1 },
  { name: 'Giantsflame Take Thee', type: 'incantation', spellBaseAR: 325, damageType: F, requirements: { fai: 24 }, fp: 28, slots: 1 },
  { name: 'Whirl, O Flame!', type: 'incantation', spellBaseAR: 384, damageType: F, requirements: { fai: 18 }, fp: 16, slots: 1, note: 'Multi-hit' },
  { name: 'Flame, Fall Upon Them', type: 'incantation', spellBaseAR: 345, damageType: F, requirements: { fai: 26 }, fp: 30, slots: 2, note: 'Multi-hit' },
  { name: 'Black Flame', type: 'incantation', spellBaseAR: 244, damageType: F, requirements: { fai: 20 }, fp: 18, slots: 1, note: 'Plus % current-HP damage over time' },
  { name: 'Black Flame Blade', type: 'incantation', spellBaseAR: 0, damageType: F, requirements: { fai: 22 }, fp: 16, slots: 1, note: 'Weapon buff' },
  { name: 'Surge, O Flame!', type: 'incantation', spellBaseAR: 51, damageType: F, requirements: { fai: 15 }, fp: 8, slots: 1, note: 'Channeled — single tick' },
  { name: 'Lightning Spear', type: 'incantation', spellBaseAR: 234, damageType: L, requirements: { fai: 17 }, fp: 18, slots: 1 },
  { name: 'Honed Bolt', type: 'incantation', spellBaseAR: 205, damageType: L, requirements: { fai: 16 }, fp: 14, slots: 1 },
  { name: 'Lightning Strike', type: 'incantation', spellBaseAR: 246, damageType: L, requirements: { fai: 24 }, fp: 24, slots: 1 },
  { name: 'Ancient Dragons’ Lightning Spear', type: 'incantation', spellBaseAR: 645, damageType: L, requirements: { fai: 32 }, fp: 30, slots: 1, note: 'Bolt + impact' },
  { name: 'Ancient Dragons’ Lightning Strike', type: 'incantation', spellBaseAR: 634, damageType: L, requirements: { fai: 36 }, fp: 38, slots: 2, note: 'Multi-hit' },
  { name: 'Fortissax’s Lightning Spear', type: 'incantation', spellBaseAR: 777, damageType: L, requirements: { fai: 36 }, fp: 42, slots: 2, note: 'Multi-hit' },
  { name: 'Dragonbolt Blessing', type: 'incantation', spellBaseAR: 0, damageType: L, requirements: { fai: 0 }, fp: 30, slots: 1, note: 'Buff' },
  { name: 'Elden Stars', type: 'incantation', spellBaseAR: 619, damageType: H, requirements: { fai: 50 }, fp: 38, slots: 2, note: 'Multi-hit — favourable' },
  { name: 'Black Blade', type: 'incantation', spellBaseAR: 387, damageType: H, requirements: { fai: 38 }, fp: 30, slots: 2, note: 'Plus % max-HP damage' },
  { name: 'Discus of Light', type: 'incantation', spellBaseAR: 300, damageType: H, requirements: { int: 13, fai: 13 }, fp: 14, slots: 1, note: 'Two hits' },
  { name: 'Triple Rings of Light', type: 'incantation', spellBaseAR: 310, damageType: H, requirements: { fai: 24 }, fp: 21, slots: 1, note: 'Multi-hit' },
  { name: 'Wrath of Gold', type: 'incantation', spellBaseAR: 350, damageType: H, requirements: { fai: 30 }, fp: 30, slots: 1 },
  { name: 'Radagon’s Rings of Light', type: 'incantation', spellBaseAR: 310, damageType: H, requirements: { fai: 35, int: 14 }, fp: 26, slots: 1 },
  { name: 'Aspects of the Crucible: Tail', type: 'incantation', spellBaseAR: 476, damageType: PHYS, requirements: { fai: 15 }, fp: 22, slots: 1, note: 'Physical — not catalyst-scaled; excluded from ranking' },
  { name: 'Dragonfire', type: 'incantation', spellBaseAR: 288, damageType: F, requirements: { fai: 15 }, fp: 28, slots: 1, note: 'Dragon Communion; channeled single-tap basis' },
  { name: 'Dragonclaw', type: 'incantation', spellBaseAR: 648, damageType: F, requirements: { fai: 18 }, fp: 28, slots: 1, note: 'Shockwave + direct' },
  { name: "Agheel's Flame", type: 'incantation', spellBaseAR: 338, damageType: F, requirements: { fai: 27 }, fp: 32, slots: 2, note: 'Channeled single-tap basis' },
  { name: 'Rotten Breath', type: 'incantation', spellBaseAR: 262, damageType: F, requirements: { fai: 15 }, fp: 26, slots: 1, note: 'Scarlet-rot buildup is the real payload' },
]

// ── DLC sorceries (Shadow of the Erdtree) — datamined multiplier × 100 ────────
const dlcSorceries: Spell[] = [
  { name: 'Glintblade Trio', type: 'sorcery', spellBaseAR: 327, damageType: M, requirements: { int: 28 }, fp: 19, slots: 1, dlc: true, confidence: 'high', note: '3 blades' },
  { name: 'Rellana’s Twin Moons', type: 'sorcery', spellBaseAR: 1000, damageType: M, requirements: { int: 72 }, fp: 47, slots: 2, dlc: true, confidence: 'high', note: 'Multi-hit — two moons + final strike' },
  { name: 'Gravitational Missile', type: 'sorcery', spellBaseAR: 339, damageType: M, requirements: { int: 36 }, fp: 18, slots: 1, dlc: true, confidence: 'high', note: 'Explosion + pulses' },
  { name: 'Blades of Stone', type: 'sorcery', spellBaseAR: 261, damageType: M, requirements: { int: 48 }, fp: 18, slots: 2, dlc: true, confidence: 'high', note: 'Physical damage; uncharged' },
  { name: 'Glintstone Nail', type: 'sorcery', spellBaseAR: 216, damageType: M, requirements: { int: 18 }, fp: 10, slots: 1, dlc: true, confidence: 'high' },
  { name: 'Glintstone Nails', type: 'sorcery', spellBaseAR: 396, damageType: M, requirements: { int: 32 }, fp: 23, slots: 1, dlc: true, confidence: 'high', note: 'Multi-hit — 6 nails' },
  { name: 'Fleeting Microcosm', type: 'sorcery', spellBaseAR: 334, damageType: M, requirements: { int: 42 }, fp: 26, slots: 1, dlc: true, confidence: 'high', note: 'Pulse + burst' },
  { name: 'Cherishing Fingers', type: 'sorcery', spellBaseAR: 253, damageType: M, requirements: { int: 36 }, fp: 20, slots: 1, dlc: true, confidence: 'high', note: 'Physical (strike) damage' },
  { name: 'Impenetrable Thorns', type: 'sorcery', spellBaseAR: 567, damageType: M, requirements: { fai: 24 }, fp: 15, slots: 1, dlc: true, confidence: 'high', note: 'Multi-hit + bleed; costs 50 HP' },
  { name: 'Rings of Spectral Light', type: 'sorcery', spellBaseAR: 318, damageType: M, requirements: { int: 24, fai: 18 }, fp: 14, slots: 1, dlc: true, confidence: 'high', note: 'Multi-hit + frostbite' },
  { name: 'Mass of Putrescence', type: 'sorcery', spellBaseAR: 280, damageType: M, requirements: { int: 28, fai: 22 }, fp: 41, slots: 1, dlc: true, confidence: 'high', note: 'Impact + explosion; frostbite' },
  { name: 'Vortex of Putrescence', type: 'sorcery', spellBaseAR: 328, damageType: M, requirements: { int: 32, fai: 26 }, fp: 29, slots: 2, dlc: true, confidence: 'high', note: 'Magic + frostbite' },
]

// ── DLC incantations (Shadow of the Erdtree) — datamined multiplier × 100 ─────
const dlcIncantations: Spell[] = [
  { name: 'Wrath from Afar', type: 'incantation', spellBaseAR: 100, damageType: H, requirements: { fai: 34 }, fp: 18, slots: 1, dlc: true, confidence: 'high' },
  { name: 'Aspects of the Crucible: Thorns', type: 'incantation', spellBaseAR: 510, damageType: PHYS, requirements: { fai: 27 }, fp: 14, slots: 1, dlc: true, confidence: 'high', note: 'Physical — excluded from ranking' },
  { name: 'Aspects of the Crucible: Bloom', type: 'incantation', spellBaseAR: 80, damageType: PHYS, requirements: { fai: 27 }, fp: 23, slots: 1, dlc: true, confidence: 'medium', note: 'Physical, per-hit only — excluded from ranking' },
  { name: 'Land of Shadow', type: 'incantation', spellBaseAR: 865, damageType: H, requirements: { fai: 58 }, fp: 40, slots: 1, dlc: true, confidence: 'medium', note: 'Explosion + many projectiles (variable)' },
  { name: 'Multilayered Ring of Light', type: 'incantation', spellBaseAR: 440, damageType: H, requirements: { fai: 36 }, fp: 23, slots: 1, dlc: true, confidence: 'high', note: 'Initial + 6 rings' },
  { name: 'Knight’s Lightning Spear', type: 'incantation', spellBaseAR: 238, damageType: L, requirements: { fai: 36 }, fp: 29, slots: 1, dlc: true, confidence: 'high', note: 'Spear + 2 follow-ups' },
  { name: 'Electrocharge', type: 'incantation', spellBaseAR: 213, damageType: L, requirements: { fai: 30 }, fp: 26, slots: 1, dlc: true, confidence: 'medium', note: 'Initial bolt; plus ticking AoE' },
  { name: 'Golden Arcs', type: 'incantation', spellBaseAR: 240, damageType: H, requirements: { fai: 22 }, fp: 12, slots: 1, dlc: true, confidence: 'high', note: '3 arcs' },
  { name: 'Giant Golden Arc', type: 'incantation', spellBaseAR: 215, damageType: H, requirements: { fai: 34 }, fp: 24, slots: 1, dlc: true, confidence: 'high' },
  { name: 'Spira', type: 'incantation', spellBaseAR: 160, damageType: H, requirements: { fai: 48 }, fp: 10, slots: 2, dlc: true, confidence: 'high', note: 'Per spiral cast; chainable' },
  { name: 'Divine Bird Feathers', type: 'incantation', spellBaseAR: 42, damageType: PHYS, requirements: { fai: 24 }, fp: 3, slots: 1, dlc: true, confidence: 'medium', note: 'Physical, rapid channel — excluded from ranking' },
  { name: 'Divine Beast Tornado', type: 'incantation', spellBaseAR: 220, damageType: PHYS, requirements: { fai: 28 }, fp: 24, slots: 1, dlc: true, confidence: 'high', note: 'Physical — excluded from ranking' },
  { name: 'Fire Serpent', type: 'incantation', spellBaseAR: 168, damageType: F, requirements: { fai: 16 }, fp: 11, slots: 1, dlc: true, confidence: 'high' },
  { name: 'Rain of Fire', type: 'incantation', spellBaseAR: 52, damageType: F, requirements: { fai: 52 }, fp: 27, slots: 1, dlc: true, confidence: 'medium', note: 'Per-hit only; many hits (variable)' },
  { name: 'Messmer’s Orb', type: 'incantation', spellBaseAR: 358, damageType: F, requirements: { fai: 60 }, fp: 31, slots: 2, dlc: true, confidence: 'high', note: 'Contact + explosion' },
  { name: 'Roar of Rugalea', type: 'incantation', spellBaseAR: 355, damageType: PHYS, requirements: { fai: 14 }, fp: 17, slots: 1, dlc: true, confidence: 'high', note: 'Physical — excluded from ranking' },
  { name: 'Furious Blade of Ansbach', type: 'incantation', spellBaseAR: 348, damageType: PHYS, requirements: { fai: 19, arc: 27 }, fp: 18, slots: 1, dlc: true, confidence: 'high', note: 'Physical + fire + bleed — excluded from ranking' },
  { name: 'Pest-Thread Spears', type: 'incantation', spellBaseAR: 360, damageType: F, requirements: { fai: 26 }, fp: 28, slots: 1, dlc: true, confidence: 'high', note: '2 spears; scarlet-rot buildup' },
  { name: 'Rotten Butterflies', type: 'incantation', spellBaseAR: 400, damageType: F, requirements: { fai: 33 }, fp: 48, slots: 1, dlc: true, confidence: 'medium', note: 'Whirl + explosions; scarlet rot is the payload' },
  { name: 'Midra’s Flame of Frenzy', type: 'incantation', spellBaseAR: 75, damageType: F, requirements: { fai: 41 }, fp: 22, slots: 2, dlc: true, confidence: 'medium', note: 'Per-hit only, channeled; madness buildup' },
  { name: 'Ghostflame Breath', type: 'incantation', spellBaseAR: 504, damageType: F, requirements: { fai: 23, arc: 15 }, fp: 36, slots: 1, dlc: true, confidence: 'medium', note: 'Frost dragon breath; one full wave' },
  { name: 'Bayle’s Tyranny', type: 'incantation', spellBaseAR: 535, damageType: F, requirements: { arc: 49 }, fp: 46, slots: 2, dlc: true, confidence: 'high', note: 'Fire + lightning roar (scales with ARC)' },
  { name: 'Bayle’s Flame Lightning', type: 'incantation', spellBaseAR: 750, damageType: L, requirements: { arc: 53 }, fp: 43, slots: 2, dlc: true, confidence: 'high', note: 'Physical + lightning + fire direct hit' },
]

export const sorceries: Spell[] = [...baseSorceries, ...dlcSorceries]
export const incantations: Spell[] = [...baseIncantations, ...dlcIncantations]
export const allSpells: Spell[] = [...sorceries, ...incantations]

/** Damage spells only (those that rank by AR through a catalyst channel). */
export const damageSorceries = sorceries.filter((s) => s.spellBaseAR > 0 && s.damageType != null)
export const damageIncantations = incantations.filter((s) => s.spellBaseAR > 0 && s.damageType != null)
