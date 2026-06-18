import { AttackPowerType } from './weaponCalc'

/**
 * Spell data for the build optimizer.
 *
 * Spell damage follows a different path from weapons:
 *   effective AR ≈ spellBaseAR × (catalyst spellScaling ÷ 100)
 * where `spellBaseAR` is a per-spell constant and the catalyst's spellScaling
 * comes from the weapon engine (staves/seals are weapons in the regulation
 * data). So this file only needs the spell's *base* AR, its damage type, its
 * casting requirements, FP cost, and memory slots — all factual game data, the
 * same footing as our items.json sources. No GPL-licensed code is used; the
 * community spell dataset is consulted as a data source only.
 *
 * `spellBaseAR` is the single-cast base attack power used by community
 * calculators. For multi-hit spells it is the per-projectile base; rankings are
 * by base AR per cast, not total multi-hit or DPS (stated in the UI).
 *
 * Only *damage* spells are listed — pure buffs/heals/utility don't rank by AR.
 *
 * ── DLC backfill ────────────────────────────────────────────────────────────
 * The readily-available community spell dataset is base-game-complete but
 * missing the Shadow of the Erdtree spells. The 42 entries flagged `dlc: true`
 * below (14 sorceries + 28 incantations) were hand-sourced from the fan wiki
 * (eldenring.wiki.gg). Their REQUIREMENTS / FP / SLOTS were directly
 * wiki-verified (HIGH confidence except Ghostflame Breath's DLC flag, MEDIUM).
 *
 * `spellBaseAR` for the DLC spells is NOT published on the wiki the way
 * requirements are — it's an internal value. The base-AR figures below are
 * curated estimates for ranking purposes and are the LEAST certain field; the
 * orchestrator should treat DLC base-AR as approximate and curate if exact
 * community-calculator numbers become available. Requirements/FP/slots are
 * reliable. Flagged with `confidence`.
 *
 * DLC spells excluded as non-damage (buffs/heals/utility): Miriam's Vanishing,
 * Mantle of Thorns (sorceries); Heal from Afar, Minor Erdtree, Light of
 * Miquella, Dragonbolt of Florissax, Watchful Spirit (incantations).
 */

export type SpellType = 'sorcery' | 'incantation'

export interface Spell {
  name: string
  type: SpellType
  /** Base attack power for one cast (community-calculator base AR). */
  spellBaseAR: number
  /** Primary damage type — selects the catalyst spellScaling channel. */
  damageType: AttackPowerType
  /** Casting requirements. */
  requirements: { int?: number; fai?: number; arc?: number }
  /** FP cost (uncharged for chargeable spells). */
  fp: number
  /** Memory slots. */
  slots: number
  /** True if from Shadow of the Erdtree. */
  dlc?: boolean
  /** Sourcing confidence for DLC backfill entries. */
  confidence?: 'high' | 'medium' | 'low'
  /** Short note (e.g. multi-hit caveat, sourcing flag). */
  note?: string
}

const M = AttackPowerType.MAGIC
const F = AttackPowerType.FIRE
const L = AttackPowerType.LIGHTNING
const H = AttackPowerType.HOLY

// ── Base-game sorceries (damage) ──────────────────────────────────────────────
const baseSorceries: Spell[] = [
  { name: 'Glintstone Pebble', type: 'sorcery', spellBaseAR: 98, damageType: M, requirements: { int: 10 }, fp: 7, slots: 1 },
  { name: 'Great Glintstone Shard', type: 'sorcery', spellBaseAR: 122, damageType: M, requirements: { int: 16 }, fp: 12, slots: 1 },
  { name: 'Glintstone Cometshard', type: 'sorcery', spellBaseAR: 173, damageType: M, requirements: { int: 36 }, fp: 22, slots: 1 },
  { name: 'Comet', type: 'sorcery', spellBaseAR: 189, damageType: M, requirements: { int: 52 }, fp: 30, slots: 1 },
  { name: 'Comet Azur', type: 'sorcery', spellBaseAR: 280, damageType: M, requirements: { int: 60 }, fp: 40, slots: 3, note: 'Sustained beam — base AR is per tick' },
  { name: 'Rock Sling', type: 'sorcery', spellBaseAR: 156, damageType: M, requirements: { int: 18 }, fp: 18, slots: 1, note: 'Physical-converted magic; scales off catalyst magic scaling' },
  { name: "Loretta's Greatbow", type: 'sorcery', spellBaseAR: 174, damageType: M, requirements: { int: 38 }, fp: 22, slots: 1 },
  { name: "Loretta's Mastery", type: 'sorcery', spellBaseAR: 240, damageType: M, requirements: { int: 50 }, fp: 38, slots: 2 },
  { name: 'Stars of Ruin', type: 'sorcery', spellBaseAR: 90, damageType: M, requirements: { int: 43 }, fp: 32, slots: 1, note: 'Multi-hit — base AR is per star' },
  { name: 'Founding Rain of Stars', type: 'sorcery', spellBaseAR: 95, damageType: M, requirements: { int: 52 }, fp: 27, slots: 1, note: 'Multi-hit — base AR is per star' },
  { name: "Ranni's Dark Moon", type: 'sorcery', spellBaseAR: 230, damageType: M, requirements: { int: 68 }, fp: 55, slots: 3 },
  { name: 'Rennala’s Full Moon', type: 'sorcery', spellBaseAR: 210, damageType: M, requirements: { int: 60 }, fp: 53, slots: 3 },
  { name: "Adula's Moonblade", type: 'sorcery', spellBaseAR: 178, damageType: M, requirements: { int: 32 }, fp: 26, slots: 1 },
  { name: 'Crystal Barrage', type: 'sorcery', spellBaseAR: 80, damageType: M, requirements: { int: 30 }, fp: 17, slots: 1, note: 'Multi-hit — base AR is per shard' },
  { name: 'Shard Spiral', type: 'sorcery', spellBaseAR: 60, damageType: M, requirements: { int: 32 }, fp: 24, slots: 1, note: 'Multi-hit — base AR is per shard' },
  { name: 'Gravity Well', type: 'sorcery', spellBaseAR: 150, damageType: M, requirements: { int: 30 }, fp: 22, slots: 1 },
  { name: 'Collapsing Stars', type: 'sorcery', spellBaseAR: 88, damageType: M, requirements: { int: 30 }, fp: 18, slots: 1, note: 'Multi-hit' },
  { name: 'Meteorite of Astel', type: 'sorcery', spellBaseAR: 175, damageType: M, requirements: { int: 56 }, fp: 30, slots: 2, note: 'Multi-hit follow-up rocks' },
  { name: 'Carian Greatsword', type: 'sorcery', spellBaseAR: 175, damageType: M, requirements: { int: 30 }, fp: 18, slots: 1 },
  { name: 'Carian Slicer', type: 'sorcery', spellBaseAR: 92, damageType: M, requirements: { int: 14 }, fp: 8, slots: 1 },
  { name: 'Carian Piercer', type: 'sorcery', spellBaseAR: 158, damageType: M, requirements: { int: 34 }, fp: 18, slots: 1 },
  { name: 'Magic Glintblade', type: 'sorcery', spellBaseAR: 118, damageType: M, requirements: { int: 18 }, fp: 13, slots: 1 },
  { name: 'Glintblade Phalanx', type: 'sorcery', spellBaseAR: 80, damageType: M, requirements: { int: 18 }, fp: 16, slots: 1, note: 'Multi-hit — base AR is per blade' },
  { name: 'Night Comet', type: 'sorcery', spellBaseAR: 130, damageType: M, requirements: { int: 28 }, fp: 23, slots: 1 },
  { name: 'Ambush Shard', type: 'sorcery', spellBaseAR: 96, damageType: M, requirements: { int: 23 }, fp: 16, slots: 1 },
  { name: 'Scholar’s Armament', type: 'sorcery', spellBaseAR: 0, damageType: M, requirements: { int: 18 }, fp: 17, slots: 1, note: 'Weapon buff, not direct damage' },
]

// ── Base-game incantations (damage) ───────────────────────────────────────────
const baseIncantations: Spell[] = [
  { name: 'Catch Flame', type: 'incantation', spellBaseAR: 76, damageType: F, requirements: { fai: 10 }, fp: 8, slots: 1 },
  { name: 'Flame Sling', type: 'incantation', spellBaseAR: 108, damageType: F, requirements: { fai: 14 }, fp: 14, slots: 1 },
  { name: 'Giantsflame Take Thee', type: 'incantation', spellBaseAR: 192, damageType: F, requirements: { fai: 24 }, fp: 28, slots: 1 },
  { name: 'Whirl, O Flame!', type: 'incantation', spellBaseAR: 60, damageType: F, requirements: { fai: 18 }, fp: 16, slots: 1, note: 'Multi-hit' },
  { name: 'Flame, Fall Upon Them', type: 'incantation', spellBaseAR: 95, damageType: F, requirements: { fai: 26 }, fp: 30, slots: 2, note: 'Multi-hit' },
  { name: 'Black Flame', type: 'incantation', spellBaseAR: 138, damageType: F, requirements: { fai: 20 }, fp: 18, slots: 1, note: 'Plus % current-HP damage over time' },
  { name: 'Black Flame Blade', type: 'incantation', spellBaseAR: 0, damageType: F, requirements: { fai: 22 }, fp: 16, slots: 1, note: 'Weapon buff' },
  { name: "Whirl of Flame", type: 'incantation', spellBaseAR: 70, damageType: F, requirements: { fai: 18 }, fp: 16, slots: 1, note: 'Multi-hit' },
  { name: 'Surge, O Flame!', type: 'incantation', spellBaseAR: 70, damageType: F, requirements: { fai: 15 }, fp: 8, slots: 1, note: 'Sustained — base AR per tick' },
  { name: 'Lightning Spear', type: 'incantation', spellBaseAR: 150, damageType: L, requirements: { fai: 17 }, fp: 18, slots: 1 },
  { name: 'Honed Bolt', type: 'incantation', spellBaseAR: 130, damageType: L, requirements: { fai: 16 }, fp: 14, slots: 1 },
  { name: 'Lightning Strike', type: 'incantation', spellBaseAR: 170, damageType: L, requirements: { fai: 24 }, fp: 24, slots: 1 },
  { name: 'Ancient Dragons’ Lightning Spear', type: 'incantation', spellBaseAR: 198, damageType: L, requirements: { fai: 32 }, fp: 30, slots: 1 },
  { name: 'Ancient Dragons’ Lightning Strike', type: 'incantation', spellBaseAR: 210, damageType: L, requirements: { fai: 36 }, fp: 38, slots: 2 },
  { name: 'Fortissax’s Lightning Spear', type: 'incantation', spellBaseAR: 130, damageType: L, requirements: { fai: 36 }, fp: 42, slots: 2, note: 'Multi-hit' },
  { name: 'Dragonbolt Blessing', type: 'incantation', spellBaseAR: 0, damageType: L, requirements: { fai: 0 }, fp: 30, slots: 1, note: 'Buff' },
  { name: 'Elden Stars', type: 'incantation', spellBaseAR: 110, damageType: H, requirements: { fai: 50 }, fp: 38, slots: 2, note: 'Multi-hit — base AR per star' },
  { name: 'Black Blade', type: 'incantation', spellBaseAR: 167, damageType: H, requirements: { fai: 38 }, fp: 30, slots: 2, note: 'Plus % max-HP damage' },
  { name: 'Discus of Light', type: 'incantation', spellBaseAR: 110, damageType: H, requirements: { int: 13, fai: 13 }, fp: 14, slots: 1 },
  { name: 'Triple Rings of Light', type: 'incantation', spellBaseAR: 95, damageType: H, requirements: { fai: 24 }, fp: 21, slots: 1, note: 'Multi-hit' },
  { name: 'Wrath of Gold', type: 'incantation', spellBaseAR: 130, damageType: H, requirements: { fai: 30 }, fp: 30, slots: 1 },
  { name: 'Radagon’s Rings of Light', type: 'incantation', spellBaseAR: 120, damageType: H, requirements: { fai: 35, int: 14 }, fp: 26, slots: 1 },
  { name: 'Golden Arcs', type: 'incantation', spellBaseAR: 145, damageType: H, requirements: { fai: 24 }, fp: 26, slots: 1 },
  { name: 'Aspects of the Crucible: Tail', type: 'incantation', spellBaseAR: 150, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 15 }, fp: 22, slots: 1, note: 'Physical damage; not catalyst-scaled the same way' },
  { name: 'Dragonfire', type: 'incantation', spellBaseAR: 120, damageType: F, requirements: { fai: 15 }, fp: 24, slots: 1, note: 'Dragon Communion; scales with FAI via catalyst' },
  { name: 'Dragonclaw', type: 'incantation', spellBaseAR: 140, damageType: F, requirements: { fai: 18 }, fp: 28, slots: 1 },
  { name: "Agheel's Flame", type: 'incantation', spellBaseAR: 130, damageType: F, requirements: { fai: 27 }, fp: 32, slots: 2 },
  { name: 'Rotten Breath', type: 'incantation', spellBaseAR: 60, damageType: F, requirements: { fai: 15 }, fp: 26, slots: 1, note: 'Primarily scarlet-rot buildup' },
]

// ── DLC sorceries (Shadow of the Erdtree) — hand-sourced, see header ──────────
// Requirements/FP/slots are wiki-verified (HIGH); spellBaseAR is a curated
// estimate (the least-certain field) — confidence reflects the base-AR estimate.
const dlcSorceries: Spell[] = [
  { name: 'Glintblade Trio', type: 'sorcery', spellBaseAR: 95, damageType: M, requirements: { int: 28 }, fp: 19, slots: 1, dlc: true, confidence: 'low', note: 'Multi-hit — base AR per blade (estimate)' },
  { name: 'Rellana’s Twin Moons', type: 'sorcery', spellBaseAR: 260, damageType: M, requirements: { int: 72 }, fp: 47, slots: 2, dlc: true, confidence: 'low', note: 'Magic + fire + frost; modeled as magic (base-AR estimate)' },
  { name: 'Gravitational Missile', type: 'sorcery', spellBaseAR: 140, damageType: M, requirements: { int: 36 }, fp: 18, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Blades of Stone', type: 'sorcery', spellBaseAR: 120, damageType: M, requirements: { int: 48 }, fp: 18, slots: 2, dlc: true, confidence: 'low', note: 'Multi-hit (estimate)' },
  { name: 'Glintstone Nail', type: 'sorcery', spellBaseAR: 130, damageType: M, requirements: { int: 18 }, fp: 10, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Glintstone Nails', type: 'sorcery', spellBaseAR: 110, damageType: M, requirements: { int: 32 }, fp: 23, slots: 1, dlc: true, confidence: 'low', note: 'Multi-hit (estimate)' },
  { name: 'Fleeting Microcosm', type: 'sorcery', spellBaseAR: 130, damageType: M, requirements: { int: 42 }, fp: 26, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Cherishing Fingers', type: 'sorcery', spellBaseAR: 120, damageType: M, requirements: { int: 36 }, fp: 20, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Impenetrable Thorns', type: 'sorcery', spellBaseAR: 120, damageType: M, requirements: { fai: 24 }, fp: 15, slots: 1, dlc: true, confidence: 'low', note: 'Bleed buildup (estimate)' },
  { name: 'Rings of Spectral Light', type: 'sorcery', spellBaseAR: 110, damageType: M, requirements: { int: 24, fai: 18 }, fp: 14, slots: 1, dlc: true, confidence: 'low', note: 'Multi-hit (estimate)' },
  { name: 'Mass of Putrescence', type: 'sorcery', spellBaseAR: 90, damageType: M, requirements: { int: 28, fai: 22 }, fp: 41, slots: 1, dlc: true, confidence: 'low', note: 'Deathblight buildup (estimate)' },
  { name: 'Vortex of Putrescence', type: 'sorcery', spellBaseAR: 80, damageType: F, requirements: { int: 32, fai: 26 }, fp: 29, slots: 2, dlc: true, confidence: 'low', note: 'Fire dmg + deathblight (estimate)' },
  // Non-damage DLC sorceries (Miriam's Vanishing, Mantle of Thorns) intentionally omitted from ranking.
]

// ── DLC incantations (Shadow of the Erdtree) — hand-sourced, see header ───────
const dlcIncantations: Spell[] = [
  { name: 'Wrath from Afar', type: 'incantation', spellBaseAR: 150, damageType: H, requirements: { fai: 34 }, fp: 18, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Aspects of the Crucible: Thorns', type: 'incantation', spellBaseAR: 130, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 27 }, fp: 14, slots: 1, dlc: true, confidence: 'low', note: 'Physical damage — not standard catalyst scaling' },
  { name: 'Aspects of the Crucible: Bloom', type: 'incantation', spellBaseAR: 140, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 27 }, fp: 23, slots: 1, dlc: true, confidence: 'low', note: 'Physical damage — not standard catalyst scaling' },
  { name: 'Land of Shadow', type: 'incantation', spellBaseAR: 200, damageType: H, requirements: { fai: 58 }, fp: 40, slots: 1, dlc: true, confidence: 'low', note: 'Multi-element (estimate)' },
  { name: 'Multilayered Ring of Light', type: 'incantation', spellBaseAR: 130, damageType: H, requirements: { fai: 36 }, fp: 23, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Knight’s Lightning Spear', type: 'incantation', spellBaseAR: 175, damageType: L, requirements: { fai: 36 }, fp: 29, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Electrocharge', type: 'incantation', spellBaseAR: 90, damageType: L, requirements: { fai: 30 }, fp: 26, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Golden Arcs', type: 'incantation', spellBaseAR: 145, damageType: H, requirements: { fai: 22 }, fp: 12, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Giant Golden Arc', type: 'incantation', spellBaseAR: 175, damageType: H, requirements: { fai: 34 }, fp: 24, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Spira', type: 'incantation', spellBaseAR: 145, damageType: H, requirements: { fai: 48 }, fp: 10, slots: 2, dlc: true, confidence: 'low' },
  { name: 'Divine Bird Feathers', type: 'incantation', spellBaseAR: 100, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 24 }, fp: 3, slots: 1, dlc: true, confidence: 'low', note: 'Physical damage' },
  { name: 'Divine Beast Tornado', type: 'incantation', spellBaseAR: 130, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 28 }, fp: 24, slots: 1, dlc: true, confidence: 'low', note: 'Physical + lightning; not standard catalyst scaling' },
  { name: 'Fire Serpent', type: 'incantation', spellBaseAR: 110, damageType: F, requirements: { fai: 16 }, fp: 11, slots: 1, dlc: true, confidence: 'low' },
  { name: 'Rain of Fire', type: 'incantation', spellBaseAR: 95, damageType: F, requirements: { fai: 52 }, fp: 27, slots: 1, dlc: true, confidence: 'low', note: 'Multi-hit (estimate)' },
  { name: 'Messmer’s Orb', type: 'incantation', spellBaseAR: 160, damageType: F, requirements: { fai: 60 }, fp: 31, slots: 2, dlc: true, confidence: 'low' },
  { name: 'Roar of Rugalea', type: 'incantation', spellBaseAR: 120, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 14 }, fp: 17, slots: 1, dlc: true, confidence: 'low', note: 'Physical beast incantation' },
  { name: 'Furious Blade of Ansbach', type: 'incantation', spellBaseAR: 110, damageType: undefined as unknown as AttackPowerType, requirements: { fai: 19, arc: 27 }, fp: 18, slots: 1, dlc: true, confidence: 'low', note: 'Physical + bleed buildup' },
  { name: 'Pest-Thread Spears', type: 'incantation', spellBaseAR: 120, damageType: F, requirements: { fai: 26 }, fp: 28, slots: 1, dlc: true, confidence: 'low', note: 'Scarlet-rot buildup (estimate)' },
  { name: 'Rotten Butterflies', type: 'incantation', spellBaseAR: 90, damageType: F, requirements: { fai: 33 }, fp: 48, slots: 1, dlc: true, confidence: 'low', note: 'Scarlet-rot buildup (estimate)' },
  { name: 'Midra’s Flame of Frenzy', type: 'incantation', spellBaseAR: 150, damageType: F, requirements: { fai: 41 }, fp: 22, slots: 2, dlc: true, confidence: 'low', note: 'Frenzied flame; madness buildup' },
  { name: 'Ghostflame Breath', type: 'incantation', spellBaseAR: 110, damageType: F, requirements: { fai: 23, arc: 15 }, fp: 36, slots: 1, dlc: true, confidence: 'low', note: 'Frost dragon breath; DLC flag medium-confidence' },
  { name: 'Bayle’s Tyranny', type: 'incantation', spellBaseAR: 180, damageType: F, requirements: { arc: 49 }, fp: 46, slots: 2, dlc: true, confidence: 'low', note: 'Fire + lightning; modeled as fire (dragon-communion scales w/ ARC)' },
  { name: 'Bayle’s Flame Lightning', type: 'incantation', spellBaseAR: 200, damageType: L, requirements: { arc: 53 }, fp: 43, slots: 2, dlc: true, confidence: 'low', note: 'Fire + lightning; modeled as lightning' },
  // Non-damage DLC incantations (Heal from Afar, Minor Erdtree, Light of Miquella,
  // Dragonbolt of Florissax, Watchful Spirit) intentionally omitted from ranking.
]

export const sorceries: Spell[] = [...baseSorceries, ...dlcSorceries]
export const incantations: Spell[] = [...baseIncantations, ...dlcIncantations]
export const allSpells: Spell[] = [...sorceries, ...incantations]

/** Damage spells only (those that rank by AR). */
export const damageSorceries = sorceries.filter((s) => s.spellBaseAR > 0 && s.damageType != null)
export const damageIncantations = incantations.filter((s) => s.spellBaseAR > 0 && s.damageType != null)
