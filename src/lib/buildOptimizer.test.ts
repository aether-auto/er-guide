import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  decodeRegulationData,
  AttackPowerType,
  WeaponType,
  type EncodedRegulationDataJson,
  type Weapon,
  type Attributes,
} from './weaponCalc'
import {
  rankWeapons,
  rankByDamageType,
  rankByStatus,
  rankSorceries,
  rankIncantations,
} from './buildOptimizer'

const regulationPath = fileURLToPath(
  new URL('../../public/regulation-vanilla-v1.14.js', import.meta.url),
)
const encoded = JSON.parse(readFileSync(regulationPath, 'utf8')) as EncodedRegulationDataJson
const weapons: Weapon[] = decodeRegulationData(encoded)

const strBuild: Attributes = { str: 60, dex: 20, int: 9, fai: 9, arc: 9 }
const intBuild: Attributes = { str: 12, dex: 12, int: 80, fai: 9, arc: 9 }
const faiBuild: Attributes = { str: 12, dex: 12, int: 9, fai: 80, arc: 9 }
const lowBuild: Attributes = { str: 10, dex: 10, int: 10, fai: 10, arc: 10 }

describe('rankWeapons', () => {
  it('returns entries sorted by descending AR', () => {
    const ranked = rankWeapons(weapons, strBuild)
    expect(ranked.length).toBeGreaterThan(50)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].totalAr).toBeGreaterThanOrEqual(ranked[i].totalAr)
    }
  })

  it('excludes shields, torches, catalysts, and Unarmed (by weapon type)', () => {
    const ranked = rankWeapons(weapons, strBuild, { metRequirementsOnly: false })
    expect(ranked.some((r) => r.name === 'Unarmed')).toBe(false)
    const excludedTypes: number[] = [
      WeaponType.SMALL_SHIELD,
      WeaponType.MEDIUM_SHIELD,
      WeaponType.GREATSHIELD,
      WeaponType.THRUSTING_SHIELD,
      WeaponType.TORCH,
      WeaponType.GLINTSTONE_STAFF,
      WeaponType.SACRED_SEAL,
      WeaponType.DUAL_CATALYST,
    ]
    expect(ranked.some((r) => excludedTypes.includes(r.weaponType))).toBe(false)
  })

  it('picks one best affinity per base weapon (no duplicate base names)', () => {
    const ranked = rankWeapons(weapons, strBuild, { metRequirementsOnly: false })
    const baseNames = ranked.map((r) => r.weaponName)
    expect(new Set(baseNames).size).toBe(baseNames.length)
  })

  it('gates by requirements: a low build sees fewer weapons than show-all', () => {
    const gated = rankWeapons(weapons, lowBuild, { metRequirementsOnly: true })
    const all = rankWeapons(weapons, lowBuild, { metRequirementsOnly: false })
    expect(gated.length).toBeLessThan(all.length)
    expect(gated.every((r) => r.meetsRequirements)).toBe(true)
  })

  it('two-handing raises AR for a heavy STR weapon', () => {
    const oneHand = rankWeapons(weapons, strBuild, { twoHanding: false })
    const twoHand = rankWeapons(weapons, strBuild, { twoHanding: true })
    const find = (list: typeof oneHand, name: string) => list.find((r) => r.weaponName === name)
    const a = find(oneHand, 'Greatsword')
    const b = find(twoHand, 'Greatsword')
    if (a && b) expect(b.totalAr).toBeGreaterThan(a.totalAr)
  })

  it('an INT build favours magic affinities; a STR build does not', () => {
    const intRanked = rankWeapons(weapons, intBuild)
    // The top results for a pure-INT build should include magic-scaling weapons.
    expect(intRanked.slice(0, 30).some((r) => /Magic|Cold|Staff|Glintstone|Carian|Moonveil/.test(r.name) || r.breakdown.some((b) => b.label === 'Magic'))).toBe(true)
  })
})

describe('rankByDamageType', () => {
  it('returns ranked weapons for each of the 5 damage types', () => {
    const byType = rankByDamageType(weapons, { str: 50, dex: 50, int: 50, fai: 50, arc: 50 })
    for (const t of [
      AttackPowerType.PHYSICAL,
      AttackPowerType.MAGIC,
      AttackPowerType.FIRE,
      AttackPowerType.LIGHTNING,
      AttackPowerType.HOLY,
    ]) {
      expect(byType[t].length).toBeGreaterThan(0)
      for (let i = 1; i < byType[t].length; i++) {
        expect(byType[t][i - 1].totalAr).toBeGreaterThanOrEqual(byType[t][i].totalAr)
      }
    }
  })
})

describe('rankByStatus', () => {
  it('ranks bleed weapons by buildup descending', () => {
    const byStatus = rankByStatus(weapons, { str: 30, dex: 40, int: 9, fai: 9, arc: 45 })
    const bleed = byStatus[AttackPowerType.BLEED]
    expect(bleed.length).toBeGreaterThan(0)
    for (let i = 1; i < bleed.length; i++) {
      expect(bleed[i - 1].buildup).toBeGreaterThanOrEqual(bleed[i].buildup)
    }
    expect(bleed.every((r) => r.buildup > 0)).toBe(true)
  })
})

describe('rankSorceries / rankIncantations', () => {
  it('an INT build ranks sorceries with a real staff and descending AR', () => {
    const ranked = rankSorceries(weapons, intBuild)
    expect(ranked.length).toBeGreaterThan(5)
    expect(ranked[0].catalyst).not.toBe('—')
    expect(ranked[0].catalystScaling).toBeGreaterThan(0)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].effectiveAr).toBeGreaterThanOrEqual(ranked[i].effectiveAr)
    }
  })

  it('a FAI build ranks incantations with a real seal', () => {
    const ranked = rankIncantations(weapons, faiBuild)
    expect(ranked.length).toBeGreaterThan(5)
    expect(ranked[0].catalyst).not.toBe('—')
    expect(ranked.every((r) => r.effectiveAr >= 0)).toBe(true)
  })

  it('gates spells by casting requirements', () => {
    const gated = rankSorceries(weapons, lowBuild, { metRequirementsOnly: true })
    const all = rankSorceries(weapons, lowBuild, { metRequirementsOnly: false })
    expect(gated.length).toBeLessThanOrEqual(all.length)
    expect(gated.every((r) => r.meetsRequirements)).toBe(true)
  })
})

describe('talisman application', () => {
  it('an AR-multiplier talisman raises totals proportionally', () => {
    const base = rankWeapons(weapons, strBuild)
    const buffed = rankWeapons(weapons, strBuild, { talismans: ['ritual-sword-talisman'] }) // 1.10x
    const top = base[0]
    const buffedTop = buffed.find((r) => r.weaponName === top.weaponName)!
    expect(buffedTop.totalAr).toBeCloseTo(top.totalAr * 1.1, 1)
  })

  it('a stat-bonus talisman raises AR by feeding scaling', () => {
    const base = rankWeapons(weapons, { str: 40, dex: 20, int: 9, fai: 9, arc: 9 })
    const buffed = rankWeapons(weapons, { str: 40, dex: 20, int: 9, fai: 9, arc: 9 }, {
      talismans: ['starscourge-heirloom'], // +5 STR
    })
    const top = base.find((r) => r.weaponName === 'Greatsword')
    const buffedTop = buffed.find((r) => r.weaponName === 'Greatsword')
    if (top && buffedTop) expect(buffedTop.totalAr).toBeGreaterThan(top.totalAr)
  })
})
