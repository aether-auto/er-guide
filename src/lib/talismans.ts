import type { Attribute } from './weaponCalc'

/**
 * A curated table of damage-relevant talismans.
 *
 * Two kinds of effect, applied at different points in the AR pipeline:
 *  - `statBonus`: flat attribute bonuses folded into the stat block *before*
 *    the weapon calc runs (so they feed scaling like real stats do).
 *  - `arMultiplier`: a flat multiplier applied to the final Attack Rating
 *    *after* the calc (these are post-calc damage-up effects in game).
 *
 * `condition` text is informational — many of these only apply situationally
 * (e.g. "at full HP"). The optimizer assumes the condition is met when the
 * talisman is selected, so numbers reflect the best case.
 *
 * Stat-bonus values are the in-game flat additions. Multiplier values are the
 * standard community figures for the listed condition. Both are factual game
 * data, the same footing as our items.json sources.
 */
export interface Talisman {
  id: string
  name: string
  /** Flat attribute bonuses applied before the weapon calc. */
  statBonus?: Partial<Record<Attribute, number>>
  /** Multiplier applied to final AR after the calc (1.08 = +8%). */
  arMultiplier?: number
  /** Situational note — assumed active when the talisman is selected. */
  condition?: string
  /** True if from the Shadow of the Erdtree DLC. */
  dlc?: boolean
}

export const talismans: Talisman[] = [
  // ── Flat AR / damage multipliers ──────────────────────────────────────────
  {
    id: 'shard-of-alexander',
    name: 'Shard of Alexander',
    arMultiplier: 1.15,
    condition: 'Boosts skill (Ash of War) attack power by 15%',
  },
  {
    id: 'ritual-sword-talisman',
    name: 'Ritual Sword Talisman',
    arMultiplier: 1.1,
    condition: 'At full HP',
  },
  {
    id: 'godfrey-icon',
    name: 'Godfrey Icon',
    arMultiplier: 1.15,
    condition: 'Boosts charged skills and charged spells by 15%',
  },
  {
    id: 'rotten-winged-sword-insignia',
    name: 'Rotten Winged Sword Insignia',
    arMultiplier: 1.13,
    condition: 'Successive attacks raise attack power (up to ~13%)',
  },
  {
    id: 'winged-sword-insignia',
    name: 'Winged Sword Insignia',
    arMultiplier: 1.08,
    condition: 'Successive attacks raise attack power (up to ~8%)',
  },
  {
    id: 'millicents-prosthesis',
    name: "Millicent's Prosthesis",
    statBonus: { dex: 5 },
    arMultiplier: 1.06,
    condition: 'Successive attacks raise dexterity and attack power',
  },
  {
    id: 'lord-of-bloods-exultation',
    name: "Lord of Blood's Exultation",
    arMultiplier: 1.2,
    condition: 'When blood loss occurs nearby',
  },
  {
    id: 'kindreds-of-rot-exultation',
    name: 'Kindred of Rot’s Exultation',
    arMultiplier: 1.2,
    condition: 'When scarlet rot occurs nearby',
  },
  {
    id: 'aged-ones-exultation',
    name: "Aged One's Exultation",
    arMultiplier: 1.2,
    condition: 'When poison occurs nearby (DLC)',
    dlc: true,
  },
  {
    id: 'magic-scorpion-charm',
    name: 'Magic Scorpion Charm',
    arMultiplier: 1.12,
    condition: 'Raises magic attack ~12% (raises damage taken)',
  },
  {
    id: 'fire-scorpion-charm',
    name: 'Fire Scorpion Charm',
    arMultiplier: 1.12,
    condition: 'Raises fire attack ~12% (raises damage taken)',
  },
  {
    id: 'lightning-scorpion-charm',
    name: 'Lightning Scorpion Charm',
    arMultiplier: 1.12,
    condition: 'Raises lightning attack ~12% (raises damage taken)',
  },
  {
    id: 'sacred-scorpion-charm',
    name: 'Sacred Scorpion Charm',
    arMultiplier: 1.12,
    condition: 'Raises holy attack ~12% (raises damage taken)',
  },
  {
    id: 'shabriris-woe',
    name: "Shabriri's Woe",
    arMultiplier: 1.0,
    condition: 'Draws aggro; no direct AR boost',
  },
  {
    id: 'red-feathered-branchsword',
    name: 'Red-Feathered Branchsword',
    arMultiplier: 1.1,
    condition: 'Raises attack power when HP is below 20%',
  },
  {
    id: 'crimson-seed-talisman',
    name: 'Crimson Seed Talisman',
    arMultiplier: 1.0,
    condition: 'Boosts HP healed by flasks; no AR boost',
  },

  // ── Stat-bonus talismans (fed into scaling) ─────────────────────────────────
  {
    id: 'starscourge-heirloom',
    name: 'Starscourge Heirloom',
    statBonus: { str: 5 },
    condition: '+5 Strength',
  },
  {
    id: 'prosthesis-wearer-heirloom',
    name: 'Prosthesis-Wearer Heirloom',
    statBonus: { dex: 5 },
    condition: '+5 Dexterity',
  },
  {
    id: 'magic-scorpion-heirloom-intelligence',
    name: "Graven-School Talisman",
    arMultiplier: 1.04,
    condition: 'Raises potency of sorceries ~4%',
  },
  {
    id: 'graven-mass-talisman',
    name: 'Graven-Mass Talisman',
    arMultiplier: 1.08,
    condition: 'Raises potency of sorceries ~8% (DLC)',
    dlc: true,
  },
  {
    id: 'faithful-canvas-talisman',
    name: "Faithful's Canvas Talisman",
    arMultiplier: 1.04,
    condition: 'Raises potency of incantations ~4%',
  },
  {
    id: 'dragoncrest-greatshield-talisman',
    name: 'Dragoncrest Greatshield Talisman',
    arMultiplier: 1.0,
    condition: 'Reduces physical damage taken; no AR boost',
  },
  {
    id: 'radagons-soreseal',
    name: "Radagon's Soreseal",
    statBonus: { str: 5, dex: 5, int: 0, fai: 0, arc: 0 },
    condition: '+5 Str/Dex/Vig/End (raises damage taken)',
  },
  {
    id: 'radagon-scarseal',
    name: 'Radagon Scarseal',
    statBonus: { str: 3, dex: 3 },
    condition: '+3 Str/Dex/Vig/End (raises damage taken)',
  },
]

export const talismansById = new Map(talismans.map((t) => [t.id, t]))
