import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData, type EncodedRegulationDataJson } from './regulationData'
import { getWeaponAttack } from './calculator'
import { AttackPowerType, allDamageTypes } from './attackPowerTypes'
import type { Weapon } from './weapon'
import type { Attributes } from './attributes'

// Decode the vendored regulation data once (the same file the page fetches at
// runtime). Read straight from public/ here since tests run in a node env.
const regulationPath = fileURLToPath(
  new URL('../../../public/regulation-vanilla-v1.14.js', import.meta.url),
)
const encoded = JSON.parse(readFileSync(regulationPath, 'utf8')) as EncodedRegulationDataJson
const weapons = decodeRegulationData(encoded)
const byName = new Map(weapons.map((w) => [w.name, w]))

function get(name: string): Weapon {
  const w = byName.get(name)
  if (!w) throw new Error(`weapon not found: ${name}`)
  return w
}

function totalAr(attackPower: Partial<Record<AttackPowerType, number>>): number {
  return allDamageTypes.reduce<number>((sum, t) => sum + (attackPower[t] ?? 0), 0)
}

const STANDARD_MAX = 25 // +25
const SOMBER_MAX = 10 // +10

describe('weaponCalc — golden AR values vs upstream calculator', () => {
  // Golden numbers computed directly from the upstream
  // ThomasJClark/elden-ring-weapon-calculator engine on the same regulation data.
  it('Heavy Greatsword +25, STR 60 / DEX 12, one-handed', () => {
    const attrs: Attributes = { str: 60, dex: 12, int: 0, fai: 0, arc: 0 }
    const r = getWeaponAttack({ weapon: get('Heavy Greatsword'), attributes: attrs, upgradeLevel: STANDARD_MAX })
    expect(totalAr(r.attackPower)).toBeCloseTo(745.42, 1)
  })

  it('Heavy Greatsword +25, STR 60 / DEX 12, two-handed (floor(STR*1.5))', () => {
    const attrs: Attributes = { str: 60, dex: 12, int: 0, fai: 0, arc: 0 }
    const r = getWeaponAttack({
      weapon: get('Heavy Greatsword'),
      attributes: attrs,
      upgradeLevel: STANDARD_MAX,
      twoHanding: true,
    })
    expect(totalAr(r.attackPower)).toBeCloseTo(839.62, 1)
  })

  it('Longsword (Standard) +25, STR 16 / DEX 13', () => {
    const attrs: Attributes = { str: 16, dex: 13, int: 0, fai: 0, arc: 0 }
    const r = getWeaponAttack({ weapon: get('Longsword'), attributes: attrs, upgradeLevel: STANDARD_MAX })
    expect(totalAr(r.attackPower)).toBeCloseTo(334.94, 1)
  })

  it('Keen Uchigatana +25, STR 15 / DEX 50 — physical AR and bleed buildup', () => {
    const attrs: Attributes = { str: 15, dex: 50, int: 0, fai: 0, arc: 0 }
    const r = getWeaponAttack({ weapon: get('Keen Uchigatana'), attributes: attrs, upgradeLevel: STANDARD_MAX })
    expect(r.attackPower[AttackPowerType.PHYSICAL]).toBeCloseTo(514.72, 1)
    // Keen affinity keeps the base bleed buildup unchanged.
    expect(r.attackPower[AttackPowerType.BLEED]).toBeCloseTo(45, 1)
  })

  it('Lusat’s Glintstone Staff +10, INT 80 — sorcery (magic) scaling', () => {
    const attrs: Attributes = { str: 10, dex: 10, int: 80, fai: 0, arc: 0 }
    const r = getWeaponAttack({
      weapon: get("Lusat's Glintstone Staff"),
      attributes: attrs,
      upgradeLevel: SOMBER_MAX,
    })
    expect(r.spellScaling[AttackPowerType.MAGIC]).toBeCloseTo(413.5, 0)
  })

  it('Erdtree Seal +10, FAI 80 — incantation (holy) scaling', () => {
    const attrs: Attributes = { str: 10, dex: 10, int: 0, fai: 80, arc: 0 }
    const r = getWeaponAttack({ weapon: get('Erdtree Seal'), attributes: attrs, upgradeLevel: SOMBER_MAX })
    expect(r.spellScaling[AttackPowerType.HOLY]).toBeCloseTo(353.65, 0)
  })

  it('requirement gating: unmet STR requirement applies the 0.6 penalty multiplier', () => {
    // Far below requirements — scaling collapses to 1 - 0.4 = 0.6 of base.
    const weak: Attributes = { str: 1, dex: 1, int: 1, fai: 1, arc: 1 }
    const strong: Attributes = { str: 99, dex: 99, int: 0, fai: 0, arc: 0 }
    const gs = get('Heavy Greatsword')
    const weakR = getWeaponAttack({ weapon: gs, attributes: weak, upgradeLevel: STANDARD_MAX })
    const strongR = getWeaponAttack({ weapon: gs, attributes: strong, upgradeLevel: STANDARD_MAX })
    expect(weakR.ineffectiveAttributes.length).toBeGreaterThan(0)
    expect(totalAr(weakR.attackPower)).toBeLessThan(totalAr(strongR.attackPower))
  })

  it('decodes the full vanilla weapon set including DLC weapons', () => {
    expect(weapons.length).toBeGreaterThan(3000)
    expect(weapons.some((w) => w.dlc)).toBe(true)
  })
})
