// Ported MIT weapon-attack engine — see ./LICENSE and the per-file headers.
// Public surface for the build optimizer.

export * from './attributes'
export * from './attackPowerTypes'
export * from './weaponTypes'
export type { Weapon, AttackElementCorrect } from './weapon'
export {
  decodeRegulationData,
  evaluateCalcCorrectGraph,
  type EncodedRegulationDataJson,
} from './regulationData'
export {
  getWeaponAttack,
  adjustAttributesForTwoHanding,
  type WeaponAttackResult,
} from './calculator'

import { decodeRegulationData, type EncodedRegulationDataJson } from './regulationData'
import type { Weapon } from './weapon'

/**
 * Lazy-load + decode the vendored regulation data. The ~1 MB JSON
 * (public/regulation-vanilla-v1.14.js) is fetched at runtime only — it is never
 * part of the main bundle. Decoding is memoized so it runs once per session.
 */
let weaponsPromise: Promise<Weapon[]> | null = null

export function loadWeapons(): Promise<Weapon[]> {
  if (!weaponsPromise) {
    weaponsPromise = fetch(`${import.meta.env.BASE_URL}regulation-vanilla-v1.14.js`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load regulation data (${res.status})`)
        return res.json() as Promise<EncodedRegulationDataJson>
      })
      .then((data) => decodeRegulationData(data))
      .catch((err) => {
        // Reset so a later mount can retry rather than caching the failure.
        weaponsPromise = null
        throw err
      })
  }
  return weaponsPromise
}
