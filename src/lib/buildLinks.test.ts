import { describe, expect, it } from 'vitest'
import { findBuildLink, _internal } from './buildLinks'
import { items } from './data'

describe('buildLinks name normalization', () => {
  it('normalizes apostrophes and punctuation', () => {
    expect(_internal.normalizeName("Loretta's Greatbow")).toBe('lorettas greatbow')
    expect(_internal.normalizeName('Ranni’s Dark Moon')).toBe('rannis dark moon')
    expect(_internal.normalizeName('  Comet   Azur ')).toBe('comet azur')
  })

  it('matches a representative weapon that exists in items.json', () => {
    // Pick a real weapon name from the data so the test is self-validating.
    const weapon = items.find((i) => i.category === 'weapon')!
    const link = findBuildLink(weapon.name)
    // It may legitimately have no route position; but if matched, the item id lines up.
    if (link) {
      expect(link.item.id).toBe(weapon.id)
      expect(link.path.startsWith('/region/')).toBe(true)
    } else {
      // At least the normalized index should contain it.
      expect(_internal.itemByNormalizedName.has(_internal.normalizeName(weapon.name))).toBe(true)
    }
  })

  it('matches a representative sorcery from items.json', () => {
    const sorcery = items.find((i) => i.category === 'sorcery')!
    expect(_internal.itemByNormalizedName.has(_internal.normalizeName(sorcery.name))).toBe(true)
  })

  it('returns null for an unknown name', () => {
    expect(findBuildLink('Definitely Not A Real Weapon 12345')).toBeNull()
  })

  it('matches case-insensitively and ignoring an affinity-free base name', () => {
    const sorcery = items.find((i) => i.category === 'sorcery' && i.map != null)
    if (sorcery) {
      const link = findBuildLink(sorcery.name.toUpperCase())
      expect(link?.item.id).toBe(sorcery.id)
    }
  })
})
