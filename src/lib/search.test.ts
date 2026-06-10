import { describe, expect, it } from 'vitest'
import { searchItems, stepVisible } from './search'
import type { Item, Step } from './types'

const mk = (id: string, name: string, category: Item['category']): Item => ({
  id, name, category, dlc: false, acquisition: '', missable: null, quest: null, map: null, wikiUrl: null,
})
const pool = [mk('talisman-radagons-soreseal', "Radagon's Soreseal", 'talisman'), mk('weapon-moonveil', 'Moonveil', 'weapon')]

describe('searchItems', () => {
  it('matches case-insensitively on name', () => {
    expect(searchItems(pool, 'moonv').map((i) => i.id)).toEqual(['weapon-moonveil'])
  })
  it('ignores punctuation in the query', () => {
    expect(searchItems(pool, "radagons sore").map((i) => i.id)).toEqual(['talisman-radagons-soreseal'])
  })
  it('returns empty for blank queries', () => {
    expect(searchItems(pool, '  ')).toEqual([])
  })
})

describe('stepVisible', () => {
  const itemStep: Step = { type: 'item', itemId: 'talisman-radagons-soreseal' }
  const direction: Step = { type: 'direction', text: 'go' }
  it('directions always visible', () => {
    expect(stepVisible(direction, pool[0], { hideCompleted: true, categories: new Set(['weapon']) }, () => true)).toBe(true)
  })
  it('hides completed when toggled', () => {
    expect(stepVisible(itemStep, pool[0], { hideCompleted: true, categories: null }, () => true)).toBe(false)
    expect(stepVisible(itemStep, pool[0], { hideCompleted: false, categories: null }, () => true)).toBe(true)
  })
  it('filters by category set (null = all)', () => {
    expect(stepVisible(itemStep, pool[0], { hideCompleted: false, categories: new Set(['weapon']) }, () => false)).toBe(false)
    expect(stepVisible(itemStep, pool[0], { hideCompleted: false, categories: new Set(['talisman']) }, () => false)).toBe(true)
  })
})
