import {
  getWeaponAttack,
  AttackPowerType,
  allDamageTypes,
  WeaponType,
  nonWeaponTypes,
  catalystTypes,
  type Weapon,
  type Attributes,
  type Attribute,
} from './weaponCalc'
import { talismansById } from './talismans'
import { damageSorceries, damageIncantations, type Spell } from './spellData'

/**
 * Ranking layer over the ported weapon engine. Given a character's stats, it
 * ranks weapons (overall, by damage type, by status), and spells (sorceries /
 * incantations), all by computed Attack Rating. Talismans are applied as
 * pre-calc stat bonuses and/or post-calc AR multipliers. Requirement gating is
 * on by default with a show-all option.
 *
 * Note: rankings are by Attack Rating, NOT per-swing motion values.
 */

const STANDARD_MAX_UPGRADE = 25 // +25
const SOMBER_MAX_UPGRADE = 10 // +10

const ATTRS: Attribute[] = ['str', 'dex', 'int', 'fai', 'arc']

export const DAMAGE_TYPE_LABELS: Record<number, string> = {
  [AttackPowerType.PHYSICAL]: 'Physical',
  [AttackPowerType.MAGIC]: 'Magic',
  [AttackPowerType.FIRE]: 'Fire',
  [AttackPowerType.LIGHTNING]: 'Lightning',
  [AttackPowerType.HOLY]: 'Holy',
}

export const STATUS_TYPES = [
  AttackPowerType.BLEED,
  AttackPowerType.FROST,
  AttackPowerType.POISON,
  AttackPowerType.SCARLET_ROT,
  AttackPowerType.SLEEP,
  AttackPowerType.MADNESS,
] as const

export const STATUS_LABELS: Record<number, string> = {
  [AttackPowerType.BLEED]: 'Bleed',
  [AttackPowerType.FROST]: 'Frost',
  [AttackPowerType.POISON]: 'Poison',
  [AttackPowerType.SCARLET_ROT]: 'Scarlet Rot',
  [AttackPowerType.SLEEP]: 'Sleep',
  [AttackPowerType.MADNESS]: 'Madness',
}

export interface OptimizerOptions {
  twoHanding?: boolean
  /** Talisman ids to apply (stat bonuses pre-calc, AR multipliers post-calc). */
  talismans?: string[]
  /** When false (default), only show items whose requirements the build meets. */
  metRequirementsOnly?: boolean
}

export interface WeaponRanking {
  /** Base weapon name (affinity-agnostic), e.g. "Nightrider Glaive". */
  weaponName: string
  /** Full chosen variant name, e.g. "Heavy Nightrider Glaive". */
  name: string
  affinity: string
  weaponType: WeaponType
  totalAr: number
  /** Per-damage-type AR breakdown (only non-zero types). */
  breakdown: { type: number; label: string; value: number }[]
  requirements: Partial<Record<Attribute, number>>
  meetsRequirements: boolean
  dlc: boolean
  url: string | null
}

export interface StatusRanking {
  weaponName: string
  name: string
  affinity: string
  status: number
  statusLabel: string
  buildup: number
  totalAr: number
  requirements: Partial<Record<Attribute, number>>
  meetsRequirements: boolean
  dlc: boolean
  url: string | null
}

export interface SpellRanking {
  name: string
  type: Spell['type']
  damageType: number
  damageLabel: string
  /** spellBaseAR × (catalyst spellScaling / 100). */
  effectiveAr: number
  spellBaseAR: number
  /** The catalyst chosen for this build. */
  catalyst: string
  catalystScaling: number
  fp: number
  slots: number
  requirements: { int?: number; fai?: number; arc?: number }
  meetsRequirements: boolean
  dlc: boolean
  confidence?: Spell['confidence']
  note?: string
}

const affinityLabels: Record<number, string> = {
  [-1]: 'Unique',
  0: 'Standard',
  1: 'Heavy',
  2: 'Keen',
  3: 'Quality',
  4: 'Fire',
  5: 'Flame Art',
  6: 'Lightning',
  7: 'Sacred',
  8: 'Magic',
  9: 'Cold',
  10: 'Poison',
  11: 'Blood',
  12: 'Occult',
}

export function affinityLabel(affinityId: number): string {
  return affinityLabels[affinityId] ?? 'Standard'
}

function maxUpgradeFor(weapon: Weapon): number {
  // Somber weapons have an 11-entry reinforcement table (+0…+10); standard
  // weapons have 26 (+0…+25). Use the actual length so it's robust.
  return weapon.attack.length - 1
}

/** Apply selected talismans' stat bonuses to the attribute block. */
function applyStatBonuses(attributes: Attributes, talismanIds: string[]): Attributes {
  const out: Attributes = { ...attributes }
  for (const id of talismanIds) {
    const t = talismansById.get(id)
    if (!t?.statBonus) continue
    for (const attr of ATTRS) {
      const bonus = t.statBonus[attr]
      if (bonus) out[attr] += bonus
    }
  }
  return out
}

/** Product of all selected talismans' AR multipliers (default 1). */
function arMultiplier(talismanIds: string[]): number {
  let mult = 1
  for (const id of talismanIds) {
    const t = talismansById.get(id)
    if (t?.arMultiplier) mult *= t.arMultiplier
  }
  return mult
}

function meetsRequirements(weapon: Weapon, attributes: Attributes): boolean {
  return (Object.entries(weapon.requirements) as [Attribute, number][]).every(
    ([attr, req]) => attributes[attr] >= req,
  )
}

/** Weapons we never rank: shields, torches, and the Unarmed entry. */
function isRankableWeapon(weapon: Weapon): boolean {
  if (nonWeaponTypes.includes(weapon.weaponType)) return false
  if (catalystTypes.includes(weapon.weaponType)) return false
  if (weapon.name === 'Unarmed' || weapon.weaponName === 'Unarmed') return false
  return true
}

interface EvaluatedVariant {
  weapon: Weapon
  upgrade: number
  attackPower: Partial<Record<AttackPowerType, number>>
  totalAr: number
  meets: boolean
}

function evaluateVariant(
  weapon: Weapon,
  rawAttributes: Attributes,
  opts: Required<Pick<OptimizerOptions, 'twoHanding'>> & { talismans: string[] },
): EvaluatedVariant {
  const attributes = applyStatBonuses(rawAttributes, opts.talismans)
  const upgrade = maxUpgradeFor(weapon)
  const result = getWeaponAttack({
    weapon,
    attributes,
    twoHanding: opts.twoHanding,
    upgradeLevel: upgrade,
  })
  const mult = arMultiplier(opts.talismans)
  const attackPower: Partial<Record<AttackPowerType, number>> = {}
  let totalAr = 0
  for (const t of allDamageTypes) {
    const v = (result.attackPower[t] ?? 0) * mult
    if (v > 0) attackPower[t] = v
    totalAr += v
  }
  // Carry status buildup through unmultiplied (status isn't an AR multiplier target).
  for (const s of STATUS_TYPES) {
    const v = result.attackPower[s]
    if (v) attackPower[s] = v
  }
  return { weapon, upgrade, attackPower, totalAr, meets: meetsRequirements(weapon, attributes) }
}

/** Group weapon variants by base weapon name. */
function groupByBaseName(weapons: Weapon[]): Map<string, Weapon[]> {
  const groups = new Map<string, Weapon[]>()
  for (const w of weapons) {
    if (!isRankableWeapon(w)) continue
    const list = groups.get(w.weaponName) ?? []
    list.push(w)
    groups.set(w.weaponName, list)
  }
  return groups
}

function buildBreakdown(attackPower: Partial<Record<AttackPowerType, number>>) {
  return allDamageTypes
    .map((t) => ({ type: t as number, label: DAMAGE_TYPE_LABELS[t], value: attackPower[t] ?? 0 }))
    .filter((b) => b.value > 0)
}

function toWeaponRanking(v: EvaluatedVariant): WeaponRanking {
  return {
    weaponName: v.weapon.weaponName,
    name: v.weapon.name,
    affinity: affinityLabel(v.weapon.affinityId),
    weaponType: v.weapon.weaponType,
    totalAr: v.totalAr,
    breakdown: buildBreakdown(v.attackPower),
    requirements: v.weapon.requirements,
    meetsRequirements: v.meets,
    dlc: v.weapon.dlc,
    url: v.weapon.url,
  }
}

/**
 * Rank weapons: for each base weapon name, pick the single best affinity for
 * this build (highest total AR at max upgrade), then sort across base weapons.
 */
export function rankWeapons(
  weapons: Weapon[],
  attributes: Attributes,
  options: OptimizerOptions = {},
): WeaponRanking[] {
  const { twoHanding = false, talismans = [], metRequirementsOnly = true } = options
  const groups = groupByBaseName(weapons)
  const rankings: WeaponRanking[] = []

  for (const variants of groups.values()) {
    let best: EvaluatedVariant | null = null
    for (const w of variants) {
      const ev = evaluateVariant(w, attributes, { twoHanding, talismans })
      if (metRequirementsOnly && !ev.meets) continue
      if (!best || ev.totalAr > best.totalAr) best = ev
    }
    if (best) rankings.push(toWeaponRanking(best))
  }

  return rankings.sort((a, b) => b.totalAr - a.totalAr)
}

/**
 * Rank the best weapon (any affinity) for each damage type, returning a map
 * damageType → ranked list. AR shown is the AR *of that damage type*.
 */
export function rankByDamageType(
  weapons: Weapon[],
  attributes: Attributes,
  options: OptimizerOptions = {},
): Record<number, WeaponRanking[]> {
  const { twoHanding = false, talismans = [], metRequirementsOnly = true } = options
  const groups = groupByBaseName(weapons)
  const out: Record<number, WeaponRanking[]> = {}
  for (const t of allDamageTypes) out[t] = []

  for (const variants of groups.values()) {
    // For each damage type, find the variant of this base weapon that maximizes
    // that single type.
    const bestPerType = new Map<number, EvaluatedVariant>()
    for (const w of variants) {
      const ev = evaluateVariant(w, attributes, { twoHanding, talismans })
      if (metRequirementsOnly && !ev.meets) continue
      for (const t of allDamageTypes) {
        const v = ev.attackPower[t] ?? 0
        if (v <= 0) continue
        const cur = bestPerType.get(t)
        if (!cur || v > (cur.attackPower[t] ?? 0)) bestPerType.set(t, ev)
      }
    }
    for (const [t, ev] of bestPerType) {
      const r = toWeaponRanking(ev)
      // Report the single-type AR for this tab.
      out[t].push({ ...r, totalAr: ev.attackPower[t as AttackPowerType] ?? 0 })
    }
  }

  for (const t of allDamageTypes) out[t].sort((a, b) => b.totalAr - a.totalAr)
  return out
}

/** Rank the best weapon per status-effect buildup. */
export function rankByStatus(
  weapons: Weapon[],
  attributes: Attributes,
  options: OptimizerOptions = {},
): Record<number, StatusRanking[]> {
  const { twoHanding = false, talismans = [], metRequirementsOnly = true } = options
  const groups = groupByBaseName(weapons)
  const out: Record<number, StatusRanking[]> = {}
  for (const s of STATUS_TYPES) out[s] = []

  for (const variants of groups.values()) {
    const bestPerStatus = new Map<number, EvaluatedVariant>()
    for (const w of variants) {
      const ev = evaluateVariant(w, attributes, { twoHanding, talismans })
      if (metRequirementsOnly && !ev.meets) continue
      for (const s of STATUS_TYPES) {
        const v = ev.attackPower[s] ?? 0
        if (v <= 0) continue
        const cur = bestPerStatus.get(s)
        if (!cur || v > (cur.attackPower[s] ?? 0)) bestPerStatus.set(s, ev)
      }
    }
    for (const [s, ev] of bestPerStatus) {
      out[s].push({
        weaponName: ev.weapon.weaponName,
        name: ev.weapon.name,
        affinity: affinityLabel(ev.weapon.affinityId),
        status: s,
        statusLabel: STATUS_LABELS[s],
        buildup: ev.attackPower[s as AttackPowerType] ?? 0,
        totalAr: ev.totalAr,
        requirements: ev.weapon.requirements,
        meetsRequirements: ev.meets,
        dlc: ev.weapon.dlc,
        url: ev.weapon.url,
      })
    }
  }

  for (const s of STATUS_TYPES) out[s].sort((a, b) => b.buildup - a.buildup)
  return out
}

const SPELL_TYPE_TO_DAMAGE: Record<number, AttackPowerType> = {
  [AttackPowerType.MAGIC]: AttackPowerType.MAGIC,
  [AttackPowerType.FIRE]: AttackPowerType.FIRE,
  [AttackPowerType.LIGHTNING]: AttackPowerType.LIGHTNING,
  [AttackPowerType.HOLY]: AttackPowerType.HOLY,
}

interface BestCatalyst {
  name: string
  scalingByType: Partial<Record<AttackPowerType, number>>
}

/**
 * Pick the user's best catalyst for a tool kind (sorcery/incantation). For each
 * damage channel we want the catalyst that gives the highest spellScaling, so
 * we track per-type maxima — different spells may want different catalysts but
 * we report the single best one per spell.
 */
function bestCatalysts(
  weapons: Weapon[],
  attributes: Attributes,
  talismanIds: string[],
  kind: 'sorcery' | 'incantation',
): BestCatalyst[] {
  const attrs = applyStatBonuses(attributes, talismanIds)
  const results: BestCatalyst[] = []
  for (const w of weapons) {
    const isTool = kind === 'sorcery' ? w.sorceryTool : w.incantationTool
    if (!isTool) continue
    // Require the catalyst be usable (requirements met) so recommendations are real.
    if (!meetsRequirements(w, attrs)) continue
    const upgrade = maxUpgradeFor(w)
    const r = getWeaponAttack({ weapon: w, attributes: attrs, upgradeLevel: upgrade })
    results.push({ name: w.name, scalingByType: r.spellScaling })
  }
  return results
}

function rankSpells(
  spells: Spell[],
  weapons: Weapon[],
  attributes: Attributes,
  options: OptimizerOptions,
  kind: 'sorcery' | 'incantation',
): SpellRanking[] {
  const { talismans = [], metRequirementsOnly = true } = options
  const attrs = applyStatBonuses(attributes, talismans)
  const catalysts = bestCatalysts(weapons, attrs, talismans, kind)
  const mult = arMultiplier(talismans)

  const out: SpellRanking[] = []
  for (const spell of spells) {
    const damageType = SPELL_TYPE_TO_DAMAGE[spell.damageType]
    if (damageType == null) continue

    const meets =
      (spell.requirements.int == null || attrs.int >= spell.requirements.int) &&
      (spell.requirements.fai == null || attrs.fai >= spell.requirements.fai) &&
      (spell.requirements.arc == null || attrs.arc >= spell.requirements.arc)
    if (metRequirementsOnly && !meets) continue

    // Best catalyst for this spell's damage channel.
    let bestScaling = 0
    let bestName = '—'
    for (const c of catalysts) {
      const s = c.scalingByType[damageType] ?? 0
      if (s > bestScaling) {
        bestScaling = s
        bestName = c.name
      }
    }

    const effectiveAr = spell.spellBaseAR * (bestScaling / 100) * mult
    out.push({
      name: spell.name,
      type: spell.type,
      damageType,
      damageLabel: DAMAGE_TYPE_LABELS[damageType],
      effectiveAr,
      spellBaseAR: spell.spellBaseAR,
      catalyst: bestName,
      catalystScaling: bestScaling,
      fp: spell.fp,
      slots: spell.slots,
      requirements: spell.requirements,
      meetsRequirements: meets,
      dlc: spell.dlc ?? false,
      confidence: spell.confidence,
      note: spell.note,
    })
  }

  return out.sort((a, b) => b.effectiveAr - a.effectiveAr)
}

export function rankSorceries(
  weapons: Weapon[],
  attributes: Attributes,
  options: OptimizerOptions = {},
): SpellRanking[] {
  return rankSpells(damageSorceries, weapons, attributes, options, 'sorcery')
}

export function rankIncantations(
  weapons: Weapon[],
  attributes: Attributes,
  options: OptimizerOptions = {},
): SpellRanking[] {
  return rankSpells(damageIncantations, weapons, attributes, options, 'incantation')
}
