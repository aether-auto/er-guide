import { describe, expect, it } from 'vitest'
import {
  checkableId,
  countChecked,
  countIgnored,
  firstUncheckedId,
  legCheckables,
  questlines,
  regionCheckables,
  regions,
} from './data'
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
  it('countIgnored counts only ignored ids', () => {
    expect(countIgnored(['a', 'b', 'c'], { a: 1, d: 99 })).toBe(1)
  })
  it('firstUncheckedId returns first unchecked id', () => {
    expect(firstUncheckedId(leg.steps, {}, {})).toBe('talisman-x')
    expect(firstUncheckedId(leg.steps, { 'talisman-x': 1 }, {})).toBe('boss-y')
    expect(firstUncheckedId(leg.steps, {})).toBe('talisman-x') // ignored param optional
  })
  it('firstUncheckedId skips ignored ids', () => {
    expect(firstUncheckedId(leg.steps, {}, { 'talisman-x': 1 })).toBe('boss-y')
    expect(firstUncheckedId(leg.steps, { 'boss-y': 1 }, { 'talisman-x': 1 })).toBe('quest-z')
    expect(firstUncheckedId(leg.steps, {}, { 'talisman-x': 1, 'boss-y': 1, 'quest-z': 1 })).toBe(null)
  })
})

describe('questlines (real region data)', () => {
  it('groups every authored quest step exactly once', () => {
    let authoredCount = 0
    for (const region of regions)
      for (const leg of region.legs)
        for (const step of leg.steps) if (step.type === 'quest') authoredCount++

    const groupedCount = questlines.reduce((n, q) => n + q.steps.length, 0)
    expect(groupedCount).toBe(authoredCount)
    expect(authoredCount).toBeGreaterThan(0)
  })

  it('collapses naming-variant aliases (no "Varré" or "Sellen" leak through)', () => {
    const names = questlines.map((q) => q.name)
    expect(names).not.toContain('Varré')
    expect(names).not.toContain('Sellen')
    expect(names).toContain('White-Faced Varré')
    expect(names).toContain('Sorceress Sellen')
    // names are unique after canonicalization
    expect(new Set(names).size).toBe(names.length)
  })

  it('orders steps within a questline by region order then leg order (non-decreasing)', () => {
    for (const q of questlines) {
      for (let i = 1; i < q.steps.length; i++) {
        expect(q.steps[i].regionOrder).toBeGreaterThanOrEqual(q.steps[i - 1].regionOrder)
      }
    }
  })

  it('every quest step carries region/leg context and a stable id', () => {
    for (const q of questlines) {
      for (const step of q.steps) {
        expect(step.id).toBeTruthy()
        expect(step.regionId).toBeTruthy()
        expect(step.legId).toBeTruthy()
        expect(step.questline).toBe(q.name)
      }
    }
  })
})
