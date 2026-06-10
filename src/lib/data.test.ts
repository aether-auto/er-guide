import { describe, expect, it } from 'vitest'
import { checkableId, countChecked, legCheckables, regionCheckables } from './data'
import type { Leg, Region } from './types'

const leg: Leg = {
  id: 'l1', from: 'A', to: 'B', summary: '',
  steps: [
    { type: 'direction', text: 'go north' },
    { type: 'item', itemId: 'talisman-x' },
    { type: 'boss', id: 'boss-y', text: 'Y' },
    { type: 'quest', id: 'quest-z', questline: 'Z', text: 'talk' },
  ],
}

describe('data helpers', () => {
  it('checkableId covers all step types', () => {
    expect(leg.steps.map(checkableId)).toEqual([null, 'talisman-x', 'boss-y', 'quest-z'])
  })
  it('legCheckables drops directions', () => {
    expect(legCheckables(leg)).toEqual(['talisman-x', 'boss-y', 'quest-z'])
  })
  it('countChecked counts only checked ids', () => {
    expect(countChecked(['a', 'b', 'c'], { a: 1, c: 2, d: 3 })).toBe(2)
  })
  it('regionCheckables appends cleanup ids after leg checkables', () => {
    const region: Region = {
      id: 'r1', name: 'R1', order: 1,
      legs: [leg],
      cleanup: ['weapon-a', 'armor-b'],
    }
    expect(regionCheckables(region)).toEqual(['talisman-x', 'boss-y', 'quest-z', 'weapon-a', 'armor-b'])
  })
})
