import { items, itemPosition, type ItemPosition } from './data'
import type { Item } from './types'

/**
 * "Where to find it" linking for the build optimizer.
 *
 * The weapon engine and spell data identify items by their in-game *base* name
 * (e.g. "Nightrider Glaive", "Comet Azur"). We match those names against
 * items.json and return the item's route position so results can deep-link into
 * the guide. Matching is best-effort; an unmatched name simply yields no link.
 */

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '') // curly + straight apostrophes
    .replace(/[^a-z0-9]+/g, ' ') // punctuation/whitespace → single space
    .trim()
}

// Build a normalized-name index over items.json. Weapons/sorceries/incantations
// are the categories the optimizer surfaces, but we index everything so the
// matcher is robust (and so it never collides across categories of the same
// normalized name we don't expect).
const itemByNormalizedName = new Map<string, Item>()
for (const item of items) {
  const key = normalizeName(item.name)
  // First authored item wins for a given normalized name.
  if (!itemByNormalizedName.has(key)) itemByNormalizedName.set(key, item)
}

export interface BuildLink {
  item: Item
  position: ItemPosition
  /** Route path into the guide, e.g. "/region/limgrave/leg-1". */
  path: string
}

/**
 * Resolve a weapon/spell name to a guide route link, or `null` when the item
 * isn't in our route data (e.g. not yet authored, or has no map position).
 */
export function findBuildLink(name: string): BuildLink | null {
  const item = itemByNormalizedName.get(normalizeName(name))
  if (!item) return null
  const position = itemPosition.get(item.id)
  if (!position) return null
  const path = position.legId
    ? `/region/${position.regionId}/${position.legId}`
    : `/region/${position.regionId}`
  return { item, position, path }
}

/** Exposed for tests. */
export const _internal = { normalizeName, itemByNormalizedName }
