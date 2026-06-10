import { describe, expect, it } from 'vitest'
import { checkableId, countChecked, legCheckables } from './data'
import type { Leg } from './types'

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
})
